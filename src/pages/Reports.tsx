import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, BarChart3, Banknote, Bell, Eye, FileSpreadsheet, Info, Map, PackageCheck, ReceiptText, TrendingUp, Truck, Users, Wallet } from 'lucide-react';
import { Modal } from '../components/ui/Ui';
import type { ReportTab } from '../domain/reports/entities';
import type { Shipment } from '../domain/logistics/entities';
import type { DriverFinancialAdjustment, OperationalExpense } from '../domain/finance/entities';
import type { PricingPolicySettings } from '../domain/settings/entities';
import { approvedDriverAdjustmentCost, approvedOperationalExpenses, deliveryCost, driverDeliveryCost, merchantShippingFee, shipmentShippingProfit, shippingRevenue } from '../domain/finance/calculations';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { downloadXlsx } from '../utils/exportSpreadsheet';
import { formatCurrency } from '../utils/helpers';
import { api } from '../infrastructure/api/client';
import { friendlyApiMessage } from '../infrastructure/api/errors';
import './Reports.css';

const reportTabs: { id: ReportTab; label: string; icon: ReactNode }[] = [
  { id: 'orderValue', label: 'المبيعات والربحية', icon: <TrendingUp size={17} /> },
  { id: 'operations', label: 'التشغيل', icon: <PackageCheck size={17} /> },
  { id: 'drivers', label: 'المناديب', icon: <Users size={17} /> },
  { id: 'governorates', label: 'المحافظات', icon: <Map size={17} /> },
  { id: 'delays', label: 'التأخير و SLA', icon: <Bell size={17} /> },
];

type Period = 'today' | 'week' | 'month' | 'custom';
type FinancialDetailKind = 'shippingIncome' | 'courierCost' | 'shippingProfit' | 'expenses' | 'driverAdjustments' | 'netOperatingProfit';
type ReportSummary = {
  start: Date;
  end: Date;
  current: Shipment[];
  currentExpenses: OperationalExpense[];
  currentAdjustments: DriverFinancialAdjustment[];
  pricing?: PricingPolicySettings;
  totals: { shippingIncome: number; courierCost: number; shippingProfit: number };
  expenseTotal: number;
  driverExtraCost: number;
  netOperatingProfit: number;
};

const expenseLabels: Record<string, string> = { rent: 'إيجار', utilities: 'كهرباء ومياه', salaries: 'رواتب', fuel: 'بنزين ومشاوير', maintenance: 'صيانة', packaging: 'تغليف ومطبوعات', marketing: 'تسويق', software: 'أنظمة وبرامج', other: 'أخرى' };
const adjustmentLabels: Record<string, string> = { bonus: 'إضافة / مكافأة', deduction: 'خصم', reimbursement: 'تعويض مصروف', advance: 'سلفة' };
const reviewLabels: Record<string, string> = { pending: 'معلق', approved: 'معتمد', rejected: 'مرفوض', cancelled: 'ملغي' };
const periodOptions: Array<{ id: Period; label: string }> = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'آخر 7 أيام' },
  { id: 'month', label: 'الشهر الحالي' },
  { id: 'custom', label: 'فترة مخصصة' },
];

const fmt = (value: number) => value.toLocaleString('ar-EG');
const pct = (value: number) => `${value.toLocaleString('ar-EG')}%`;
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dayEnd = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

function resolveRange(period: Period, customStart: string, customEnd: string) {
  const today = new Date();
  if (period === 'today') return { start: dayStart(today), end: dayEnd(today) };
  if (period === 'month') return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: dayEnd(today) };
  if (period === 'custom' && customStart && customEnd) return { start: dayStart(new Date(customStart)), end: dayEnd(new Date(customEnd)) };
  const start = dayStart(today);
  start.setDate(start.getDate() - 6);
  return { start, end: dayEnd(today) };
}

