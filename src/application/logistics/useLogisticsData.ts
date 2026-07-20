import { useMemo } from 'react';
import {
  ALL_STATUS,
  calculateDashboardStats,
  calculateDriverSummary,
  calculateMerchantSummary,
  filterShipments,
  getRecentShipments,
  type FilterStatus,
} from '../../domain/logistics/analytics';
import { useDeliveryData } from '../../context/DeliveryDataContext';

export { ALL_STATUS };
export type { FilterStatus };

export function useLogisticsDashboard() {
  const query = useDeliveryData();
  const shipments = useMemo(() => query.state?.shipments ?? [], [query.state?.shipments]);
  const drivers = useMemo(() => query.state?.drivers ?? [], [query.state?.drivers]);
  const merchants = useMemo(() => query.state?.merchants ?? [], [query.state?.merchants]);
  const stats = useMemo(() => query.state ? calculateDashboardStats(shipments, drivers, merchants) : null, [query.state, shipments, drivers, merchants]);
  return { stats, shipments, drivers, merchants, recentShipments: getRecentShipments(shipments), isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

export function useShipments(queryText: string, statusFilter: FilterStatus = ALL_STATUS) {
  const query = useDeliveryData();
  const shipments = useMemo(() => filterShipments(query.state?.shipments ?? [], queryText, statusFilter), [query.state?.shipments, queryText, statusFilter]);
  return { shipments, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

export function useDrivers() {
  const query = useDeliveryData();
  const drivers = useMemo(() => query.state?.drivers ?? [], [query.state?.drivers]);
  return { drivers, summary: calculateDriverSummary(drivers), isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

export function useMerchants() {
  const query = useDeliveryData();
  const merchants = useMemo(() => query.state?.merchants ?? [], [query.state?.merchants]);
  return { merchants, summary: calculateMerchantSummary(merchants), isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}
