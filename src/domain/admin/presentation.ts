import type { AccountStatus, AdminRole, AuditSeverity, MerchantApplicationStatus, SettlementStatus, SettlementType } from './entities';

export const roleLabels: Record<AdminRole, string> = {
  superAdmin: 'مدير النظام',
  operationsManager: 'مدير العمليات',
  dispatcher: 'مسؤول التوزيع',
  warehouse: 'مسؤول المخزن',
  supportAgent: 'خدمة العملاء',
  accountant: 'محاسب',
  auditor: 'مراجع / قراءة فقط',
};

export const accountStatusLabels: Record<AccountStatus, string> = {
  invited: 'تمت الدعوة',
  active: 'نشط',
  suspended: 'موقوف',
  locked: 'مقفل أمنيًا',
  archived: 'مؤرشف',
};

export const applicationStatusLabels: Record<MerchantApplicationStatus, string> = { pendingReview: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض' };
export const settlementStatusLabels: Record<SettlementStatus, string> = { pending: 'معلقة', approved: 'معتمدة', paid: 'مدفوعة', rejected: 'مرفوضة' };
export const settlementTypeLabels: Record<SettlementType, string> = { merchantPayout: 'تسوية تاجر', driverRemittance: 'توريد مندوب' };
export const severityLabels: Record<AuditSeverity, string> = { info: 'معلومة', warning: 'تنبيه', critical: 'حرج' };

export const statusTone: Record<AccountStatus | MerchantApplicationStatus | SettlementStatus | AuditSeverity, string> = {
  invited: 'info', active: 'success', suspended: 'danger', locked: 'danger', archived: 'neutral',
  pendingReview: 'warning', rejected: 'danger', approved: 'success', pending: 'warning', paid: 'success',
  info: 'info', warning: 'warning', critical: 'danger',
};
