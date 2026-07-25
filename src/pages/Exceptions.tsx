import { AlertTriangle, Banknote, Clock3, MapPinOff, PackageSearch, RefreshCcw, Truck, UserRoundX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLogisticsDashboard } from '../application/logistics/useLogisticsData';
import { EmptyState, ErrorState, PageSkeleton } from '../components/AsyncState';
import { MetricCard, Modal, SectionHeader, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Shipment } from '../domain/logistics/entities';
import { formatAge, formatCurrency, statusConfig, taskStatusConfig } from '../utils/helpers';
import './Exceptions.css';

type ExceptionCategory = 'all' | 'delay' | 'assignment' | 'financial' | 'return' | 'customer' | 'stale';
interface ExceptionItem { id: string; shipment: Shipment; category: Exclude<ExceptionCategory, 'all'>; title: string; reason: string; severity: 'medium' | 'high' | 'urgent'; }
const categoryLabels: Record<ExceptionCategory, string> = { all: 'كل الاستثناءات', delay: 'تأخير', assignment: 'بلا مندوب', financial: 'فروقات مالية', return: 'مرتجعات', customer: 'خدمة العملاء', stale: 'بدون تحديث' };

export function ExceptionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { shipments, drivers, isLoading, error, refetch } = useLogisticsDashboard();
  const { execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const [query, setQuery] = useState('');
  const [resolutionItem, setResolutionItem] = useState<ExceptionItem | null>(null);
  const [resolution, setResolution] = useState('تمت مراجعة الحالة واتخاذ الإجراء المناسب.');
  const [driverId, setDriverId] = useState('');
  const selectedCategory = isCategory(searchParams.get('category')) ? searchParams.get('category') as ExceptionCategory : 'all';
  const [now] = useState(() => Date.now());
  const exceptions = useMemo(() => buildExceptions(shipments, now), [shipments, now]);
  const filtered = exceptions.filter((item) => { const value = query.trim().toLocaleLowerCase('ar-EG'); return (selectedCategory === 'all' || item.category === selectedCategory) && (!value || [item.shipment.id, item.shipment.customerName, item.shipment.merchantName, item.shipment.driverName, item.reason].some((text) => text?.toLocaleLowerCase('ar-EG').includes(value))); });
  const setCategory = (category: ExceptionCategory) => { const next = new URLSearchParams(searchParams); if (category === 'all') next.delete('category'); else next.set('category', category); setSearchParams(next, { replace: true }); };
  const counts = Object.fromEntries((Object.keys(categoryLabels) as ExceptionCategory[]).map((category) => [category, category === 'all' ? exceptions.length : exceptions.filter((item) => item.category === category).length]));
  const openResolve = (item: ExceptionItem) => { setResolutionItem(item); setDriverId(drivers.find((driver) => driver.status === 'active')?.id ?? ''); setResolution(defaultResolution(item.category)); };
  const resolve = async () => {
    if (!resolutionItem) return;
    if (resolutionItem.category === 'financial') { navigate(`/accounting?shipment=${resolutionItem.shipment.id}`); setResolutionItem(null); return; }
    const result = await execute({ type: 'exception/resolve', shipmentId: resolutionItem.shipment.id, resolution: resolution.trim() || 'تم إغلاق الاستثناء.', driverId: resolutionItem.category === 'assignment' ? driverId : undefined });
    showToast(result.message, result.ok ? 'success' : 'danger'); if (result.ok) setResolutionItem(null);
  };
  if (isLoading) return <PageSkeleton rows={4}/>;
  if (error) return <ErrorState message={error} onRetry={refetch}/>;

  return <div className="exceptions-page"><SectionHeader title="مركز الاستثناءات" description="حل الاستثناء ينفذ الإجراء الحقيقي أو يسجل سبب الإغلاق في سجل الشحنة." actions={<button className="outline-btn" onClick={refetch}><RefreshCcw size={15}/> تحديث</button>}/><div className="exceptions-metrics"><MetricCard label="إجمالي الاستثناءات" value={exceptions.length.toLocaleString('ar-EG')} detail="مشتقة من حالات الشحنات" icon={AlertTriangle} tone="danger"/><MetricCard label="تأخير" value={Number(counts.delay).toLocaleString('ar-EG')} detail="تجاوزت الموعد" icon={Clock3} tone="warning" onClick={() => setCategory('delay')}/><MetricCard label="مشكلات مالية" value={Number(counts.financial).toLocaleString('ar-EG')} detail="فرق تحصيل أو مراجعة" icon={Banknote} tone="danger" onClick={() => setCategory('financial')}/><MetricCard label="بلا مندوب" value={Number(counts.assignment).toLocaleString('ar-EG')} detail="تحتاج توزيعًا" icon={UserRoundX} tone="warning" onClick={() => setCategory('assignment')}/></div><section className="exceptions-toolbar glass-card"><input className="input-glass" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في الاستثناءات..." aria-label="البحث في الاستثناءات"/><div className="exceptions-tabs">{(Object.keys(categoryLabels) as ExceptionCategory[]).map((category) => <button key={category} className={selectedCategory === category ? 'active' : ''} onClick={() => setCategory(category)}>{categoryLabels[category]} <span>{Number(counts[category]).toLocaleString('ar-EG')}</span></button>)}</div></section>{filtered.length === 0 ? <EmptyState title="لا توجد استثناءات مطابقة" description="تم حل الحالات أو لا توجد نتائج للفلاتر الحالية." actionLabel="عرض الكل" onAction={() => { setCategory('all'); setQuery(''); }}/> : <section className="exceptions-list glass-card">{filtered.map((item) => <article key={item.id} className={`exception-row ${item.severity}`}><span className="exception-symbol">{exceptionIcon(item.category)}</span><div className="exception-main"><div className="exception-title-line"><strong>{item.title}</strong><StatusBadge label={severityLabel(item.severity)} tone={item.severity === 'urgent' ? 'danger' : item.severity === 'high' ? 'warning' : 'info'}/></div><p>{item.reason}</p><div className="exception-meta"><span>{item.shipment.id}</span><span>{item.shipment.customerName}</span><span>{item.shipment.merchantName}</span><span>{item.shipment.driverName ?? 'غير معين'}</span><span>{formatCurrency(item.shipment.expectedCollection)}</span><span>{formatAge(item.shipment.lastUpdatedAt)}</span></div></div><div className="exception-actions"><button className="outline-btn" onClick={() => navigate(`/shipments?shipment=${item.shipment.id}`)}><PackageSearch size={15}/> فتح الشحنة</button><button className="btn-primary" onClick={() => openResolve(item)}>حل الاستثناء</button></div></article>)}</section>}
  {resolutionItem && <Modal title={`حل: ${resolutionItem.title}`} description={`${resolutionItem.shipment.id} — ${resolutionItem.reason}`} onClose={() => setResolutionItem(null)} footer={<><button className="outline-btn" onClick={() => setResolutionItem(null)}>إلغاء</button><button className="btn-primary" onClick={() => void resolve()}>{resolutionItem.category === 'financial' ? 'فتح المطابقة المالية' : 'تنفيذ الحل'}</button></>}>{resolutionItem.category === 'assignment' && <label className="form-field"><span>المندوب</span><select className="input-glass" value={driverId} onChange={(event) => setDriverId(event.target.value)}>{drivers.filter((driver) => driver.status === 'active').map((driver) => <option key={driver.id} value={driver.id}>{driver.name} — متاح {Math.max(0, driver.capacity - driver.activeLoad).toLocaleString('ar-EG')}</option>)}</select></label>}{resolutionItem.category !== 'financial' && <label className="form-field"><span>تفاصيل الحل</span><textarea className="input-glass" value={resolution} onChange={(event) => setResolution(event.target.value)}/></label>}{resolutionItem.category === 'financial' && <p className="report-muted">سيتم فتح شاشة المطابقة المالية على الشحنة، لأن إخفاء الاستثناء دون تعديل المبالغ غير مسموح.</p>}</Modal>}</div>;
}

