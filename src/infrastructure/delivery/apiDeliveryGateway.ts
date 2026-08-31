import type { DeliveryGateway, GatewayCommandResponse } from '../../application/delivery/contracts';
import type { DeliveryCommand, DeliveryState } from '../../application/delivery/types';
import type { DriverFinancialAdjustment, OperationalExpense } from '../../domain/finance/entities';
import { api } from '../api/client';
import { ApiClientError, friendlyApiMessage } from '../api/errors';
import { asRecord, auditFromApi, conversationFromApi, dispatchFromApi, driverFromApi, driverUpdateFromApi, intakeFromApi, ledgerFromApi, merchantFromApi, messageFromApi, notificationToApi, pickupFromApi, pricingToApi, printingToApi, proofToApi, returnFromApi, settlementFromApi, settingsFromApi, shipmentFromApi, deliveryToApi } from '../api/mappers';

const PAGE_SIZE = 100;

function asRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  return [];
}

async function allPages(path: string, query: Record<string, string | number | boolean | null | undefined> = {}, optional = true): Promise<unknown[]> {
  const rows: unknown[] = [];
  let page = 1;
  for (;;) {
    try {
      const result = await api.get<unknown>(path, { query: { ...query, page, per_page: PAGE_SIZE }, retries: 1 });
      rows.push(...asRows(result.data));
      const lastPage = Number(result.meta?.last_page ?? result.meta?.page ?? page);
      if (!Number.isFinite(lastPage) || page >= lastPage) break;
      page += 1;
    } catch (error) {
      if (optional && error instanceof ApiClientError && error.status === 403) return [];
      throw error;
    }
  }
  return rows;
}

async function optionalObject(path: string): Promise<unknown | null> {
  try { return (await api.get<unknown>(path, { retries: 1 })).data; }
  catch (error) {
    if (error instanceof ApiClientError && error.status === 403) return null;
    throw error;
  }
}

async function loadMessages(conversationId: string): Promise<ReturnType<typeof messageFromApi>[]> {
  const rows = await allPages(`/api/v1/conversations/${conversationId}/messages`, { sort: 'created_at' });
  return rows.map(messageFromApi);
}

function moneyFromMinor(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount / 100 : 0;
}

function operationalExpenseFromApi(input: unknown): OperationalExpense {
  const row = asRecord(input);
  return {
    id: String(row.id ?? ''),
    date: String(row.expense_date ?? row.date ?? row.created_at ?? ''),
    category: String(row.category ?? 'other') as OperationalExpense['category'],
    description: String(row.description ?? ''),
    amount: moneyFromMinor(row.amount_minor),
    paymentMethod: String(row.payment_method ?? 'cash') as OperationalExpense['paymentMethod'],
    status: ['approved', 'rejected', 'cancelled'].includes(String(row.status)) ? String(row.status) as OperationalExpense['status'] : 'pending',
    createdBy: String(row.created_by ?? row.created_by_name ?? 'النظام'),
  };
}

function driverAdjustmentFromApi(input: unknown): DriverFinancialAdjustment {
  const row = asRecord(input);
  const driver = asRecord(row.driver);
  return {
    id: String(row.id ?? ''),
    driverId: String(row.driver_id ?? ''),
    driverName: String(row.driver_name ?? driver.name ?? row.driver_id ?? 'مندوب'),
    date: String(row.adjustment_date ?? row.date ?? row.created_at ?? ''),
    type: String(row.type ?? 'bonus') as DriverFinancialAdjustment['type'],
    amount: moneyFromMinor(row.amount_minor),
    description: String(row.description ?? ''),
    status: ['approved', 'rejected', 'cancelled'].includes(String(row.status)) ? String(row.status) as DriverFinancialAdjustment['status'] : 'pending',
    createdBy: String(row.created_by ?? row.created_by_name ?? 'النظام'),
  };
}

