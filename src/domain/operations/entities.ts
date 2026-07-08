export type PickupTaskStatus = 'assigned' | 'driverSubmitted' | 'approved' | 'needsReview';
export type DeliveryBatchStatus = 'draft' | 'assigned' | 'inProgress' | 'completed';
export type DriverShipmentUpdateStatus = 'pendingAdminApproval' | 'approvedForMerchant' | 'rejectedForReview';
export type DriverReportedShipmentStatus = 'pickedUp' | 'inTransit' | 'delivered' | 'failed' | 'returned' | 'postponed';

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
