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

export function calculateDashboardStats(
  shipments: Shipment[],
  drivers: Driver[],
  merchants: Merchant[],
): DashboardStats {
  return {
    totalShipments: shipments.length,
    deliveredToday: shipments.filter((shipment) => shipment.status === 'delivered').length,
    inTransit: shipments.filter((shipment) => shipment.status === 'inTransit').length,
    returned: shipments.filter((shipment) => shipment.status === 'returned').length,
    totalCashCollected: shipments
      .filter((shipment) => shipment.status === 'delivered' && shipment.paymentType === 'cashOnDelivery')
      .reduce((sum, shipment) => sum + shipment.collectedCash, 0),
    pendingSettlement: shipments
      .filter((shipment) => shipment.status === 'delivered' && shipment.settlementStatus === 'unsettled')
      .reduce((sum, shipment) => sum + shipment.collectedCash, 0),
    activeDrivers: drivers.filter((driver) => driver.status === 'active').length,
    totalMerchants: merchants.length,
  };
}

export function getRecentShipments(shipments: Shipment[], limit = 8): Shipment[] {
  return shipments.slice(0, limit);
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
        shipment.driverName ?? '',
        shipment.merchantName,
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
  };
}
