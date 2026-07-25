import type {
  PaymentType,
  ShipmentFinancialStatus,
  ShipmentPriority,
  ShipmentStatus,
  ShipmentTaskStatus,
} from './entities';

interface StatusPresentation {
  label: string;
  color: string;
  bg: string;
}

export const statusConfig: Record<ShipmentStatus, StatusPresentation> = {
  draft: { label: 'مسودة', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
  readyToShip: { label: 'بانتظار الاستلام', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  receivedAtOffice: { label: 'وصلت المكتب', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  deliveredToDriver: { label: 'مع المندوب', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  inTransit: { label: 'في الطريق', color: '#0EA5E9', bg: 'rgba(14,165,233,0.15)' },
  delivered: { label: 'تم التسليم', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  partiallyDelivered: { label: 'تم التسليم جزئيًا', color: '#14B8A6', bg: 'rgba(20,184,166,0.15)' },
  postponed: { label: 'مؤجل', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  failedToDeliver: { label: 'فشل التسليم', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  returned: { label: 'مرتجع', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

export const taskStatusConfig: Record<ShipmentTaskStatus, StatusPresentation> = {
  none: { label: 'لا يوجد إجراء', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
  needsPickup: { label: 'يحتاج استلام', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  needsOfficeConfirmation: { label: 'يحتاج تأكيد الوصول', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  needsDriverAssignment: { label: 'يحتاج تعيين مندوب', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  needsStatusApproval: { label: 'يحتاج اعتماد تحديث', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  needsCustomerService: { label: 'يحتاج خدمة العملاء', color: '#0EA5E9', bg: 'rgba(14,165,233,0.15)' },
  needsReturnProcessing: { label: 'يحتاج معالجة مرتجع', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  needsFinancialReview: { label: 'يحتاج مراجعة مالية', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

export const financialStatusConfig: Record<ShipmentFinancialStatus, StatusPresentation> = {
  notDue: { label: 'غير مستحق', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
  awaitingCollection: { label: 'بانتظار التحصيل', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  collected: { label: 'تم التحصيل', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  partiallyCollected: { label: 'تحصيل جزئي', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  remitted: { label: 'تم التوريد', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  inSettlement: { label: 'داخل تسوية', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  settled: { label: 'تمت التسوية', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  discrepancy: { label: 'يوجد فرق مالي', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

export const priorityConfig: Record<ShipmentPriority, StatusPresentation> = {
  normal: { label: 'طبيعي', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
  high: { label: 'مهم', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  urgent: { label: 'عاجل', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

export const paymentTypeLabels: Record<PaymentType, string> = {
  cashOnDelivery: 'تحصيل عند التسليم',
  prepaid: 'مدفوع مسبقا',
};

export const nextShipmentStatuses: Record<ShipmentStatus, ShipmentStatus[]> = {
  draft: ['readyToShip'],
  readyToShip: ['receivedAtOffice', 'returned'],
  receivedAtOffice: ['deliveredToDriver', 'returned'],
  deliveredToDriver: ['inTransit', 'receivedAtOffice'],
  inTransit: ['delivered', 'postponed', 'failedToDeliver', 'returned'],
  delivered: [],
  partiallyDelivered: [],
  postponed: ['inTransit', 'failedToDeliver', 'returned'],
  failedToDeliver: ['inTransit', 'postponed', 'returned'],
  returned: [],
};

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م`;
}

export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

export function formatAge(isoDate: string): string {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000));
  if (diffMinutes < 60) return `منذ ${diffMinutes.toLocaleString('ar-EG')} دقيقة`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `منذ ${hours.toLocaleString('ar-EG')} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days.toLocaleString('ar-EG')} يوم`;
}
