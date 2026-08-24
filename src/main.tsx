import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { PageSkeleton } from './components/AsyncState.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { WorkspaceProvider } from './context/WorkspaceContext.tsx';
import { DeliveryDataProvider } from './context/DeliveryDataContext.tsx';
import { LoginPage } from './pages/Login.tsx';
import './index.css';

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <main className="auth-loading"><PageSkeleton rows={3} /></main>;
  if (!user) return <LoginPage />;
  return (
    <DeliveryDataProvider>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </DeliveryDataProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
