import { useMemo } from 'react';
import { adminMockRepository } from '../../infrastructure/mock/adminMockRepository';

export function useAdminMetrics() {
  return useMemo(() => adminMockRepository.getMetrics(), []);
}

export function useUsersAndRoles() {
  return useMemo(() => ({
    users: adminMockRepository.getUsers(),
    roles: adminMockRepository.getRoles(),
  }), []);
}

export function useMerchantApplications() {
  return useMemo(() => adminMockRepository.getApplications(), []);
}

export function useSettlements() {
  return useMemo(() => adminMockRepository.getSettlements(), []);
}

export function useAuditLogs() {
  return useMemo(() => adminMockRepository.getAuditLogs(), []);
}
