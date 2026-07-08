import { useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Eye,
  FileSpreadsheet,
  Map,
  PackageCheck,
  RotateCcw,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import type { ReportTab } from '../domain/reports/entities';
import { useReportsData } from '../application/reports/useReportsData';
import { downloadCsv } from '../utils/exportCsv';
import { formatCurrency } from '../utils/helpers';
import './Reports.css';

const reportTabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: 'orderValue', label: 'المبيعات والإيراد', icon: <TrendingUp size={17} /> },
  { id: 'operations', label: 'التشغيل', icon: <PackageCheck size={17} /> },
  { id: 'drivers', label: 'المناديب', icon: <Users size={17} /> },
  { id: 'governorates', label: 'المحافظات', icon: <Map size={17} /> },
  { id: 'delays', label: 'التأخير وSLA', icon: <Bell size={17} /> },
];

const periodOptions = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'آخر ٧ أيام' },
  { id: 'month', label: 'الشهر الحالي' },
  { id: 'custom', label: 'فترة مخصصة' },
];

const formatNumber = (value: number) => value.toLocaleString('ar-EG');
const formatPercent = (value: number) => `${value.toLocaleString('ar-EG')}٪`;

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('orderValue');
  const [period, setPeriod] = useState('week');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const reports = useReportsData();
  const totals = useMemo(() => {
    const orders = reports.orderValueTrend.reduce((sum, day) => sum + day.orders, 0);
    const orderValue = reports.orderValueTrend.reduce((sum, day) => sum + day.orderValue, 0);
    const shippingFees = reports.orderValueTrend.reduce((sum, day) => sum + day.shippingFees, 0);
    const returns = reports.orderValueTrend.reduce((sum, day) => sum + day.returns, 0);
    const delivered = reports.funnel.find((step) => step.label === 'تم التوصيل')?.count ?? 0;
    const totalFunnel = reports.funnel.reduce((sum, step) => sum + step.count, 0);
    const successRate = totalFunnel ? Math.round((delivered / totalFunnel) * 100) : 0;

    return { orders, orderValue, shippingFees, returns, successRate };
  }, [reports]);

  const exportActiveReport = () => {
    if (activeTab === 'orderValue') {
      downloadCsv('تقرير-المبيعات-والإيراد.csv', reports.orderValueTrend.map((day) => ({
        اليوم: day.day,
        الأوردرات: day.orders,
        'قيمة الأوردرات': day.orderValue,
        'إيراد الشحن': day.shippingFees,
        المرتجعات: day.returns,
      })));
    } else if (activeTab === 'drivers') {
      downloadCsv('تقرير-أداء-المناديب.csv', reports.driverPerformance.map((driver) => ({
        المندوب: driver.driverName,
        الزون: driver.zone,
        مكلف: driver.assigned,
        منجز: driver.delivered,
        مرتجع: driver.returned,
        تأخير: driver.delayed,
        التحصيل: driver.collectedCash,
        'نسبة النجاح': `${driver.successRate}%`,
      })));
    } else if (activeTab === 'governorates') {
      downloadCsv('تقرير-المحافظات.csv', reports.governorates);
    } else if (activeTab === 'delays') {
      downloadCsv('تقرير-التأخير.csv', reports.delays);
    } else {
      downloadCsv('تقرير-التشغيل.csv', reports.funnel);
    }

    setActionMessage(`تم تجهيز تصدير التقرير للفترة: ${periodOptions.find((item) => item.id === period)?.label}.`);
  };

  const sendDelayNotifications = () => {
    setActionMessage(`تم إرسال ${formatNumber(reports.delays.length)} تنبيهات تأخير للتجار والمناديب حسب الحالة.`);
  };

  const openDetails = (label: string) => {
    setActionMessage(`تم فتح تفاصيل: ${label}. في النسخة الحقيقية سيتم التحويل للشحنات بنفس الفلتر.`);
  };

  return (
    <div className="reports-page">
      <header className="reports-hero glass-card">
        <div>
          <h2>التقارير والإحصائيات</h2>
          <p>مبيعات، أداء تشغيل، مناديب، محافظات، تأخير، وتنبيهات في شاشة قرار واحدة.</p>
        </div>
        <div className="reports-actions">
          <div className="period-control">
            {periodOptions.map((option) => (
              <button key={option.id} className={period === option.id ? 'active' : ''} onClick={() => setPeriod(option.id)}>
                {option.label}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={exportActiveReport}>
            <FileSpreadsheet size={16} />
            تصدير Excel
          </button>
        </div>
      </header>

      {actionMessage && <div className="ops-feedback">{actionMessage}</div>}

      <div className="reports-tabs glass-card">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            className={`reports-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'orderValue' && (
        <>
          <div className="report-kpi-grid">
            <Kpi label="إجمالي الأوردرات" value={formatNumber(totals.orders)} icon={<BarChart3 size={20} />} gradient="linear-gradient(135deg,#4F46E5,#7C3AED)" />
            <Kpi label="قيمة أوردرات البراندات" value={formatCurrency(totals.orderValue)} icon={<TrendingUp size={20} />} gradient="linear-gradient(135deg,#10B981,#059669)" />
            <Kpi label="إيراد الشحن" value={formatCurrency(totals.shippingFees)} icon={<Truck size={20} />} gradient="linear-gradient(135deg,#0EA5E9,#0284C7)" />
            <Kpi label="المرتجعات" value={formatNumber(totals.returns)} icon={<RotateCcw size={20} />} gradient="linear-gradient(135deg,#EF4444,#B91C1C)" />
          </div>

          <div className="report-grid-2">
            <section className="glass-card">
              <div className="report-section-title">
                <h3>ترند قيمة الأوردرات</h3>
                <span className="report-muted">{periodOptions.find((item) => item.id === period)?.label}</span>
              </div>
              <BarChart values={reports.orderValueTrend.map((day) => ({ label: day.day, value: day.orderValue }))} />
            </section>
            <section className="glass-card">
              <div className="report-section-title">
                <h3>ملخص سريع</h3>
                <button className="outline-btn" onClick={() => openDetails('أوردرات الفترة')}><Eye size={15} /> التفاصيل</button>
              </div>
              <div className="funnel-list">
                {reports.orderValueTrend.map((day) => (
                  <ProgressRow key={day.day} label={day.day} value={day.orders} max={80} suffix="أوردر" />
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {activeTab === 'operations' && (
        <div className="report-grid-2">
          <section className="glass-card">
            <div className="report-section-title">
              <h3>مسار حالات الأوردرات</h3>
              <span className="report-muted">نسبة النجاح {formatPercent(totals.successRate)}</span>
            </div>
            <div className="funnel-list">
              {reports.funnel.map((step) => (
                <ProgressRow key={step.label} label={step.label} value={step.count} max={360} suffix="أوردر" />
              ))}
            </div>
          </section>
          <section className="glass-card">
            <div className="report-section-title">
              <h3>مؤشرات تشغيل</h3>
            </div>
            <div className="report-kpi-grid one-column">
              <Kpi label="وصل مكتب الشحن" value={formatNumber(91)} icon={<PackageCheck size={20} />} gradient="linear-gradient(135deg,#0EA5E9,#0284C7)" />
              <Kpi label="جاري التجهيز" value={formatNumber(37)} icon={<PackageCheck size={20} />} gradient="linear-gradient(135deg,#F59E0B,#D97706)" />
              <Kpi label="تم تسليم للمندوب" value={formatNumber(64)} icon={<Truck size={20} />} gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)" />
            </div>
          </section>
        </div>
      )}

      {activeTab === 'drivers' && (
        <section className="glass-card">
          <div className="report-section-title">
            <h3>أداء المناديب</h3>
            <span className="report-muted">منجز، مرتجع، تأخير، تحصيل</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>المندوب</th>
                  <th>الزون</th>
                  <th>مكلف</th>
                  <th>منجز</th>
                  <th>مرتجع</th>
                  <th>تأخير</th>
                  <th>التحصيل</th>
                  <th>نسبة النجاح</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {reports.driverPerformance.map((driver) => (
                  <tr key={driver.driverId} className="table-row">
                    <td><strong>{driver.driverName}</strong><p className="report-muted">{driver.driverId}</p></td>
                    <td>{driver.zone}</td>
                    <td>{formatNumber(driver.assigned)}</td>
                    <td className="amount">{formatNumber(driver.delivered)}</td>
                    <td>{formatNumber(driver.returned)}</td>
                    <td>{formatNumber(driver.delayed)}</td>
                    <td className="amount">{formatCurrency(driver.collectedCash)}</td>
                    <td><ProgressInline value={driver.successRate} /></td>
                    <td><button className="btn-icon sm" title="عرض الشحنات" onClick={() => openDetails(driver.driverName)}><Eye size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'governorates' && (
        <section className="glass-card">
          <div className="report-section-title">
            <h3>تقرير المحافظات</h3>
            <span className="report-muted">حالة الأوردرات لكل محافظة</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>المحافظة</th>
                  <th>الإجمالي</th>
                  <th>تم التوصيل</th>
                  <th>في الطريق</th>
                  <th>مرتجع</th>
                  <th>متأخر</th>
                  <th>متوسط الوقت</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {reports.governorates.map((row) => (
                  <tr key={row.governorate} className="table-row">
                    <td><strong>{row.governorate}</strong></td>
                    <td>{formatNumber(row.total)}</td>
                    <td className="amount">{formatNumber(row.delivered)}</td>
                    <td>{formatNumber(row.inTransit)}</td>
                    <td>{formatNumber(row.returned)}</td>
                    <td>{formatNumber(row.delayed)}</td>
                    <td>{formatNumber(row.avgDeliveryHours)} ساعة</td>
                    <td><button className="btn-icon sm" title="عرض المحافظة" onClick={() => openDetails(row.governorate)}><Eye size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'delays' && (
        <section className="glass-card">
          <div className="report-section-title">
            <h3>تنبيهات التأخير</h3>
            <button className="btn-primary" onClick={sendDelayNotifications}><Bell size={16} /> إرسال إشعارات التأخير</button>
          </div>
          <div className="delay-list">
            {reports.delays.map((delay) => (
              <div key={delay.id} className="delay-row">
                <div className="funnel-row-top">
                  <span>{delay.shipmentId} - {delay.merchantName}</span>
                  <span className={`tone-badge ${delay.severity}`}>{formatNumber(delay.lateByHours)} ساعة تأخير</span>
                </div>
                <p className="report-muted">{delay.reason} - {delay.governorate} - {delay.driverName ?? 'لم يعين مندوب'}</p>
                <button className="outline-btn" onClick={() => openDetails(delay.shipmentId)}><Eye size={15} /> فتح الشحنة</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value, icon, gradient }: { label: string; value: string; icon: React.ReactNode; gradient: string }) {
  return (
    <div className="report-kpi glass-card">
      <div className="report-kpi-icon" style={{ background: gradient }}>{icon}</div>
      <div>
        <p className="report-kpi-label">{label}</p>
        <p className="report-kpi-value">{value}</p>
      </div>
    </div>
  );
}

function BarChart({ values }: { values: { label: string; value: number }[] }) {
  const max = Math.max(...values.map((item) => item.value));

  return (
    <div className="bar-chart">
      {values.map((item) => (
        <button key={item.label} className="bar-column" title={`${item.label}: ${formatCurrency(item.value)}`}>
          <div className="bar-track">
            <div className="bar-fill" style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }} />
          </div>
          <span className="bar-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function ProgressRow({ label, value, max, suffix }: { label: string; value: number; max: number; suffix: string }) {
  return (
    <div className="funnel-row">
      <div className="funnel-row-top">
        <span>{label}</span>
        <span>{formatNumber(value)} {suffix}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function ProgressInline({ value }: { value: number }) {
  return (
    <div style={{ minWidth: 120 }}>
      <div className="funnel-row-top" style={{ marginBottom: 4 }}>
        <span>{formatPercent(value)}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

