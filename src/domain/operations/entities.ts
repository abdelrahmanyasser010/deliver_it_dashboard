export type PickupTaskStatus = 'assigned' | 'driverSubmitted' | 'approved' | 'needsReview';
export type DeliveryBatchStatus = 'draft' | 'assigned' | 'inProgress' | 'completed';
export type DriverShipmentUpdateStatus = 'pendingAdminApproval' | 'approvedForMerchant' | 'rejectedForReview';
export type DriverReportedShipmentStatus = 'pickedUp' | 'inTransit' | 'delivered' | 'partiallyDelivered' | 'failed' | 'returned' | 'postponed';

export interface PickupTaskItem {
  shipmentId: string;
  expected: boolean;
  driverConfirmed: boolean;
  codAmount: number;
}

export interface PickupTask {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantAddress: string;
  driverId: string;
  driverName: string;
  status: PickupTaskStatus;
  assignedAt: string;
  submittedAt?: string;
  items: PickupTaskItem[];
  reviewNote?: string;
}

export interface DeliveryBatch {
  id: string;
  driverId?: string;
  driverName?: string;
  zone: string;
  status: DeliveryBatchStatus;
  shipmentIds: string[];
  createdAt: string;
}

export interface DriverPartialDeliveryLine {
  itemIndex: number;
  itemName: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  undeliveredAction?: 'retry' | 'return';
  reason?: string;
}

export interface DriverShipmentUpdate {
  id: string;
  shipmentId: string;
  driverId: string;
  driverName: string;
  merchantName: string;
  reportedStatus: DriverReportedShipmentStatus;
  previousStatus: string;
  customerName: string;
  evidence?: string;
  evidenceReference?: string;
  recipientName?: string;
  location?: { latitude: number; longitude: number; accuracyMeters: number; capturedAt: string; distanceFromDestinationMeters?: number };
  partialDeliveryLines?: DriverPartialDeliveryLine[];
  reportedCollectedCash?: number;
  requiresManualReview?: boolean;
  reviewReason?: string;
  note?: string;
  createdAt: string;
  status: DriverShipmentUpdateStatus;
}

export interface OperationsMetrics {
  pickupTasksWaitingApproval: number;
  deliveryBatchesInProgress: number;
  pendingDriverUpdates: number;
  shipmentsReadyForAssignment: number;
}

export type ReturnCaseStatus = 'returningToHub' | 'receivedAtHub' | 'awaitingMerchantAssignment' | 'assignedToDriver' | 'outForMerchantReturn' | 'returnedToMerchant';

export interface ReturnCase {
  id: string;
  shipmentId: string;
  rootShipmentId: string;
  merchantId: string;
  merchantName: string;
  sourceDriverId?: string;
  sourceDriverName?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  status: ReturnCaseStatus;
  reason: string;
  itemSummary: string;
  quantity: number;
  returnFee: number;
  receivedAtHubAt?: string;
  assignedAt?: string;
  completedAt?: string;
  proofReference?: string;
  createdAt: string;
  updatedAt: string;
}