async function loadState(): Promise<DeliveryState> {
  const [
    shipmentRows, driverRows, merchantRows, pickupRows, dispatchRows, updateRows,
    returnRows, settlementRows, ledgerRows, intakeRows, conversationRows, auditRows,
    periods, expenseRows, driverAdjustmentRows, deliveryPolicy, pricingPolicy, proofPolicy, locationPolicy, printingPolicy, notificationPolicy,
  ] = await Promise.all([
    allPages('/api/v1/shipments'),
    allPages('/api/v1/drivers'),
    allPages('/api/v1/merchants'),
    allPages('/api/v1/pickup-requests'),
    allPages('/api/v1/dispatch-batches'),
    allPages('/api/v1/driver-updates'),
    allPages('/api/v1/return-cases'),
    allPages('/api/v1/settlements'),
    allPages('/api/v1/ledger/entries'),
    allPages('/api/v1/intake-batches'),
    allPages('/api/v1/conversations'),
    allPages('/api/v1/audit-logs'),
    allPages('/api/v1/accounting-periods'),
    allPages('/api/v1/finance/operational-expenses'),
    allPages('/api/v1/finance/driver-adjustments'),
    optionalObject('/api/v1/settings/delivery-policy'),
    optionalObject('/api/v1/settings/pricing-policy'),
    optionalObject('/api/v1/settings/proof-policy'),
    optionalObject('/api/v1/settings/location-policy'),
    optionalObject('/api/v1/settings/printing-policy'),
    optionalObject('/api/v1/settings/notification-policy'),
  ]);

  const chatRooms = await Promise.all(conversationRows.map(async (row) => {
    const room = conversationFromApi(row);
    room.messages = await loadMessages(room.id);
    return room;
  }));

  const closedPeriods = periods
    .map(asRecord)
    .filter((row) => String(row.status ?? '').toLowerCase() === 'closed')
    .map((row) => String(row.period_key ?? row.starts_on ?? row.id ?? '').slice(0, 7))
    .filter(Boolean);

  return {
    shipments: shipmentRows.map(shipmentFromApi),
    drivers: driverRows.map(driverFromApi),
    merchants: merchantRows.map(merchantFromApi),
    pickupTasks: pickupRows.map(pickupFromApi),
    deliveryBatches: dispatchRows.map(dispatchFromApi),
    driverUpdates: updateRows.map(driverUpdateFromApi),
    returnCases: returnRows.map(returnFromApi),
    settlements: settlementRows.map(settlementFromApi),
    ledgerEntries: ledgerRows.map(ledgerFromApi),
    operationalExpenses: expenseRows.map(operationalExpenseFromApi),
    driverAdjustments: driverAdjustmentRows.map(driverAdjustmentFromApi),
    barcodeBatches: intakeRows.map(intakeFromApi),
    chatRooms,
    auditEvents: auditRows.map(auditFromApi),
    closedPeriods,
    settings: settingsFromApi(deliveryPolicy ?? {}, pricingPolicy ?? {}, proofPolicy ?? {}, locationPolicy ?? {}, printingPolicy ?? {}, notificationPolicy ?? {}),
    lastSyncedAt: new Date().toISOString(),
  };
}

const clientActionId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
async function versionOf(path: string) { const r = await api.get<Record<string, unknown>>(path, { retries: 1 }); return Number(asRecord(r.data).version ?? asRecord(r.data).resource_version ?? 1); }
async function conversationSummary(id: string) { const rows = (await api.get<Record<string, unknown>[]>('/api/v1/conversations', { query: { page: 1, per_page: 100 } })).data ?? []; const found = rows.map(asRecord).find((x) => String(x.id) === id); if (!found) throw new Error('Conversation not found'); return found; }

