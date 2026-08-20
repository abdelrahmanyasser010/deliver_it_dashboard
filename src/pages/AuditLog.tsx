import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '../components/AsyncState';
import { useDeliveryData } from '../context/DeliveryDataContext';
import './AdminOperations.css';

export function AuditLogPage() {
  const { state } = useDeliveryData();
  const [criticalOnly, setCriticalOnly] = useState(false);
  const logs = useMemo(() => {
    const items = state?.auditEvents ?? [];
    if (!criticalOnly) return items;
    return items.filter((event) => /delete|pay|close|reject|financial|settlement|حذف|دفع|إغلاق|رفض|مالي/i.test(`${event.action} ${event.detail}`));
  }, [state?.auditEvents, criticalOnly]);

  return <div className="admin-page"><section className="glass-card">
    <div className="section-title-row"><div><h3>سجل العمليات</h3><p className="section-subtitle">سجل موحد لكل أمر غيّر الشحنات أو المناديب أو التجار أو التسويات.</p></div><div className="toolbar-actions"><button className={`outline-btn ${!criticalOnly ? 'active' : ''}`} onClick={() => setCriticalOnly(false)}><Activity size={16} /> كل الأحداث</button><button className={`outline-btn ${criticalOnly ? 'active' : ''}`} onClick={() => setCriticalOnly(true)}><AlertTriangle size={16} /> حرجة فقط</button></div></div>
    {logs.length ? <div className="audit-list">{logs.map((log) => <div key={log.id} className="audit-item"><div><p className="audit-action">{actionLabel(log.action)}</p><p className="audit-meta">{log.actor} — {log.entityType}: {log.entityId || 'مجموعة عناصر'}</p><p className="audit-meta">{log.detail} — {new Date(log.createdAt).toLocaleString('ar-EG')}</p></div><div className="toolbar-actions"><span className={`tone-badge ${isCritical(log.action, log.detail) ? 'danger' : 'info'}`}>{isCritical(log.action, log.detail) ? 'حرج' : 'معلوماتي'}</span><span className="btn-icon sm" aria-label="عملية مسجلة"><ShieldCheck size={14} /></span></div></div>)}</div> : <EmptyState title="لا توجد أحداث مطابقة" description="ستظهر العمليات هنا فور تنفيذ أي أمر من الـStore الموحد." />}
  </section></div>;
}

function isCritical(action: string, detail: string) { return /delete|pay|close|reject|financial|settlement|حذف|دفع|إغلاق|رفض|مالي/i.test(`${action} ${detail}`); }
function actionLabel(action: string) {
  const labels: Record<string, string> = {
    'shipment/assignDriver': 'تعيين مندوب', 'shipment/transition': 'تغيير حالة شحنة', 'shipment/addAttempt': 'تسجيل محاولة توصيل', 'shipment/import': 'استيراد شحنات', 'pickup/approve': 'اعتماد استلام', 'pickup/review': 'مراجعة استلام', 'batch/assign': 'تعيين مجموعة توزيع', 'driverUpdate/approve': 'اعتماد تحديث مندوب', 'driverUpdate/reject': 'رفض تحديث مندوب', 'barcode/create': 'إنشاء دفعة باركود', 'barcode/close': 'إغلاق دفعة باركود', 'exception/resolve': 'حل استثناء', 'driver/upsert': 'حفظ مندوب', 'merchant/upsert': 'حفظ تاجر', 'settlement/create': 'إنشاء تسوية', 'settlement/approve': 'اعتماد تسوية', 'settlement/pay': 'دفع تسوية', 'finance/reconcileShipment': 'مطابقة مالية', 'ledger/postAll': 'ترحيل قيود', 'period/close': 'إغلاق فترة مالية',
  };
  return labels[action] ?? action;
}