function buildExceptions(shipments: Shipment[], now: number): ExceptionItem[] {
  const items: ExceptionItem[] = [];
  const severityScore = { urgent: 3, high: 2, medium: 1 } as const;
  shipments.forEach((shipment) => {
    const delayed = shipment.expectedDeliveryAt && new Date(shipment.expectedDeliveryAt).getTime() < now && !['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status);
    const staleHours = (now - new Date(shipment.lastUpdatedAt).getTime()) / 3600000;
    if (delayed) items.push({ id: `${shipment.id}-delay`, shipment, category: 'delay', title: 'شحنة متأخرة', reason: shipment.exceptionReason ?? 'تجاوزت موعد التسليم المتوقع.', severity: staleHours > 12 ? 'urgent' : 'high' });
    if (shipment.taskStatus === 'needsDriverAssignment') items.push({ id: `${shipment.id}-assignment`, shipment, category: 'assignment', title: 'تحتاج تعيين مندوب', reason: 'الشحنة جاهزة للتوزيع ولا يوجد مندوب معين لها.', severity: shipment.priority === 'urgent' ? 'urgent' : 'high' });
    if (shipment.taskStatus === 'needsFinancialReview' || shipment.financialStatus === 'discrepancy') items.push({ id: `${shipment.id}-financial`, shipment, category: 'financial', title: 'فرق تحصيل', reason: shipment.exceptionReason ?? 'المبلغ المحصل لا يطابق المبلغ المتوقع.', severity: 'urgent' });
    if (shipment.taskStatus === 'needsReturnProcessing') items.push({ id: `${shipment.id}-return`, shipment, category: 'return', title: 'مرتجع معلق', reason: shipment.exceptionReason ?? 'المرتجع يحتاج استكمال التسليم للتاجر.', severity: 'high' });
    if (shipment.taskStatus === 'needsCustomerService') items.push({ id: `${shipment.id}-customer`, shipment, category: 'customer', title: 'تحتاج تدخل خدمة العملاء', reason: shipment.exceptionReason ?? `${taskStatusConfig[shipment.taskStatus].label} بعد ${statusConfig[shipment.status].label}.`, severity: 'medium' });
    if (staleHours > 24 && !['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status)) items.push({ id: `${shipment.id}-stale`, shipment, category: 'stale', title: 'لا يوجد تحديث حديث', reason: `آخر تحديث منذ ${formatAge(shipment.lastUpdatedAt)}.`, severity: staleHours > 48 ? 'urgent' : 'medium' });
  });
  return items.sort((a, b) => severityScore[b.severity] - severityScore[a.severity]);
}
function defaultResolution(category: ExceptionItem['category']) { return category === 'return' ? 'تم تسليم المرتجع للتاجر وإغلاق المهمة.' : category === 'delay' ? 'تمت إعادة الجدولة والتواصل مع الأطراف المعنية.' : category === 'customer' ? 'تم التواصل مع العميل وتسجيل نتيجة المتابعة.' : category === 'stale' ? 'تم التواصل مع المندوب وتحديث متابعة الشحنة.' : 'تم تعيين مندوب مناسب للشحنة.'; }
function isCategory(value: string | null): value is ExceptionCategory { return value !== null && value in categoryLabels; }
function severityLabel(value: ExceptionItem['severity']) { return { medium: 'متوسط', high: 'عالي', urgent: 'عاجل' }[value]; }
function exceptionIcon(category: ExceptionItem['category']) { if (category === 'financial') return <Banknote size={18}/>; if (category === 'assignment') return <Truck size={18}/>; if (category === 'stale') return <MapPinOff size={18}/>; return <AlertTriangle size={18}/>; }
