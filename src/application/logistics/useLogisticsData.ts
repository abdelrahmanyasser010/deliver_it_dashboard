import { useMemo } from 'react';
import {
  ALL_STATUS,
  calculateDriverSummary,
  calculateMerchantSummary,
  filterShipments,
  getRecentShipments,
  type FilterStatus,
} from '../../domain/logistics/analytics';
import { logisticsMockRepository } from '../../infrastructure/mock/logisticsMockRepository';

export { ALL_STATUS };
export type { FilterStatus };

export function useLogisticsDashboard() {
  return useMemo(() => {
    const snapshot = logisticsMockRepository.getSnapshot();

    return {
      stats: snapshot.stats,
      recentShipments: getRecentShipments(snapshot.shipments),
    };
  }, []);
}

export function useShipments(query: string, statusFilter: FilterStatus = ALL_STATUS) {
  return useMemo(() => {
    const { shipments } = logisticsMockRepository.getSnapshot();

    return filterShipments(shipments, query, statusFilter);
  }, [query, statusFilter]);
}

export function useDrivers() {
  return useMemo(() => {
    const { drivers } = logisticsMockRepository.getSnapshot();

    return {
      drivers,
      summary: calculateDriverSummary(drivers),
    };
  }, []);
}

export function useMerchants() {
  return useMemo(() => {
    const { merchants } = logisticsMockRepository.getSnapshot();

    return {
      merchants,
      summary: calculateMerchantSummary(merchants),
    };
  }, []);
}
