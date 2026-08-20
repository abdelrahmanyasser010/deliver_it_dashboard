import type { DeliveryGateway, GatewayCommandResponse } from '../../application/delivery/contracts';
import type { DeliveryCommand, DeliveryState } from '../../application/delivery/types';
import type { Merchant } from '../../domain/logistics/entities';
import type { DeliveryBatch, DriverShipmentUpdate, PickupTask, ReturnCase } from '../../domain/operations/entities';
import type { FinancialLedgerEntry, MerchantSettlement } from '../../domain/finance/entities';
import { defaultTenantOperationalSettings } from '../../domain/settings/entities';
import { logisticsMockRepository } from '../mock/logisticsMockRepository';

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const now = () => new Date();
const iso = (offsetHours = 0) => new Date(now().getTime() + offsetHours * 3600000).toISOString();

function enrichMerchant(merchant: Merchant, index: number): Merchant {
  const fallbackBranch = merchant.branchName || 'الفرع الرئيسي';
  return {
    ...merchant,
    branches: merchant.branches ?? [
      { id: `${merchant.id}-BR-1`, name: fallbackBranch, address: index % 2 === 0 ? 'مدينة نصر، القاهرة' : 'الدقي، الجيزة', contactName: 'مسؤول المخزن', contactPhone: merchant.phone, pickupWindow: '10:00 ص — 4:00 م', active: true },
      { id: `${merchant.id}-BR-2`, name: 'مخزن احتياطي', address: index % 2 === 0 ? 'القاهرة الجديدة' : 'الهرم، الجيزة', contactName: 'مساعد المخزن', contactPhone: merchant.phone, pickupWindow: '12:00 م — 6:00 م', active: index < 3 },
    ],
    pricingRules: merchant.pricingRules ?? [
      { id: `${merchant.id}-PR-1`, scope: 'القاهرة والجيزة', deliveryFee: 55 + index * 2, returnFee: 30, collectionFee: 0, estimatedDays: 1 },
      { id: `${merchant.id}-PR-2`, scope: 'الدلتا والإسكندرية', deliveryFee: 75 + index * 2, returnFee: 40, collectionFee: 5, estimatedDays: 2 },
      { id: `${merchant.id}-PR-3`, scope: 'الصعيد', deliveryFee: 95 + index * 3, returnFee: 50, collectionFee: 8, estimatedDays: 3 },
    ],
    bankAccountReference: merchant.bankAccountReference ?? `BANK-${merchant.id}`,
    code: merchant.code ?? merchant.id.replace(/^BRN-/, 'MRC-'),
    legalName: merchant.legalName ?? `${merchant.name} للتجارة`,
    email: merchant.email ?? `merchant${index + 1}@example.com`,
    status: merchant.status ?? 'active',
    accountManagerName: merchant.accountManagerName ?? (index % 2 === 0 ? 'نور حسن' : 'سارة محمد'),
    settlementMethod: merchant.settlementMethod ?? (index % 2 === 0 ? 'bank' : 'instapay'),
    taxId: merchant.taxId ?? `TAX-${10000 + index}`,
    registrationNumber: merchant.registrationNumber ?? `CR-${20000 + index}`,
    usersCount: merchant.usersCount ?? 2,
    documentsCount: merchant.documentsCount ?? 3,
  };
}

function createPickupTasks(state: Pick<DeliveryState, 'shipments' | 'merchants' | 'drivers'>): PickupTask[] {
  const candidates = state.shipments.filter((shipment) => shipment.status === 'readyToShip').slice(0, 10);
  const byMerchant = new Map<string, typeof candidates>();
  candidates.forEach((shipment) => byMerchant.set(shipment.merchantId, [...(byMerchant.get(shipment.merchantId) ?? []), shipment]));
  return [...byMerchant.entries()].map(([merchantId, shipments], index) => {
    const merchant = state.merchants.find((item) => item.id === merchantId)!;
    const driver = state.drivers[index % state.drivers.length];
    return {
      id: `PCK-${2101 + index}`, merchantId, merchantName: merchant.name,
      merchantAddress: merchant.branches?.[0]?.address ?? merchant.branchName,
      driverId: driver.id, driverName: driver.name, status: index === 0 ? 'driverSubmitted' : 'assigned',
      assignedAt: iso(-3 - index), submittedAt: index === 0 ? iso(-1) : undefined,
      items: shipments.map((shipment, itemIndex) => ({ shipmentId: shipment.id, expected: true, driverConfirmed: index === 0 ? itemIndex !== shipments.length - 1 : false, codAmount: shipment.expectedCollection })),
    };
  });
}

