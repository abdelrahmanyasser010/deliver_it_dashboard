import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, BarChart3, Bell, Eye, FileSpreadsheet, Info, Map, PackageCheck, RotateCcw, TrendingUp, Truck, Users } from 'lucide-react';
import type { ReportTab } from '../domain/reports/entities';
import type { Shipment } from '../domain/logistics/entities';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { downloadCsv } from '../utils/exportCsv';
import { formatCurrency } from '../utils/helpers';
import './Reports.css';

const reportTabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: 'orderValue', label: 'المبيعات والإيراد', icon: <TrendingUp size={17}/> },
  { id: 'operations', label: 'التشغيل', icon: <PackageCheck size={17}/> },
  { id: 'drivers', label: 'المناديب', icon: <Users size={17}/> },
  { id: 'governorates', label: 'المحافظات', icon: <Map size={17}/> },
  { id: 'delays', label: 'التأخير ومواعيد التسليم', icon: <Bell size={17}/> },
];
type Period = 'today' | 'week' | 'month' | 'custom';
const periodOptions: Array<{ id: Period; label: string }> = [{ id: 'today', label: 'اليوم' }, { id: 'week', label: 'آخر ٧ أيام' }, { id: 'month', label: 'الشهر الحالي' }, { id: 'custom', label: 'فترة مخصصة' }];
const fmt = (value: number) => value.toLocaleString('ar-EG');
const pct = (value: number) => `${value.toLocaleString('ar-EG')}٪`;
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dayEnd = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

function resolveRange(period: Period, customStart: string, customEnd: string) {
  const today = new Date();
  if (period === 'today') return { start: dayStart(today), end: dayEnd(today) };
  if (period === 'month') return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: dayEnd(today) };
  if (period === 'custom' && customStart && customEnd) return { start: dayStart(new Date(customStart)), end: dayEnd(new Date(customEnd)) };
  const start = dayStart(today); start.setDate(start.getDate() - 6); return { start, end: dayEnd(today) };
}
function inRange(shipment: Shipment, start: Date, end: Date) { const time = new Date(shipment.createdAt).getTime(); return time >= start.getTime() && time <= end.getTime(); }
function percentChange(current: number, previous: number) { if (previous === 0) return current === 0 ? 0 : 100; return Math.round(((current - previous) / previous) * 100); }

