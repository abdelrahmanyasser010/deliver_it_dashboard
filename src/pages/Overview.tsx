import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCcw,
  Route,
  RotateCcw,
  Truck,
  UserRoundCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ErrorState, PageSkeleton } from '../components/AsyncState';
import { useWorkspace, workspaceRoleLabels } from '../context/WorkspaceContext';
import { useLogisticsDashboard } from '../application/logistics/useLogisticsData';
import type { ShipmentStatus } from '../domain/logistics/entities';
import { formatAge, formatCurrency, formatDateTime, statusConfig } from '../utils/helpers';
import './Overview.css';

const formatNumber = (value: number) => value.toLocaleString('ar-EG');

function formatChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 'بدون تغيير' : 'نشاط جديد';
  const value = Math.round(((current - previous) / previous) * 100);
  return `${value > 0 ? '+' : ''}${value.toLocaleString('ar-EG')}٪`;
}

const flowOrder: Array<{ status: ShipmentStatus; label: string }> = [
  { status: 'readyToShip', label: 'بانتظار الاستلام' },
  { status: 'receivedAtOffice', label: 'في المكتب' },
  { status: 'deliveredToDriver', label: 'مع المندوب' },
  { status: 'inTransit', label: 'في الطريق' },
  { status: 'delivered', label: 'تم التسليم' },
];

