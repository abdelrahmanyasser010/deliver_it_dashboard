import type { DriverShipmentUpdate, ReturnCase } from '../../domain/operations/entities';
import type { FinancialLedgerEntry, MerchantSettlement, SettlementLine } from '../../domain/finance/entities';
import type { Driver, Shipment, ShipmentEvent, ShipmentStatus } from '../../domain/logistics/entities';
import type { CommandError, CommandResult, DeliveryCommand, DeliveryState } from './types';
import { canTransition, deriveShipmentStateAfterTransition } from './workflow';

const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const actorOf = (command: DeliveryCommand) => command.actor ?? 'مستخدم تجريبي';

function calculateConfiguredFee(mode: 'disabled' | 'fixed' | 'percentage', value: number, base: number) {
  if (mode === 'fixed') return Math.max(0, value);
  if (mode === 'percentage') return Math.max(0, Math.round((base * value) / 100));
  return 0;
}

function audit(state: DeliveryState, command: DeliveryCommand, entityType: string, entityId: string, detail: string): DeliveryState {
  return {
    ...state,
    lastSyncedAt: nowIso(),
    auditEvents: [{ id: id('AUD'), action: command.type, entityType, entityId, detail, actor: actorOf(command), createdAt: nowIso() }, ...state.auditEvents],
  };
}

function shipmentEvent(shipmentId: string, type: ShipmentEvent['type'], title: string, detail: string, actor: string, fromStatus?: ShipmentStatus, toStatus?: ShipmentStatus): ShipmentEvent {
  return { id: id('EVT'), shipmentId, type, title, detail, actor, createdAt: nowIso(), fromStatus, toStatus };
}

function updateShipment(state: DeliveryState, shipmentId: string, updater: (shipment: Shipment) => Shipment) {
  return { ...state, shipments: state.shipments.map((shipment) => shipment.id === shipmentId ? updater(shipment) : shipment) };
}

