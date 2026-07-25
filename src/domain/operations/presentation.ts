import type {
  DeliveryBatchStatus,
  DriverReportedShipmentStatus,
  DriverShipmentUpdateStatus,
  PickupTaskStatus,
} from './entities';

export const pickupTaskStatusLabels: Record<PickupTaskStatus, string> = {
  assigned: 'مكلفة للمندوب',
  driverSubmitted: 'المندوب أكد الاستلام',
  approved: 'معتمدة من الشركة',
  needsReview: 'تحتاج مراجعة',
};

export const deliveryBatchStatusLabels: Record<DeliveryBatchStatus, string> = {
  draft: 'تجهيز',
  assigned: 'مكلفة للمندوب',
  inProgress: 'قيد التوصيل',
  completed: 'مكتملة',
};

export const driverUpdateStatusLabels: Record<DriverShipmentUpdateStatus, string> = {
  pendingAdminApproval: 'بانتظار اعتمادك',
  approvedForMerchant: 'ظهر للتاجر',
  rejectedForReview: 'مرفوض للمراجعة',
};

export const reportedStatusLabels: Record<DriverReportedShipmentStatus, string> = {
  pickedUp: 'تم الاستلام',
  inTransit: 'في الطريق',
  delivered: 'تم التسليم',
  partiallyDelivered: 'تم التسليم جزئيًا',
  failed: 'فشل التسليم',
  returned: 'مرتجع',
  postponed: 'مؤجل',
};

export const operationTone: Record<
  PickupTaskStatus | DeliveryBatchStatus | DriverShipmentUpdateStatus | DriverReportedShipmentStatus,
  string
> = {
  assigned: 'info',
  driverSubmitted: 'warning',
  approved: 'success',
  needsReview: 'danger',
  draft: 'warning',
  inProgress: 'info',
  completed: 'success',
  pendingAdminApproval: 'warning',
  approvedForMerchant: 'success',
  rejectedForReview: 'danger',
  pickedUp: 'info',
  inTransit: 'info',
  delivered: 'success',
  partiallyDelivered: 'warning',
  failed: 'danger',
  returned: 'danger',
  postponed: 'warning',
};
