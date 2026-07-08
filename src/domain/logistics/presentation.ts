import type { PaymentType, ShipmentStatus } from './entities';

interface StatusPresentation {
  label: string;
  color: string;
  bg: string;
}

export const statusConfig: Record<ShipmentStatus, StatusPresentation> = {
  draft: { label: 'مسودة', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
  readyToShip: { label: 'جاهز للإرسال', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  receivedAtOffice: { label: 'في المقر', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  deliveredToDriver: { label: 'مع المندوب', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  inTransit: { label: 'في الطريق', color: '#0EA5E9', bg: 'rgba(14,165,233,0.15)' },
  delivered: { label: 'تم التسليم', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  postponed: { label: 'مؤجل', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  failedToDeliver: { label: 'فشل التسليم', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  returned: { label: 'مرتجع', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

export const paymentTypeLabels: Record<PaymentType, string> = {
  cashOnDelivery: 'كاش عند الاستلام',
  prepaid: 'مدفوع مسبقا',
};

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م`;
}
