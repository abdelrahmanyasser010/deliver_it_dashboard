import { useMemo } from 'react';
import { reportsMockRepository } from '../../infrastructure/mock/reportsMockRepository';

export function useReportsData() {
  return useMemo(() => reportsMockRepository.getReports(), []);
}

export function useAccountingData() {
  return useMemo(() => reportsMockRepository.getAccounting(), []);
}