function createDeliveryBatches(state: Pick<DeliveryState, 'shipments'>): DeliveryBatch[] {
  const ready = state.shipments.filter((shipment) => shipment.status === 'receivedAtOffice' && !shipment.driverId);
  const assigned = state.shipments.filter((shipment) => ['deliveredToDriver', 'inTransit'].includes(shipment.status) && shipment.driverId);
  const batches: DeliveryBatch[] = [];
  if (ready.length) batches.push({ id: 'DLV-B-3302', zone: ready[0].governorate, status: 'draft', shipmentIds: ready.slice(0, 6).map((item) => item.id), createdAt: iso(-1) });
  if (assigned.length) batches.push({ id: 'DLV-B-3301', driverId: assigned[0].driverId, driverName: assigned[0].driverName, zone: assigned[0].governorate, status: 'inProgress', shipmentIds: assigned.slice(0, 6).map((item) => item.id), createdAt: iso(-5) });
  return batches;
}

function createDriverUpdates(state: Pick<DeliveryState, 'shipments'>): DriverShipmentUpdate[] {
  const pending = state.shipments.filter((shipment) => shipment.taskStatus === 'needsStatusApproval' && shipment.driverId);
  return pending.map((shipment, index) => {
    const isPartial = index === 0 && shipment.items.length >= 2;
    return {
      id: `UPD-${7001 + index}`, shipmentId: shipment.id, driverId: shipment.driverId!, driverName: shipment.driverName ?? 'مندوب', merchantName: shipment.merchantName,
      reportedStatus: isPartial ? 'partiallyDelivered' : index % 2 === 0 ? 'delivered' : 'failed', previousStatus: shipment.status, customerName: shipment.customerName,
      evidence: isPartial ? 'صورة التسليم الجزئي مرفقة' : index % 2 === 0 ? 'صورة إثبات التسليم مرفقة' : 'سجل محاولة اتصال',
      evidenceReference: isPartial ? '/demo/proofs/partial-delivery.jpg' : '/demo/proofs/delivery.jpg',
      recipientName: isPartial ? 'أحمد محمود' : shipment.customerName,
      location: { latitude: 30.0444, longitude: 31.2357, accuracyMeters: isPartial ? 32 : 47, capturedAt: iso(-0.55 - index), distanceFromDestinationMeters: isPartial ? 41 : 73 },
      partialDeliveryLines: isPartial ? shipment.items.map((item, itemIndex) => ({
        itemIndex, itemName: item.name, orderedQuantity: item.quantity,
        deliveredQuantity: itemIndex === 0 ? item.quantity : 0,
        undeliveredAction: itemIndex === 0 ? undefined : itemIndex % 2 === 0 ? 'retry' : 'return',
        reason: itemIndex === 0 ? undefined : itemIndex % 2 === 0 ? 'العميل طلب المحاولة غدًا' : 'العميل رفض المقاس',
      })) : undefined,
      reportedCollectedCash: isPartial ? shipment.items[0].quantity * shipment.items[0].price + shipment.deliveryFee - shipment.discount : shipment.expectedCollection,
      requiresManualReview: isPartial,
      reviewReason: isPartial ? 'تسليم جزئي يتطلب تقسيم البوليصة واعتماد الشركة.' : undefined,
      note: isPartial ? 'العميل استلم عنصرًا ورفض عنصرًا؛ رسوم الشحن الأساسية كاملة.' : index % 2 === 0 ? 'تم التحصيل بالكامل' : 'العميل لا يرد',
      createdAt: iso(-0.5 - index), status: 'pendingAdminApproval' as const,
    };
  });
}