function inRange(shipment: Shipment, start: Date, end: Date) {
  const time = new Date(shipment.createdAt).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function dateInRange(date: string, start: Date, end: Date) {
  const time = new Date(date).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { state, isLoading } = useDeliveryData();
  const [activeTab, setActiveTab] = useState<ReportTab>('orderValue');
  const [period, setPeriod] = useState<Period>('week');
  const [customStart, setCustomStart] = useState(() => new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [driverDetailsId, setDriverDetailsId] = useState<string | null>(null);
  const [governorateDetails, setGovernorateDetails] = useState<string | null>(null);
  const [delayNotifyOpen, setDelayNotifyOpen] = useState(false);
  const [delayNotifyBusy, setDelayNotifyBusy] = useState(false);
  const [financialDetail, setFinancialDetail] = useState<FinancialDetailKind | null>(null);
  const [now] = useState(() => Date.now());

  const report = useMemo(() => {
    const shipments = state?.shipments ?? [];
    const drivers = state?.drivers ?? [];
    const pricing = state?.settings.pricing;
    const expenses = state?.operationalExpenses ?? [];
    const adjustments = state?.driverAdjustments ?? [];
    const { start, end } = resolveRange(period, customStart, customEnd);
    const duration = end.getTime() - start.getTime() + 1;
    const previousStart = new Date(start.getTime() - duration);
    const previousEnd = new Date(start.getTime() - 1);
    const current = shipments.filter((shipment) => inRange(shipment, start, end));
    const previous = shipments.filter((shipment) => inRange(shipment, previousStart, previousEnd));
    const currentExpenses = expenses.filter((item) => dateInRange(item.date, start, end));
    const currentAdjustments = adjustments.filter((item) => dateInRange(item.date, start, end));

    const summarize = (items: Shipment[]) => {
      const shippingIncome = pricing ? shippingRevenue(items, pricing) : items.reduce((sum, item) => sum + item.deliveryFee, 0);
      const courierCost = pricing ? deliveryCost(items, pricing) : 0;
      return {
        orders: items.length,
        orderValue: items.reduce((sum, item) => sum + item.total, 0),
        shippingIncome,
        courierCost,
        shippingProfit: pricing ? items.reduce((sum, item) => sum + shipmentShippingProfit(item, pricing), 0) : shippingIncome,
        returns: items.filter((item) => item.status === 'returned').length,
        delivered: items.filter((item) => item.status === 'delivered').length,
        partialDelivered: items.filter((item) => item.status === 'partiallyDelivered').length,
        attempted: items.filter((item) => ['delivered', 'partiallyDelivered', 'failedToDeliver', 'postponed', 'returned'].includes(item.status)).length,
      };
    };

    const totals = summarize(current);
    const previousTotals = summarize(previous);
    const expenseTotal = approvedOperationalExpenses(currentExpenses);
    const driverExtraCost = approvedDriverAdjustmentCost(currentAdjustments);
    const netOperatingProfit = totals.shippingProfit - expenseTotal - driverExtraCost;
    const successRate = totals.attempted ? Math.round(((totals.delivered + totals.partialDelivered) / totals.attempted) * 100) : 0;
    const previousSuccessRate = previousTotals.attempted ? Math.round(((previousTotals.delivered + previousTotals.partialDelivered) / previousTotals.attempted) * 100) : 0;

    const days: Array<{ key: string; label: string; items: Shipment[] }> = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const date = new Date(cursor);
      const key = date.toISOString().slice(0, 10);
      days.push({ key, label: date.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' }), items: current.filter((item) => new Date(item.createdAt).toISOString().slice(0, 10) === key) });
    }
    const trend = days.map((day) => ({
      day: day.label,
      orders: day.items.length,
      orderValue: day.items.reduce((sum, item) => sum + item.total, 0),
      shippingIncome: pricing ? shippingRevenue(day.items, pricing) : day.items.reduce((sum, item) => sum + item.deliveryFee, 0),
      courierCost: pricing ? deliveryCost(day.items, pricing) : 0,
      shippingProfit: pricing ? day.items.reduce((sum, item) => sum + shipmentShippingProfit(item, pricing), 0) : day.items.reduce((sum, item) => sum + item.deliveryFee, 0),
      returns: day.items.filter((item) => item.status === 'returned').length,
    }));

    const statuses = [
      { label: 'بانتظار الاستلام', count: current.filter((item) => item.status === 'readyToShip').length, query: 'readyToShip' },
      { label: 'وصل مكتب الشحن', count: current.filter((item) => item.status === 'receivedAtOffice').length, query: 'receivedAtOffice' },
      { label: 'مع المندوب', count: current.filter((item) => item.status === 'deliveredToDriver').length, query: 'deliveredToDriver' },
      { label: 'في الطريق', count: current.filter((item) => item.status === 'inTransit').length, query: 'inTransit' },
      { label: 'تم التسليم كامل', count: totals.delivered, query: 'delivered' },
      { label: 'تم التسليم جزئي', count: totals.partialDelivered, query: 'partiallyDelivered' },
      { label: 'مرتجع / فشل', count: current.filter((item) => ['returned', 'failedToDeliver'].includes(item.status)).length, query: 'returned' },
    ];

    const driverPerformance = drivers.map((driver) => {
      const items = current.filter((item) => item.driverId === driver.id);
      const delivered = items.filter((item) => ['delivered', 'partiallyDelivered'].includes(item.status)).length;
      const attempted = items.filter((item) => ['delivered', 'partiallyDelivered', 'failedToDeliver', 'postponed', 'returned'].includes(item.status)).length;
      return {
        driverId: driver.id,
        driverName: driver.name,
        zone: driver.zone,
        assigned: items.length,
        delivered,
        returned: items.filter((item) => item.status === 'returned').length,
        delayed: items.filter((item) => item.expectedDeliveryAt && new Date(item.expectedDeliveryAt).getTime() < now && !['delivered', 'partiallyDelivered', 'returned'].includes(item.status)).length,
        collectedCash: items.reduce((sum, item) => sum + item.collectedCash, 0),
        courierCost: pricing ? deliveryCost(items, pricing) : 0,
        successRate: attempted ? Math.round((delivered / attempted) * 100) : 0,
      };
    }).filter((item) => item.assigned > 0);

    const governorates = [...new Set(current.map((item) => item.governorate))].map((governorate) => {
      const items = current.filter((item) => item.governorate === governorate);
      const deliveredItems = items.filter((item) => ['delivered', 'partiallyDelivered'].includes(item.status));
      return {
        governorate,
        total: items.length,
        delivered: deliveredItems.length,
        inTransit: items.filter((item) => item.status === 'inTransit').length,
        returned: items.filter((item) => item.status === 'returned').length,
        delayed: items.filter((item) => item.expectedDeliveryAt && new Date(item.expectedDeliveryAt).getTime() < now && !['delivered', 'partiallyDelivered', 'returned'].includes(item.status)).length,
        revenue: pricing ? shippingRevenue(items, pricing) : items.reduce((sum, item) => sum + item.deliveryFee, 0),
        cost: pricing ? deliveryCost(items, pricing) : 0,
        avgDeliveryHours: deliveredItems.length ? Math.round(deliveredItems.reduce((sum, item) => sum + Math.max(1, (new Date(item.statusChangedAt).getTime() - new Date(item.createdAt).getTime()) / 3600000), 0) / deliveredItems.length) : 0,
      };
    });
    const delays = current
      .filter((item) => item.expectedDeliveryAt && new Date(item.expectedDeliveryAt).getTime() < now && !['delivered', 'partiallyDelivered', 'returned'].includes(item.status))
      .map((item) => ({ shipment: item, lateByHours: Math.max(1, Math.round((now - new Date(item.expectedDeliveryAt!).getTime()) / 3600000)) }))
      .sort((a, b) => b.lateByHours - a.lateByHours);

    return { start, end, current, currentExpenses, currentAdjustments, totals, previousTotals, expenseTotal, driverExtraCost, netOperatingProfit, successRate, previousSuccessRate, trend, statuses, driverPerformance, governorates, delays, pricing };
  }, [state, period, customStart, customEnd, now]);

  const sendDelayNotifications = async () => {
    if (!report.delays.length || delayNotifyBusy) return;
    setDelayNotifyBusy(true);
    try {
      const shipmentIds = report.delays.map(({ shipment }) => shipment.id);
      const previewAction = `web-delay-preview-${crypto.randomUUID()}`;
      const preview = await api.post<{ id: string }>('/api/v1/notification-batches/preview', {
        shipment_ids: shipmentIds,
        audiences: ['driver', 'merchant'],
        channels: ['in_app', 'push'],
        event_type: 'shipment_delay',
        title: 'تنبيه تأخير شحنة',
        body: 'توجد شحنة متأخرة عن موعد التسليم المتوقع. يرجى مراجعة التفاصيل داخل التطبيق.',
        client_action_id: previewAction,
      }, { idempotencyKey: previewAction, retries: 1 });
      const sendAction = `web-delay-send-${crypto.randomUUID()}`;
      const sent = await api.post<{ result_summary?: { accepted?: number; failed?: number; skipped?: number } }>(`/api/v1/notification-batches/${preview.data.id}/send`, {
        severity: 'warning',
        client_action_id: sendAction,
      }, { idempotencyKey: sendAction, retries: 1 });
      const summary = sent.data.result_summary;
      setActionMessage(summary ? `تم إرسال التنبيهات: ${fmt(summary.accepted ?? 0)} مقبول، ${fmt(summary.skipped ?? 0)} متجاوز، ${fmt(summary.failed ?? 0)} فشل.` : 'تم إرسال تنبيهات التأخير بنجاح.');
      setDelayNotifyOpen(false);
    } catch (error) {
      setActionMessage(friendlyApiMessage(error));
    } finally {
      setDelayNotifyBusy(false);
    }
  };

  const withDates = (path: string) => `${path}${path.includes('?') ? '&' : '?'}from=${report.start.toISOString().slice(0, 10)}&to=${report.end.toISOString().slice(0, 10)}`;
  const exportActiveReport = () => {
    const dateSuffix = `${report.start.toISOString().slice(0, 10)}_${report.end.toISOString().slice(0, 10)}`;
    if (activeTab === 'orderValue') downloadXlsx({ filename: `profit-report-${dateSuffix}.xlsx`, sheetName: 'المبيعات والربحية', rows: report.trend.map((item) => ({ اليوم: item.day, الأوردرات: item.orders, قيمة_الأوردرات: item.orderValue, إيراد_الشحن: item.shippingIncome, تكلفة_المندوب: item.courierCost, ربح_الشحن: item.shippingProfit, المرتجعات: item.returns })) });
    else if (activeTab === 'drivers') downloadXlsx({ filename: `drivers-performance-${dateSuffix}.xlsx`, sheetName: 'أداء المناديب', rows: report.driverPerformance.map((item) => ({ كود_المندوب: item.driverId, المندوب: item.driverName, المنطقة: item.zone, مكلف: item.assigned, منجز: item.delivered, مرتجع: item.returned, متأخر: item.delayed, التحصيل: item.collectedCash, تكلفة_التوصيل: item.courierCost, نسبة_النجاح: item.successRate / 100 })) });
    else if (activeTab === 'governorates') downloadXlsx({ filename: `governorates-report-${dateSuffix}.xlsx`, sheetName: 'المحافظات', rows: report.governorates.map((item) => ({ المحافظة: item.governorate, الإجمالي: item.total, تم_التسليم: item.delivered, في_الطريق: item.inTransit, مرتجع: item.returned, متأخر: item.delayed, إيراد_الشحن: item.revenue, تكلفة_المندوب: item.cost, متوسط_الساعات: item.avgDeliveryHours })) });
    else if (activeTab === 'delays') downloadXlsx({ filename: `sla-delays-${dateSuffix}.xlsx`, sheetName: 'التأخير', rows: report.delays.map((item) => ({ الشحنة: item.shipment.id, التاجر: item.shipment.merchantName, المندوب: item.shipment.driverName ?? 'غير معين', المحافظة: item.shipment.governorate, ساعات_التأخير: item.lateByHours })) });
    else downloadXlsx({ filename: `operations-report-${dateSuffix}.xlsx`, sheetName: 'التشغيل', rows: report.statuses.map((item) => ({ الحالة: item.label, العدد: item.count })) });
    setActionMessage('تم تجهيز ملف Excel مطابق للفترة والتاب الحالي.');
  };

  const selectedDriverDetails = report.driverPerformance.find((item) => item.driverId === driverDetailsId) ?? null;
  const selectedGovernorateDetails = report.governorates.find((item) => item.governorate === governorateDetails) ?? null;

  if (isLoading) return <div className="reports-page"><div className="glass-card">جاري تحميل التقارير...</div></div>;
  return <div className="reports-page">
    <header className="reports-hero glass-card"><div><h2>التقارير والإحصائيات</h2><p>قراءة تشغيلية ومالية من نفس مصدر البيانات: شحنات، مناديب، محافظات، مصاريف، وربحية.</p></div><div className="reports-actions"><div className="period-control">{periodOptions.map((option) => <button key={option.id} className={period === option.id ? 'active' : ''} onClick={() => setPeriod(option.id)}>{option.label}</button>)}</div><button className="btn-primary" onClick={exportActiveReport}><FileSpreadsheet size={16} /> تحميل Excel</button></div></header>
    {period === 'custom' && <section className="statement-toolbar glass-card"><label><span>من</span><input className="input-glass" type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} /></label><label><span>إلى</span><input className="input-glass" type="date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value)} /></label></section>}
    {actionMessage && <div className="ops-feedback">{actionMessage}</div>}
    <div className="reports-tabs glass-card">{reportTabs.map((tab) => <button key={tab.id} className={`reports-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.icon}{tab.label}</button>)}</div>

    {activeTab === 'orderValue' && <><div className="report-kpi-grid"><Kpi label="إيراد الشحن من التجار" value={formatCurrency(report.totals.shippingIncome)} change={percentChange(report.totals.shippingIncome, report.previousTotals.shippingIncome)} definition="سعر الشحن المحاسب به التاجر حسب إعدادات كل محافظة." icon={<ReceiptText size={20} />} gradient="linear-gradient(135deg,#0EA5E9,#0284C7)" onClick={() => setFinancialDetail('shippingIncome')} /><Kpi label="تكلفة توصيل المناديب" value={formatCurrency(report.totals.courierCost)} change={percentChange(report.totals.courierCost, report.previousTotals.courierCost)} inverse definition="المبلغ المستحق للمناديب مقابل التوصيل حسب المحافظة." icon={<Truck size={20} />} gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)" onClick={() => setFinancialDetail('courierCost')} /><Kpi label="ربح الشحن" value={formatCurrency(report.totals.shippingProfit)} change={percentChange(report.totals.shippingProfit, report.previousTotals.shippingProfit)} definition="إيراد الشحن ناقص تكلفة المندوب قبل المصاريف التشغيلية." icon={<Banknote size={20} />} gradient="linear-gradient(135deg,#10B981,#059669)" onClick={() => setFinancialDetail('shippingProfit')} /><Kpi label="صافي التشغيل" value={formatCurrency(report.netOperatingProfit)} definition="ربح الشحن بعد المصاريف التشغيلية وحركات المناديب الإضافية." icon={<Wallet size={20} />} gradient="linear-gradient(135deg,#F59E0B,#D97706)" onClick={() => setFinancialDetail('netOperatingProfit')} /></div><div className="report-kpi-grid"><Kpi label="إجمالي الأوردرات" value={fmt(report.totals.orders)} change={percentChange(report.totals.orders, report.previousTotals.orders)} definition="عدد الشحنات التي أُنشئت داخل الفترة." icon={<BarChart3 size={20} />} gradient="linear-gradient(135deg,#4F46E5,#7C3AED)" onClick={() => navigate(withDates('/shipments'))} /><Kpi label="قيمة أوردرات التجار" value={formatCurrency(report.totals.orderValue)} change={percentChange(report.totals.orderValue, report.previousTotals.orderValue)} definition="مجموع قيمة المنتجات داخل الشحنات." icon={<TrendingUp size={20} />} gradient="linear-gradient(135deg,#14B8A6,#0F766E)" onClick={() => navigate(withDates('/shipments'))} /><Kpi label="مصاريف تشغيلية" value={formatCurrency(report.expenseTotal)} inverse definition="بنود مثل كهرباء، إيجار، صيانة، تغليف، وبرامج." icon={<ReceiptText size={20} />} gradient="linear-gradient(135deg,#EF4444,#B91C1C)" onClick={() => setFinancialDetail('expenses')} /><Kpi label="حركات مناديب إضافية" value={formatCurrency(report.driverExtraCost)} inverse definition="مكافآت وتعويضات وسلف، مع استبعاد الخصومات من التكلفة." icon={<Users size={20} />} gradient="linear-gradient(135deg,#64748B,#334155)" onClick={() => setFinancialDetail('driverAdjustments')} /></div><div className="report-grid-2"><section className="glass-card"><div className="report-section-title"><h3>ربح الشحن اليومي</h3><span className="report-muted">{report.start.toLocaleDateString('ar-EG')} - {report.end.toLocaleDateString('ar-EG')}</span></div><BarChart values={report.trend.map((item) => ({ label: item.day, value: item.shippingProfit }))} /></section><section className="glass-card"><div className="report-section-title"><h3>حجم الأوردرات يوميا</h3><button className="outline-btn" onClick={() => navigate(withDates('/shipments'))}><Eye size={15} /> التفاصيل</button></div><div className="funnel-list">{report.trend.map((item) => <ProgressRow key={item.day} label={item.day} value={item.orders} max={Math.max(1, ...report.trend.map((point) => point.orders))} suffix="أوردر" />)}</div></section></div></>}

    {activeTab === 'operations' && <div className="report-grid-2"><section className="glass-card"><div className="report-section-title"><h3>مسار حالات الشحنات</h3><span className="report-muted" title="الشحنات المسلمة ÷ الشحنات التي وصلت لمحاولة توصيل">نسبة نجاح المحاولات {pct(report.successRate)} ({report.successRate - report.previousSuccessRate >= 0 ? '+' : ''}{pct(report.successRate - report.previousSuccessRate)})</span></div><div className="funnel-list">{report.statuses.map((step) => <button key={step.label} className="funnel-row" onClick={() => navigate(withDates(`/shipments?status=${step.query}`))}><ProgressRow label={step.label} value={step.count} max={Math.max(1, report.current.length)} suffix="شحنة" /></button>)}</div></section><section className="glass-card"><div className="report-section-title"><h3>قراءة المؤشر</h3></div><p className="report-muted">نسبة النجاح تشمل التسليم الكامل والجزئي من الشحنات التي وصلت لمحاولة توصيل. أي تكدس في بانتظار الاستلام أو مع المندوب يظهر هنا بسرعة قبل ما يتحول لتأخير.</p><div className="report-kpi-grid one-column"><Kpi label="وصل مكتب الشحن" value={fmt(report.statuses[1].count)} icon={<PackageCheck size={20} />} gradient="linear-gradient(135deg,#0EA5E9,#0284C7)" /><Kpi label="تسليم جزئي" value={fmt(report.totals.partialDelivered)} icon={<PackageCheck size={20} />} gradient="linear-gradient(135deg,#14B8A6,#0F766E)" onClick={() => navigate(withDates('/shipments?status=partiallyDelivered'))} /><Kpi label="مع المندوب أو في الطريق" value={fmt(report.statuses[2].count + report.statuses[3].count)} icon={<Truck size={20} />} gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)" /></div></section></div>}

    {activeTab === 'drivers' && <section className="glass-card"><div className="report-section-title"><h3>أداء المناديب</h3><span className="report-muted">الأداء والتكلفة محسوبان داخل الفترة</span></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>المندوب</th><th>المنطقة</th><th>مكلف</th><th>منجز</th><th>مرتجع</th><th>تأخير</th><th>التحصيل</th><th>تكلفة التوصيل</th><th>نسبة النجاح</th><th>إجراء</th></tr></thead><tbody>{report.driverPerformance.map((driver) => <tr key={driver.driverId}><td><strong>{driver.driverName}</strong><p className="report-muted">{driver.driverId}</p></td><td>{driver.zone}</td><td>{fmt(driver.assigned)}</td><td>{fmt(driver.delivered)}</td><td>{fmt(driver.returned)}</td><td>{fmt(driver.delayed)}</td><td>{formatCurrency(driver.collectedCash)}</td><td>{formatCurrency(driver.courierCost)}</td><td><ProgressInline value={driver.successRate} /></td><td><button className="outline-btn" onClick={() => setDriverDetailsId(driver.driverId)}><Eye size={14} /> التفاصيل</button></td></tr>)}</tbody></table></div></section>}

    {activeTab === 'governorates' && <section className="glass-card"><div className="report-section-title"><h3>أداء المحافظات</h3></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>المحافظة</th><th>الإجمالي</th><th>تم التسليم</th><th>في الطريق</th><th>مرتجع</th><th>متأخر</th><th>إيراد الشحن</th><th>تكلفة المندوب</th><th>متوسط الساعات</th><th>إجراء</th></tr></thead><tbody>{report.governorates.map((item) => <tr key={item.governorate}><td><strong>{item.governorate}</strong></td><td>{fmt(item.total)}</td><td>{fmt(item.delivered)}</td><td>{fmt(item.inTransit)}</td><td>{fmt(item.returned)}</td><td>{fmt(item.delayed)}</td><td>{formatCurrency(item.revenue)}</td><td>{formatCurrency(item.cost)}</td><td>{fmt(item.avgDeliveryHours)}</td><td><button className="outline-btn" onClick={() => setGovernorateDetails(item.governorate)}><Eye size={14} /> التفاصيل</button></td></tr>)}</tbody></table></div></section>}

    {activeTab === 'delays' && <section className="glass-card"><div className="report-section-title"><div><h3>الشحنات المتأخرة</h3><span className="report-muted">{fmt(report.delays.length)} حالة</span></div><button className="outline-btn" disabled={!report.delays.length} onClick={() => setDelayNotifyOpen(true)}><Bell size={15} /> مراجعة تنبيهات التأخير</button></div><div className="delay-list">{report.delays.map(({ shipment, lateByHours }) => <div key={shipment.id} className="delay-row"><div className="funnel-row-top"><strong>{shipment.id} · {shipment.merchantName}</strong><span className={`tone-badge ${lateByHours >= 12 ? 'high' : 'medium'}`}>متأخرة {fmt(lateByHours)} ساعة</span></div><p className="report-muted">{shipment.governorate} · {shipment.driverName ?? 'لم يعين مندوب'} · {shipment.exceptionReason ?? 'تجاوز موعد التسليم'}</p><button className="outline-btn" onClick={() => navigate(`/shipments?shipment=${shipment.id}`)}><Eye size={15} /> فتح تفاصيل الشحنة</button></div>)}</div></section>}

    {selectedDriverDetails && <Modal wide title={`تفاصيل أداء ${selectedDriverDetails.driverName}`} description={`${report.start.toLocaleDateString('ar-EG')} - ${report.end.toLocaleDateString('ar-EG')}`} onClose={() => setDriverDetailsId(null)} footer={<><button className="outline-btn" onClick={() => setDriverDetailsId(null)}>إغلاق</button><button className="btn-primary" onClick={() => navigate(withDates(`/shipments?driver=${encodeURIComponent(selectedDriverDetails.driverName)}`))}><Eye size={15} /> فتح الشحنات بنفس الفلتر</button></>}><div className="report-kpi-grid"><Kpi label="مكلف" value={fmt(selectedDriverDetails.assigned)} icon={<PackageCheck size={18} />} gradient="linear-gradient(135deg,#0EA5E9,#4F46E5)" /><Kpi label="منجز" value={fmt(selectedDriverDetails.delivered)} icon={<PackageCheck size={18} />} gradient="linear-gradient(135deg,#10B981,#059669)" /><Kpi label="متأخر" value={fmt(selectedDriverDetails.delayed)} icon={<Bell size={18} />} gradient="linear-gradient(135deg,#F59E0B,#D97706)" /><Kpi label="تكلفة التوصيل" value={formatCurrency(selectedDriverDetails.courierCost)} icon={<Truck size={18} />} gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)" /></div><p className="report-muted">المنطقة: {selectedDriverDetails.zone} · المرتجعات: {fmt(selectedDriverDetails.returned)} · نسبة النجاح: {pct(selectedDriverDetails.successRate)}.</p></Modal>}

    {selectedGovernorateDetails && <Modal wide title={`تفاصيل محافظة ${selectedGovernorateDetails.governorate}`} description={`${report.start.toLocaleDateString('ar-EG')} - ${report.end.toLocaleDateString('ar-EG')}`} onClose={() => setGovernorateDetails(null)} footer={<><button className="outline-btn" onClick={() => setGovernorateDetails(null)}>إغلاق</button><button className="btn-primary" onClick={() => navigate(withDates(`/shipments?governorate=${encodeURIComponent(selectedGovernorateDetails.governorate)}`))}><Eye size={15} /> فتح الشحنات بنفس الفلتر</button></>}><div className="report-kpi-grid"><Kpi label="إجمالي الشحنات" value={fmt(selectedGovernorateDetails.total)} icon={<BarChart3 size={18} />} gradient="linear-gradient(135deg,#4F46E5,#7C3AED)" /><Kpi label="تم التسليم" value={fmt(selectedGovernorateDetails.delivered)} icon={<PackageCheck size={18} />} gradient="linear-gradient(135deg,#10B981,#059669)" /><Kpi label="إيراد الشحن" value={formatCurrency(selectedGovernorateDetails.revenue)} icon={<ReceiptText size={18} />} gradient="linear-gradient(135deg,#0EA5E9,#0284C7)" /><Kpi label="تكلفة المندوب" value={formatCurrency(selectedGovernorateDetails.cost)} icon={<Truck size={18} />} gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)" /></div><p className="report-muted">في الطريق: {fmt(selectedGovernorateDetails.inTransit)} · مرتجع: {fmt(selectedGovernorateDetails.returned)} · متأخر: {fmt(selectedGovernorateDetails.delayed)}.</p></Modal>}

    {delayNotifyOpen && <Modal wide title="مراجعة تنبيهات التأخير" description={`سيتم تجهيز ${fmt(report.delays.length)} حالة وإرسالها للتاجر والمندوب حسب إعدادات الشركة.`} onClose={() => { if (!delayNotifyBusy) setDelayNotifyOpen(false); }} footer={<><button className="outline-btn" disabled={delayNotifyBusy} onClick={() => setDelayNotifyOpen(false)}>إلغاء</button><button className="btn-primary" disabled={delayNotifyBusy} onClick={() => void sendDelayNotifications()}><Bell size={15} /> {delayNotifyBusy ? 'جاري الإرسال...' : 'إرسال بعد المراجعة'}</button></>}><div className="delay-list">{report.delays.slice(0, 12).map(({ shipment, lateByHours }) => <div className="delay-row" key={`notify-${shipment.id}`}><div className="funnel-row-top"><strong>{shipment.id}</strong><span className="tone-badge medium">{fmt(lateByHours)} ساعة</span></div><p className="report-muted">المندوب: {shipment.driverName ?? 'غير معين'} · التاجر: {shipment.merchantName}</p><button className="outline-btn" onClick={() => navigate(`/shipments?shipment=${shipment.id}`)}><Eye size={14} /> فتح تفاصيل الشحنة</button></div>)}</div></Modal>}
    {financialDetail && <FinancialDetailModal kind={financialDetail} report={report} onClose={() => setFinancialDetail(null)} onOpenShipment={(id: string) => navigate(`/shipments?shipment=${id}`)} />}
  </div>;
}

function Kpi({ label, value, icon, gradient, change, definition, inverse = false, onClick }: { label: string; value: string; icon: ReactNode; gradient: string; change?: number; definition?: string; inverse?: boolean; onClick?: () => void }) {
  const positive = change === undefined ? true : inverse ? change <= 0 : change >= 0;
  const Tag = onClick ? 'button' : 'div';
  return <Tag className={`report-kpi glass-card ${onClick ? 'report-kpi-clickable' : ''}`} onClick={onClick}><div className="report-kpi-icon" style={{ background: gradient }}>{icon}</div><div className="report-kpi-content"><p className="report-kpi-label">{label}{definition && <span className="report-definition" title={definition}><Info size={13} /></span>}</p><p className="report-kpi-value">{value}</p>{change !== undefined && <span className={`report-change ${positive ? 'positive' : 'negative'}`}>{change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {Math.abs(change).toLocaleString('ar-EG')}% مقارنة بالفترة السابقة</span>}</div></Tag>;
}

function BarChart({ values }: { values: { label: string; value: number }[] }) {
  const max = Math.max(1, ...values.map((item) => item.value));
  return <div className="bar-chart">{values.map((item) => <button key={item.label} className="bar-column" title={`${item.label}: ${formatCurrency(item.value)}`}><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(4, (item.value / max) * 100)}%` }} /></div><span className="bar-label">{item.label}</span></button>)}</div>;
}

function ProgressRow({ label, value, max, suffix }: { label: string; value: number; max: number; suffix: string }) {
  return <div className="funnel-row"><div className="funnel-row-top"><span>{label}</span><span>{fmt(value)} {suffix}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} /></div></div>;
}

function ProgressInline({ value }: { value: number }) {
  return <div style={{ minWidth: 120 }}><div className="funnel-row-top" style={{ marginBottom: 4 }}><span>{pct(value)}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${value}%` }} /></div></div>;
}

function FinancialDetailModal({ kind, report, onClose, onOpenShipment }: { kind: FinancialDetailKind; report: ReportSummary; onClose: () => void; onOpenShipment: (id: string) => void }) {
  const shipmentRows = report.current.map((shipment) => ({
    shipment,
    merchantFee: report.pricing ? merchantShippingFee(shipment, report.pricing) : shipment.deliveryFee,
    driverCost: report.pricing ? driverDeliveryCost(shipment, report.pricing) : 0,
    profit: report.pricing ? shipmentShippingProfit(shipment, report.pricing) : shipment.deliveryFee,
  }));
  const titles: Record<FinancialDetailKind, string> = {
    shippingIncome: 'تفاصيل إيراد الشحن',
    courierCost: 'تفاصيل تكلفة المناديب',
    shippingProfit: 'تفاصيل ربح الشحن',
    expenses: 'تفاصيل المصاريف التشغيلية',
    driverAdjustments: 'تفاصيل حركات المناديب',
    netOperatingProfit: 'تفاصيل صافي التشغيل',
  };
  const rowsForExport = () => {
    if (kind === 'expenses') return report.currentExpenses.map((item) => ({ التاريخ: item.date, البند: expenseLabels[item.category] ?? item.category, البيان: item.description, المبلغ: item.amount, الحالة: reviewLabels[item.status] ?? item.status }));
    if (kind === 'driverAdjustments') return report.currentAdjustments.map((item) => ({ التاريخ: item.date, المندوب: item.driverName, النوع: adjustmentLabels[item.type] ?? item.type, البيان: item.description, المبلغ: item.amount, الحالة: reviewLabels[item.status] ?? item.status }));
    return shipmentRows.map((row) => ({ الشحنة: row.shipment.id, التاجر: row.shipment.merchantName, المندوب: row.shipment.driverName ?? 'غير معين', المحافظة: row.shipment.governorate, سعر_التاجر: row.merchantFee, تكلفة_المندوب: row.driverCost, ربح_الشحن: row.profit }));
  };
  const exportDetails = () => downloadXlsx({ filename: `financial-details-${kind}.xlsx`, sheetName: titles[kind], rows: rowsForExport() as Record<string, unknown>[] });

  return (
    <Modal
      wide
      title={titles[kind]}
      description={`${report.start.toLocaleDateString('ar-EG')} - ${report.end.toLocaleDateString('ar-EG')}`}
      onClose={onClose}
      footer={<><button className="outline-btn" onClick={onClose}>إغلاق</button><button className="btn-primary" onClick={exportDetails}><FileSpreadsheet size={15} /> تحميل التفاصيل</button></>}
    >
      {kind === 'netOperatingProfit' && <div className="report-kpi-grid"><Kpi label="ربح الشحن" value={formatCurrency(report.totals.shippingProfit)} icon={<Banknote size={18} />} gradient="linear-gradient(135deg,#10B981,#059669)" /><Kpi label="المصاريف التشغيلية" value={formatCurrency(report.expenseTotal)} icon={<ReceiptText size={18} />} gradient="linear-gradient(135deg,#EF4444,#B91C1C)" /><Kpi label="حركات المناديب" value={formatCurrency(report.driverExtraCost)} icon={<Users size={18} />} gradient="linear-gradient(135deg,#64748B,#334155)" /><Kpi label="صافي التشغيل" value={formatCurrency(report.netOperatingProfit)} icon={<Wallet size={18} />} gradient="linear-gradient(135deg,#F59E0B,#D97706)" /></div>}
      {['shippingIncome', 'courierCost', 'shippingProfit', 'netOperatingProfit'].includes(kind) && <div className="table-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}><table className="data-table compact-table"><thead><tr><th>الشحنة</th><th>التاجر</th><th>المندوب</th><th>المحافظة</th><th>سعر التاجر</th><th>تكلفة المندوب</th><th>ربح الشحن</th><th>إجراء</th></tr></thead><tbody>{shipmentRows.map((row) => <tr key={row.shipment.id}><td>{row.shipment.id}</td><td>{row.shipment.merchantName}</td><td>{row.shipment.driverName ?? 'غير معين'}</td><td>{row.shipment.governorate}</td><td>{formatCurrency(row.merchantFee)}</td><td>{formatCurrency(row.driverCost)}</td><td>{formatCurrency(row.profit)}</td><td><button className="outline-btn" onClick={() => onOpenShipment(row.shipment.id)}><Eye size={14} /> الشحنة</button></td></tr>)}</tbody></table></div>}
      {kind === 'expenses' && <div className="table-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}><table className="data-table compact-table"><thead><tr><th>التاريخ</th><th>البند</th><th>البيان</th><th>المبلغ</th><th>طريقة الدفع</th><th>الحالة</th></tr></thead><tbody>{report.currentExpenses.map((item) => <tr key={item.id}><td>{new Date(item.date).toLocaleString('ar-EG')}</td><td>{expenseLabels[item.category] ?? item.category}</td><td>{item.description}</td><td>{formatCurrency(item.amount)}</td><td>{item.paymentMethod === 'cash' ? 'خزينة' : item.paymentMethod === 'bank' ? 'بنك' : 'محفظة'}</td><td>{reviewLabels[item.status] ?? item.status}</td></tr>)}</tbody></table></div>}
      {kind === 'driverAdjustments' && <div className="table-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}><table className="data-table compact-table"><thead><tr><th>التاريخ</th><th>المندوب</th><th>النوع</th><th>البيان</th><th>المبلغ</th><th>الحالة</th></tr></thead><tbody>{report.currentAdjustments.map((item) => <tr key={item.id}><td>{new Date(item.date).toLocaleString('ar-EG')}</td><td>{item.driverName}</td><td>{adjustmentLabels[item.type] ?? item.type}</td><td>{item.description}</td><td>{formatCurrency(item.amount)}</td><td>{reviewLabels[item.status] ?? item.status}</td></tr>)}</tbody></table></div>}
    </Modal>
  );
}
