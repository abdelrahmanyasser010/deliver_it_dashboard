import type { AuditEvent, BarcodeBatch, ChatMessageRecord, ChatRoomRecord } from '../../application/delivery/types';
import type { FinancialLedgerEntry, MerchantSettlement } from '../../domain/finance/entities';
import type { Driver, Merchant, Shipment, ShipmentFinancialStatus, ShipmentStatus, ShipmentTaskStatus } from '../../domain/logistics/entities';
import type { DeliveryBatch, DriverShipmentUpdate, PickupTask, ReturnCase } from '../../domain/operations/entities';
import { defaultGovernorateRates, defaultTenantOperationalSettings, type DeliveryPolicySettings, type DriverLocationPolicySettings, type GovernorateRate, type NotificationSettings, type PricingPolicySettings, type PrintingSettings, type ProofPolicySettings, type TenantOperationalSettings } from '../../domain/settings/entities';

export type AnyRecord = Record<string, any>;
export const asRecord = (value: unknown): AnyRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {};
export function jsonObject(value: unknown): AnyRecord { if (!value) return {}; if (typeof value === 'object' && !Array.isArray(value)) return value as AnyRecord; if (typeof value === 'string') { try { return asRecord(JSON.parse(value)); } catch { return {}; } } return {}; }
export function jsonArray(value: unknown): any[] { if (Array.isArray(value)) return value; if (typeof value === 'string') { try { const x = JSON.parse(value); return Array.isArray(x) ? x : []; } catch { return []; } } return []; }
export const minor = (value: unknown) => Number(value ?? 0) / 100;
export const num = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const str = (value: unknown, fallback = '') => value == null ? fallback : String(value);
export const bool = (value: unknown, fallback = false) => value == null ? fallback : Boolean(value);

