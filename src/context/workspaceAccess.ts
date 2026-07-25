import type { WorkspaceRole } from './WorkspaceContext';

export const routeRoles: Record<string, WorkspaceRole[]> = {
  '/': ['management', 'operations', 'accounting', 'support'],
  '/shipments': ['management', 'operations', 'accounting', 'support'],
  '/operations': ['management', 'operations'],
  '/exceptions': ['management', 'operations', 'accounting', 'support'],
  '/barcode': ['management', 'operations'],
  '/reports': ['management', 'operations', 'accounting'],
  '/accounting': ['management', 'accounting'],
  '/drivers': ['management', 'operations'],
  '/merchants': ['management', 'operations', 'accounting', 'support'],
  '/chat': ['management', 'operations', 'support'],
  '/applications': ['management', 'operations', 'support'],
  '/settlements': ['management', 'accounting'],
  '/users': ['management'],
  '/audit-log': ['management'],
  '/settings': ['management'],
};

export function canAccessRoute(role: WorkspaceRole, path: string) {
  return (routeRoles[path] ?? []).includes(role);
}

export function firstAllowedRoute(role: WorkspaceRole) {
  if (role === 'accounting') return '/accounting';
  if (role === 'operations') return '/operations';
  if (role === 'support') return '/shipments';
  return '/';
}