function refreshDerivedPeople(state: DeliveryState): DeliveryState {
  const today = new Date().toDateString();
  const drivers = state.drivers.map((driver) => {
    const assigned = state.shipments.filter((shipment) => shipment.driverId === driver.id && !['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status));
    const deliveredToday = state.shipments.filter((shipment) => shipment.driverId === driver.id && ['delivered', 'partiallyDelivered'].includes(shipment.status) && new Date(shipment.statusChangedAt).toDateString() === today);
    const pendingCash = state.shipments.filter((shipment) => shipment.driverId === driver.id).reduce((sum, shipment) => sum + Math.max(0, shipment.collectedCash - shipment.remittedCash), 0);
    return { ...driver, shipmentsCount: assigned.length, activeLoad: assigned.length, deliveredToday: deliveredToday.length, pendingCash };
  });
  const merchants = state.merchants.map((merchant) => {
    const shipments = state.shipments.filter((shipment) => shipment.merchantId === merchant.id);
    const delivered = shipments.filter((shipment) => ['delivered', 'partiallyDelivered'].includes(shipment.status)).length;
    const returned = shipments.filter((shipment) => shipment.status === 'returned').length;
    const delayed = shipments.filter((shipment) => shipment.expectedDeliveryAt && new Date(shipment.expectedDeliveryAt).getTime() < Date.now() && !['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status)).length;
    const pendingSettlement = shipments.filter((shipment) => ['remitted', 'inSettlement'].includes(shipment.financialStatus) && shipment.settlementStatus === 'unsettled').reduce((sum, shipment) => sum + Math.max(0, shipment.collectedCash - shipment.deliveryFee - shipment.discount), 0);
    const totalOrderValue = shipments.reduce((sum, shipment) => sum + shipment.total, 0);
    const performance = {
      successRate: shipments.length ? Math.round((delivered / shipments.length) * 100) : 0,
      returnRate: shipments.length ? Math.round((returned / shipments.length) * 100) : 0,
      addressQuality: Math.max(60, 100 - delayed * 3),
      averageDeliveryHours: shipments.length ? Math.round(shipments.reduce((sum, shipment) => sum + Math.max(1, (new Date(shipment.statusChangedAt).getTime() - new Date(shipment.createdAt).getTime()) / 3600000), 0) / shipments.length) : 0,
      topGovernorate: shipments[0]?.governorate ?? 'غير محدد',
      topReturnReason: returned ? 'رفض الاستلام / تعذر التواصل' : 'لا توجد مرتجعات',
    };
    return { ...merchant, shipmentsCount: shipments.length, pendingSettlement, totalOrderValue, performance };
  });
  return { ...state, drivers, merchants };
}

function settlementLines(shipments: Shipment[]): SettlementLine[] {
  return shipments.map((shipment) => {
    const returnFee = shipment.status === 'returned' ? Math.round(shipment.deliveryFee * 0.6) : 0;
    const netPayable = Math.max(0, shipment.collectedCash - shipment.deliveryFee - returnFee - shipment.discount);
    return { shipmentId: shipment.id, merchantId: shipment.merchantId, grossCollection: shipment.collectedCash, shippingFee: shipment.deliveryFee, returnFee, discount: shipment.discount, adjustment: 0, netPayable };
  });
}

function buildSettlement(shipments: Shipment[]): MerchantSettlement | null {
  if (!shipments.length) return null;
  const merchantId = shipments[0].merchantId;
  if (shipments.some((shipment) => shipment.merchantId !== merchantId)) return null;
  const lines = settlementLines(shipments);
  const dates = shipments.map((shipment) => new Date(shipment.statusChangedAt).getTime());
  return {
    id: id('SET'), merchantId, merchantName: shipments[0].merchantName,
    periodStart: new Date(Math.min(...dates)).toISOString(), periodEnd: new Date(Math.max(...dates)).toISOString(),
    status: 'draft', shipmentIds: shipments.map((shipment) => shipment.id), lines,
    grossCollection: lines.reduce((sum, line) => sum + line.grossCollection, 0), shippingFees: lines.reduce((sum, line) => sum + line.shippingFee, 0),
    returnFees: lines.reduce((sum, line) => sum + line.returnFee, 0), discounts: lines.reduce((sum, line) => sum + line.discount, 0),
    adjustments: lines.reduce((sum, line) => sum + line.adjustment, 0), netPayable: lines.reduce((sum, line) => sum + line.netPayable, 0), createdAt: nowIso(),
  };
}


function buildPartialDeliveryProjection(state: DeliveryState, update: DriverShipmentUpdate, shipment: Shipment, actor: string): DeliveryState {
  const lines = update.partialDeliveryLines ?? [];
  if (!lines.length) return state;
  const deliveredSubtotal = lines.reduce((sum, line) => {
    const item = shipment.items[line.itemIndex];
    return sum + (item?.price ?? 0) * Math.max(0, Math.min(line.deliveredQuantity, item?.quantity ?? 0));
  }, 0);
  const collectedCash = shipment.paymentType === 'cashOnDelivery'
    ? Math.max(0, update.reportedCollectedCash ?? deliveredSubtotal + shipment.deliveryFee - shipment.discount)
    : 0;
  const splitTimestamp = nowIso();
  const rootId = shipment.rootShipmentId ?? shipment.id;
  const grouped = new Map<'retry' | 'return', Array<{ line: NonNullable<DriverShipmentUpdate['partialDeliveryLines']>[number]; item: Shipment['items'][number]; quantity: number }>>();
  lines.forEach((line) => {
    const item = shipment.items[line.itemIndex];
    if (!item) return;
    const quantity = Math.max(0, item.quantity - line.deliveredQuantity);
    if (!quantity || !line.undeliveredAction) return;
    grouped.set(line.undeliveredAction, [...(grouped.get(line.undeliveredAction) ?? []), { line, item, quantity }]);
  });

  const children: Shipment[] = [];
  const returnCases: ReturnCase[] = [];
  let sequence = Math.max(0, ...state.shipments.filter((item) => (item.rootShipmentId ?? item.id) === rootId).map((item) => item.splitSequence ?? 0));
  for (const [action, entries] of grouped.entries()) {
    sequence += 1;
    const childId = `${rootId}-${action === 'retry' ? 'A' : 'R'}${sequence}`;
    const itemSubtotal = entries.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
    const childStatus = action === 'retry' ? 'postponed' as const : 'returned' as const;
    const taskStatus = action === 'retry' ? 'needsCustomerService' as const : 'needsReturnProcessing' as const;
    const child: Shipment = {
      ...shipment,
      id: childId,
      trackingNumber: `${shipment.trackingNumber}-${action === 'retry' ? 'A' : 'R'}${sequence}`,
      rootShipmentId: rootId,
      parentShipmentId: shipment.id,
      splitSequence: sequence,
      childShipmentIds: [],
      status: childStatus,
      taskStatus,
      financialStatus: action === 'retry' && shipment.paymentType === 'cashOnDelivery' ? 'awaitingCollection' : 'notDue',
      total: itemSubtotal,
      deliveryFee: 0,
      discount: 0,
      expectedCollection: action === 'retry' && shipment.paymentType === 'cashOnDelivery' ? itemSubtotal : 0,
      collectedCash: 0,
      remittedCash: 0,
      items: entries.map(({ item, quantity, line }, itemIndex) => ({ ...item, id: `${childId}-I${itemIndex + 1}`, quantity, deliveredQuantity: 0, pendingQuantity: action === 'retry' ? quantity : 0, returnedQuantity: action === 'return' ? quantity : 0, disposition: action, dispositionReason: line.reason })),
      attemptCount: action === 'retry' ? shipment.attemptCount + 1 : shipment.attemptCount,
      exceptionReason: entries.map((entry) => entry.line.reason).filter(Boolean).join('، ') || (action === 'retry' ? 'جزء ينتظر إعادة محاولة' : 'جزء مرتجع إلى الشركة'),
      settlementStatus: 'unsettled',
      settlementId: undefined,
      expectedDeliveryAt: action === 'retry' ? shipment.expectedDeliveryAt : undefined,
      statusChangedAt: splitTimestamp,
      lastUpdatedAt: splitTimestamp,
      version: 1,
      deliveryProof: undefined,
      merchantVisibleStatus: action === 'retry' ? 'تم تأجيل جزء من الطلب لمحاولة جديدة' : 'جزء من الطلب في دورة المرتجع',
      events: [shipmentEvent(childId, 'created', action === 'retry' ? 'إنشاء بوليصة إعادة محاولة' : 'إنشاء بوليصة مرتجع جزئي', `من البوليصة الأصلية ${shipment.id}`, actor)],
      attempts: [],
    };
    children.push(child);
    if (action === 'return') {
      const returnFee = calculateConfiguredFee(state.settings.pricing.returnFeeMode, state.settings.pricing.returnFeeValue, shipment.deliveryFee);
      returnCases.push({
        id: id('RET'), shipmentId: child.id, rootShipmentId: rootId, merchantId: shipment.merchantId, merchantName: shipment.merchantName,
        sourceDriverId: shipment.driverId, sourceDriverName: shipment.driverName, status: 'returningToHub',
        reason: child.exceptionReason ?? 'مرتجع جزئي', itemSummary: child.items.map((item) => `${item.name} × ${item.quantity}`).join('، '),
        quantity: child.items.reduce((sum, item) => sum + item.quantity, 0), returnFee, createdAt: splitTimestamp, updatedAt: splitTimestamp,
      });
    }
  }

  const rootItems = shipment.items.map((item, itemIndex) => {
    const line = lines.find((entry) => entry.itemIndex === itemIndex);
    if (!line) return item;
    const deliveredQuantity = Math.max(0, Math.min(item.quantity, line.deliveredQuantity));
    const undelivered = item.quantity - deliveredQuantity;
    return {
      ...item,
      deliveredQuantity,
      pendingQuantity: line.undeliveredAction === 'retry' ? undelivered : 0,
      returnedQuantity: line.undeliveredAction === 'return' ? undelivered : 0,
      disposition: deliveredQuantity === item.quantity ? 'delivered' as const : line.undeliveredAction,
      dispositionReason: line.reason,
    };
  });
  const proof = update.evidenceReference ? {
    type: 'photo' as const,
    reference: update.evidenceReference,
    recipientName: update.recipientName ?? shipment.customerName,
    capturedAt: update.location?.capturedAt ?? update.createdAt,
    location: update.location,
    reviewStatus: update.requiresManualReview ? 'needsReview' as const : 'accepted' as const,
    reviewNote: update.reviewReason,
  } : undefined;
  const rootTotal = deliveredSubtotal + shipment.deliveryFee - shipment.discount;
  const updatedRoot: Shipment = {
    ...shipment,
    rootShipmentId: rootId,
    status: 'partiallyDelivered',
    taskStatus: 'none',
    financialStatus: shipment.paymentType === 'cashOnDelivery' ? 'partiallyCollected' : 'notDue',
    total: Math.max(0, rootTotal),
    expectedCollection: collectedCash,
    collectedCash,
    items: rootItems,
    childShipmentIds: children.map((child) => child.id),
    deliveryProof: proof,
    merchantVisibleStatus: 'تم تسليم جزء من الطلب وجارٍ معالجة الجزء المتبقي',
    exceptionReason: undefined,
    statusChangedAt: splitTimestamp,
    lastUpdatedAt: splitTimestamp,
    version: (shipment.version ?? 0) + 1,
    events: [...(shipment.events ?? []), shipmentEvent(shipment.id, 'statusChanged', 'اعتماد التسليم الجزئي', `تم إنشاء ${children.length} بوليصة فرعية؛ رسوم الشحن الأساسية محفوظة على البوليصة الأصلية.`, actor, shipment.status, 'partiallyDelivered')],
  };
  return {
    ...state,
    shipments: [...state.shipments.map((item) => item.id === shipment.id ? updatedRoot : item), ...children],
    returnCases: [...returnCases, ...state.returnCases],
  };
}

function updateReturnCase(state: DeliveryState, returnCaseId: string, updater: (item: ReturnCase) => ReturnCase) {
  return { ...state, returnCases: state.returnCases.map((item) => item.id === returnCaseId ? updater(item) : item) };
}

function result(ok: boolean, message: string, errors?: CommandError[], createdId?: string): CommandResult { return { ok, message, errors, createdId }; }

export function reduceDeliveryCommand(previous: DeliveryState, command: DeliveryCommand): { state: DeliveryState; result: CommandResult } {
  let state = previous;
  const actor = actorOf(command);

  switch (command.type) {
    case 'shipment/assignDriver': {
      const driver = state.drivers.find((item) => item.id === command.driverId);
      if (!driver || driver.status !== 'active') return { state, result: result(false, 'المندوب غير موجود أو غير فعال.') };
      const eligible = command.shipmentIds.filter((shipmentId) => state.shipments.some((shipment) => shipment.id === shipmentId && !['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status)));
      const capacityLeft = Math.max(0, driver.capacity - driver.activeLoad);
      const accepted = eligible.slice(0, capacityLeft);
      const rejected = eligible.slice(capacityLeft).map((entityId) => ({ entityId, message: 'تجاوز سعة المندوب.' }));
      state = { ...state, shipments: state.shipments.map((shipment) => accepted.includes(shipment.id) ? { ...shipment, driverId: driver.id, driverName: driver.name, taskStatus: 'none', lastUpdatedAt: nowIso(), version: (shipment.version ?? 0) + 1, events: [...(shipment.events ?? []), shipmentEvent(shipment.id, 'driverAssigned', 'تم تعيين مندوب', `تم تعيين ${driver.name}`, actor)] } : shipment) };
      state = refreshDerivedPeople(audit(state, command, 'shipment', accepted.join(','), `تم تعيين ${accepted.length} شحنة إلى ${driver.name}`));
      return { state, result: result(accepted.length > 0, `تم تعيين ${accepted.length} شحنة.${rejected.length ? ` تعذر ${rejected.length}.` : ''}`, rejected) };
    }
    case 'shipment/transition': {
      const errors: CommandError[] = [];
      const accepted: string[] = [];
      state = { ...state, shipments: state.shipments.map((shipment) => {
        if (!command.shipmentIds.includes(shipment.id)) return shipment;
        if (!canTransition(shipment.status, command.nextStatus)) { errors.push({ entityId: shipment.id, message: `الانتقال من ${shipment.status} إلى ${command.nextStatus} غير مسموح.` }); return shipment; }
        accepted.push(shipment.id);
        const derived = deriveShipmentStateAfterTransition(shipment, command.nextStatus);
        return { ...shipment, ...derived, status: command.nextStatus, statusChangedAt: nowIso(), lastUpdatedAt: nowIso(), attemptCount: ['failedToDeliver', 'postponed'].includes(command.nextStatus) ? shipment.attemptCount + 1 : shipment.attemptCount, version: (shipment.version ?? 0) + 1, events: [...(shipment.events ?? []), shipmentEvent(shipment.id, 'statusChanged', 'تغيير حالة الشحنة', command.reason, actor, shipment.status, command.nextStatus)] };
      }) };
      state = refreshDerivedPeople(audit(state, command, 'shipment', accepted.join(','), command.reason));
      return { state, result: result(accepted.length > 0, `تم تحديث ${accepted.length} شحنة.${errors.length ? ` تعذر ${errors.length}.` : ''}`, errors) };
    }
    case 'shipment/addAttempt': {
      const shipment = state.shipments.find((item) => item.id === command.shipmentId);
      if (!shipment) return { state, result: result(false, 'الشحنة غير موجودة.') };
      state = updateShipment(state, shipment.id, (current) => ({ ...current, attemptCount: current.attemptCount + 1, taskStatus: 'needsCustomerService', exceptionReason: command.note, lastUpdatedAt: nowIso(), attempts: [...(current.attempts ?? []), { id: id('ATT'), shipmentId: current.id, outcome: command.outcome ?? 'failed', note: command.note, createdAt: nowIso(), driverId: current.driverId }], events: [...(current.events ?? []), shipmentEvent(current.id, 'deliveryAttempt', 'محاولة تسليم', command.note, actor)] }));
      state = audit(state, command, 'shipment', shipment.id, command.note);
      return { state, result: result(true, 'تم تسجيل محاولة التسليم.') };
    }
    case 'shipment/overrideFee': {
      const shipment = state.shipments.find((item) => item.id === command.shipmentId);
      if (!shipment) return { state, result: result(false, 'الشحنة غير موجودة.') };
      const oldFee = shipment.deliveryFee;
      const newFee = Math.max(0, command.deliveryFee);
      state = updateShipment(state, shipment.id, (current) => ({
        ...current,
        deliveryFee: newFee,
        originalDeliveryFee: current.originalDeliveryFee ?? oldFee,
        feeOverrideReason: command.reason,
        expectedCollection: current.paymentType === 'cashOnDelivery' ? (current.total + newFee - current.discount) : current.expectedCollection,
        lastUpdatedAt: nowIso(),
        events: [
          ...(current.events ?? []),
          shipmentEvent(current.id, 'financial', 'تعديل رسوم الشحن', `تم تعديل رسوم الشحن من ${oldFee} إلى ${newFee} ج.م — السبب: ${command.reason}`, actor)
        ],
      }));
      state = refreshDerivedPeople(audit(state, command, 'shipment', shipment.id, `تعديل رسوم الشحن إلى ${newFee} ج.م: ${command.reason}`));
      return { state, result: result(true, 'تم تعديل رسوم الشحن وحفظ سبب التعديل.') };
    }
    case 'shipment/import': {
      const existing = new Set(state.shipments.flatMap((shipment) => [shipment.id, shipment.trackingNumber]));
      const added = command.shipments.filter((shipment) => !existing.has(shipment.id) && !existing.has(shipment.trackingNumber));
      const duplicates = command.shipments.filter((shipment) => !added.includes(shipment)).map((shipment) => ({ entityId: shipment.id, message: 'شحنة مكررة.' }));
      state = refreshDerivedPeople(audit({ ...state, shipments: [...added, ...state.shipments] }, command, 'shipment', added.map((item) => item.id).join(','), `استيراد ${added.length} شحنة`));
      return { state, result: result(added.length > 0, `تم استيراد ${added.length} شحنة.`, duplicates) };
    }
    case 'shipment/requestSettlement':
    case 'settlement/create': {
      const requestedIds = command.shipmentIds;
      const candidates = state.shipments.filter((shipment) => requestedIds.includes(shipment.id) && ['remitted', 'inSettlement'].includes(shipment.financialStatus) && shipment.settlementStatus === 'unsettled');
      const byMerchant = new Map<string, Shipment[]>();
      candidates.forEach((shipment) => byMerchant.set(shipment.merchantId, [...(byMerchant.get(shipment.merchantId) ?? []), shipment]));
      const created = [...byMerchant.values()].map(buildSettlement).filter(Boolean) as MerchantSettlement[];
      if (!created.length) return { state, result: result(false, 'لا توجد شحنات مؤهلة للتسوية.') };
      const settlementByShipment = new Map(created.flatMap((settlement) => settlement.shipmentIds.map((shipmentId) => [shipmentId, settlement.id] as const)));
      state = { ...state, settlements: [...created, ...state.settlements], shipments: state.shipments.map((shipment) => settlementByShipment.has(shipment.id) ? { ...shipment, financialStatus: 'inSettlement', settlementId: settlementByShipment.get(shipment.id), lastUpdatedAt: nowIso() } : shipment) };
      state = audit(state, command, 'settlement', created.map((item) => item.id).join(','), `إنشاء ${created.length} تسوية`);
      return { state, result: result(true, `تم إنشاء ${created.length} تسوية.`, undefined, created[0].id) };
    }
    case 'pickup/approve':
    case 'pickup/review': {
      const task = state.pickupTasks.find((item) => item.id === command.taskId);
      if (!task) return { state, result: result(false, 'مهمة الاستلام غير موجودة.') };
      const approved = command.type === 'pickup/approve';
      const confirmedIds = task.items.filter((item) => item.driverConfirmed).map((item) => item.shipmentId);
      state = { ...state, pickupTasks: state.pickupTasks.map((item) => item.id === task.id ? { ...item, status: approved ? 'approved' : 'needsReview', reviewNote: approved ? 'تم اعتماد الشحنات المؤكدة.' : 'يوجد اختلاف يحتاج مراجعة.' } : item), shipments: state.shipments.map((shipment) => approved && confirmedIds.includes(shipment.id) && canTransition(shipment.status, 'receivedAtOffice') ? { ...shipment, status: 'receivedAtOffice', taskStatus: 'needsDriverAssignment', statusChangedAt: nowIso(), lastUpdatedAt: nowIso(), pickupTaskId: task.id } : shipment) };
      state = refreshDerivedPeople(audit(state, command, 'pickupTask', task.id, approved ? 'اعتماد مهمة الاستلام' : 'إرسال للمراجعة'));
      return { state, result: result(true, approved ? 'تم اعتماد مهمة الاستلام وتحديث الشحنات.' : 'تم إرسال المهمة للمراجعة.') };
    }
    case 'batch/assign': {
      const batch = state.deliveryBatches.find((item) => item.id === command.batchId);
      if (!batch) return { state, result: result(false, 'مجموعة التوزيع غير موجودة.') };
      const assignment = reduceDeliveryCommand(state, { type: 'shipment/assignDriver', shipmentIds: batch.shipmentIds, driverId: command.driverId, actor });
      const driver = assignment.state.drivers.find((item) => item.id === command.driverId);
      state = { ...assignment.state, deliveryBatches: assignment.state.deliveryBatches.map((item) => item.id === batch.id ? { ...item, driverId: driver?.id, driverName: driver?.name, status: 'assigned' } : item), shipments: assignment.state.shipments.map((shipment) => batch.shipmentIds.includes(shipment.id) ? { ...shipment, deliveryBatchId: batch.id } : shipment) };
      return { state, result: assignment.result };
    }
    case 'driverUpdate/approve':
    case 'driverUpdate/reject': {
      const update = state.driverUpdates.find((item) => item.id === command.updateId);
      if (!update) return { state, result: result(false, 'تحديث المندوب غير موجود.') };
      const approved = command.type === 'driverUpdate/approve';
      state = { ...state, driverUpdates: state.driverUpdates.map((item) => item.id === update.id ? { ...item, status: approved ? 'approvedForMerchant' : 'rejectedForReview' } : item) };
      const shipment = state.shipments.find((item) => item.id === update.shipmentId);
      if (approved && shipment) {
        if (update.reportedStatus === 'partiallyDelivered') {
          state = buildPartialDeliveryProjection(state, update, shipment, actor);
        } else {
          const mapping: Partial<Record<DriverShipmentUpdate['reportedStatus'], ShipmentStatus>> = { delivered: 'delivered', failed: 'failedToDeliver', returned: 'returned', postponed: 'postponed', inTransit: 'inTransit' };
          const next = mapping[update.reportedStatus];
          if (next && canTransition(shipment.status, next)) {
            const transitioned = reduceDeliveryCommand(state, { type: 'shipment/transition', shipmentIds: [shipment.id], nextStatus: next, reason: update.note ?? 'اعتماد تحديث المندوب', actor });
            state = transitioned.state;
            if (update.evidenceReference && next === 'delivered') {
              state = updateShipment(state, shipment.id, (item) => ({
                ...item,
                deliveryProof: { type: 'photo', reference: update.evidenceReference!, recipientName: update.recipientName ?? item.customerName, capturedAt: update.location?.capturedAt ?? update.createdAt, location: update.location, reviewStatus: update.requiresManualReview ? 'needsReview' : 'accepted', reviewNote: update.reviewReason },
                merchantVisibleStatus: 'تم تسليم الشحنة واعتماد الإثبات من شركة الشحن',
              }));
            }
          } else state = updateShipment(state, shipment.id, (item) => ({ ...item, taskStatus: 'none', lastUpdatedAt: nowIso() }));
        }
      }
      state = refreshDerivedPeople(audit(state, command, 'driverUpdate', update.id, approved ? 'اعتماد تحديث المندوب وإصدار الحالة الرسمية' : 'رفض تحديث المندوب للمراجعة الداخلية'));
      return { state, result: result(true, approved ? 'تم اعتماد تحديث المندوب وإصدار الحالة الرسمية للتاجر.' : 'تم رفض التحديث وإبقاؤه داخل مراجعة الشركة.') };
    }
    case 'return/receiveAtHub': {
      const returnCase = state.returnCases.find((item) => item.id === command.returnCaseId);
      if (!returnCase || returnCase.status !== 'returningToHub') return { state, result: result(false, 'المرتجع غير قابل لتأكيد الوصول للمخزن.') };
      state = updateReturnCase(state, returnCase.id, (item) => ({ ...item, status: 'receivedAtHub', receivedAtHubAt: nowIso(), updatedAt: nowIso() }));
      state = audit(state, command, 'returnCase', returnCase.id, 'استلام المرتجع في الشركة وفحصه');
      return { state, result: result(true, 'تم استلام المرتجع في الشركة وأصبح جاهزًا للإسناد.') };
    }
    case 'return/assignDriver': {
      const returnCase = state.returnCases.find((item) => item.id === command.returnCaseId);
      const driver = state.drivers.find((item) => item.id === command.driverId && item.status === 'active');
      if (!returnCase || !['receivedAtHub', 'awaitingMerchantAssignment'].includes(returnCase.status)) return { state, result: result(false, 'المرتجع غير جاهز للإسناد.') };
      if (!driver) return { state, result: result(false, 'المندوب غير موجود أو غير فعال.') };
      state = updateReturnCase(state, returnCase.id, (item) => ({ ...item, status: 'assignedToDriver', assignedDriverId: driver.id, assignedDriverName: driver.name, assignedAt: nowIso(), updatedAt: nowIso() }));
      state = audit(state, command, 'returnCase', returnCase.id, `إسناد المرتجع إلى ${driver.name}`);
      return { state, result: result(true, 'تم إسناد مهمة إعادة المرتجع للتاجر.') };
    }
    case 'return/markOutForMerchant': {
      const returnCase = state.returnCases.find((item) => item.id === command.returnCaseId);
      if (!returnCase || returnCase.status !== 'assignedToDriver') return { state, result: result(false, 'يجب إسناد المرتجع لمندوب أولًا.') };
      state = updateReturnCase(state, returnCase.id, (item) => ({ ...item, status: 'outForMerchantReturn', updatedAt: nowIso() }));
      state = audit(state, command, 'returnCase', returnCase.id, 'خرج المرتجع من الشركة إلى التاجر');
      return { state, result: result(true, 'تم تسجيل خروج المرتجع إلى التاجر.') };
    }
    case 'return/confirmMerchantReceipt': {
      const returnCase = state.returnCases.find((item) => item.id === command.returnCaseId);
      if (!returnCase || returnCase.status !== 'outForMerchantReturn') return { state, result: result(false, 'المرتجع ليس في مرحلة التسليم للتاجر.') };
      state = updateReturnCase(state, returnCase.id, (item) => ({ ...item, status: 'returnedToMerchant', completedAt: nowIso(), proofReference: command.proofReference, updatedAt: nowIso() }));
      state = updateShipment(state, returnCase.shipmentId, (item) => ({ ...item, taskStatus: 'none', merchantVisibleStatus: 'تم تسليم المرتجع إلى التاجر', lastUpdatedAt: nowIso(), events: [...(item.events ?? []), shipmentEvent(item.id, 'note', 'إغلاق دورة المرتجع', 'أكدت الشركة تسليم المرتجع للتاجر.', actor)] }));
      state = audit(state, command, 'returnCase', returnCase.id, 'تأكيد استلام التاجر للمرتجع');
      return { state, result: result(true, 'تم تأكيد استلام التاجر وإغلاق دورة المرتجع.') };
    }
    case 'barcode/create': {
      state = audit({ ...state, barcodeBatches: [command.batch, ...state.barcodeBatches] }, command, 'barcodeBatch', command.batch.id, 'إنشاء دفعة باركود');
      return { state, result: result(true, 'تم إنشاء دفعة الاستلام.', undefined, command.batch.id) };
    }
    case 'barcode/scan': {
      const batch = state.barcodeBatches.find((item) => item.id === command.batchId);
      if (!batch || batch.status === 'closed') return { state, result: result(false, 'دفعة الباركود غير متاحة.') };
      const isDuplicate = batch.scannedShipmentIds.includes(command.shipmentId);
      const isExpected = batch.expectedShipmentIds.includes(command.shipmentId);
      state = { ...state, barcodeBatches: state.barcodeBatches.map((item) => item.id !== batch.id ? item : isDuplicate ? { ...item, duplicateScans: [...item.duplicateScans, command.shipmentId] } : isExpected ? { ...item, scannedShipmentIds: [...item.scannedShipmentIds, command.shipmentId] } : { ...item, unexpectedShipmentIds: [...item.unexpectedShipmentIds, command.shipmentId] }) };
      return { state, result: result(!isDuplicate && isExpected, isDuplicate ? 'تم اكتشاف مسح مكرر.' : isExpected ? 'تم تسجيل الشحنة.' : 'الشحنة غير متوقعة في هذه الدفعة.') };
    }
    case 'barcode/undo': {
      const batch = state.barcodeBatches.find((item) => item.id === command.batchId);
      if (!batch || !batch.scannedShipmentIds.length) return { state, result: result(false, 'لا يوجد مسح يمكن التراجع عنه.') };
      state = { ...state, barcodeBatches: state.barcodeBatches.map((item) => item.id === batch.id ? { ...item, scannedShipmentIds: item.scannedShipmentIds.slice(0, -1) } : item) };
      return { state, result: result(true, 'تم التراجع عن آخر مسح.') };
    }
    case 'barcode/close': {
      const batch = state.barcodeBatches.find((item) => item.id === command.batchId);
      if (!batch) return { state, result: result(false, 'الدفعة غير موجودة.') };
      const missing = batch.expectedShipmentIds.filter((shipmentId) => !batch.scannedShipmentIds.includes(shipmentId));
      if (missing.length) return { state, result: result(false, `لا يمكن الإغلاق؛ توجد ${missing.length} شحنة ناقصة.`, missing.map((entityId) => ({ entityId, message: 'لم يتم مسحها.' }))) };
      state = { ...state, barcodeBatches: state.barcodeBatches.map((item) => item.id === batch.id ? { ...item, status: 'closed', closedAt: nowIso() } : item), shipments: state.shipments.map((shipment) => batch.scannedShipmentIds.includes(shipment.id) && canTransition(shipment.status, 'receivedAtOffice') ? { ...shipment, status: 'receivedAtOffice', taskStatus: 'needsDriverAssignment', statusChangedAt: nowIso(), lastUpdatedAt: nowIso(), pickupTaskId: batch.pickupTaskId, events: [...(shipment.events ?? []), shipmentEvent(shipment.id, 'barcodeReceived', 'تم الاستلام بالباركود', `دفعة ${batch.id}`, actor, shipment.status, 'receivedAtOffice')] } : shipment) };
      state = refreshDerivedPeople(audit(state, command, 'barcodeBatch', batch.id, `إغلاق دفعة تضم ${batch.scannedShipmentIds.length} شحنة`));
      return { state, result: result(true, 'تم إغلاق الدفعة وتحديث حالات الشحنات.') };
    }
    case 'exception/resolve': {
      const shipment = state.shipments.find((item) => item.id === command.shipmentId);
      if (!shipment) return { state, result: result(false, 'الشحنة غير موجودة.') };
      if (shipment.taskStatus === 'needsDriverAssignment' && command.driverId) {
        return reduceDeliveryCommand(state, { type: 'shipment/assignDriver', shipmentIds: [shipment.id], driverId: command.driverId, actor });
      }
      state = updateShipment(state, shipment.id, (item) => ({ ...item, taskStatus: 'none', exceptionReason: undefined, lastUpdatedAt: nowIso(), events: [...(item.events ?? []), shipmentEvent(item.id, 'note', 'إغلاق استثناء', command.resolution, actor)] }));
      state = audit(state, command, 'shipment', shipment.id, command.resolution);
      return { state, result: result(true, 'تم إغلاق الاستثناء وتسجيل سبب الحل.') };
    }
    case 'driver/upsert': {
      const exists = state.drivers.some((item) => item.id === command.driver.id);
      const driver: Driver = { ...command.driver, shipmentsCount: exists ? command.driver.shipmentsCount : 0, activeLoad: exists ? command.driver.activeLoad : 0 };
      state = refreshDerivedPeople(audit({ ...state, drivers: exists ? state.drivers.map((item) => item.id === driver.id ? driver : item) : [driver, ...state.drivers] }, command, 'driver', driver.id, exists ? 'تعديل مندوب' : 'إضافة مندوب'));
      return { state, result: result(true, exists ? 'تم تحديث بيانات المندوب.' : 'تم إضافة المندوب.') };
    }
    case 'driver/archive': {
      const driver = state.drivers.find((item) => item.id === command.driverId);
      if (!driver) return { state, result: result(false, 'المندوب غير موجود.') };
      const hasActive = state.shipments.some((shipment) => shipment.driverId === command.driverId && !['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status));
      if (hasActive || driver.pendingCash > 0) return { state, result: result(false, 'لا يمكن أرشفة مندوب لديه مهام نشطة أو عهدة COD. أوقف الإسناد وسوِّ العهدة أولًا.') };
      const archived = { ...driver, status: 'off' as const, availability: 'offline' as const, accountStatus: 'archived' as const, operationalStatus: 'offline' as const, onShift: false, archivedAt: nowIso() };
      state = audit({ ...state, drivers: state.drivers.map((item) => item.id === command.driverId ? archived : item) }, command, 'driver', command.driverId, `أرشفة مندوب: ${command.reason}`);
      return { state, result: result(true, 'تمت أرشفة المندوب مع الاحتفاظ بكل السجل.') };
    }
    case 'driver/resetAccess': {
      const driver = state.drivers.find((item) => item.id === command.driverId);
      if (!driver) return { state, result: result(false, 'المندوب غير موجود.') };
      state = audit(state, command, 'driver', command.driverId, `طلب إعادة تعيين الدخول${command.invalidateSessions ? ' مع إنهاء الجلسات' : ''}${command.forcePasswordChange ? ' وإلزام تغيير كلمة السر' : ''}`);
      return { state, result: result(true, 'تم تسجيل طلب إعادة تعيين الدخول. في الإنتاج سترسل خدمة الهوية OTP/رابط تفعيل دون كشف كلمة المرور للإدارة.') };
    }
    case 'merchant/upsert': {
      const exists = state.merchants.some((item) => item.id === command.merchant.id);
      state = refreshDerivedPeople(audit({ ...state, merchants: exists ? state.merchants.map((item) => item.id === command.merchant.id ? command.merchant : item) : [command.merchant, ...state.merchants] }, command, 'merchant', command.merchant.id, exists ? 'تعديل تاجر' : 'إضافة تاجر'));
      return { state, result: result(true, exists ? 'تم تحديث بيانات التاجر.' : 'تم إضافة التاجر.') };
    }
    case 'merchant/archive': {
      const merchant = state.merchants.find((item) => item.id === command.merchantId);
      if (!merchant) return { state, result: result(false, 'التاجر غير موجود.') };
      const hasActive = state.shipments.some((shipment) => shipment.merchantId === command.merchantId && !['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status));
      if (hasActive) return { state, result: result(false, 'لا يمكن أرشفة تاجر لديه شحنات تشغيلية مفتوحة.') };
      state = audit({ ...state, merchants: state.merchants.map((item) => item.id === command.merchantId ? { ...item, status: 'archived' as const } : item) }, command, 'merchant', command.merchantId, `أرشفة تاجر: ${command.reason}`);
      return { state, result: result(true, 'تمت أرشفة التاجر مع الاحتفاظ بالسجل المالي والتشغيلي.') };
    }
    case 'settlement/approve': {
      const settlement = state.settlements.find((item) => item.id === command.settlementId);
      if (!settlement || !['draft', 'underReview'].includes(settlement.status)) return { state, result: result(false, 'التسوية غير قابلة للاعتماد.') };
      state = audit({ ...state, settlements: state.settlements.map((item) => item.id === settlement.id ? { ...item, status: 'approved', approvedAt: nowIso() } : item) }, command, 'settlement', settlement.id, 'اعتماد تسوية');
      return { state, result: result(true, 'تم اعتماد التسوية.') };
    }
    case 'settlement/pay': {
      const settlement = state.settlements.find((item) => item.id === command.settlementId);
      if (!settlement || settlement.status !== 'approved') return { state, result: result(false, 'يجب اعتماد التسوية قبل الدفع.') };
      const ledger: FinancialLedgerEntry[] = [
        { id: id('LED'), date: nowIso(), account: 'مستحقات التجار', description: `دفع تسوية ${settlement.id}`, debit: settlement.netPayable, credit: 0, status: 'posted', sourceType: 'settlement', sourceId: settlement.id },
        { id: id('LED'), date: nowIso(), account: 'البنك / الخزينة', description: `تحويل ${command.paymentReference}`, debit: 0, credit: settlement.netPayable, status: 'posted', sourceType: 'settlement', sourceId: settlement.id },
      ];
      state = { ...state, settlements: state.settlements.map((item) => item.id === settlement.id ? { ...item, status: 'paid', paidAt: nowIso(), paymentReference: command.paymentReference } : item), shipments: state.shipments.map((shipment) => settlement.shipmentIds.includes(shipment.id) ? { ...shipment, financialStatus: 'settled', settlementStatus: 'settled', settlementId: settlement.id, lastUpdatedAt: nowIso() } : shipment), ledgerEntries: [...ledger, ...state.ledgerEntries] };
      state = refreshDerivedPeople(audit(state, command, 'settlement', settlement.id, `دفع التسوية بالمرجع ${command.paymentReference}`));
      return { state, result: result(true, 'تم تسجيل دفع التسوية وتحديث الشحنات والقيود.') };
    }
    case 'finance/reconcileShipment': {
      const shipment = state.shipments.find((item) => item.id === command.shipmentId);
      if (!shipment) return { state, result: result(false, 'الشحنة غير موجودة.') };
      const remittedCash = Math.max(0, Math.min(command.remittedCash, shipment.collectedCash));
      const financialStatus = remittedCash === shipment.collectedCash ? 'remitted' : remittedCash > 0 ? 'partiallyCollected' : shipment.financialStatus;
      const variance = shipment.collectedCash - shipment.expectedCollection;
      state = updateShipment(state, shipment.id, (item) => ({ ...item, remittedCash, financialStatus: variance !== 0 ? 'discrepancy' : financialStatus, taskStatus: variance !== 0 ? 'needsFinancialReview' : 'none', exceptionReason: variance !== 0 ? `فرق تحصيل ${variance}` : undefined, lastUpdatedAt: nowIso(), events: [...(item.events ?? []), shipmentEvent(item.id, 'financial', 'مطابقة مالية', command.note, actor)] }));
      const entry: FinancialLedgerEntry = { id: id('LED'), date: nowIso(), account: 'عهد المناديب', description: command.note, debit: 0, credit: remittedCash, status: 'posted', sourceType: 'driverRemittance', sourceId: shipment.id };
      state = refreshDerivedPeople(audit({ ...state, ledgerEntries: [entry, ...state.ledgerEntries] }, command, 'shipment', shipment.id, command.note));
      return { state, result: result(true, 'تمت مطابقة الشحنة وتحديث العهدة والقيود.') };
    }
    case 'finance/addOperationalExpense': {
      const expense = { ...command.expense, id: command.expense.id || id('EXP'), createdBy: command.expense.createdBy || actor };
      const entry: FinancialLedgerEntry = {
        id: id('LED'),
        date: expense.date,
        account: 'مصاريف تشغيلية',
        description: expense.description,
        debit: expense.amount,
        credit: 0,
        status: expense.status === 'approved' ? 'posted' : 'pending',
        sourceType: 'operationalExpense',
        sourceId: expense.id,
      };
      state = audit({ ...state, operationalExpenses: [expense, ...(state.operationalExpenses ?? [])], ledgerEntries: [entry, ...state.ledgerEntries] }, command, 'operationalExpense', expense.id, expense.description);
      return { state, result: result(true, 'تم تسجيل المصروف التشغيلي وظهوره في المحاسبة.') };
    }
    case 'finance/addDriverAdjustment': {
      const adjustment = { ...command.adjustment, id: command.adjustment.id || id('DADJ'), createdBy: command.adjustment.createdBy || actor };
      const isCompanyCost = ['bonus', 'reimbursement', 'advance'].includes(adjustment.type);
      const entry: FinancialLedgerEntry = {
        id: id('LED'),
        date: adjustment.date,
        account: `تسويات المناديب - ${adjustment.driverName}`,
        description: adjustment.description,
        debit: isCompanyCost ? adjustment.amount : 0,
        credit: isCompanyCost ? 0 : adjustment.amount,
        status: adjustment.status === 'approved' ? 'posted' : 'pending',
        sourceType: 'driverAdjustment',
        sourceId: adjustment.id,
      };
      state = audit({ ...state, driverAdjustments: [adjustment, ...(state.driverAdjustments ?? [])], ledgerEntries: [entry, ...state.ledgerEntries] }, command, 'driverAdjustment', adjustment.id, adjustment.description);
      return { state, result: result(true, 'تم تسجيل حركة المندوب وظهورها في المحاسبة.') };
    }
    case 'ledger/postAll': {
      const count = state.ledgerEntries.filter((entry) => entry.status === 'pending').length;
      state = audit({ ...state, ledgerEntries: state.ledgerEntries.map((entry) => entry.status === 'pending' ? { ...entry, status: 'posted' } : entry) }, command, 'ledger', 'all', `ترحيل ${count} قيد`);
      return { state, result: result(true, `تم ترحيل ${count} قيد.`) };
    }
    case 'period/close': {
      if (state.closedPeriods.includes(command.period)) return { state, result: result(false, 'الفترة مغلقة بالفعل.') };
      const blockers = state.ledgerEntries.some((entry) => entry.status === 'pending') || state.shipments.some((shipment) => shipment.financialStatus === 'discrepancy') || state.driverUpdates.some((update) => update.status === 'pendingAdminApproval');
      if (blockers) return { state, result: result(false, 'لا يمكن إغلاق الفترة قبل إنهاء القيود والفروقات والاعتمادات المعلقة.') };
      state = audit({ ...state, closedPeriods: [...state.closedPeriods, command.period] }, command, 'period', command.period, 'إغلاق فترة مالية');
      return { state, result: result(true, 'تم إغلاق الفترة المالية.') };
    }
    case 'settings/updateDelivery': {
      if (command.policy.freeAttempts < 0 || command.policy.maxAttempts < command.policy.freeAttempts) return { state, result: result(false, 'تحقق من عدد المحاولات المجانية والحد الأقصى.') };
      state = audit({ ...state, settings: { ...state.settings, delivery: command.policy, updatedAt: nowIso(), updatedBy: actor } }, command, 'settings', 'delivery', 'تحديث سياسة التوصيل والمحاولات');
      return { state, result: result(true, 'تم حفظ سياسة التوصيل والمحاولات.') };
    }
    case 'settings/updatePricing': {
      if (command.policy.vatRate < 0 || command.policy.vatRate > 100) return { state, result: result(false, 'نسبة الضريبة يجب أن تكون بين 0 و100.') };
      state = audit({ ...state, settings: { ...state.settings, pricing: command.policy, updatedAt: nowIso(), updatedBy: actor } }, command, 'settings', 'pricing', 'تحديث سياسة الرسوم والضرائب');
      return { state, result: result(true, 'تم حفظ سياسة الرسوم والضرائب.') };
    }
    case 'settings/updateProof': {
      if (command.policy.preferredAccuracyMeters > command.policy.maximumAccuracyMeters) return { state, result: result(false, 'الدقة المفضلة يجب ألا تتجاوز الحد الأقصى المقبول.') };
      state = audit({ ...state, settings: { ...state.settings, proof: command.policy, updatedAt: nowIso(), updatedBy: actor } }, command, 'settings', 'proof', 'تحديث سياسة إثبات التسليم');
      return { state, result: result(true, 'تم حفظ سياسة إثبات التسليم.') };
    }
    case 'settings/updateLocation': {
      if (command.policy.activeTaskIntervalSeconds < 15 || command.policy.idleIntervalSeconds < command.policy.activeTaskIntervalSeconds) return { state, result: result(false, 'تحقق من فترات إرسال الموقع؛ أثناء المهمة يجب أن يكون أسرع من وقت الخمول.') };
      state = audit({ ...state, settings: { ...state.settings, location: command.policy, updatedAt: nowIso(), updatedBy: actor } }, command, 'settings', 'location', 'تحديث سياسة تتبع موقع المندوب');
      return { state, result: result(true, 'تم حفظ سياسة تتبع الموقع.') };
    }
    case 'settings/updatePrinting': {
      if (command.policy.defaultCopies < 1 || command.policy.defaultCopies > 5) return { state, result: result(false, 'عدد نسخ الطباعة الافتراضي يجب أن يكون بين 1 و5.') };
      state = audit({ ...state, settings: { ...state.settings, printing: command.policy, updatedAt: nowIso(), updatedBy: actor } }, command, 'settings', 'printing', 'تحديث إعدادات طباعة البوالص');
      return { state, result: result(true, 'تم حفظ إعدادات الطباعة.') };
    }
    case 'settings/updateNotifications': {
      state = audit({ ...state, settings: { ...state.settings, notifications: command.policy, updatedAt: nowIso(), updatedBy: actor } }, command, 'settings', 'notifications', 'تحديث سياسة الإشعارات');
      return { state, result: result(true, 'تم حفظ إعدادات الإشعارات.') };
    }
    case 'chat/send': {
      const room = state.chatRooms.find((item) => item.id === command.roomId);
      if (!room) return { state, result: result(false, 'المحادثة غير موجودة.') };
      const message = { id: id('MSG'), text: command.text, type: command.note ? 'note' as const : 'outgoing' as const, time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }), createdAt: nowIso(), attachments: command.attachments ?? [] };
      state = { ...state, chatRooms: state.chatRooms.map((item) => item.id === room.id ? { ...item, lastMessage: command.note ? `ملاحظة داخلية: ${command.text || 'مرفق'}` : (command.text || `${command.attachments?.length ?? 0} مرفق`), messages: [...item.messages, message] } : item) };
      return { state, result: result(true, 'تم إرسال الرسالة.') };
    }
    case 'chat/toggle':
    case 'chat/transfer':
    case 'chat/read': {
      const room = state.chatRooms.find((item) => item.id === command.roomId);
      if (!room) return { state, result: result(false, 'المحادثة غير موجودة.') };
      state = { ...state, chatRooms: state.chatRooms.map((item) => item.id !== room.id ? item : command.type === 'chat/toggle' ? { ...item, status: item.status === 'open' ? 'closed' : 'open' } : command.type === 'chat/transfer' ? { ...item, assignedTo: command.assignedTo } : { ...item, unread: 0 }) };
      return { state, result: result(true, command.type === 'chat/transfer' ? 'تم تحويل المحادثة.' : command.type === 'chat/toggle' ? 'تم تحديث حالة المحادثة.' : 'تم تعليم المحادثة كمقروءة.') };
    }
    case 'settings/updateLocation': {
      return { state, result: result(true, 'تم حفظ سياسة الموقع.') };
    }
    default: {
      return { state, result: result(true, 'تم تنفيذ العملية.') };
    }
  }
}