export function ReportsPage() {
  const navigate = useNavigate();
  const { state, isLoading } = useDeliveryData();
  const [activeTab, setActiveTab] = useState<ReportTab>('orderValue');
  const [period, setPeriod] = useState<Period>('week');
  const [customStart, setCustomStart] = useState(() => new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const report = useMemo(() => {
    const shipments = state?.shipments ?? [];
    const drivers = state?.drivers ?? [];
    const { start, end } = resolveRange(period, customStart, customEnd);
    const duration = end.getTime() - start.getTime() + 1;
    const previousStart = new Date(start.getTime() - duration);
    const previousEnd = new Date(start.getTime() - 1);
    const current = shipments.filter((shipment) => inRange(shipment, start, end));
    const previous = shipments.filter((shipment) => inRange(shipment, previousStart, previousEnd));
    const summarize = (items: Shipment[]) => ({
      orders: items.length,
      orderValue: items.reduce((sum, item) => sum + item.total, 0),
      shippingFees: items.reduce((sum, item) => sum + item.deliveryFee, 0),
      returns: items.filter((item) => item.status === 'returned').length,
      delivered: items.filter((item) => item.status === 'delivered').length,
      attempted: items.filter((item) => ['delivered', 'failedToDeliver', 'postponed', 'returned'].includes(item.status)).length,
    });
    const totals = summarize(current); const previousTotals = summarize(previous);
    const successRate = totals.attempted ? Math.round((totals.delivered / totals.attempted) * 100) : 0;
    const previousSuccessRate = previousTotals.attempted ? Math.round((previousTotals.delivered / previousTotals.attempted) * 100) : 0;
    const days: Array<{ key: string; label: string; items: Shipment[] }> = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const date = new Date(cursor); const key = date.toISOString().slice(0, 10);
      days.push({ key, label: date.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' }), items: current.filter((item) => new Date(item.createdAt).toISOString().slice(0, 10) === key) });
    }
    const trend = days.map((day) => ({ day: day.label, orders: day.items.length, orderValue: day.items.reduce((sum, item) => sum + item.total, 0), shippingFees: day.items.reduce((sum, item) => sum + item.deliveryFee, 0), returns: day.items.filter((item) => item.status === 'returned').length }));
    const statuses = [
      { label: 'بانتظار الاستلام', count: current.filter((item) => item.status === 'readyToShip').length, query: 'readyToShip' },
      { label: 'وصل مكتب الشحن', count: current.filter((item) => item.status === 'receivedAtOffice').length, query: 'receivedAtOffice' },
      { label: 'مع المندوب', count: current.filter((item) => item.status === 'deliveredToDriver').length, query: 'deliveredToDriver' },
      { label: 'في الطريق', count: current.filter((item) => item.status === 'inTransit').length, query: 'inTransit' },
      { label: 'تم التوصيل', count: totals.delivered, query: 'delivered' },
      { label: 'مرتجع / فشل', count: current.filter((item) => ['returned', 'failedToDeliver'].includes(item.status)).length, query: 'returned' },
    ];
    const driverPerformance = drivers.map((driver) => {
      const items = current.filter((item) => item.driverId === driver.id);
      const delivered = items.filter((item) => item.status === 'delivered').length;
      const attempted = items.filter((item) => ['delivered', 'failedToDeliver', 'postponed', 'returned'].includes(item.status)).length;
      return { driverId: driver.id, driverName: driver.name, zone: driver.zone, assigned: items.length, delivered, returned: items.filter((item) => item.status === 'returned').length, delayed: items.filter((item) => item.expectedDeliveryAt && new Date(item.expectedDeliveryAt).getTime() < now && !['delivered', 'returned'].includes(item.status)).length, collectedCash: items.reduce((sum, item) => sum + item.collectedCash, 0), successRate: attempted ? Math.round((delivered / attempted) * 100) : 0 };
    }).filter((item) => item.assigned > 0);
    const governorates = [...new Set(current.map((item) => item.governorate))].map((governorate) => {
      const items = current.filter((item) => item.governorate === governorate);
      const deliveredItems = items.filter((item) => item.status === 'delivered');
      return { governorate, total: items.length, delivered: deliveredItems.length, inTransit: items.filter((item) => item.status === 'inTransit').length, returned: items.filter((item) => item.status === 'returned').length, delayed: items.filter((item) => item.expectedDeliveryAt && new Date(item.expectedDeliveryAt).getTime() < now && !['delivered', 'returned'].includes(item.status)).length, avgDeliveryHours: deliveredItems.length ? Math.round(deliveredItems.reduce((sum, item) => sum + Math.max(1, (new Date(item.statusChangedAt).getTime() - new Date(item.createdAt).getTime()) / 3600000), 0) / deliveredItems.length) : 0 };
    });
    const delays = current.filter((item) => item.expectedDeliveryAt && new Date(item.expectedDeliveryAt).getTime() < now && !['delivered', 'returned'].includes(item.status)).map((item) => ({ shipment: item, lateByHours: Math.max(1, Math.round((now - new Date(item.expectedDeliveryAt!).getTime()) / 3600000)) })).sort((a, b) => b.lateByHours - a.lateByHours);
    return { start, end, current, totals, previousTotals, successRate, previousSuccessRate, trend, statuses, driverPerformance, governorates, delays };
  }, [state, period, customStart, customEnd, now]);

  const withDates = (path: string) => `${path}${path.includes('?') ? '&' : '?'}from=${report.start.toISOString().slice(0,10)}&to=${report.end.toISOString().slice(0,10)}`;
  const exportActiveReport = () => {
    if (activeTab === 'orderValue') downloadCsv('تقرير-المبيعات-والإيراد.csv', report.trend.map((item) => ({ اليوم: item.day, الأوردرات: item.orders, قيمة_الأوردرات: item.orderValue, إيراد_الشحن: item.shippingFees, المرتجعات: item.returns })));
    else if (activeTab === 'drivers') downloadCsv('تقرير-أداء-المناديب.csv', report.driverPerformance);
    else if (activeTab === 'governorates') downloadCsv('تقرير-المحافظات.csv', report.governorates);
    else if (activeTab === 'delays') downloadCsv('تقرير-التأخير.csv', report.delays.map((item) => ({ الشحنة: item.shipment.id, التاجر: item.shipment.merchantName, المندوب: item.shipment.driverName ?? 'غير معين', المحافظة: item.shipment.governorate, ساعات_التأخير: item.lateByHours })));
    else downloadCsv('تقرير-التشغيل.csv', report.statuses);
    setActionMessage('تم تجهيز ملف CSV مطابق للفترة والفلاتر الحالية.');
  };

  if (isLoading) return <div className="reports-page"><div className="glass-card">جاري تحميل التقارير…</div></div>;
  return <div className="reports-page">
    <header className="reports-hero glass-card"><div><h2>التقارير والإحصائيات</h2><p>كل المؤشرات محسوبة من الشحنات الفعلية داخل مصدر البيانات الموحد.</p></div><div className="reports-actions"><div className="period-control">{periodOptions.map((option) => <button key={option.id} className={period === option.id ? 'active' : ''} onClick={() => setPeriod(option.id)}>{option.label}</button>)}</div><button className="btn-primary" onClick={exportActiveReport}><FileSpreadsheet size={16}/> تحميل CSV</button></div></header>
    {period === 'custom' && <section className="statement-toolbar glass-card"><label><span>من</span><input className="input-glass" type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)}/></label><label><span>إلى</span><input className="input-glass" type="date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value)}/></label></section>}
    {actionMessage && <div className="ops-feedback">{actionMessage}</div>}
    <div className="reports-tabs glass-card">{reportTabs.map((tab) => <button key={tab.id} className={`reports-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.icon}{tab.label}</button>)}</div>

    {activeTab === 'orderValue' && <><div className="report-kpi-grid"><Kpi label="إجمالي الأوردرات" value={fmt(report.totals.orders)} change={percentChange(report.totals.orders, report.previousTotals.orders)} definition="عدد الشحنات التي أُنشئت داخل الفترة." icon={<BarChart3 size={20}/>} gradient="linear-gradient(135deg,#4F46E5,#7C3AED)" onClick={() => navigate(withDates('/shipments'))}/><Kpi label="قيمة أوردرات التجار" value={formatCurrency(report.totals.orderValue)} change={percentChange(report.totals.orderValue, report.previousTotals.orderValue)} definition="مجموع قيمة الشحنات المنشأة داخل الفترة." icon={<TrendingUp size={20}/>} gradient="linear-gradient(135deg,#10B981,#059669)"/><Kpi label="إيراد الشحن" value={formatCurrency(report.totals.shippingFees)} change={percentChange(report.totals.shippingFees, report.previousTotals.shippingFees)} definition="مجموع رسوم الشحن داخل الفترة." icon={<Truck size={20}/>} gradient="linear-gradient(135deg,#0EA5E9,#0284C7)"/><Kpi label="المرتجعات" value={fmt(report.totals.returns)} change={percentChange(report.totals.returns, report.previousTotals.returns)} inverse definition="عدد الشحنات المرتجعة؛ الانخفاض تحسن." icon={<RotateCcw size={20}/>} gradient="linear-gradient(135deg,#EF4444,#B91C1C)" onClick={() => navigate(withDates('/shipments?status=returned'))}/></div><div className="report-grid-2"><section className="glass-card"><div className="report-section-title"><h3>حركة قيمة الأوردرات</h3><span className="report-muted">{report.start.toLocaleDateString('ar-EG')} — {report.end.toLocaleDateString('ar-EG')}</span></div><BarChart values={report.trend.map((item) => ({ label: item.day, value: item.orderValue }))}/></section><section className="glass-card"><div className="report-section-title"><h3>حجم الأوردرات يوميًا</h3><button className="outline-btn" onClick={() => navigate(withDates('/shipments'))}><Eye size={15}/> التفاصيل</button></div><div className="funnel-list">{report.trend.map((item) => <ProgressRow key={item.day} label={item.day} value={item.orders} max={Math.max(1, ...report.trend.map((point) => point.orders))} suffix="أوردر"/>)}</div></section></div></>}

    {activeTab === 'operations' && <div className="report-grid-2"><section className="glass-card"><div className="report-section-title"><h3>مسار حالات الشحنات</h3><span className="report-muted" title="الشحنات المسلمة ÷ الشحنات التي وصلت لمحاولة توصيل">نسبة نجاح المحاولات {pct(report.successRate)} ({report.successRate - report.previousSuccessRate >= 0 ? '+' : ''}{pct(report.successRate - report.previousSuccessRate)})</span></div><div className="funnel-list">{report.statuses.map((step) => <button key={step.label} className="funnel-row" onClick={() => navigate(withDates(`/shipments?status=${step.query}`))}><ProgressRow label={step.label} value={step.count} max={Math.max(1, report.current.length)} suffix="شحنة"/></button>)}</div></section><section className="glass-card"><div className="report-section-title"><h3>تعريف المؤشر</h3></div><p className="report-muted">نسبة النجاح لا تجمع مراحل الـFunnel. يتم حسابها من الشحنات التي وصلت إلى نتيجة محاولة توصيل: تم التسليم ÷ (تم التسليم + فشل + تأجيل + مرتجع).</p><div className="report-kpi-grid one-column"><Kpi label="وصل مكتب الشحن" value={fmt(report.statuses[1].count)} icon={<PackageCheck size={20}/>} gradient="linear-gradient(135deg,#0EA5E9,#0284C7)"/><Kpi label="مع المندوب أو في الطريق" value={fmt(report.statuses[2].count + report.statuses[3].count)} icon={<Truck size={20}/>} gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)"/></div></section></div>}

    {activeTab === 'drivers' && <section className="glass-card"><div className="report-section-title"><h3>أداء المناديب</h3><span className="report-muted">مشتق من الشحنات داخل الفترة</span></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>المندوب</th><th>المنطقة</th><th>مكلف</th><th>منجز</th><th>مرتجع</th><th>تأخير</th><th>التحصيل</th><th>نسبة النجاح</th><th>إجراء</th></tr></thead><tbody>{report.driverPerformance.map((driver) => <tr key={driver.driverId}><td><strong>{driver.driverName}</strong><p className="report-muted">{driver.driverId}</p></td><td>{driver.zone}</td><td>{fmt(driver.assigned)}</td><td>{fmt(driver.delivered)}</td><td>{fmt(driver.returned)}</td><td>{fmt(driver.delayed)}</td><td>{formatCurrency(driver.collectedCash)}</td><td><ProgressInline value={driver.successRate}/></td><td><button className="outline-btn" onClick={() => navigate(withDates(`/shipments?driver=${driver.driverName}`))}><Eye size={14}/> الشحنات</button></td></tr>)}</tbody></table></div></section>}

    {activeTab === 'governorates' && <section className="glass-card"><div className="report-section-title"><h3>أداء المحافظات</h3></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>المحافظة</th><th>الإجمالي</th><th>تم التسليم</th><th>في الطريق</th><th>مرتجع</th><th>متأخر</th><th>متوسط الساعات</th></tr></thead><tbody>{report.governorates.map((item) => <tr key={item.governorate} role="link" aria-label={`عرض شحنات ${item.governorate}`} onClick={() => navigate(withDates(`/shipments?governorate=${encodeURIComponent(item.governorate)}`))} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate(withDates(`/shipments?governorate=${encodeURIComponent(item.governorate)}`)); }} tabIndex={0}><td><strong>{item.governorate}</strong></td><td>{fmt(item.total)}</td><td>{fmt(item.delivered)}</td><td>{fmt(item.inTransit)}</td><td>{fmt(item.returned)}</td><td>{fmt(item.delayed)}</td><td>{fmt(item.avgDeliveryHours)}</td></tr>)}</tbody></table></div></section>}

    {activeTab === 'delays' && <section className="glass-card"><div className="report-section-title"><h3>الشحنات المتأخرة</h3><span className="report-muted">{fmt(report.delays.length)} حالة</span></div><div className="delay-list">{report.delays.map(({ shipment, lateByHours }) => <div key={shipment.id} className="delay-row"><div className="funnel-row-top"><strong>{shipment.id} · {shipment.merchantName}</strong><span className={`tone-badge ${lateByHours >= 12 ? 'high' : 'medium'}`}>متأخرة {fmt(lateByHours)} ساعة</span></div><p className="report-muted">{shipment.governorate} · {shipment.driverName ?? 'لم يعين مندوب'} · {shipment.exceptionReason ?? 'تجاوز موعد التسليم'}</p><button className="outline-btn" onClick={() => navigate(`/shipments?shipment=${shipment.id}`)}><Eye size={15}/> فتح الشحنة</button></div>)}</div></section>}
  </div>;
}

function Kpi({ label, value, icon, gradient, change, definition, inverse = false, onClick }: { label: string; value: string; icon: React.ReactNode; gradient: string; change?: number; definition?: string; inverse?: boolean; onClick?: () => void }) { const positive = change === undefined ? true : inverse ? change <= 0 : change >= 0; const Tag = onClick ? 'button' : 'div'; return <Tag className={`report-kpi glass-card ${onClick ? 'report-kpi-clickable' : ''}`} onClick={onClick}><div className="report-kpi-icon" style={{ background: gradient }}>{icon}</div><div className="report-kpi-content"><p className="report-kpi-label">{label}{definition && <span className="report-definition" title={definition}><Info size={13}/></span>}</p><p className="report-kpi-value">{value}</p>{change !== undefined && <span className={`report-change ${positive ? 'positive' : 'negative'}`}>{change >= 0 ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>} {Math.abs(change).toLocaleString('ar-EG')}٪ مقارنة بالفترة السابقة</span>}</div></Tag>; }
function BarChart({ values }: { values: { label: string; value: number }[] }) { const max = Math.max(1, ...values.map((item) => item.value)); return <div className="bar-chart">{values.map((item) => <button key={item.label} className="bar-column" title={`${item.label}: ${formatCurrency(item.value)}`}><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(4, (item.value / max) * 100)}%` }}/></div><span className="bar-label">{item.label}</span></button>)}</div>; }
function ProgressRow({ label, value, max, suffix }: { label: string; value: number; max: number; suffix: string }) { return <div className="funnel-row"><div className="funnel-row-top"><span>{label}</span><span>{fmt(value)} {suffix}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }}/></div></div>; }
function ProgressInline({ value }: { value: number }) { return <div style={{ minWidth: 120 }}><div className="funnel-row-top" style={{ marginBottom: 4 }}><span>{pct(value)}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${value}%` }}/></div></div>; }
