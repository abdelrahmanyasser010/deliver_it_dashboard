import type {
  DeliveryBatch,
  DriverShipmentUpdate,
  OperationsMetrics,
  PickupTask,
} from '../../domain/operations/entities';

const pickupTasks: PickupTask[] = [
  {
    id: 'PCK-2101',
    merchantId: 'BRN-001',
    merchantName: 'متجر الأزياء',
    merchantAddress: 'مدينة نصر، شارع مصطفى النحاس',
    driverId: 'DRV-002',
    driverName: 'أحمد سامي',
    status: 'driverSubmitted',
    assignedAt: 'اليوم 09:00 ص',
    submittedAt: 'اليوم 10:05 ص',
    items: [
      { shipmentId: 'SHP-0001', expected: true, driverConfirmed: true, codAmount: 850 },
      { shipmentId: 'SHP-0002', expected: true, driverConfirmed: true, codAmount: 640 },
      { shipmentId: 'SHP-0003', expected: true, driverConfirmed: false, codAmount: 1200 },
    ],
  },
  {
    id: 'PCK-2102',
    merchantId: 'BRN-003',
    merchantName: 'هوم ديكور',
    merchantAddress: 'الهرم، شارع العريش',
    driverId: 'DRV-004',
    driverName: 'خالد إبراهيم',
    status: 'assigned',
    assignedAt: 'اليوم 11:30 ص',
    items: [
      { shipmentId: 'SHP-0017', expected: true, driverConfirmed: false, codAmount: 320 },
      { shipmentId: 'SHP-0018', expected: true, driverConfirmed: false, codAmount: 990 },
    ],
  },
];

const deliveryBatches: DeliveryBatch[] = [
  {
    id: 'DLV-B-3301',
    driverId: 'DRV-001',
    driverName: 'محمد علي',
    zone: 'القاهرة - مدينة نصر',
    status: 'inProgress',
    shipmentIds: ['SHP-0007', 'SHP-0008', 'SHP-0009', 'SHP-0010'],
    createdAt: 'اليوم 08:45 ص',
  },
  {
    id: 'DLV-B-3302',
    zone: 'الجيزة - الهرم',
    status: 'draft',
    shipmentIds: ['SHP-0011', 'SHP-0012', 'SHP-0013'],
    createdAt: 'اليوم 12:10 م',
  },
];

const driverUpdates: DriverShipmentUpdate[] = [
  {
    id: 'UPD-7001',
    shipmentId: 'SHP-0007',
    driverId: 'DRV-001',
    driverName: 'محمد علي',
    merchantName: 'إلكترونيات بلس',
    reportedStatus: 'delivered',
    previousStatus: 'مع المندوب',
    customerName: 'سارة محمود',
    evidence: 'صورة إثبات التسليم مرفقة',
    note: 'تم التحصيل بالكامل',
    createdAt: 'اليوم 01:15 م',
    status: 'pendingAdminApproval',
  },
  {
    id: 'UPD-7002',
    shipmentId: 'SHP-0010',
    driverId: 'DRV-001',
    driverName: 'محمد علي',
    merchantName: 'متجر الأزياء',
    reportedStatus: 'failed',
    previousStatus: 'في الطريق',
    customerName: 'طارق محمد',
    evidence: 'تسجيل محاولة اتصال',
    note: 'العميل لا يرد',
    createdAt: 'اليوم 12:50 م',
    status: 'pendingAdminApproval',
  },
  {
    id: 'UPD-7003',
    shipmentId: 'SHP-0008',
    driverId: 'DRV-001',
    driverName: 'محمد علي',
    merchantName: 'هوم ديكور',
    reportedStatus: 'postponed',
    previousStatus: 'مع المندوب',
    customerName: 'كريم إبراهيم',
    note: 'العميل طلب التوصيل غدا',
    createdAt: 'اليوم 11:05 ص',
    status: 'approvedForMerchant',
  },
];

export const operationsMockRepository = {
  getPickupTasks(): PickupTask[] {
    return pickupTasks;
  },
  getDeliveryBatches(): DeliveryBatch[] {
    return deliveryBatches;
  },
  getDriverUpdates(): DriverShipmentUpdate[] {
    return driverUpdates;
  },
  getMetrics(): OperationsMetrics {
    return {
      pickupTasksWaitingApproval: pickupTasks.filter((task) => task.status === 'driverSubmitted').length,
      deliveryBatchesInProgress: deliveryBatches.filter((batch) => batch.status === 'inProgress').length,
      pendingDriverUpdates: driverUpdates.filter((update) => update.status === 'pendingAdminApproval').length,
      shipmentsReadyForAssignment: deliveryBatches
        .filter((batch) => batch.status === 'draft')
        .reduce((sum, batch) => sum + batch.shipmentIds.length, 0),
    };
  },
};
