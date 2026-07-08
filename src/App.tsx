import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Header, Sidebar } from './layout/Sidebar';
import { AccountingPage } from './pages/Accounting';
import { ApplicationsPage } from './pages/Applications';
import { AuditLogPage } from './pages/AuditLog';
import { ChatPage } from './pages/Chat';
import { DriversPage } from './pages/Drivers';
import { MerchantsPage } from './pages/Merchants';
import { OperationsCenterPage } from './pages/OperationsCenter';
import { OverviewPage } from './pages/Overview';
import { ReportsPage } from './pages/Reports';
import { SettlementsPage } from './pages/Settlements';
import { ShipmentsPage } from './pages/Shipments';
import { UsersPage } from './pages/Users';
import './App.css';

const PAGE_TITLES: Record<string, string> = {
  '/': 'الرئيسية',
  '/shipments': 'إدارة الشحنات',
  '/operations': 'مركز العمليات',
  '/reports': 'التقارير والإحصائيات',
  '/accounting': 'المحاسبة وتقفيلة الشهر',
  '/drivers': 'إدارة المناديب',
  '/merchants': 'إدارة التجار',
  '/chat': 'الشات',
  '/applications': 'طلبات التجار',
  '/settlements': 'التسويات والمحافظ',
  '/users': 'المستخدمين والصلاحيات',
  '/audit-log': 'سجل العمليات',
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  let activePage = location.pathname.substring(1);
  if (activePage === '') activePage = 'overview';
  if (activePage === 'applications') activePage = 'merchants';
  if (activePage === 'settlements') activePage = 'accounting';

  const handleNavigate = (page: string) => {
    if (page === 'overview') navigate('/');
    else navigate(`/${page}`);
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        activePage={activePage}
        collapsed={sidebarCollapsed}
        onNavigate={handleNavigate}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      />
      <div className="main-area">
        <Header title={PAGE_TITLES[location.pathname] ?? 'لوحة التحكم'} />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/shipments" element={<ShipmentsPage />} />
            <Route path="/operations" element={<OperationsCenterPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/accounting" element={<AccountingPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/merchants" element={<MerchantsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/settlements" element={<SettlementsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {location.pathname === '/' && (
        <button className="floating-chat" onClick={() => navigate('/chat')} title="فتح الشات">
          <MessageCircle size={22} />
          <span className="floating-chat-badge">3</span>
        </button>
      )}
    </div>
  );
}

export default App;