export function shipmentStatus(value: unknown): ShipmentStatus {
  const raw = str(value).toLowerCase();
  if (raw === 'draft') return 'draft';
  if (['ready_to_ship','pickup_scheduled'].includes(raw)) return 'readyToShip';
  if (['picked_up','received_at_hub','ready_for_dispatch'].includes(raw)) return 'receivedAtOffice';
  if (['assigned_to_driver', 'out_for_delivery', 'in_transit'].includes(raw)) return 'deliveredToDriver';
  if (raw === 'delivered') return 'delivered';
  if (['partially_delivered','split_for_retry','split_return_to_hub'].includes(raw)) return 'partiallyDelivered';
  if (raw === 'delivery_postponed') return 'postponed';
  if (['delivery_failed','return_in_progress','returned_to_hub','return_assigned_to_driver'].includes(raw)) return 'failedToDeliver';
  if (raw === 'returned_to_merchant') return 'returned';
  if (raw === 'cancelled') return 'failedToDeliver';
  return 'readyToShip';
}
export function taskStatus(value: unknown): ShipmentTaskStatus {
  const raw = str(value).toLowerCase();
  const map: Record<string, ShipmentTaskStatus> = {
    none:'none', needs_pickup:'needsPickup', needs_office_confirmation:'needsOfficeConfirmation', needs_driver_assignment:'needsDriverAssignment',
    needs_status_approval:'needsStatusApproval', needs_customer_service:'needsCustomerService', needs_return_processing:'needsReturnProcessing', needs_financial_review:'needsFinancialReview',
  };
  return map[raw] ?? 'none';
}
export function financialStatus(value: unknown): ShipmentFinancialStatus {
  const raw = str(value).toLowerCase();
  const map: Record<string, ShipmentFinancialStatus> = { not_due:'notDue', awaiting_collection:'awaitingCollection', collected:'collected', partially_collected:'partiallyCollected', remitted:'remitted', in_settlement:'inSettlement', settled:'settled', discrepancy:'discrepancy' };
  return map[raw] ?? 'notDue';
}
export function shipmentFromApi(input: unknown): Shipment {
  const r = asRecord(input); const recipient = jsonObject(r.recipient_snapshot); const address = jsonObject(r.address_snapshot); const metadata = jsonObject(r.metadata);
  const itemsRaw = Array.isArray(r.items) ? r.items : jsonArray(r.items_snapshot ?? metadata.items);
  const items = itemsRaw.map((item: any) => ({ id: item.id ? str(item.id) : undefined, name: str(item.name ?? item.title, 'صنف'), quantity: num(item.quantity, 1), price: item.price_minor != null ? minor(item.price_minor) : num(item.price), deliveredQuantity: item.delivered_quantity != null ? num(item.delivered_quantity) : undefined, pendingQuantity: item.pending_quantity != null ? num(item.pending_quantity) : undefined, returnedQuantity: item.returned_quantity != null ? num(item.returned_quantity) : undefined }));
  const expected = r.expected_collection_minor != null ? minor(r.expected_collection_minor) : num(r.expected_collection);
  const fee = r.delivery_fee_minor != null ? minor(r.delivery_fee_minor) : num(r.delivery_fee);
  const discount = r.discount_minor != null ? minor(r.discount_minor) : num(r.discount);
  return {
    id: str(r.id), trackingNumber: str(r.tracking_number ?? r.trackingNumber ?? r.id), customerName: str(r.recipient_name ?? recipient.name ?? recipient.full_name, '—'), customerPhone: str(r.recipient_phone ?? recipient.phone, '—'),
    governorate: str(r.governorate ?? address.governorate ?? address.state, '—'), city: str(r.city ?? address.city ?? address.area, '—'), address: str(r.address ?? address.formatted_address ?? address.address_line ?? address.street, '—'),
    status: shipmentStatus(r.operational_status ?? r.status), taskStatus: taskStatus(r.task_status), financialStatus: financialStatus(r.financial_status), priority: ['high','urgent'].includes(str(r.priority)) ? str(r.priority) as 'high'|'urgent' : 'normal',
    paymentType: str(r.payment_type) === 'prepaid' ? 'prepaid' : 'cashOnDelivery', total: r.items_total_minor != null ? minor(r.items_total_minor) : Math.max(0, expected - fee + discount), deliveryFee: fee, discount,
    collectedCash: r.collected_minor != null ? minor(r.collected_minor) : num(r.collected), expectedCollection: expected, remittedCash: r.remitted_minor != null ? minor(r.remitted_minor) : num(r.remitted), items,
    driverId: r.assigned_driver_id ? str(r.assigned_driver_id) : undefined, driverName: r.assigned_driver_name ? str(r.assigned_driver_name) : undefined, merchantId: str(r.merchant_id), merchantName: str(r.merchant_name ?? metadata.merchant_name, '—'),
    createdAt: str(r.created_at, new Date(0).toISOString()), lastUpdatedAt: str(r.updated_at ?? r.last_updated_at ?? r.created_at), statusChangedAt: str(r.status_changed_at ?? r.updated_at ?? r.created_at), expectedDeliveryAt: r.expected_delivery_at ? str(r.expected_delivery_at) : undefined,
    attemptCount: num(r.attempt_count), exceptionReason: r.exception_reason ? str(r.exception_reason) : undefined, settlementStatus: ['settled','in_settlement'].includes(str(r.financial_status)) ? 'settled' : 'unsettled', settlementId: r.settlement_id ? str(r.settlement_id) : undefined,
    pickupTaskId: r.pickup_request_id ? str(r.pickup_request_id) : undefined, deliveryBatchId: r.dispatch_batch_id ? str(r.dispatch_batch_id) : undefined, rootShipmentId: r.root_shipment_id ? str(r.root_shipment_id) : undefined, parentShipmentId: r.parent_shipment_id ? str(r.parent_shipment_id) : undefined,
    splitSequence: r.split_sequence != null ? num(r.split_sequence) : undefined, version: num(r.version ?? r.resource_version, 1), events: Array.isArray(r.events) ? r.events.map((e:any) => ({ id:str(e.id), shipmentId:str(r.id), type:'statusChanged' as const, title:str(e.event_type ?? e.type, 'تحديث'), detail:str(e.note ?? e.description ?? ''), createdAt:str(e.created_at ?? e.occurred_at), actor:str(e.actor_name ?? 'النظام') })) : undefined,
  };
}
export function driverFromApi(input: unknown): Driver {
  const r = asRecord(input);
  const vehicle = asRecord(r.vehicle);
  const metadata = jsonObject(r.metadata);
  const account = str(r.account_status ?? r.status, 'active');
  const operational = str(r.operational_status ?? r.availability, 'offline');
  const serviceAreaIds = jsonArray(r.service_area_ids).map(String);
  const rawTaskTypes = Array.isArray(r.task_types) ? r.task_types : jsonArray(r.task_types).length ? jsonArray(r.task_types) : jsonArray(metadata.task_types);
  const taskTypes = rawTaskTypes.filter((x) => ['pickup','delivery','returns'].includes(String(x))).map(String) as Driver['taskTypes'];
  const zoneId = r.zone_id ? str(r.zone_id) : metadata.zone_id ? str(metadata.zone_id) : undefined;
  return {
    id: str(r.id), name: str(r.name ?? r.user_name, '—'), phone: str(r.phone, '—'),
    zone: str(r.zone_name ?? zoneId, '—'), zoneId,
    shipmentsCount: num(r.shipments_count ?? r.active_load),
    pendingCash: r.pending_cash_minor != null ? minor(r.pending_cash_minor) : num(r.pending_cash),
    deliveredToday: num(r.delivered_today),
    status: ['suspended','inactive','archived','restricted'].includes(account) ? 'off' : 'active',
    availability: ['busy','break','offline'].includes(operational) ? operational as Driver['availability'] : 'available',
    capacity: num(r.capacity ?? r.capacity_shipments, 1), activeLoad: num(r.active_load),
    shiftEndsAt: str(asRecord(r.current_shift).ends_at ?? r.shift_ends_at, ''),
    lastLocationUpdateAt: str(r.last_location_update_at, ''), successRate: num(r.success_rate),
    vehicleType: ['motorcycle','car','van'].includes(str(vehicle.type ?? r.vehicle_type)) ? str(vehicle.type ?? r.vehicle_type) as Driver['vehicleType'] : undefined,
    vehicleNumber: (vehicle.plate_number ?? r.plate_number) ? str(vehicle.plate_number ?? r.plate_number) : undefined,
    userCode: str(r.code ?? r.user_code, ''),
    accountStatus: account === 'archived' ? 'archived' : account === 'suspended' ? 'suspended' : account === 'restricted' ? 'restricted' : 'active',
    operationalStatus: (['available','busy','pickup_task','delivery_task','offline'].includes(operational) ? operational : 'offline') as Driver['operationalStatus'],
    branchId: r.branch_id ? str(r.branch_id) : undefined, branchName: r.branch_name ? str(r.branch_name) : undefined,
    serviceAreaIds, taskTypes: (taskTypes && taskTypes.length) ? taskTypes : undefined,
    maxBatchShipments: r.max_batch_shipments != null ? num(r.max_batch_shipments) : undefined,
    maxOpenTasks: r.max_open_tasks != null ? num(r.max_open_tasks) : undefined,
    onShift: str(r.shift_status) === 'on_shift', lastSeenAt: r.last_seen_at ? str(r.last_seen_at) : undefined,
    archivedAt: r.archived_at ? str(r.archived_at) : undefined, version: num(r.version, 1),
  };
}
export function merchantFromApi(input: unknown): Merchant { const r=asRecord(input); const ss=jsonObject(r.settlement_settings); return { id:str(r.id), name:str(r.name ?? r.brand_name,'—'), code:r.code?str(r.code):undefined, legalName:r.legal_name?str(r.legal_name):undefined, email:r.email?str(r.email):undefined, status:(['pending_onboarding','active','suspended','archived'].includes(str(r.status))?str(r.status):'active') as Merchant['status'], phone:str(r.phone ?? r.contact_phone,'—'), logoUrl:str(r.logo_url,''), shipmentsCount:num(r.shipments_count), pendingSettlement:r.pending_settlement_minor!=null?minor(r.pending_settlement_minor):num(r.pending_settlement), totalOrderValue:r.total_order_value_minor!=null?minor(r.total_order_value_minor):num(r.total_order_value), joinedAt:str(r.created_at,''), branchName:str(r.branch_name,'—'), settlementCycle:str(r.settlement_cycle)==='twice_weekly'?'twiceWeekly':str(r.settlement_cycle)==='daily'?'daily':'weekly', priorityLevel:str(r.priority_level ?? ss.priority_level)==='priority'?'priority':'standard', branches:Array.isArray(r.branches)?r.branches.map((b:any)=>({id:str(b.id),name:str(b.name),address:str(typeof b.address==='string'?b.address:jsonObject(b.address).formatted_address),contactName:str(b.contact_name),contactPhone:str(b.phone??b.contact_phone),pickupWindow:str(b.pickup_window??''),active:str(b.status)!=='archived'})):undefined, accountManagerName:asRecord(r.account_manager).name?str(asRecord(r.account_manager).name):undefined, settlementMethod:(['bank','wallet','instapay','cash'].includes(str(r.payout_method))?str(r.payout_method):undefined) as Merchant['settlementMethod'], version:num(r.version,1) }; }
export function pickupFromApi(input: unknown): PickupTask { const r=asRecord(input), meta=jsonObject(r.metadata); const statusRaw=str(r.status); const status = statusRaw==='approved'||statusRaw==='closed'?'approved':statusRaw==='needs_review'?'needsReview':statusRaw==='driver_submitted'||statusRaw==='collected'?'driverSubmitted':'assigned'; return { id:str(r.id), merchantId:str(r.merchant_id), merchantName:str(r.merchant_name??meta.merchant_name,'—'), merchantAddress:str(r.merchant_address??meta.merchant_address,'—'), driverId:str(r.driver_id,''), driverName:str(r.driver_name??meta.driver_name,'—'), status, assignedAt:str(r.assigned_at??r.created_at,''), submittedAt:r.submitted_at?str(r.submitted_at):undefined, items:(Array.isArray(r.shipment_ids)?r.shipment_ids:jsonArray(r.shipment_ids)).map((id:any)=>({shipmentId:str(id),expected:true,driverConfirmed:true,codAmount:0})), reviewNote:r.review_note?str(r.review_note):undefined } }
export function dispatchFromApi(input: unknown): DeliveryBatch { const r=asRecord(input); const raw=str(r.status); const status=raw==='completed'||raw==='closed'?'completed':raw==='dispatched'||raw==='in_progress'?'inProgress':r.driver_id||raw==='assigned'?'assigned':'draft'; return { id:str(r.id), driverId:r.driver_id?str(r.driver_id):undefined, driverName:r.driver_name?str(r.driver_name):undefined, zone:str(r.zone_name??r.zone_id,'—'), status, shipmentIds:Array.isArray(r.shipment_ids)?r.shipment_ids.map((value)=>str(value)):jsonArray(r.shipment_ids).map((value)=>str(value)), createdAt:str(r.created_at,'') }; }
export function driverUpdateFromApi(input: unknown): DriverShipmentUpdate { const r=asRecord(input), p=jsonObject(r.payload); const reported=str(r.type??p.type); const reportedStatus = reported.includes('partial')?'partiallyDelivered':reported.includes('deliver')?'delivered':reported.includes('postpon')?'postponed':reported.includes('fail')?'failed':reported.includes('return')?'returned':reported.includes('pickup')?'pickedUp':'inTransit'; const st=str(r.status); return { id:str(r.id),shipmentId:str(r.shipment_id),driverId:str(r.driver_id),driverName:str(r.driver_name??p.driver_name,'—'),merchantName:str(r.merchant_name??p.merchant_name,'—'),reportedStatus,previousStatus:str(p.previous_status,''),customerName:str(r.customer_name??p.customer_name,'—'),evidence:str(p.evidence??''),evidenceReference:p.evidence_reference?str(p.evidence_reference):undefined,recipientName:p.recipient_name?str(p.recipient_name):undefined,reportedCollectedCash:p.collected_minor!=null?minor(p.collected_minor):undefined,note:str(p.note??r.note,''),createdAt:str(r.created_at,''),status:st==='approved'?'approvedForMerchant':st==='rejected'?'rejectedForReview':'pendingAdminApproval',reviewReason:r.decision_reason?str(r.decision_reason):undefined } }
export function returnFromApi(input: unknown): ReturnCase { const r=asRecord(input), m=jsonObject(r.metadata); const map:Record<string,ReturnCase['status']>={returning_to_hub:'returningToHub',received_at_hub:'receivedAtHub',awaiting_merchant_assignment:'awaitingMerchantAssignment',assigned_to_driver:'assignedToDriver',out_for_merchant_return:'outForMerchantReturn',returned_to_merchant:'returnedToMerchant'}; return { id:str(r.id),shipmentId:str(r.shipment_id),rootShipmentId:str(r.root_shipment_id??r.shipment_id),merchantId:str(r.merchant_id),merchantName:str(r.merchant_name??m.merchant_name,'—'),sourceDriverId:r.source_driver_id?str(r.source_driver_id):undefined,sourceDriverName:r.source_driver_name?str(r.source_driver_name):undefined,assignedDriverId:r.assigned_driver_id?str(r.assigned_driver_id):undefined,assignedDriverName:r.assigned_driver_name?str(r.assigned_driver_name):undefined,status:map[str(r.status)]??'returningToHub',reason:str(r.reason??m.reason,'—'),itemSummary:str(r.item_summary??m.item_summary,'—'),quantity:num(r.quantity,1),returnFee:r.return_fee_minor!=null?minor(r.return_fee_minor):num(r.return_fee),receivedAtHubAt:r.received_at_hub_at?str(r.received_at_hub_at):undefined,assignedAt:r.assigned_at?str(r.assigned_at):undefined,completedAt:r.completed_at?str(r.completed_at):undefined,proofReference:r.proof_reference?str(r.proof_reference):undefined,createdAt:str(r.created_at,''),updatedAt:str(r.updated_at??r.created_at,'') } }
export function settlementFromApi(input: unknown): MerchantSettlement { const r=asRecord(input), lines=Array.isArray(r.lines)?r.lines:[]; return { id:str(r.id),merchantId:str(r.merchant_id),merchantName:str(r.merchant_name,'—'),periodStart:str(r.period_start??r.created_at,'').slice(0,10),periodEnd:str(r.period_end??r.created_at,'').slice(0,10),status:str(r.status)==='under_review'?'underReview':(['draft','approved','paid','reconciled','disputed','cancelled'].includes(str(r.status))?str(r.status) as any:'draft'),shipmentIds:Array.isArray(r.shipment_ids)?r.shipment_ids.map((value)=>str(value)):lines.map((x:any)=>str(x.shipment_id)),lines:lines.map((x:any)=>({shipmentId:str(x.shipment_id),merchantId:str(r.merchant_id),grossCollection:minor(x.gross_collection_minor??x.gross_minor),shippingFee:minor(x.shipping_fee_minor),returnFee:minor(x.return_fee_minor),discount:minor(x.discount_minor),adjustment:minor(x.adjustment_minor),netPayable:minor(x.net_payable_minor??x.net_minor)})),grossCollection:minor(r.gross_collection_minor??r.gross_minor),shippingFees:minor(r.shipping_fees_minor??r.delivery_fees_minor),returnFees:minor(r.return_fees_minor),discounts:minor(r.discounts_minor),adjustments:minor(r.adjustments_minor),netPayable:minor(r.net_payable_minor??r.net_minor),createdAt:str(r.created_at,''),approvedAt:r.approved_at?str(r.approved_at):undefined,paidAt:r.paid_at?str(r.paid_at):undefined,paymentReference:r.payment_reference?str(r.payment_reference):undefined } }
export function ledgerFromApi(input: unknown): FinancialLedgerEntry { const r=asRecord(input); return { id:str(r.id),date:str(r.posting_date??r.entry_date??r.created_at,'').slice(0,10),account:str(r.account??r.account_key??r.ledger_account_id,'—'),description:str(r.description??r.memo,'—'),debit:r.debit_minor!=null?minor(r.debit_minor):num(r.debit),credit:r.credit_minor!=null?minor(r.credit_minor):num(r.credit),status:str(r.status)==='reversed'?'reversed':str(r.status)==='posted'?'posted':'pending',sourceType:str(r.source_type)==='driver_remittance'?'driverRemittance':str(r.source_type)==='settlement'?'settlement':str(r.source_type)==='shipment'?'shipment':'adjustment',sourceId:str(r.source_id??r.reference_id,'') }; }
export function intakeFromApi(input: unknown): BarcodeBatch { const r=asRecord(input); return { id:str(r.id),pickupTaskId:r.pickup_request_id?str(r.pickup_request_id):undefined,merchantId:r.merchant_id?str(r.merchant_id):undefined,merchantName:r.merchant_name?str(r.merchant_name):undefined,expectedShipmentIds:Array.isArray(r.expected_shipment_ids)?r.expected_shipment_ids.map((value)=>str(value)):jsonArray(r.expected_shipment_ids).map((value)=>str(value)),scannedShipmentIds:Array.isArray(r.scanned_shipment_ids)?r.scanned_shipment_ids.map((value)=>str(value)):jsonArray(r.scanned_shipment_ids).map((value)=>str(value)),unexpectedShipmentIds:Array.isArray(r.unexpected_shipment_ids)?r.unexpected_shipment_ids.map((value)=>str(value)):[],duplicateScans:Array.isArray(r.duplicate_scans)?r.duplicate_scans.map((value)=>str(value)):[],status:str(r.status)==='closed'?'closed':'open',createdAt:str(r.created_at,''),closedAt:r.closed_at?str(r.closed_at):undefined,operatorName:str(r.operator_name,'—') }; }
export function conversationFromApi(input: unknown): ChatRoomRecord { const r=asRecord(input), c=asRecord(r.counterparty), lm=asRecord(r.latest_message); return {id:str(r.id),name:str(c.name??r.subject??'محادثة'),role:str(c.type??r.participant_type??'طرف'),category:str(c.type)==='merchant'?'merchant':str(c.type)==='driver'?'driver':'internal',lastMessage:str(lm.body??r.last_message??''),unread:num(r.unread_count),linkedShipmentId:r.shipment_id?str(r.shipment_id):undefined,assignedTo:str(r.assigned_user_name??r.assigned_user_id,'—'),assignedUserId:r.assigned_user_id?str(r.assigned_user_id):undefined,status:str(r.status)==='closed'?'closed':'open',messages:[]}; }
export function messageFromApi(input: unknown): ChatMessageRecord { const r=asRecord(input); const rawFiles = Array.isArray(r.files) ? r.files : (r.file ? [r.file] : []); const attachments = rawFiles.map((value:unknown) => { const f=asRecord(value); return { id:str(f.id), name:str(f.file_name,'ملف'), mimeType:str(f.mime_type), size:num(f.size_bytes), url:f.download_url?str(f.download_url):undefined }; }); const type = str(r.message_type)==='internal_note'?'note':bool(r.is_me)?'outgoing':'incoming'; return { id:str(r.id),text:str(r.body??''),type,time:str(r.created_at,''),createdAt:str(r.created_at,''),attachments:attachments.length?attachments:undefined }; }
export function auditFromApi(input: unknown): AuditEvent { const r=asRecord(input); return { id:str(r.id),action:str(r.action,'—'),entityType:str(r.entity_type??r.resource_type,'—'),entityId:str(r.entity_id??r.resource_id,''),detail:str(r.description??r.metadata??''),actor:str(r.actor_name??r.user_id,'النظام'),createdAt:str(r.created_at,'') }; }

