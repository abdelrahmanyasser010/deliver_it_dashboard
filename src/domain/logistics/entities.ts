export const shipmentStatuses = [
  'draft',
  'readyToShip',
  'receivedAtOffice',
  'deliveredToDriver',
  'inTransit',
  'delivered',
  'postponed',
  'failedToDeliver',
  'returned',
] as const;

export type ShipmentStatus = (typeof shipmentStatuses)[number];

export type PaymentType = 'cashOnDelivery' | 'prepaid';
export type SettlementStatus = 'unsettled' | 'settled';
export type DriverStatus = 'active' | 'off';

export interface ShipmentItem {
  name: string;
  quantity: number;
  price: number;
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
  paymentType: PaymentType;
  total: number;
  deliveryFee: number;
  discount: number;
  collectedCash: number;
  items: ShipmentItem[];
  driverId?: string;
  driverName?: string;
  merchantId: string;
  merchantName: string;
  createdAt: string;
  settlementStatus: SettlementStatus;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  zone: string;
  shipmentsCount: number;
  pendingCash: number;
  deliveredToday: number;
  status: DriverStatus;
}

export interface Merchant {
  id: string;
  name: string;
  phone: string;
  logoUrl: string;
  shipmentsCount: number;
  pendingSettlement: number;
  totalOrderValue: number;
  joinedAt: string;
}

export interface DashboardStats {
  totalShipments: number;
  deliveredToday: number;
  inTransit: number;
  returned: number;
  totalCashCollected: number;
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
}
