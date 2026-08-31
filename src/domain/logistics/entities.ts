export const shipmentStatuses = [
  'draft',
  'readyToShip',
  'receivedAtOffice',
  'deliveredToDriver',
  'inTransit',
  'delivered',
  'partiallyDelivered',
  'postponed',
  'failedToDeliver',
  'returned',
] as const;

export type ShipmentStatus = (typeof shipmentStatuses)[number];

export const shipmentTaskStatuses = [
  'none',
  'needsPickup',
  'needsOfficeConfirmation',
  'needsDriverAssignment',
  'needsStatusApproval',
  'needsCustomerService',
  'needsReturnProcessing',
  'needsFinancialReview',
] as const;

export type ShipmentTaskStatus = (typeof shipmentTaskStatuses)[number];

export const shipmentFinancialStatuses = [
  'notDue',
  'awaitingCollection',
  'collected',
  'partiallyCollected',
  'remitted',
  'inSettlement',
  'settled',
  'discrepancy',
] as const;

export type ShipmentFinancialStatus = (typeof shipmentFinancialStatuses)[number];
export type ShipmentPriority = 'normal' | 'high' | 'urgent';
export type PaymentType = 'cashOnDelivery' | 'prepaid';
export type SettlementStatus = 'unsettled' | 'settled';
export type DriverStatus = 'active' | 'off';
export type DriverAccountStatus = 'active' | 'restricted' | 'suspended' | 'archived';
export type DriverOperationalStatus = 'off_shift' | 'available' | 'busy' | 'pickup_task' | 'delivery_task' | 'offline';
export type DriverAvailability = 'available' | 'busy' | 'break' | 'offline';

export type ShipmentItemDisposition = 'delivered' | 'retry' | 'return';

export interface ShipmentItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  deliveredQuantity?: number;
  pendingQuantity?: number;
  returnedQuantity?: number;
  disposition?: ShipmentItemDisposition;
  dispositionReason?: string;
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  type: 'created' | 'statusChanged' | 'driverAssigned' | 'deliveryAttempt' | 'barcodeReceived' | 'financial' | 'note';
  title: string;
  detail: string;
  createdAt: string;
  actor: string;
  fromStatus?: ShipmentStatus;
  toStatus?: ShipmentStatus;
}

export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
  distanceFromDestinationMeters?: number;
}

export interface DeliveryProof {
  type: 'photo' | 'otp' | 'signature';
  reference: string;
  recipientName: string;
  capturedAt: string;
  location?: LocationSnapshot;
  reviewStatus: 'pending' | 'accepted' | 'needsReview';
  reviewNote?: string;
}