export function printingFromApi(input: unknown): PrintingSettings {
  const r = asRecord(input);
  const layout = str(r.default_label_layout, 'thermal_100x150');
  return {
    defaultLabelFormat: layout.startsWith('a4_') ? 'a4' : 'thermal',
    defaultCopies: Math.min(5, Math.max(1, num(r.default_copies, 1))),
    a4LabelsPerPage: 4,
    showCod: bool(r.include_cod, true),
    showContents: bool(r.include_items, false),
    barcodeFormat: 'code128',
  };
}

export function notificationFromApi(input: unknown): NotificationSettings {
  const r = asRecord(input);
  const channels = asRecord(r.channels);
  const events = asRecord(r.events);
  const hasEvent = (name: string) => Array.isArray(events[name]) && events[name].length > 0;
  return {
    inAppEnabled: bool(channels.in_app, true),
    pushDriverEnabled: bool(channels.push, true),
    pushMerchantEnabled: bool(channels.push, true),
    slaDelayEnabled: hasEvent('sla_delay') || hasEvent('shipment_delayed'),
    notifyMerchantOnApprovedStatus: hasEvent('shipment_status_approved') || hasEvent('shipment_status_changed'),
    notifyDriverOnClarification: hasEvent('driver_clarification') || hasEvent('driver_update_review'),
    whatsApp: {
      enabled: bool(channels.whatsapp, true),
      companyName: str(r.company_name) || defaultTenantOperationalSettings.notifications.whatsApp.companyName,
      defaultTemplate: str(r.whatsapp_template) || defaultTenantOperationalSettings.notifications.whatsApp.defaultTemplate,
    },
  };
}

