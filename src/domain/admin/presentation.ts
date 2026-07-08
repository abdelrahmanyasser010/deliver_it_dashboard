import type {
  AccountStatus,
  AdminRole,
  AuditSeverity,
  MerchantApplicationStatus,
  SettlementStatus,
  SettlementType,
} from './entities';

export const roleLabels: Record<AdminRole, string> = {
  superAdmin: 'مدير النظام',
  operationsManager: 'مدير العمليات',
  supportAgent: 'دعم العملاء',
  accountant: 'محاسب',
  driver: 'مندوب',
  merchant: 'تاجر',
};

export const accountStatusLabels: Record<AccountStatus, string> = {
  active: 'نشط',
  pendingReview: 'بانتظار المراجعة',
  suspended: 'موقوف',
  rejected: 'مرفوض',
};

export const applicationStatusLabels: Record<MerchantApplicationStatus, string> = {
  pendingReview: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
};

export const settlementStatusLabels: Record<SettlementStatus, string> = {
  pending: 'معلقة',
  approved: 'معتمدة',
  paid: 'مدفوعة',
  rejected: 'مرفوضة',
};

export const settlementTypeLabels: Record<SettlementType, string> = {
  merchantPayout: 'تسوية تاجر',
  driverRemittance: 'توريد مندوب',
};

export const severityLabels: Record<AuditSeverity, string> = {
  info: 'معلومة',
  warning: 'تنبيه',
  critical: 'حرج',
};

export const statusTone: Record<AccountStatus | MerchantApplicationStatus | SettlementStatus | AuditSeverity, string> = {
  active: 'success',
  pendingReview: 'warning',
  suspended: 'danger',
  rejected: 'danger',
  approved: 'success',
  pending: 'warning',
  paid: 'success',
  info: 'info',
  warning: 'warning',
  critical: 'danger',
};
