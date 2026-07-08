import { logisticsMockRepository } from '../infrastructure/mock/logisticsMockRepository';

export type {
  DashboardStats,
  Driver,
  Merchant as Brand,
  Merchant,
  PaymentType,
  SettlementStatus,
  Shipment,
  ShipmentStatus,
} from '../domain/logistics/entities';

const snapshot = logisticsMockRepository.getSnapshot();

export const mockShipments = snapshot.shipments;
export const mockDrivers = snapshot.drivers;
export const mockBrands = snapshot.merchants;
export const mockStats = snapshot.stats;
