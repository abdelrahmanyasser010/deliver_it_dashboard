import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Barcode, Bell, ChartNoAxesCombined, CheckCheck, ChevronLeft, ChevronRight, LayoutDashboard, LogOut,
  MessageCircle, Package, ReceiptText, Route, Settings2, ShieldCheck, Store, Users,
} from 'lucide-react';
import { useLogisticsDashboard } from '../application/logistics/useLogisticsData';
import { GlobalSearch } from '../components/GlobalSearch';
import { useWorkspace, workspaceRoleLabels, type WorkspaceRole } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badgeKey?: 'operations' | 'shipments' | 'exceptions';
  roles: WorkspaceRole[];
}
interface NavSection { title: string; items: NavItem[]; }
const allRoles: WorkspaceRole[] = ['management', 'operations', 'accounting', 'support'];
const navSections: NavSection[] = [
  { title: 'التشغيل', items: [
    { id: 'overview', label: 'الرئيسية', icon: <LayoutDashboard size={20}/>, roles: allRoles },
    { id: 'operations', label: 'مركز العمليات', icon: <Route size={20}/>, badgeKey: 'operations', roles: ['management', 'operations'] },
    { id: 'exceptions', label: 'مركز المتابعة', icon: <AlertTriangle size={20}/>, badgeKey: 'exceptions', roles: ['management', 'operations', 'support', 'accounting'] },
    { id: 'barcode', label: 'الاستلام بالباركود', icon: <Barcode size={20}/>, roles: ['management', 'operations'] },
    { id: 'shipments', label: 'الشحنات', icon: <Package size={20}/>, badgeKey: 'shipments', roles: allRoles },
    { id: 'chat', label: 'الشات', icon: <MessageCircle size={20}/>, roles: ['management', 'operations', 'support'] },
  ]},
  { title: 'التحليل والماليات', items: [
    { id: 'reports', label: 'التقارير', icon: <ChartNoAxesCombined size={20}/>, roles: ['management', 'operations', 'accounting'] },
    { id: 'accounting', label: 'المحاسبة', icon: <ReceiptText size={20}/>, roles: ['management', 'accounting'] },
    { id: 'settlements', label: 'التسويات', icon: <CheckCheck size={20}/>, roles: ['management', 'accounting'] },
  ]},
  { title: 'الإدارة', items: [
    { id: 'drivers', label: 'المناديب', icon: <Users size={20}/>, roles: ['management', 'operations'] },
    { id: 'merchants', label: 'التجار', icon: <Store size={20}/>, roles: allRoles },
    { id: 'users', label: 'المستخدمون والصلاحيات', icon: <ShieldCheck size={20}/>, roles: ['management'] },
    { id: 'settings', label: 'إعدادات الشركة', icon: <Settings2 size={20}/>, roles: ['management'] },
  ]},
];
const formatNumber = (value: number) => value.toLocaleString('ar-EG');