export function settingsFromApi(deliveryRaw: unknown, pricingRaw: unknown, proofRaw: unknown, locationRaw: unknown, printingRaw?: unknown, notificationRaw?: unknown): TenantOperationalSettings {
  const d=asRecord(deliveryRaw), p=asRecord(pricingRaw), pr=asRecord(proofRaw), l=asRecord(locationRaw); const fees=(key:string)=>asRecord(p[key]); const mode=(f:AnyRecord):'disabled'|'fixed'|'percentage'=>!f.enabled||f.mode==='none'?'disabled':f.mode==='percentage'?'percentage':'fixed'; const val=(f:AnyRecord)=>f.amount_minor!=null?minor(f.amount_minor):num(f.percentage_basis_points)/100;
  const requiredProof = jsonArray(d.required_delivery_proof_types).map((value)=>str(value));
  const apiRates = jsonArray(p.governorate_rates).map((rate): GovernorateRate => {
    const r = asRecord(rate);
    const merchantDeliveryFee = r.merchant_delivery_fee_minor != null ? minor(r.merchant_delivery_fee_minor) : r.delivery_fee_minor != null ? minor(r.delivery_fee_minor) : num(r.merchant_delivery_fee ?? r.delivery_fee);
    const driverDeliveryCost = r.driver_delivery_cost_minor != null ? minor(r.driver_delivery_cost_minor) : num(r.driver_delivery_cost);
    return {
      id: str(r.id ?? r.governorate, `gov-${Math.random().toString(36).slice(2)}`),
      governorate: str(r.governorate ?? r.zone_name, 'نطاق غير محدد'),
      merchantDeliveryFee,
      driverDeliveryCost,
      deliveryFee: merchantDeliveryFee,
      returnFee: r.return_fee_minor != null ? minor(r.return_fee_minor) : num(r.return_fee),
      estimatedDays: num(r.estimated_days, 1),
    };
  });
  const merchantSpecificRates = jsonArray(p.merchant_specific_rates).map((rate) => {
    const r = asRecord(rate);
    const merchantDeliveryFee = r.merchant_delivery_fee_minor != null ? minor(r.merchant_delivery_fee_minor) : num(r.merchant_delivery_fee);
    return { id: str(r.id, `mrate-${Math.random().toString(36).slice(2)}`), merchantId: str(r.merchant_id), merchantName: str(r.merchant_name, 'تاجر'), governorate: str(r.governorate, 'القاهرة'), merchantDeliveryFee, driverDeliveryCost: r.driver_delivery_cost_minor != null ? minor(r.driver_delivery_cost_minor) : num(r.driver_delivery_cost), returnFee: r.return_fee_minor != null ? minor(r.return_fee_minor) : num(r.return_fee), effectiveFrom: str(r.effective_from, new Date().toISOString().slice(0, 10)), active: bool(r.active, true) };
  });
  const weightTiers = jsonArray(p.weight_tiers).map((tier) => {
    const r = asRecord(tier);
    return { id: str(r.id, `weight-${Math.random().toString(36).slice(2)}`), fromKg: num(r.from_kg), toKg: r.to_kg == null ? undefined : num(r.to_kg), merchantExtraFee: r.merchant_extra_fee_minor != null ? minor(r.merchant_extra_fee_minor) : num(r.merchant_extra_fee), driverExtraCost: r.driver_extra_cost_minor != null ? minor(r.driver_extra_cost_minor) : num(r.driver_extra_cost) };
  });
  return { delivery:{
      ...defaultTenantOperationalSettings.delivery,
      freeAttempts:num(p.free_delivery_attempts,3),
      // These legacy UI fields are not independently configurable in the API.
      // Keep conservative read-only semantics rather than inventing server state.
      requireCompanyApprovalForDriverUpdates:true,
      partialDeliveryEnabled:true,
      allowExtraAttempts: asRecord(p.extra_attempt_fee).enabled !== false,
    }, pricing:{
      returnFeeMode:mode(fees('return_fee')),
      returnFeeValue:val(fees('return_fee')),
      extraAttemptFeeMode:mode(fees('extra_attempt_fee')),
      extraAttemptFeeValue:val(fees('extra_attempt_fee')),
      collectionFeeMode:mode(fees('collection_fee')),
      collectionFeeValue:val(fees('collection_fee')),
      collectionFeeMinimum:fees('collection_fee').minimum_minor!=null?minor(fees('collection_fee').minimum_minor):0,
      collectionFeeMaximum:fees('collection_fee').maximum_minor!=null?minor(fees('collection_fee').maximum_minor):0,
      vatEnabled:bool(asRecord(p.vat).enabled),
      vatRate:num(asRecord(p.vat).rate_basis_points)/100,
      pricesIncludeVat:bool(asRecord(p.vat).prices_include_tax),
      taxableShippingFee:jsonArray(asRecord(p.vat).taxable_fee_types).includes('delivery'),
      taxableReturnFee:jsonArray(asRecord(p.vat).taxable_fee_types).includes('return'),
      taxableExtraAttemptFee:jsonArray(asRecord(p.vat).taxable_fee_types).includes('extra_attempt'),
      taxableCollectionFee:jsonArray(asRecord(p.vat).taxable_fee_types).includes('collection'),
      baseWeightKg: num(p.base_weight_kg, defaultTenantOperationalSettings.pricing.baseWeightKg),
      extraWeightKgFee: num(p.extra_weight_kg_fee, defaultTenantOperationalSettings.pricing.extraWeightKgFee),
      pickupFreeThreshold: num(p.pickup_free_threshold, defaultTenantOperationalSettings.pricing.pickupFreeThreshold),
      pickupFeeUnderThreshold: num(p.pickup_fee_under_threshold, defaultTenantOperationalSettings.pricing.pickupFeeUnderThreshold),
      driverPickupReward: num(p.driver_pickup_reward, defaultTenantOperationalSettings.pricing.driverPickupReward),
      governorateRates: apiRates.length ? apiRates : defaultTenantOperationalSettings.pricing.governorateRates,
      merchantSpecificRates: merchantSpecificRates.length ? merchantSpecificRates : defaultTenantOperationalSettings.pricing.merchantSpecificRates,
      weightTiers: weightTiers.length ? weightTiers : defaultTenantOperationalSettings.pricing.weightTiers,
    }, proof:{recipientNameRequired:bool(pr.recipient_name_required,requiredProof.includes('recipient_name')),photoRequired:bool(pr.photo_required,requiredProof.includes('photo')),minimumPhotoCount:num(pr.minimum_photo_count,1),gpsRequired:bool(pr.gps_required,requiredProof.includes('location_snapshot')),preferredAccuracyMeters:num(pr.preferred_accuracy_meters ?? d.preferred_accuracy_meters,50),maximumAccuracyMeters:num(pr.maximum_accuracy_meters ?? d.maximum_accepted_accuracy_meters,150),deliveryGeofenceMeters:num(pr.delivery_geofence_meters ?? d.delivery_geofence_radius_meters,150),photoFromCameraOnly:bool(pr.photo_from_camera_only),otpSupported:bool(pr.otp_supported,requiredProof.includes('otp')),signatureSupported:bool(pr.signature_supported,requiredProof.includes('signature'))}, location:{trackingDuringShiftOnly:bool(l.tracking_during_shift_only,true),idleIntervalSeconds:num(l.idle_interval_seconds ?? d.idle_tracking_interval_seconds,180),activeTaskIntervalSeconds:num(l.active_task_interval_seconds ?? d.active_tracking_interval_seconds,30),proofSnapshotMaxAgeSeconds:num(l.proof_snapshot_max_age_seconds ?? d.max_location_age_seconds,60),rawLocationRetentionDays:num(l.raw_location_retention_days ?? d.raw_location_retention_days,90),offlineBatchEnabled:bool(l.offline_batch_enabled,true)}, printing: printingRaw ? printingFromApi(printingRaw) : defaultTenantOperationalSettings.printing, notifications: notificationRaw ? notificationFromApi(notificationRaw) : defaultTenantOperationalSettings.notifications, updatedAt:new Date().toISOString(), updatedBy:'الخادم' };
}