export function OverviewPage() {
  const navigate = useNavigate();
  const { role } = useWorkspace();
  const { stats, shipments, recentShipments, isLoading, error, refetch } = useLogisticsDashboard();

  if (isLoading) return <PageSkeleton rows={4} />;
  if (error || !stats) return <ErrorState message={error ?? 'لا توجد بيانات متاحة.'} onRetry={refetch} />;

  const actionCardsByRole = {
    management: [
      { label: 'شحنات بلا مندوب', value: stats.unassignedShipments, detail: 'تنتظر التوزيع الآن', icon: <UserRoundCheck size={19} />, tone: 'danger', path: '/shipments?view=unassigned' },
      { label: 'تحديثات تحتاج اعتمادًا', value: stats.pendingApprovals, detail: 'قادمة من المناديب', icon: <CheckCircle2 size={19} />, tone: 'warning', path: '/operations?tab=driverUpdates' },
      { label: 'شحنات متأخرة', value: stats.delayedShipments, detail: 'تجاوزت الموعد المتوقع', icon: <Clock3 size={19} />, tone: 'danger', path: '/exceptions?category=delay' },
      { label: 'مرتجعات معلقة', value: stats.pendingReturns, detail: 'تحتاج استكمال الدورة', icon: <RotateCcw size={19} />, tone: 'warning', path: '/exceptions?category=return' },
      { label: 'فروقات تحصيل', value: stats.cashDiscrepancies, detail: 'تحتاج مراجعة مالية', icon: <AlertCircle size={19} />, tone: 'danger', path: '/exceptions?category=financial' },
    ],
    operations: [
      { label: 'شحنات بلا مندوب', value: stats.unassignedShipments, detail: 'ابدأ التوزيع', icon: <UserRoundCheck size={19} />, tone: 'danger', path: '/shipments?view=unassigned' },
      { label: 'تحديثات تحتاج اعتمادًا', value: stats.pendingApprovals, detail: 'من تطبيق المندوب', icon: <CheckCircle2 size={19} />, tone: 'warning', path: '/operations?tab=driverUpdates' },
      { label: 'شحنات متأخرة', value: stats.delayedShipments, detail: 'تحتاج تدخلًا', icon: <Clock3 size={19} />, tone: 'danger', path: '/exceptions?category=delay' },
      { label: 'مرتجعات معلقة', value: stats.pendingReturns, detail: 'تحتاج استكمال الدورة', icon: <RotateCcw size={19} />, tone: 'warning', path: '/exceptions?category=return' },
    ],
    accounting: [
      { label: 'فروقات تحصيل', value: stats.cashDiscrepancies, detail: 'تحتاج مطابقة', icon: <AlertCircle size={19} />, tone: 'danger', path: '/exceptions?category=financial' },
      { label: 'عهدة COD الحالية', value: stats.cashWithDrivers, detail: 'قيمة محصلة لم يتم توريدها', icon: <Banknote size={19} />, tone: 'warning', path: '/accounting' },
      { label: 'تسويات معلقة', value: stats.pendingSettlement, detail: 'مستحقات تحتاج مراجعة', icon: <RefreshCcw size={19} />, tone: 'warning', path: '/settlements' },
    ],
    support: [
      { label: 'شحنات متأخرة', value: stats.delayedShipments, detail: 'قد ينتظر أصحابها ردًا', icon: <Clock3 size={19} />, tone: 'danger', path: '/exceptions?category=delay' },
      { label: 'تحتاج خدمة العملاء', value: shipments.filter((item) => item.taskStatus === 'needsCustomerService').length, detail: 'تواصل مطلوب', icon: <AlertCircle size={19} />, tone: 'warning', path: '/exceptions?category=customer' },
      { label: 'مرتجعات معلقة', value: stats.pendingReturns, detail: 'تحتاج متابعة التاجر', icon: <RotateCcw size={19} />, tone: 'warning', path: '/exceptions?category=return' },
    ],
  } as const;
  const actionCards = actionCardsByRole[role];

  const statCards = [
    {
      label: 'شحنات اليوم',
      value: stats.todayShipments,
      previous: stats.yesterdayShipments,
      icon: <Package size={21} />,
      description: 'مقارنة بأمس',
    },
    {
      label: 'تم التسليم اليوم',
      value: stats.deliveredToday,
      previous: stats.deliveredYesterday,
      icon: <CheckCircle2 size={21} />,
      description: 'مقارنة بأمس',
    },
    {
      label: 'قيد التوصيل الآن',
      value: stats.inTransit,
      previous: Math.max(1, stats.inTransit - 2),
      icon: <Truck size={21} />,
      description: 'شحنات نشطة',
    },
    {
      label: 'إجمالي المرتجعات',
      value: stats.returned,
      previous: Math.max(1, stats.returned + 1),
      icon: <RefreshCcw size={21} />,
      description: 'الأقل أفضل',
      inverse: true,
    },
  ];

  const flow = flowOrder.map((step) => ({
    ...step,
    count: shipments.filter((shipment) => shipment.status === step.status).length,
  }));

  const todayLabel = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="overview-page">
      <header className="overview-compact-header">
        <div className="header-content">
          <div className="header-titles">
            <div className="breadcrumb-line">
              <span className="overview-kicker">لوحة {workspaceRoleLabels[role]}</span>
              <span className="separator">/</span>
              <span>{todayLabel}</span>
            </div>
            <div className="title-action-row">
              <h2>{role === 'accounting' ? 'ابدأ بالمطابقة والتسويات' : role === 'support' ? 'ابدأ بالحالات التي تحتاج تواصلًا' : 'يحتاج تدخلك الآن'}</h2>
              <button className="text-link" onClick={() => navigate(role === 'accounting' ? '/accounting' : role === 'support' ? '/exceptions?category=customer' : '/operations')}>{role === 'accounting' ? 'فتح المحاسبة' : role === 'support' ? 'فتح حالات التواصل' : 'فتح مركز العمليات'}</button>
            </div>
            <p>المهام العاجلة مرتبة حسب أثرها. الأرقام مستخرجة من بيانات تشغيل تجريبية.</p>
          </div>
          <button className="outline-btn sm refresh-btn" onClick={refetch}><RefreshCcw size={14} /> تحديث</button>
        </div>
      </header>

      <section className="attention-section" aria-label="المهام العاجلة">
        <div className="attention-grid">
          {actionCards.map((card) => (
            <button key={card.label} className={`attention-card glass-card ${card.tone}`} onClick={() => navigate(card.path)}>
              <div className="attention-header-row">
                <span className="attention-icon">{card.icon}</span>
                <strong className="attention-title">{card.label}</strong>
              </div>
              <div className="attention-body">
                <b>{formatNumber(card.value)}</b>
                <small>{card.detail}</small>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="overview-stat-grid" aria-label="مؤشرات اليوم">
        {statCards.map((card) => {
          const change = card.value - card.previous;
          const positive = card.inverse ? change <= 0 : change >= 0;
          return (
            <article key={card.label} className="overview-stat-card glass-card">
              <div className="stat-header">
                <span className="stat-label">{card.label}</span>
                <div className="stat-icon-sm">{card.icon}</div>
              </div>
              <div className="stat-body">
                <strong>{formatNumber(card.value)}</strong>
              </div>
              <div className="stat-footer">
                <span className={`stat-trend ${change === 0 ? 'neutral' : positive ? 'positive' : 'negative'}`}>
                  {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {formatChange(card.value, card.previous)}
                </span>
                <small>{card.description}</small>
              </div>
            </article>
          );
        })}
      </section>

      <div className="overview-two-column">
        <section className="operations-flow glass-card">
          <div className="section-heading-row">
            <div><h3>تقدم العمليات</h3><p>توزيع الشحنات الحالية على المراحل الأساسية.</p></div>
            <Route size={21} />
          </div>
          <div className="flow-list">
            {flow.map((step, index) => {
              const max = Math.max(...flow.map((item) => item.count), 1);
              return (
                <button key={step.status} className="flow-row" onClick={() => navigate(`/shipments?status=${step.status}`)}>
                  <span className="flow-index">{formatNumber(index + 1)}</span>
                  <span className="flow-label">{step.label}</span>
                  <span className="flow-track"><i style={{ width: `${Math.max(8, (step.count / max) * 100)}%` }} /></span>
                  <strong>{formatNumber(step.count)}</strong>
                </button>
              );
            })}
          </div>
        </section>

        {role !== 'support' && <section className="cash-summary glass-card">
          <div className="section-heading-row">
            <div><h3>ملخص التحصيل</h3><p>فصل واضح بين المحصل والمورد والمتبقي.</p></div>
            <Banknote size={21} />
          </div>
          <div className="cash-summary-grid">
            <div><span>تم تحصيله</span><strong>{formatCurrency(stats.totalCashCollected)}</strong></div>
            <div><span>تم توريده</span><strong>{formatCurrency(stats.remittedCash)}</strong></div>
            <div className="cash-alert"><span>عهدة COD لدى المناديب</span><strong>{formatCurrency(stats.cashWithDrivers)}</strong></div>
            <div><span>داخل تسويات معلقة</span><strong>{formatCurrency(stats.pendingSettlement)}</strong></div>
          </div>
          <button className="outline-btn full-width" onClick={() => navigate('/accounting')}>فتح المحاسبة والتسويات</button>
        </section>}
      </div>

      <section className="recent-section glass-card">
        <div className="section-heading-row">
          <div><h3>أحدث الشحنات تحديثًا</h3><p>آخر تغييرات حدثت في دورة التشغيل.</p></div>
          <button className="outline-btn" onClick={() => navigate('/shipments')}>عرض كل الشحنات</button>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>رقم الشحنة</th><th>المستلم</th><th>التاجر</th><th>المندوب</th><th>الحالة</th><th>المبلغ</th><th>آخر تحديث</th></tr></thead>
            <tbody>
              {recentShipments.map((shipment) => {
                const status = statusConfig[shipment.status];
                return (
                  <tr key={shipment.id} className="table-row" role="link" aria-label={`فتح الشحنة ${shipment.id}`} tabIndex={0} onClick={() => navigate(`/shipments?shipment=${shipment.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate(`/shipments?shipment=${shipment.id}`); }}>
                    <td><span className="tracking-num">{shipment.id}</span></td>
                    <td><strong>{shipment.customerName}</strong><small className="cell-subtext">{shipment.governorate}</small></td>
                    <td>{shipment.merchantName}</td>
                    <td>{shipment.driverName ?? 'غير معين'}</td>
                    <td><span className="status-badge" style={{ color: status.color, background: status.bg }}>{status.label}</span></td>
                    <td className="amount">{formatCurrency(shipment.total)}</td>
                    <td title={formatDateTime(shipment.lastUpdatedAt)}>{formatAge(shipment.lastUpdatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