interface SidebarProps { activePage: string; collapsed: boolean; onNavigate: (page: string) => void; onToggleCollapsed: () => void; }
export function Sidebar({ activePage, collapsed, onNavigate, onToggleCollapsed }: SidebarProps) {
  const { stats } = useLogisticsDashboard();
  const { role } = useWorkspace();
  const { logout } = useAuth();
  const navBadges = {
    operations: stats ? stats.unassignedShipments + stats.pendingApprovals + stats.pendingReturns : 0,
    shipments: stats?.delayedShipments ?? 0,
    exceptions: stats ? stats.delayedShipments + stats.unassignedShipments + stats.pendingReturns + stats.cashDiscrepancies : 0,
  };
  const handleLogout = async () => { await logout(); onNavigate('overview'); };

  return <aside className={`sidebar glass-panel ${collapsed ? 'collapsed' : ''}`}>
    <div className="sidebar-logo"><div className="logo-icon" style={{ background: 'transparent', padding: 0 }}><img src="/trust_logo.png" alt="TRUST Logo" style={{ width: 34, height: 34, objectFit: 'contain' }} /></div>{!collapsed && <div className="logo-text"><span className="logo-name" style={{ color: '#F97316', fontWeight: 900, letterSpacing: '0.05em' }}>TRUST — تراست</span><span className="logo-sub">{workspaceRoleLabels[role]}</span></div>}<button className="collapse-btn btn-icon" onClick={onToggleCollapsed} title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'} aria-label={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}>{collapsed ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}</button></div>
    <nav className="sidebar-nav">{navSections.map((section) => { const visibleItems = section.items.filter((item) => item.roles.includes(role)); if (!visibleItems.length) return null; return <div key={section.title} className="nav-section">{!collapsed && <p className="nav-section-title">{section.title}</p>}{visibleItems.map((item) => <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)} title={collapsed ? item.label : ''} aria-current={activePage === item.id ? 'page' : undefined}><span className="nav-icon">{item.icon}</span>{!collapsed && <span className="nav-label">{item.label}</span>}{item.badgeKey && navBadges[item.badgeKey] > 0 && <span className="nav-count-badge">{formatNumber(navBadges[item.badgeKey])}</span>}{!collapsed && activePage === item.id && <span className="nav-indicator"/>}</button>)}</div>; })}</nav>
    <div className="sidebar-footer"><button className="nav-item" title={collapsed ? 'تسجيل الخروج' : ''} onClick={handleLogout}><span className="nav-icon"><LogOut size={20}/></span>{!collapsed && <span className="nav-label">تسجيل الخروج</span>}</button></div>
  </aside>;
}

interface HeaderProps { title: string; onNavigate?: (page: string) => void; }
export function Header({ title }: HeaderProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { role, notifications, markNotificationRead, markAllRead } = useWorkspace();
  const { user } = useAuth();
  const activeNotifications = notifications.filter((item) => !item.resolved);
  const unread = activeNotifications.filter((item) => !item.read).length;
  const openNotification = (id: string, path: string) => { markNotificationRead(id); setOpen(false); navigate(path); };
  const initials = (user?.name || 'م').trim().slice(0, 1);

  return <header className="topbar glass-panel"><div className="topbar-title-wrap"><h1 className="topbar-title">{title}</h1><span>{workspaceRoleLabels[role]}</span></div><GlobalSearch/><div className="topbar-actions"><div className="notification-wrap"><button className="btn-icon notification-btn" title="الإشعارات" aria-label="فتح الإشعارات" onClick={() => setOpen((value) => !value)} aria-expanded={open}><Bell size={18}/>{unread > 0 && <span className="notification-count">{formatNumber(unread)}</span>}</button>{open && <div className="notifications-popover glass-panel"><div className="notifications-head"><div><strong>الإشعارات والمهام</strong><span>{formatNumber(activeNotifications.length)} مفتوحة</span></div><button onClick={markAllRead}>تحديد الكل كمقروء</button></div><div className="notifications-list">{activeNotifications.length ? activeNotifications.map((notification) => <article key={notification.id} className={`notification-item ${notification.read ? '' : 'unread'}`}><button className="notification-open" onClick={() => openNotification(notification.id, notification.path)}><span className={`notification-mark ${notification.priority}`}/><span className="notification-copy"><strong>{notification.title}</strong><small>{notification.detail}</small><em>{notification.time}</em></span></button><button className="notification-resolve" onClick={() => openNotification(notification.id, notification.path)}>معالجة</button></article>) : <div className="notification-empty">لا توجد مهام جديدة.</div>}</div></div>}</div><div className="topbar-user" title={user?.name ?? ''}><div className="user-avatar">{initials}</div><div className="topbar-user-copy"><strong>{user?.name ?? 'مستخدم'}</strong><span>{user?.email ?? user?.phone ?? ''}</span></div></div></div></header>;
}