export function printingToApi(v: PrintingSettings, current: AnyRecord, version:number) {
  return {
    default_label_layout: v.defaultLabelFormat === 'thermal' ? 'thermal_100x150' : 'a4_4',
    default_copies: Math.min(5, Math.max(1, Math.round(v.defaultCopies))),
    include_cod: v.showCod,
    include_items: v.showContents,
    include_merchant_phone: bool(current.include_merchant_phone, false),
    show_company_logo: bool(current.show_company_logo, true),
    footer_text: current.footer_text ?? null,
    barcode_format: str(current.barcode_format, 'CODE128'),
    version,
  };
}

export function notificationToApi(v: NotificationSettings, current: AnyRecord, version:number) {
  const events = asRecord(current.events);
  const setEvent = (key:string, enabled:boolean, audience:string) => enabled ? (Array.isArray(events[key]) && events[key].length ? events[key] : [audience]) : [];
  return {
    channels: {
      in_app: v.inAppEnabled,
      push: v.pushDriverEnabled || v.pushMerchantEnabled,
      email: bool(asRecord(current.channels).email, false),
      sms: bool(asRecord(current.channels).sms, false),
    },
    events: {
      ...events,
      sla_delay: setEvent('sla_delay', v.slaDelayEnabled, 'operations'),
      shipment_status_approved: setEvent('shipment_status_approved', v.notifyMerchantOnApprovedStatus, 'merchant'),
      driver_clarification: setEvent('driver_clarification', v.notifyDriverOnClarification, 'driver'),
    },
    quiet_hours: current.quiet_hours ?? {},
    version,
  };
}
export function pricingToApi(value: PricingPolicySettings, version:number, currency='EGP', freeAttempts=defaultTenantOperationalSettings.delivery.freeAttempts) { const fee=(mode:'disabled'|'fixed'|'percentage',v:number,min=0,max=0)=> mode==='disabled'?{enabled:false,mode:'none'}:mode==='percentage'?{enabled:true,mode:'percentage',percentage_basis_points:Math.round(v*100),...(min?{minimum_minor:Math.round(min*100)}:{}),...(max?{maximum_minor:Math.round(max*100)}:{})}:{enabled:true,mode:'fixed',amount_minor:Math.round(v*100)}; const rates=(value.governorateRates?.length?value.governorateRates:defaultGovernorateRates).map((rate)=>({id:rate.id,governorate:rate.governorate,merchant_delivery_fee_minor:Math.round((rate.merchantDeliveryFee??rate.deliveryFee)*100),driver_delivery_cost_minor:Math.round((rate.driverDeliveryCost??0)*100),delivery_fee_minor:Math.round((rate.merchantDeliveryFee??rate.deliveryFee)*100),return_fee_minor:Math.round(rate.returnFee*100),estimated_days:rate.estimatedDays})); const merchantRates=(value.merchantSpecificRates??[]).map((rate)=>({id:rate.id,merchant_id:rate.merchantId,merchant_name:rate.merchantName,governorate:rate.governorate,merchant_delivery_fee_minor:Math.round(rate.merchantDeliveryFee*100),driver_delivery_cost_minor:Math.round(rate.driverDeliveryCost*100),return_fee_minor:Math.round(rate.returnFee*100),effective_from:rate.effectiveFrom,active:rate.active})); const weightTiers=(value.weightTiers??[]).map((tier)=>({id:tier.id,from_kg:tier.fromKg,to_kg:tier.toKg??null,merchant_extra_fee_minor:Math.round(tier.merchantExtraFee*100),driver_extra_cost_minor:Math.round(tier.driverExtraCost*100)})); return {currency,free_delivery_attempts:freeAttempts,return_fee:fee(value.returnFeeMode,value.returnFeeValue),extra_attempt_fee:fee(value.extraAttemptFeeMode,value.extraAttemptFeeValue),collection_fee:fee(value.collectionFeeMode,value.collectionFeeValue,value.collectionFeeMinimum,value.collectionFeeMaximum),governorate_rates:rates,merchant_specific_rates:merchantRates,weight_tiers:weightTiers,base_weight_kg:value.baseWeightKg,extra_weight_kg_fee:value.extraWeightKgFee,pickup_free_threshold:value.pickupFreeThreshold,pickup_fee_under_threshold:value.pickupFeeUnderThreshold,driver_pickup_reward:value.driverPickupReward,vat:{enabled:value.vatEnabled,rate_basis_points:Math.round(value.vatRate*100),prices_include_tax:value.pricesIncludeVat,taxable_fee_types:[value.taxableShippingFee&&'delivery',value.taxableReturnFee&&'return',value.taxableExtraAttemptFee&&'extra_attempt',value.taxableCollectionFee&&'collection'].filter(Boolean)},version}; }
export function proofToApi(v:ProofPolicySettings,version:number){return {recipient_name_required:v.recipientNameRequired,photo_required:v.photoRequired,minimum_photo_count:v.minimumPhotoCount,gps_required:v.gpsRequired,preferred_accuracy_meters:v.preferredAccuracyMeters,maximum_accuracy_meters:v.maximumAccuracyMeters,delivery_geofence_meters:v.deliveryGeofenceMeters,photo_from_camera_only:v.photoFromCameraOnly,otp_supported:v.otpSupported,signature_supported:v.signatureSupported,version};}
export function locationToApi(v:DriverLocationPolicySettings,version:number){return {tracking_during_shift_only:v.trackingDuringShiftOnly,idle_interval_seconds:v.idleIntervalSeconds,active_task_interval_seconds:v.activeTaskIntervalSeconds,proof_snapshot_max_age_seconds:v.proofSnapshotMaxAgeSeconds,raw_location_retention_days:v.rawLocationRetentionDays,offline_batch_enabled:v.offlineBatchEnabled,version};}
export function deliveryToApi(_v:DeliveryPolicySettings,current:AnyRecord,version:number){return {...current,required_delivery_proof_types:current.required_delivery_proof_types??['photo','recipient_name','location_snapshot'],attempt_location_required:current.attempt_location_required??true,max_location_age_seconds:current.max_location_age_seconds??60,preferred_accuracy_meters:current.preferred_accuracy_meters??50,maximum_accepted_accuracy_meters:current.maximum_accepted_accuracy_meters??150,delivery_geofence_radius_meters:current.delivery_geofence_radius_meters??150,idle_tracking_interval_seconds:current.idle_tracking_interval_seconds??180,active_tracking_interval_seconds:current.active_tracking_interval_seconds??30,raw_location_retention_days:current.raw_location_retention_days??90,allow_low_accuracy_with_exception:current.allow_low_accuracy_with_exception??true,version};}
