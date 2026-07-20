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

// Legacy compatibility helper. Prefer application hooks in new code.
export const getMockSnapshot = () => logisticsMockRepository.getSnapshot();
