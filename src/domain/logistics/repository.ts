import type { DashboardStats, Driver, Merchant, Shipment } from './entities';

export interface LogisticsSnapshot {
  shipments: Shipment[];
  drivers: Driver[];
  merchants: Merchant[];
  stats: DashboardStats;
}

export interface LogisticsRepository {
  getSnapshot(): Promise<LogisticsSnapshot>;
}