export interface DeliveryAttempt {
  id: string;
  shipmentId: string;
  outcome: 'noAnswer' | 'postponed' | 'wrongAddress' | 'refused' | 'failed' | 'delivered';
  note: string;
  createdAt: string;
  driverId?: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  city: string;
  address: string;
  status: ShipmentStatus;
  taskStatus: ShipmentTaskStatus;
  financialStatus: ShipmentFinancialStatus;
  priority: ShipmentPriority;
  paymentType: PaymentType;
  total: number;
  deliveryFee: number;
  discount: number;
  collectedCash: number;
  expectedCollection: number;
  remittedCash: number;
  items: ShipmentItem[];
  driverId?: string;
  driverName?: string;
  merchantId: string;
  merchantName: string;
  createdAt: string;
  lastUpdatedAt: string;
  statusChangedAt: string;
  expectedDeliveryAt?: string;
  attemptCount: number;
  exceptionReason?: string;
  settlementStatus: SettlementStatus;
  settlementId?: string;
  pickupTaskId?: string;
  deliveryBatchId?: string;
  rootShipmentId?: string;
  parentShipmentId?: string;
  splitSequence?: number;
  childShipmentIds?: string[];
  deliveryProof?: DeliveryProof;
  merchantVisibleStatus?: string;
  weightKg?: number;
  feeOverrideReason?: string;
  originalDeliveryFee?: number;
  pricingSnapshot?: {
    shippingFee: number;
    merchantDeliveryFee?: number;
    driverDeliveryCost?: number;
    grossShippingProfit?: number;
    returnFeeMode: 'disabled' | 'fixed' | 'percentage';
    returnFeeValue: number;
    freeAttempts: number;
    extraAttemptFeeMode: 'disabled' | 'fixed' | 'percentage';
    extraAttemptFeeValue: number;
    collectionFeeMode: 'disabled' | 'fixed' | 'percentage';
    collectionFeeValue: number;
    vatEnabled: boolean;
    vatRate: number;
  };
  version?: number;
  events?: ShipmentEvent[];
  attempts?: DeliveryAttempt[];
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  zone: string;
  zoneId?: string;
  shipmentsCount: number;
  pendingCash: number;
  deliveredToday: number;
  status: DriverStatus;
  availability: DriverAvailability;
  capacity: number;
  activeLoad: number;
  shiftEndsAt: string;
  lastLocationUpdateAt: string;
  successRate: number;
  vehicleType?: 'motorcycle' | 'car' | 'van';
  vehicleNumber?: string;
  userCode?: string;
  accountStatus?: DriverAccountStatus;
  operationalStatus?: DriverOperationalStatus;
  branchId?: string;
  branchName?: string;
  serviceAreaIds?: string[];
  taskTypes?: Array<'pickup' | 'delivery' | 'returns'>;
  maxBatchShipments?: number;
  maxOpenTasks?: number;
  onShift?: boolean;
  lastSeenAt?: string;
  archivedAt?: string;
  version?: number;
}

export interface MerchantBranch {
  id: string;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
  pickupWindow: string;
  active: boolean;
}

export interface PricingRule {
  id: string;
  scope: string;
  deliveryFee: number;
  driverDeliveryCost?: number;
  returnFee: number;
  collectionFee: number;
  estimatedDays: number;
}

export interface MerchantPerformance {
  successRate: number;
  returnRate: number;
  addressQuality: number;
  averageDeliveryHours: number;
  topGovernorate: string;
  topReturnReason: string;
}

export interface Merchant {
  id: string;
  name: string;
  code?: string;
  legalName?: string;
  email?: string;
  status?: 'pending_onboarding' | 'active' | 'suspended' | 'archived';
  phone: string;
  logoUrl: string;
  shipmentsCount: number;
  pendingSettlement: number;
  totalOrderValue: number;
  joinedAt: string;
  branchName: string;
  settlementCycle: 'daily' | 'twiceWeekly' | 'weekly';
  priorityLevel: 'standard' | 'priority';
  branches?: MerchantBranch[];
  pricingRules?: PricingRule[];
  performance?: MerchantPerformance;
  bankAccountReference?: string;
  accountManagerName?: string;
  settlementMethod?: 'bank' | 'wallet' | 'instapay' | 'cash';
  taxId?: string;
  registrationNumber?: string;
  usersCount?: number;
  documentsCount?: number;
  version?: number;
}


export interface DashboardStats {
  totalShipments: number;
  todayShipments: number;
  yesterdayShipments: number;
  deliveredToday: number;
  deliveredYesterday: number;
  inTransit: number;
  returned: number;
  delayedShipments: number;
  unassignedShipments: number;
  pendingApprovals: number;
  pendingReturns: number;
  cashDiscrepancies: number;
  totalCashCollected: number;
  remittedCash: number;
  cashWithDrivers: number;
  pendingSettlement: number;
  activeDrivers: number;
  totalMerchants: number;
}

export interface DriverSummary {
  activeDrivers: number;
  totalDrivers: number;
  pendingCash: number;
  deliveredToday: number;
}

export interface MerchantSummary {
  totalMerchants: number;
  pendingSettlement: number;
  totalOrderValue: number;
}

export interface ShipmentFinancials {
  itemsSubtotal: number;
  deliveryFee: number;
  discount: number;
  finalTotal: number;
  expectedCollection: number;
  collectedCash: number;
  remittedCash: number;
  cashVariance: number;
}