async function execute(command: DeliveryCommand): Promise<GatewayCommandResponse> {
  try {
    const action = clientActionId();
    const commandOptions = { idempotencyKey: action, retries: 1 } as const;
    const post = <T = unknown>(path: string, body?: unknown) => api.post<T>(path, body, commandOptions);
    const put = <T = unknown>(path: string, body?: unknown) => api.put<T>(path, body, commandOptions);
    const patch = <T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) => api.patch<T>(path, body, { ...commandOptions, headers });
    switch (command.type) {
      case 'shipment/assignDriver': await post('/api/v1/shipments/bulk-assign-driver', { driver_id: command.driverId, shipment_ids: command.shipmentIds, reason: 'dashboard_assignment' }); break;
      case 'shipment/overrideFee': break;
      case 'shipment/transition': return { result: { ok: false, message: 'تغيير الحالة الرسمي يتم من خلال دورة التشغيل المعتمدة، وليس بتعديل مباشر للحالة.' } };
      case 'shipment/addAttempt': return { result: { ok: false, message: 'محاولات التسليم تُسجل من تطبيق المندوب وتحتاج اعتماد الشركة.' } };
      case 'shipment/import': return { result: { ok: false, message: 'استخدم استيراد CSV عبر Shipment Imports حتى يتم التحقق والمعالجة غير المتزامنة.' } };
      case 'shipment/requestSettlement': { const detail = shipmentFromApi((await api.get(`/api/v1/shipments/${command.shipmentIds[0]}`)).data); const today = new Date().toISOString().slice(0, 10); await post('/api/v1/settlements', { merchant_id: detail.merchantId, shipment_ids: command.shipmentIds, period_start: today, period_end: today, client_action_id: action }); break; }
      case 'pickup/approve': { const v = await versionOf(`/api/v1/pickup-requests/${command.taskId}`); await post(`/api/v1/pickup-requests/${command.taskId}/approve`, { resource_version: v, client_action_id: action, note: 'اعتماد من لوحة التحكم' }); break; }
      case 'pickup/review': { const v = await versionOf(`/api/v1/pickup-requests/${command.taskId}`); await post(`/api/v1/pickup-requests/${command.taskId}/review`, { decision: 'needs_review', review_note: 'تحتاج مراجعة تشغيلية', missing_shipment_ids: [], resource_version: v, client_action_id: action }); break; }
      case 'batch/assign': { const v = await versionOf(`/api/v1/dispatch-batches/${command.batchId}`); await post(`/api/v1/dispatch-batches/${command.batchId}/assign-driver`, { driver_id: command.driverId, resource_version: v, client_action_id: action, override_capacity: false }); break; }
      case 'driverUpdate/approve': { const v = await versionOf(`/api/v1/driver-updates/${command.updateId}`); await post(`/api/v1/driver-updates/${command.updateId}/approve`, { review_note: 'اعتماد من لوحة التحكم', resource_version: v, client_action_id: action }); break; }
      case 'driverUpdate/reject': { const v = await versionOf(`/api/v1/driver-updates/${command.updateId}`); await post(`/api/v1/driver-updates/${command.updateId}/reject`, { review_note: 'مرفوض للمراجعة', resource_version: v, client_action_id: action }); break; }
      case 'return/receiveAtHub': case 'return/markOutForMerchant': { const v = await versionOf(`/api/v1/return-cases/${command.returnCaseId}`); const suffix = command.type === 'return/receiveAtHub' ? 'receive-at-hub' : 'mark-out-for-merchant'; await post(`/api/v1/return-cases/${command.returnCaseId}/${suffix}`, { notes: 'Dashboard command', proof_file_ids: [], resource_version: v, client_action_id: action }); break; }
      case 'return/assignDriver': { const v = await versionOf(`/api/v1/return-cases/${command.returnCaseId}`); await post(`/api/v1/return-cases/${command.returnCaseId}/assign-driver`, { driver_id: command.driverId, notes: 'Dashboard assignment', proof_file_ids: [], resource_version: v, client_action_id: action }); break; }
      case 'return/confirmMerchantReceipt': { const v = await versionOf(`/api/v1/return-cases/${command.returnCaseId}`); await post(`/api/v1/return-cases/${command.returnCaseId}/confirm-return-to-merchant`, { notes: command.proofReference, proof_file_ids: [], resource_version: v, client_action_id: action }); break; }
      case 'barcode/create': { const created = await post<any>('/api/v1/intake-batches', { pickup_request_id: command.batch.pickupTaskId, merchant_id: command.batch.merchantId, expected_shipment_ids: command.batch.expectedShipmentIds, client_action_id: action }); return { result: { ok: true, message: 'تم إنشاء دفعة الاستلام.', createdId: String(asRecord(created.data).id ?? '') }, refresh: true }; }
      case 'barcode/scan': await post(`/api/v1/intake-batches/${command.batchId}/scan`, { barcode: command.shipmentId, scanned_at: new Date().toISOString(), client_action_id: action }); break;
      case 'barcode/undo': { const v = await versionOf(`/api/v1/intake-batches/${command.batchId}`); await post(`/api/v1/intake-batches/${command.batchId}/undo-last-scan`, { reason_code: 'operator_undo', resource_version: v, client_action_id: action }); break; }
      case 'barcode/close': { const raw = asRecord((await api.get(`/api/v1/intake-batches/${command.batchId}`)).data); const expected = Array.isArray(raw.expected_shipment_ids) ? raw.expected_shipment_ids.map(String) : []; const scanned = Array.isArray(raw.scanned_shipment_ids) ? raw.scanned_shipment_ids.map(String) : []; const missing = expected.filter((id) => !scanned.includes(id)); await post(`/api/v1/intake-batches/${command.batchId}/close`, { missing_shipment_ids: missing, unexpected_resolution: 'create_exception', resource_version: Number(raw.version ?? 1), client_action_id: action, note: 'إغلاق من لوحة التحكم' }); break; }
      case 'exception/resolve': { const ex = (await api.get<any[]>('/api/v1/exceptions', { query: { page: 1, per_page: 100, status: 'open' } })).data.find((x: any) => String(x.shipment_id ?? x.resource_id) === command.shipmentId); if (!ex) return { result: { ok: false, message: 'لم يتم العثور على استثناء مفتوح لهذه الشحنة.' } }; await post(`/api/v1/exceptions/${ex.id}/resolve`, { resolution_code: 'dashboard_resolved', note: command.resolution, command: command.driverId ? 'assign_driver' : null, command_payload: command.driverId ? { driver_id: command.driverId } : {}, resource_version: Number(ex.version ?? 1), client_action_id: action }); break; }
      case 'driver/upsert': {
        const d = command.driver;
        if (!d.userCode?.trim()) return { result: { ok: false, message: 'كود المندوب مطلوب ولا يتم توليده تلقائيًا في البرودكشن.' } };
        if (!d.zoneId) return { result: { ok: false, message: 'اختر المنطقة الرئيسية من بيانات المناطق المسجلة على الخادم.' } };
        const body = {
          name: d.name,
          phone: d.phone,
          code: d.userCode.trim(),
          branch_id: d.branchId || null,
          zone_id: d.zoneId,
          capacity: Math.max(1, d.capacity || 1),
          service_area_ids: d.serviceAreaIds ?? [d.zoneId],
          max_batch_shipments: Math.max(1, d.maxBatchShipments ?? d.capacity ?? 1),
          max_open_tasks: Math.max(1, d.maxOpenTasks ?? d.capacity ?? 1),
          task_types: d.taskTypes ?? ['pickup', 'delivery', 'returns'],
        };
        if (d.id && !d.id.startsWith('new-')) {
          await patch(`/api/v1/drivers/${d.id}`, body, { 'If-Match': String(await versionOf(`/api/v1/drivers/${d.id}`)) });
        } else {
          await post('/api/v1/drivers', body);
        }
        break;
      }
      case 'driver/suspend': {
        const v = await versionOf(`/api/v1/drivers/${command.driverId}`);
        await post(`/api/v1/drivers/${command.driverId}/suspend`, {
          policy: command.policy,
          reason_code: 'dashboard_manual_suspend',
          notes: command.reason,
          resource_version: v,
          client_action_id: action,
        });
        break;
      }
      case 'driver/reactivate': {
        const v = await versionOf(`/api/v1/drivers/${command.driverId}`);
        await post(`/api/v1/drivers/${command.driverId}/reactivate`, {
          reason_code: 'dashboard_reactivate',
          notes: command.reason?.trim() || null,
          resource_version: v,
          client_action_id: action,
        });
        break;
      }
      case 'driver/archive': {
        const v = await versionOf(`/api/v1/drivers/${command.driverId}`);
        await post(`/api/v1/drivers/${command.driverId}/archive`, {
          reason_code: 'dashboard_archive',
          notes: command.reason,
          resource_version: v,
          client_action_id: action,
        });
        break;
      }
      case 'driver/resetAccess': {
        await post(`/api/v1/drivers/${command.driverId}/reset-access`, {
          logout_all_devices: command.invalidateSessions,
          force_password_change: command.forcePasswordChange,
          client_action_id: action,
        });
        break;
      }
      case 'merchant/upsert': { const m = command.merchant; const body = { brand_name: m.name, legal_name: m.name, contact_phone: m.phone, settlement_cycle: m.settlementCycle === 'twiceWeekly' ? 'twice_weekly' : m.settlementCycle, priority_level: m.priorityLevel }; if (m.id && !m.id.startsWith('new-') && !m.id.startsWith('MER-')) await patch(`/api/v1/merchants/${m.id}`, body, { 'If-Match': String(await versionOf(`/api/v1/merchants/${m.id}`)) }); else await post('/api/v1/merchants', body); break; }
      case 'merchant/archive': { const v = await versionOf(`/api/v1/merchants/${command.merchantId}`); await post(`/api/v1/merchants/${command.merchantId}/archive`, { reason_code: 'dashboard_archive', notes: command.reason, resource_version: v, client_action_id: action }); break; }
      case 'settlement/create': { const s = shipmentFromApi((await api.get(`/api/v1/shipments/${command.shipmentIds[0]}`)).data); const today = new Date().toISOString().slice(0, 10); const created = await post<any>('/api/v1/settlements', { merchant_id: s.merchantId, shipment_ids: command.shipmentIds, period_start: today, period_end: today, client_action_id: action }); return { result: { ok: true, message: 'تم إنشاء التسوية وإرسالها للمراجعة.', createdId: String(asRecord(created.data).id ?? '') }, refresh: true }; }
      case 'settlement/approve': { const v = await versionOf(`/api/v1/settlements/${command.settlementId}`); await post(`/api/v1/settlements/${command.settlementId}/approve`, { note: 'اعتماد من لوحة التحكم', resource_version: v, client_action_id: action }); break; }
      case 'settlement/pay': { const v = await versionOf(`/api/v1/settlements/${command.settlementId}`); await post(`/api/v1/settlements/${command.settlementId}/pay`, { payment_reference: command.paymentReference, paid_at: new Date().toISOString(), payment_method: 'bank_transfer', resource_version: v, client_action_id: action }); break; }
      case 'finance/reconcileShipment': { const s = asRecord((await api.get(`/api/v1/shipments/${command.shipmentId}`)).data); await post(`/api/v1/finance/shipments/${command.shipmentId}/reconcile`, { remitted_minor: Math.round(command.remittedCash * 100), currency: s.currency ?? 'EGP', note: command.note, resource_version: Number(s.version ?? 1), client_action_id: action }); break; }
      case 'finance/addOperationalExpense': await post('/api/v1/finance/operational-expenses', { category: command.expense.category, description: command.expense.description, amount_minor: Math.round(command.expense.amount * 100), payment_method: command.expense.paymentMethod, expense_date: command.expense.date, status: command.expense.status, client_action_id: action }); break;
      case 'finance/addDriverAdjustment': await post('/api/v1/finance/driver-adjustments', { driver_id: command.adjustment.driverId, type: command.adjustment.type, amount_minor: Math.round(command.adjustment.amount * 100), description: command.adjustment.description, adjustment_date: command.adjustment.date, status: command.adjustment.status, client_action_id: action }); break;
      case 'finance/reviewOperationalExpense': await post(`/api/v1/finance/operational-expenses/${command.expenseId}/review`, { status: command.status, note: command.note, client_action_id: action }); break;
      case 'finance/reviewDriverAdjustment': await post(`/api/v1/finance/driver-adjustments/${command.adjustmentId}/review`, { status: command.status, note: command.note, client_action_id: action }); break;
      case 'ledger/postAll': { const entries = (await api.get<any[]>('/api/v1/ledger/entries', { query: { page: 1, per_page: 100, status: 'pending' } })).data; await post('/api/v1/ledger/post', { entry_ids: entries.map((x: any) => x.id), posting_date: new Date().toISOString().slice(0, 10), note: 'ترحيل من لوحة التحكم', client_action_id: action }); break; }
      case 'period/close': { const periods = (await api.get<any[]>('/api/v1/accounting-periods', { query: { page: 1, per_page: 100 } })).data; const p = periods.find((x: any) => String(x.starts_on ?? '').slice(0, 7) === command.period || String(x.id) === command.period); if (!p) return { result: { ok: false, message: 'الفترة غير موجودة على الخادم.' } }; const end = String(p.ends_on ?? ''); if (!end) return { result: { ok: false, message: 'الفترة لا تحتوي تاريخ نهاية صالحًا.' } }; await post(`/api/v1/accounting-periods/${p.id}/close`, { closed_through: end, note: 'إغلاق من لوحة التحكم', resource_version: Number(p.version ?? 1), client_action_id: action }); break; }
      case 'settings/updateDelivery': { const cur = asRecord((await api.get('/api/v1/settings/delivery-policy')).data); await put('/api/v1/settings/delivery-policy', deliveryToApi(command.policy, cur, Number(cur.version ?? 1))); break; }
      case 'settings/updatePricing': { const cur = asRecord((await api.get('/api/v1/settings/pricing-policy')).data); await put('/api/v1/settings/pricing-policy', pricingToApi(command.policy, Number(cur.version ?? 1), String(cur.currency ?? 'EGP'), Number(cur.free_delivery_attempts ?? 3))); break; }
      case 'settings/updateProof': { const cur = asRecord((await api.get('/api/v1/settings/proof-policy')).data); await put('/api/v1/settings/proof-policy', proofToApi(command.policy, Number(cur.version ?? 1))); break; }
      case 'settings/updateLocation': { break; }
      case 'settings/updatePrinting': { const cur = asRecord((await api.get('/api/v1/settings/printing-policy')).data); await put('/api/v1/settings/printing-policy', printingToApi(command.policy, cur, Number(cur.version ?? 1))); break; }
      case 'settings/updateNotifications': { const cur = asRecord((await api.get('/api/v1/settings/notification-policy')).data); await put('/api/v1/settings/notification-policy', notificationToApi(command.policy, cur, Number(cur.version ?? 1))); break; }
      case 'chat/send': { const fileIds = command.attachments?.map((file) => file.id).filter(Boolean) ?? []; await post(`/api/v1/conversations/${command.roomId}/messages`, { message_type: command.note ? 'internal_note' : fileIds.length && !command.text.trim() ? 'file' : 'text', body: command.text.trim() || null, file_ids: fileIds, client_action_id: action }); break; }
      case 'chat/toggle': { const room = await conversationSummary(command.roomId); const v = Number(room.version ?? 1); const endpoint = String(room.status) === 'closed' ? 'reopen' : 'close'; await post(`/api/v1/conversations/${command.roomId}/${endpoint}`, { resource_version: v, client_action_id: action, note: endpoint === 'close' ? 'إغلاق من لوحة التحكم' : 'إعادة فتح من لوحة التحكم' }); break; }
      case 'chat/transfer': { const room = await conversationSummary(command.roomId); await post(`/api/v1/conversations/${command.roomId}/transfer`, { assignee_user_id: command.assignedTo, resource_version: Number(room.version ?? 1), client_action_id: action }); break; }
      case 'chat/read': await post(`/api/v1/conversations/${command.roomId}/read`, { last_read_message_id: null }); break;
    }
    return { result: { ok: true, message: 'تم تنفيذ العملية بنجاح.' }, refresh: true };
  } catch (error) { return { result: { ok: false, message: friendlyApiMessage(error) } }; }
}

export const apiDeliveryGateway: DeliveryGateway = {
  load(): Promise<DeliveryState> {
    return loadState();
  },
  execute,
};
