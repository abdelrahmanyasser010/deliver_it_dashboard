import type {
  DashboardStats,
  Driver,
  DriverSummary,
  Merchant,
  MerchantSummary,
  Shipment,
  ShipmentFinancials,
  ShipmentStatus,
} from './entities';

export const ALL_STATUS = 'all';
export type FilterStatus = ShipmentStatus | typeof ALL_STATUS;

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
const isSameDay = (isoDate: string, target: Date) => startOfDay(new Date(isoDate)) === startOfDay(target);

export function calculateDashboardStats(
  shipments: Shipment[],
  drivers: Driver[],
  merchants: Merchant[],
): DashboardStats {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    totalShipments: shipments.length,
    todayShipments: shipments.filter((shipment) => isSameDay(shipment.createdAt, today)).length,
    yesterdayShipments: shipments.filter((shipment) => isSameDay(shipment.createdAt, yesterday)).length,
    deliveredToday: shipments.filter((shipment) => shipment.status === 'delivered' && isSameDay(shipment.statusChangedAt, today)).length,
    deliveredYesterday: shipments.filter((shipment) => shipment.status === 'delivered' && isSameDay(shipment.statusChangedAt, yesterday)).length,
    inTransit: shipments.filter((shipment) => shipment.status === 'inTransit').length,
    returned: shipments.filter((shipment) => shipment.status === 'returned').length,
    delayedShipments: shipments.filter((shipment) => shipment.expectedDeliveryAt && new Date(shipment.expectedDeliveryAt).getTime() < Date.now() && !['delivered', 'returned'].includes(shipment.status)).length,
    unassignedShipments: shipments.filter((shipment) => shipment.taskStatus === 'needsDriverAssignment').length,
    pendingApprovals: shipments.filter((shipment) => shipment.taskStatus === 'needsStatusApproval').length,
    pendingReturns: shipments.filter((shipment) => shipment.taskStatus === 'needsReturnProcessing').length,
    cashDiscrepancies: shipments.filter((shipment) => shipment.financialStatus === 'discrepancy').length,
    totalCashCollected: shipments.reduce((sum, shipment) => sum + shipment.collectedCash, 0),
    remittedCash: shipments.reduce((sum, shipment) => sum + shipment.remittedCash, 0),
    cashWithDrivers: shipments.reduce((sum, shipment) => sum + Math.max(0, shipment.collectedCash - shipment.remittedCash), 0),
    pendingSettlement: shipments
      .filter((shipment) => shipment.settlementStatus === 'unsettled' && shipment.collectedCash > 0)
      .reduce((sum, shipment) => sum + shipment.collectedCash, 0),
    activeDrivers: drivers.filter((driver) => driver.status === 'active').length,
    totalMerchants: merchants.length,
  };
}

export function getRecentShipments(shipments: Shipment[], limit = 8): Shipment[] {
  return shipments
    .slice()
    .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
    .slice(0, limit);
}

export function filterShipments(
  shipments: Shipment[],
  query: string,
  statusFilter: FilterStatus,
): Shipment[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('ar-EG');

  return shipments.filter((shipment) => {
    const matchesStatus = statusFilter === ALL_STATUS || shipment.status === statusFilter;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [
        shipment.id,
        shipment.trackingNumber,
        shipment.customerName,
        shipment.customerPhone,
        shipment.governorate,
        shipment.city,
        shipment.address,
        shipment.driverName ?? '',
        shipment.merchantName,
        shipment.exceptionReason ?? '',
      ].some((value) => value.toLocaleLowerCase('ar-EG').includes(normalizedQuery));

    return matchesStatus && matchesQuery;
  });
}

export function calculateDriverSummary(drivers: Driver[]): DriverSummary {
  return {
    activeDrivers: drivers.filter((driver) => driver.status === 'active').length,
    totalDrivers: drivers.length,
    pendingCash: drivers.reduce((sum, driver) => sum + driver.pendingCash, 0),
    deliveredToday: drivers.reduce((sum, driver) => sum + driver.deliveredToday, 0),
  };
}

export function calculateMerchantSummary(merchants: Merchant[]): MerchantSummary {
  return {
    totalMerchants: merchants.length,
    pendingSettlement: merchants.reduce((sum, merchant) => sum + merchant.pendingSettlement, 0),
    totalOrderValue: merchants.reduce((sum, merchant) => sum + merchant.totalOrderValue, 0),
  };
}

export function calculateShipmentFinancials(shipment: Shipment): ShipmentFinancials {
  return {
    itemsSubtotal: shipment.total - shipment.deliveryFee + shipment.discount,
    deliveryFee: shipment.deliveryFee,
    discount: shipment.discount,
    finalTotal: shipment.total,
    expectedCollection: shipment.expectedCollection,
    collectedCash: shipment.collectedCash,
    remittedCash: shipment.remittedCash,
    cashVariance: shipment.collectedCash - shipment.expectedCollection,
  };
}
