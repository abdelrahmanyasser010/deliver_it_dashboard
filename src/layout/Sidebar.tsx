import { useState, type ReactNode } from 'react';
import {
  Bell,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Package,
  ReceiptText,
  Route,
  ShieldCheck,
  Store,
  TruckIcon,
  Users,
} from 'lucide-react';
import './Sidebar.css';

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  page: string;
  time: string;
  tone: 'warning' | 'info' | 'success';
}

const navSections: NavSection[] = [
  {
    title: 'التشغيل',
    items: [
      { id: 'overview', label: 'الرئيسية', icon: <LayoutDashboard size={20} /> },
      { id: 'operations', label: 'مركز العمليات', icon: <Route size={20} /> },
      { id: 'shipments', label: 'الشحنات', icon: <Package size={20} /> },
      { id: 'chat', label: 'الشات', icon: <MessageCircle size={20} /> },
      { id: 'reports', label: 'التقارير', icon: <ChartNoAxesCombined size={20} /> },
      { id: 'accounting', label: 'المحاسبة', icon: <ReceiptText size={20} /> },
    ],
  },
  {
    title: 'إدارة',
    items: [
      { id: 'drivers', label: 'المناديب', icon: <Users size={20} /> },
      { id: 'merchants', label: 'التجار', icon: <Store size={20} /> },
      { id: 'users', label: 'المستخدمون والصلاحيات', icon: <ShieldCheck size={20} /> },
    ],
  },
];

const notifications: NotificationItem[] = [
  {
    id: 'note-1',
    title: 'تحديث مندوب يحتاج اعتماد',
    detail: '٣ شحنات غيّر حالتها محمد علي وتحتاج مراجعة.',
    page: 'operations',
    time: 'منذ ٨ دقائق',
    tone: 'warning',
  },
  {
    id: 'note-2',
    title: 'تأخير في محافظة الجيزة',
    detail: '٥ شحنات تعدّت وقت التسليم المتوقع.',
    page: 'reports',
    time: 'منذ ٢٢ دقيقة',
    tone: 'info',
  },
  {
    id: 'note-3',
    title: 'تقفيلة نقدية جاهزة',
    detail: 'تحصيلات اليوم جاهزة للمراجعة في المحاسبة.',
    page: 'accounting',
    time: 'اليوم',
    tone: 'success',
  },
];

interface SidebarProps {
  activePage: string;
  collapsed: boolean;
  onNavigate: (page: string) => void;
  onToggleCollapsed: () => void;
}

export function Sidebar({ activePage, collapsed, onNavigate, onToggleCollapsed }: SidebarProps) {
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    onNavigate('overview');
    window.alert('تم تسجيل الخروج من لوحة التحكم.');
  };

  return (
    <aside className={`sidebar glass-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">
          <TruckIcon size={22} color="white" />
        </div>
        {!collapsed && (
          <div className="logo-text">
            <span className="logo-name">Deliver It</span>
            <span className="logo-sub">لوحة التحكم</span>
          </div>
        )}
        <button
          className="collapse-btn btn-icon"
          onClick={onToggleCollapsed}
          title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
        >
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.title} className="nav-section">
            {!collapsed && <p className="nav-section-title">{section.title}</p>}
            {section.items.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
                title={collapsed ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
                {!collapsed && activePage === item.id && <span className="nav-indicator" />}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" title={collapsed ? 'تسجيل الخروج' : ''} onClick={handleLogout}>
          <span className="nav-icon"><LogOut size={20} /></span>
          {!collapsed && <span className="nav-label">تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  );
}

interface HeaderProps {
  title: string;
  onNavigate?: (page: string) => void;
}

export function Header({ title, onNavigate }: HeaderProps) {
  const [open, setOpen] = useState(false);

  const openNotification = (page: string) => {
    setOpen(false);
    onNavigate?.(page);
  };

  return (
    <header className="topbar glass-panel">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-actions">
        <div className="notification-wrap">
          <button
            className="btn-icon notification-btn"
            title="الإشعارات"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <Bell size={18} />
            <span className="notification-count">{notifications.length}</span>
          </button>

          {open && (
            <div className="notifications-popover glass-panel">
              <div className="notifications-head">
                <strong>الإشعارات</strong>
                <span>{notifications.length} جديدة</span>
              </div>
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    className="notification-item"
                    onClick={() => openNotification(notification.page)}
                  >
                    <span className={`notification-mark ${notification.tone}`} />
                    <span className="notification-copy">
                      <strong>{notification.title}</strong>
                      <small>{notification.detail}</small>
                      <em>{notification.time}</em>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="user-avatar">م</div>
      </div>
    </header>
  );
}
