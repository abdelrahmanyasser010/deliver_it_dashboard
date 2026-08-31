import type { Driver, Merchant, Shipment } from '../../domain/logistics/entities';
import type { DeliveryBatch, DriverShipmentUpdate, PickupTask, ReturnCase } from '../../domain/operations/entities';
import type { DriverFinancialAdjustment, FinancialLedgerEntry, MerchantSettlement, OperationalExpense } from '../../domain/finance/entities';
import type { DeliveryPolicySettings, DriverLocationPolicySettings, NotificationSettings, PricingPolicySettings, PrintingSettings, ProofPolicySettings, TenantOperationalSettings } from '../../domain/settings/entities';

export interface BarcodeBatch {
  id: string;
  pickupTaskId?: string;
  merchantId?: string;
  merchantName?: string;
  expectedShipmentIds: string[];
  scannedShipmentIds: string[];
  unexpectedShipmentIds: string[];
  duplicateScans: string[];
  status: 'open' | 'closed';
  createdAt: string;
  closedAt?: string;
  operatorName: string;
}

export interface ChatAttachmentRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url?: string;
}

export interface ChatMessageRecord {
  id: string;
  text: string;
  type: 'incoming' | 'outgoing' | 'note';
  time: string;
  createdAt: string;
  attachments?: ChatAttachmentRecord[];
}

export interface ChatRoomRecord {
  id: string;
  name: string;
  role: string;
  category: 'merchant' | 'driver' | 'internal';
  lastMessage: string;
  unread: number;
  linkedShipmentId?: string;
  assignedTo: string;
  assignedUserId?: string;
  status: 'open' | 'closed';
  pinned?: boolean;
  messages: ChatMessageRecord[];
}

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  actor: string;
  createdAt: string;
}

export interface DeliveryState {
  shipments: Shipment[];
  drivers: Driver[];
  merchants: Merchant[];
  pickupTasks: PickupTask[];
  deliveryBatches: DeliveryBatch[];
  driverUpdates: DriverShipmentUpdate[];
  returnCases: ReturnCase[];
  settlements: MerchantSettlement[];
  ledgerEntries: FinancialLedgerEntry[];
  operationalExpenses: OperationalExpense[];
  driverAdjustments: DriverFinancialAdjustment[];
  barcodeBatches: BarcodeBatch[];
  chatRooms: ChatRoomRecord[];
  auditEvents: AuditEvent[];
  closedPeriods: string[];
  settings: TenantOperationalSettings;
  lastSyncedAt: string;
}

export type DeliveryCommand =
  | { type: 'shipment/assignDriver'; shipmentIds: string[]; driverId: string; actor?: string }
  | { type: 'shipment/transition'; shipmentIds: string[]; nextStatus: Shipment['status']; reason: string; actor?: string }
  | { type: 'shipment/addAttempt'; shipmentId: string; note: string; outcome?: 'noAnswer' | 'postponed' | 'wrongAddress' | 'refused' | 'failed' | 'delivered'; actor?: string }
  | { type: 'shipment/overrideFee'; shipmentId: string; deliveryFee: number; reason: string; actor?: string }
  | { type: 'shipment/import'; shipments: Shipment[]; actor?: string }
  | { type: 'shipment/requestSettlement'; shipmentIds: string[]; actor?: string }
  | { type: 'pickup/approve'; taskId: string; actor?: string }
  | { type: 'pickup/review'; taskId: string; actor?: string }
  | { type: 'batch/assign'; batchId: string; driverId: string; actor?: string }
  | { type: 'driverUpdate/approve'; updateId: string; actor?: string }
  | { type: 'driverUpdate/reject'; updateId: string; actor?: string }
  | { type: 'return/receiveAtHub'; returnCaseId: string; actor?: string }
  | { type: 'return/assignDriver'; returnCaseId: string; driverId: string; actor?: string }
  | { type: 'return/markOutForMerchant'; returnCaseId: string; actor?: string }
  | { type: 'return/confirmMerchantReceipt'; returnCaseId: string; proofReference: string; actor?: string }
  | { type: 'barcode/create'; batch: BarcodeBatch; actor?: string }
  | { type: 'barcode/scan'; batchId: string; shipmentId: string; actor?: string }
  | { type: 'barcode/undo'; batchId: string; actor?: string }
  | { type: 'barcode/close'; batchId: string; actor?: string }
  | { type: 'exception/resolve'; shipmentId: string; resolution: string; driverId?: string; actor?: string }
  | { type: 'driver/upsert'; driver: Driver; actor?: string }
  | { type: 'driver/suspend'; driverId: string; reason: string; policy: 'complete_current_tasks' | 'withdraw_and_reassign' | 'immediate_stop'; actor?: string }
  | { type: 'driver/reactivate'; driverId: string; reason?: string; actor?: string }
  | { type: 'driver/archive'; driverId: string; reason: string; actor?: string }
  | { type: 'driver/resetAccess'; driverId: string; invalidateSessions: boolean; forcePasswordChange: boolean; actor?: string }
  | { type: 'merchant/upsert'; merchant: Merchant; actor?: string }
  | { type: 'merchant/archive'; merchantId: string; reason: string; actor?: string }
  | { type: 'settlement/create'; shipmentIds: string[]; actor?: string }
  | { type: 'settlement/approve'; settlementId: string; actor?: string }
  | { type: 'settlement/pay'; settlementId: string; paymentReference: string; actor?: string }
  | { type: 'finance/reconcileShipment'; shipmentId: string; remittedCash: number; note: string; actor?: string }
  | { type: 'finance/addOperationalExpense'; expense: OperationalExpense; actor?: string }
  | { type: 'finance/addDriverAdjustment'; adjustment: DriverFinancialAdjustment; actor?: string }
  | { type: 'finance/reviewOperationalExpense'; expenseId: string; status: OperationalExpense['status']; note: string; actor?: string }
  | { type: 'finance/reviewDriverAdjustment'; adjustmentId: string; status: DriverFinancialAdjustment['status']; note: string; actor?: string }
  | { type: 'ledger/postAll'; actor?: string }
  | { type: 'period/close'; period: string; actor?: string }
  | { type: 'settings/updateDelivery'; policy: DeliveryPolicySettings; actor?: string }
  | { type: 'settings/updatePricing'; policy: PricingPolicySettings; actor?: string }
  | { type: 'settings/updateProof'; policy: ProofPolicySettings; actor?: string }
  | { type: 'settings/updateLocation'; policy: DriverLocationPolicySettings; actor?: string }
  | { type: 'settings/updatePrinting'; policy: PrintingSettings; actor?: string }
  | { type: 'settings/updateNotifications'; policy: NotificationSettings; actor?: string }
  | { type: 'chat/send'; roomId: string; text: string; note: boolean; attachments?: ChatAttachmentRecord[]; actor?: string }
  | { type: 'chat/toggle'; roomId: string; actor?: string }
  | { type: 'chat/transfer'; roomId: string; assignedTo: string; actor?: string }
  | { type: 'chat/read'; roomId: string; actor?: string };

export interface CommandError { entityId?: string; message: string; }
export interface CommandResult { ok: boolean; message: string; errors?: CommandError[]; createdId?: string; }
