export type AdminRole = 'superAdmin' | 'operationsManager' | 'supportAgent' | 'accountant' | 'driver' | 'merchant';
export type AccountStatus = 'active' | 'pendingReview' | 'suspended' | 'rejected';
export type PermissionKey =
  | 'shipments.read'
  | 'shipments.updateStatus'
  | 'drivers.manage'
  | 'merchants.review'
  | 'settlements.manage'
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