function createReturnCases(state: Pick<DeliveryState, 'shipments'>): ReturnCase[] {
  return state.shipments.filter((shipment) => shipment.taskStatus === 'needsReturnProcessing').slice(0, 4).map((shipment, index) => ({
    id: `RET-${4101 + index}`,
    shipmentId: shipment.id,
    rootShipmentId: shipment.rootShipmentId ?? shipment.id,
    merchantId: shipment.merchantId,
    merchantName: shipment.merchantName,
    sourceDriverId: shipment.driverId,
    sourceDriverName: shipment.driverName,
    status: index === 0 ? 'receivedAtHub' : 'returningToHub',
    reason: shipment.exceptionReason ?? 'رفض المستلم استلام المنتجات',
    itemSummary: shipment.items.map((item) => `${item.name} × ${item.quantity}`).join('، '),
    quantity: shipment.items.reduce((sum, item) => sum + item.quantity, 0),
    returnFee: 0,
    receivedAtHubAt: index === 0 ? iso(-3) : undefined,
    createdAt: shipment.statusChangedAt,
    updatedAt: shipment.lastUpdatedAt,
  }));
}

function createSettlements(state: Pick<DeliveryState, 'shipments'>): MerchantSettlement[] {
  const eligible = state.shipments.filter((shipment) => shipment.financialStatus === 'inSettlement' && shipment.settlementStatus === 'unsettled');
  const byMerchant = new Map<string, typeof eligible>();
  eligible.forEach((shipment) => byMerchant.set(shipment.merchantId, [...(byMerchant.get(shipment.merchantId) ?? []), shipment]));
  return [...byMerchant.values()].map((shipments, index) => {
    const lines = shipments.map((shipment) => ({ shipmentId: shipment.id, merchantId: shipment.merchantId, grossCollection: shipment.collectedCash, shippingFee: shipment.deliveryFee, returnFee: shipment.status === 'returned' ? Math.round(shipment.deliveryFee * .6) : 0, discount: shipment.discount, adjustment: 0, netPayable: Math.max(0, shipment.collectedCash - shipment.deliveryFee - shipment.discount) }));
    return {
      id: `SET-${5001 + index}`, merchantId: shipments[0].merchantId, merchantName: shipments[0].merchantName,
      periodStart: shipments.reduce((min, item) => item.statusChangedAt < min ? item.statusChangedAt : min, shipments[0].statusChangedAt),
      periodEnd: shipments.reduce((max, item) => item.statusChangedAt > max ? item.statusChangedAt : max, shipments[0].statusChangedAt),
      status: 'underReview', shipmentIds: shipments.map((item) => item.id), lines,
      grossCollection: lines.reduce((sum, line) => sum + line.grossCollection, 0), shippingFees: lines.reduce((sum, line) => sum + line.shippingFee, 0), returnFees: lines.reduce((sum, line) => sum + line.returnFee, 0), discounts: lines.reduce((sum, line) => sum + line.discount, 0), adjustments: 0, netPayable: lines.reduce((sum, line) => sum + line.netPayable, 0), createdAt: iso(-24),
    };
  });
}

function createLedger(state: Pick<DeliveryState, 'shipments'>): FinancialLedgerEntry[] {
  return state.shipments.filter((shipment) => shipment.collectedCash > 0).slice(0, 20).flatMap((shipment, index) => {
    const entries: FinancialLedgerEntry[] = [{ id: `LED-${9000 + index * 2}`, date: shipment.statusChangedAt, account: 'خزينة التحصيل', description: `تحصيل الشحنة ${shipment.id}`, debit: shipment.collectedCash, credit: 0, status: shipment.financialStatus === 'discrepancy' ? 'pending' : 'posted', sourceType: 'shipment', sourceId: shipment.id }];
    if (shipment.remittedCash > 0) entries.push({ id: `LED-${9001 + index * 2}`, date: shipment.lastUpdatedAt, account: 'عهد المناديب', description: `توريد الشحنة ${shipment.id}`, debit: 0, credit: shipment.remittedCash, status: 'posted', sourceType: 'driverRemittance', sourceId: shipment.id });
    return entries;
  });
}

