import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Package,
  ReceiptText,
  RefreshCcw,
  Route,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLogisticsDashboard } from '../application/logistics/useLogisticsData';
import { formatCurrency, statusConfig } from '../utils/helpers';
import './Overview.css';

const formatNumber = (value: number) => value.toLocaleString('ar-EG');
const formatChange = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('ar-EG')}٪`;

export function OverviewPage() {
  const navigate = useNavigate();
  const { stats, recentShipments } = useLogisticsDashboard();

  const statCards = [
    {
      label: 'إجمالي الشحنات',
      value: formatNumber(stats.totalShipments),
      icon: <Package size={22} />,
      gradient: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
      change: formatChange(12),
      up: true,
    },
    {
      label: 'تم التسليم اليوم',
      value: formatNumber(stats.deliveredToday),
      icon: <CheckCircle2 size={22} />,
      gradient: 'linear-gradient(135deg, #10B981, #059669)',
      change: formatChange(8),
      up: true,
    },
    {
      label: 'في الطريق',
      value: formatNumber(stats.inTransit),
      icon: <Clock size={22} />,
      gradient: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
      change: formatChange(-3),
      up: false,
    },
    {
      label: 'مرتجعات',
      value: formatNumber(stats.returned),
      icon: <RefreshCcw size={22} />,
      gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
      change: formatChange(-5),
      up: false,
    },
  ];

  const commandCards = [
    {
      label: 'مركز العمليات',
      value: `${formatNumber(14)} قرار`,
      sub: 'استلام، توزيع، واعتماد حالات',
      icon: <Route size={20} />,
      gradient: 'linear-gradient(135deg, #4F46E5, #0EA5E9)',
      path: '/operations',
    },
    {
      label: 'التقارير',
      value: 'اليوم',
      sub: 'أوردرات، أداء، محافظات، وتأخير',
      icon: <TrendingUp size={20} />,
      gradient: 'linear-gradient(135deg, #10B981, #059669)',
      path: '/reports',
    },
    {
      label: 'المحاسبة',
      value: formatCurrency(stats.pendingSettlement),
      sub: 'تسويات وتقفيلة شهر',
      icon: <ReceiptText size={20} />,
      gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
      path: '/accounting',
    },
  ];

  const moneyCards = [
    {
      label: 'إجمالي التحصيل',
      value: formatCurrency(stats.totalCashCollected),
      icon: <TrendingUp size={22} />,
      gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
      sub: 'من شحنات مسلمة',
    },
    {
      label: 'تسويات معلقة',
      value: formatCurrency(stats.pendingSettlement),
      icon: <AlertCircle size={22} />,
      gradient: 'linear-gradient(135deg, #EF4444, #B91C1C)',
      sub: 'لم تحول للتجار',
    },
    {
      label: 'المناديب النشطون',
      value: `${formatNumber(stats.activeDrivers)} مندوب`,
      icon: <Users size={22} />,
      gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
      sub: 'خارج الآن للتوصيل',
    },
    {
      label: 'إجمالي التجار',
      value: `${formatNumber(stats.totalMerchants)} متجر`,
      icon: <Store size={22} />,
      gradient: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
      sub: 'متجر نشط',
    },
  ];

  return (
    <div className="overview-page">
      <section className="today-command">
        <div className="today-copy">
          <p className="today-kicker">اليوم</p>
          <h2>ابدأ من القرارات العاجلة</h2>
          <p>الاستلامات، إسناد التوصيل، تحديثات المناديب، والتسويات في مسارات واضحة.</p>
        </div>
        <div className="today-actions">
          {commandCards.map((card) => (
            <button key={card.label} className="command-card glass-card" onClick={() => navigate(card.path)}>
              <span className="command-icon" style={{ background: card.gradient }}>{card.icon}</span>
              <span>
                <strong>{card.label}</strong>
                <small>{card.sub}</small>
              </span>
              <b>{card.value}</b>
            </button>
          ))}
        </div>
      </section>

      <div className="stat-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card glass-card">
            <div className="stat-icon" style={{ background: card.gradient }}>
              {card.icon}
            </div>
            <div className="stat-info">
              <p className="stat-label">{card.label}</p>
              <p className="stat-value">{card.value}</p>
            </div>
            <div className={`stat-badge ${card.up ? 'up' : 'down'}`}>
              {card.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {card.change}
            </div>
          </div>
        ))}
      </div>

      <div className="money-grid">
        {moneyCards.map((card) => (
          <div key={card.label} className="money-card glass-card">
            <div className="money-header">
              <div className="money-icon" style={{ background: card.gradient }}>
                {card.icon}
              </div>
              <p className="money-label">{card.label}</p>
            </div>
            <p className="money-value">{card.value}</p>
            <p className="money-sub">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="recent-section glass-card">
        <div className="recent-header">
          <h3>أحدث الشحنات</h3>
          <button className="outline-btn" onClick={() => navigate('/shipments')}>عرض الكل</button>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم التتبع</th>
                <th>العميل</th>
                <th>المحافظة</th>
                <th>المندوب</th>
                <th>الحالة</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {recentShipments.map((shipment) => {
                const cfg = statusConfig[shipment.status];

                return (
                  <tr key={shipment.id} className="table-row">
                    <td className="tracking-num">{shipment.id}</td>
                    <td>{shipment.customerName}</td>
                    <td>{shipment.governorate}</td>
                    <td>{shipment.driverName ?? '-'}</td>
                    <td>
                      <span className="status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="amount">{formatCurrency(shipment.total)}</td>
                    <td className="date">{shipment.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
