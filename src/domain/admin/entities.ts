export type AdminRole = 'superAdmin' | 'operationsManager' | 'dispatcher' | 'warehouse' | 'supportAgent' | 'accountant' | 'auditor';
export type AccountStatus = 'invited' | 'active' | 'suspended' | 'locked' | 'archived';
export type StaffScopeType = 'tenant' | 'branch' | 'warehouse' | 'region';
export type PermissionKey =
  | 'shipments.read'
  | 'shipments.assignDriver'
  | 'shipments.confirmIntake'
  | 'driverUpdates.review'
  | 'driverUpdates.approve'
  | 'driverUpdates.reject'
  | 'returns.receive'
  | 'returns.assign'
  | 'exceptions.create'
  | 'drivers.read'
  | 'drivers.manage'
  | 'merchants.read'
  | 'merchants.review'
  | 'settlements.read'
  | 'settlements.prepare'
  | 'settlements.review'
  | 'settlements.approve'
  | 'settlements.pay'
  | 'remittances.read'
  | 'remittances.reconcile'
  | 'remittances.approve'
  | 'journal.read'
  | 'journal.post'
  | 'journal.reverse'
  | 'accounting.periodClose'
  | 'accounting.periodReopen'
  | 'reports.read'
  | 'users.manage'
  | 'audit.read';

export type MerchantApplicationStatus = 'pendingReview' | 'approved' | 'rejected';
export type SettlementType = 'merchantPayout' | 'driverRemittance';
export type SettlementStatus = 'pending' | 'approved' | 'paid' | 'rejected';
export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface RoleDefinition {
  role: AdminRole;
  label: string;
  description: string;
  permissions: PermissionKey[];
  systemRole?: boolean;
  sensitivity?: 'normal' | 'high' | 'critical';
}

export interface UserAccount {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: AdminRole;
  status: AccountStatus;
  city: string;
  lastSeenAt: string;
  createdAt: string;
  scopeType?: StaffScopeType;
  scopeLabel?: string;
  jobTitle?: string;
  mfaEnabled?: boolean;
  activeSessions?: number;
  lastLoginAt?: string;
}

export interface MerchantApplication {
  id: string;
  brandName: string;
  activity: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  averageOrders: number;
  status: MerchantApplicationStatus;
  submittedAt: string;
  notes?: string;
}

export interface SettlementRecord {
  id: string;
  type: SettlementType;
  ownerId: string;
  ownerName: string;
  amount: number;
  method: string;
  status: SettlementStatus;
  requestedAt: string;
  approvedBy?: string;
  reference?: string;
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: AdminRole;
  action: string;
  target: string;
  severity: AuditSeverity;
  createdAt: string;
  ipAddress: string;
}

export interface AdminMetrics {
  activeUsers: number;
  pendingApplications: number;
  pendingSettlements: number;
  criticalEvents: number;
}