function createChatRooms(state: Pick<DeliveryState, 'shipments'>): DeliveryState['chatRooms'] {
  const targets = state.shipments.filter((shipment) => ['needsCustomerService', 'needsFinancialReview', 'needsStatusApproval'].includes(shipment.taskStatus)).slice(0, 4);
  return targets.map((shipment, index) => ({
    id: `chat-${index + 1}`, name: index % 2 === 0 ? shipment.merchantName : shipment.driverName ?? shipment.merchantName,
    role: index % 2 === 0 ? 'تاجر' : 'مندوب', category: index % 2 === 0 ? 'merchant' : 'driver',
    lastMessage: shipment.exceptionReason ?? 'نحتاج متابعة حالة الشحنة', unread: index < 2 ? index + 1 : 0, linkedShipmentId: shipment.id,
    assignedTo: index % 2 === 0 ? 'سارة — خدمة العملاء' : 'نور — العمليات', status: 'open', pinned: index === 0,
    messages: [
      { id: `msg-${index}-1`, text: `نحتاج متابعة الشحنة ${shipment.id}`, type: 'incoming', time: '١٠:١٢ ص', createdAt: iso(-2 - index) },
      { id: `msg-${index}-2`, text: shipment.exceptionReason ?? 'سيتم التحقق من الحالة والرد.', type: 'outgoing', time: '١٠:١٥ ص', createdAt: iso(-1.8 - index) },
    ],
  }));
}

async function createBootstrap(): Promise<DeliveryState> {
  const snapshot = await logisticsMockRepository.getSnapshot();
  const merchants = snapshot.merchants.map(enrichMerchant);
  const base: DeliveryState = {
    shipments: snapshot.shipments.map((shipment) => ({ ...shipment, version: 1, pricingSnapshot: { shippingFee: shipment.deliveryFee, returnFeeMode: 'disabled', returnFeeValue: 0, freeAttempts: 3, extraAttemptFeeMode: 'disabled', extraAttemptFeeValue: 0, collectionFeeMode: 'disabled', collectionFeeValue: 0, vatEnabled: false, vatRate: 0 }, events: [{ id: `EVT-${shipment.id}-1`, shipmentId: shipment.id, type: 'created', title: 'تم إنشاء الشحنة', detail: `أنشأها ${shipment.merchantName}`, createdAt: shipment.createdAt, actor: shipment.merchantName }], attempts: [] })),
    drivers: snapshot.drivers.map((driver, index) => ({ ...driver, vehicleType: index % 3 === 0 ? 'van' : index % 2 === 0 ? 'car' : 'motorcycle', vehicleNumber: `د ل ف ${1000 + index}`, userCode: `driver${index + 1}`, accountStatus: driver.status === 'active' ? 'active' : 'suspended', operationalStatus: driver.status !== 'active' ? 'offline' : index % 3 === 0 ? 'delivery_task' : index % 2 === 0 ? 'busy' : 'available', branchId: index % 2 === 0 ? 'BR-Cairo' : 'BR-Giza', branchName: index % 2 === 0 ? 'فرع القاهرة' : 'فرع الجيزة', serviceAreas: [driver.zone], taskTypes: ['pickup','delivery','returns'], maxBatchShipments: driver.capacity, maxOpenTasks: Math.max(driver.capacity, 12), onShift: driver.status === 'active' && index !== 3, lastSeenAt: index === 3 ? iso(-5) : iso(-0.08 - index * 0.03) })),
    merchants,
    pickupTasks: [], deliveryBatches: [], driverUpdates: [], returnCases: [], settlements: [], ledgerEntries: [], barcodeBatches: [], chatRooms: [], auditEvents: [], closedPeriods: [], settings: structuredClone(defaultTenantOperationalSettings), lastSyncedAt: iso(),
  };
  base.pickupTasks = createPickupTasks(base);
  base.deliveryBatches = createDeliveryBatches(base);
  base.driverUpdates = createDriverUpdates(base);
  base.returnCases = createReturnCases(base);
  base.settlements = createSettlements(base);
  base.ledgerEntries = createLedger(base);
  base.chatRooms = createChatRooms(base);
  return base;
}

export const mockDeliveryGateway: DeliveryGateway = {
  async load() { await delay(180); return createBootstrap(); },
  async execute(command: DeliveryCommand): Promise<GatewayCommandResponse> { void command; await delay(80); return { result: { ok: true, message: 'تم قبول الأمر التجريبي.' }, applyLocally: true }; },
};
