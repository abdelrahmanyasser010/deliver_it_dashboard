import { lazy, Suspense, useState, type ComponentType } from 'react';
import { MessageCircle } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PageSkeleton } from './components/AsyncState';
import { ToastHost } from './components/ui/Ui';
import { useDeliveryData } from './context/DeliveryDataContext';
import { useWorkspace } from './context/WorkspaceContext';
import { canAccessRoute, firstAllowedRoute } from './context/workspaceAccess';
import { Header, Sidebar } from './layout/Sidebar';
import './App.css';

function lazyNamed<T extends Record<string, ComponentType>>(loader: () => Promise<T>, name: keyof T) {
  return lazy(async () => ({ default: (await loader())[name] }));
}

const OverviewPage = lazyNamed(() => import('./pages/Overview'), 'OverviewPage');
const ShipmentsPage = lazyNamed(() => import('./pages/Shipments'), 'ShipmentsPage');
const OperationsCenterPage = lazyNamed(() => import('./pages/OperationsCenter'), 'OperationsCenterPage');
const ExceptionsPage = lazyNamed(() => import('./pages/Exceptions'), 'ExceptionsPage');
const BarcodeIntakePage = lazyNamed(() => import('./pages/BarcodeIntake'), 'BarcodeIntakePage');
const ReportsPage = lazyNamed(() => import('./pages/Reports'), 'ReportsPage');
const AccountingPage = lazyNamed(() => import('./pages/Accounting'), 'AccountingPage');
const DriversPage = lazyNamed(() => import('./pages/Drivers'), 'DriversPage');
const MerchantsPage = lazyNamed(() => import('./pages/Merchants'), 'MerchantsPage');
const ChatPage = lazyNamed(() => import('./pages/Chat'), 'ChatPage');
const ApplicationsPage = lazyNamed(() => import('./pages/Applications'), 'ApplicationsPage');
const SettlementsPage = lazyNamed(() => import('./pages/Settlements'), 'SettlementsPage');
const UsersPage = lazyNamed(() => import('./pages/Users'), 'UsersPage');
const AuditLogPage = lazyNamed(() => import('./pages/AuditLog'), 'AuditLogPage');

const PAGE_TITLES: Record<string, string> = {
  '/': 'الرئيسية', '/shipments': 'إدارة الشحنات', '/operations': 'مركز العمليات', '/exceptions': 'مركز الاستثناءات', '/barcode': 'استلام بالباركود', '/reports': 'التقارير والإحصائيات', '/accounting': 'حسابات العملاء والمناديب', '/drivers': 'إدارة المناديب', '/merchants': 'إدارة التجار', '/chat': 'الشات', '/applications': 'طلبات التجار', '/settlements': 'التسويات والتحصيلات', '/users': 'المستخدمون والصلاحيات', '/audit-log': 'سجل العمليات',
};

function ProtectedPage({ path, children }: { path: string; children: React.ReactNode }) {
  const { role } = useWorkspace();
  return canAccessRoute(role, path) ? children : <Navigate to={firstAllowedRoute(role)} replace />;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useWorkspace();
  const { state } = useDeliveryData();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  let activePage = location.pathname.substring(1) || 'overview';
  if (activePage === 'applications') activePage = 'merchants';
  const handleNavigate = (page: string) => navigate(page === 'overview' ? '/' : `/${page}`);
  const unreadChats = state?.chatRooms.reduce((sum, room) => sum + room.unread, 0) ?? 0;

  return <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <Sidebar activePage={activePage} collapsed={sidebarCollapsed} onNavigate={handleNavigate} onToggleCollapsed={() => setSidebarCollapsed((value) => !value)} />
    <div className="main-area">
      <Header title={PAGE_TITLES[location.pathname] ?? 'لوحة التحكم'} onNavigate={handleNavigate} />
      <main className="page-content"><Suspense fallback={<PageSkeleton rows={3} />}><Routes>
        <Route path="/" element={<ProtectedPage path="/"><OverviewPage /></ProtectedPage>} />
        <Route path="/shipments" element={<ProtectedPage path="/shipments"><ShipmentsPage /></ProtectedPage>} />
        <Route path="/operations" element={<ProtectedPage path="/operations"><OperationsCenterPage /></ProtectedPage>} />
        <Route path="/exceptions" element={<ProtectedPage path="/exceptions"><ExceptionsPage /></ProtectedPage>} />
        <Route path="/barcode" element={<ProtectedPage path="/barcode"><BarcodeIntakePage /></ProtectedPage>} />
        <Route path="/reports" element={<ProtectedPage path="/reports"><ReportsPage /></ProtectedPage>} />
        <Route path="/accounting" element={<ProtectedPage path="/accounting"><AccountingPage /></ProtectedPage>} />
        <Route path="/drivers" element={<ProtectedPage path="/drivers"><DriversPage /></ProtectedPage>} />
        <Route path="/merchants" element={<ProtectedPage path="/merchants"><MerchantsPage /></ProtectedPage>} />
        <Route path="/chat" element={<ProtectedPage path="/chat"><ChatPage /></ProtectedPage>} />
        <Route path="/applications" element={<ProtectedPage path="/applications"><ApplicationsPage /></ProtectedPage>} />
        <Route path="/settlements" element={<ProtectedPage path="/settlements"><SettlementsPage /></ProtectedPage>} />
        <Route path="/users" element={<ProtectedPage path="/users"><UsersPage /></ProtectedPage>} />
        <Route path="/audit-log" element={<ProtectedPage path="/audit-log"><AuditLogPage /></ProtectedPage>} />
        <Route path="*" element={<Navigate to={firstAllowedRoute(role)} replace />} />
      </Routes></Suspense></main>
    </div>
    <ToastHost />
    {location.pathname === '/' && canAccessRoute(role, '/chat') && <button className="floating-chat" onClick={() => navigate('/chat')} aria-label="فتح الشات"><MessageCircle size={22} />{unreadChats > 0 && <span className="floating-chat-badge">{unreadChats.toLocaleString('ar-EG')}</span>}</button>}
  </div>;
}

export default App;
