/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../infrastructure/api/client';
import { friendlyApiMessage, isNetworkLikeError } from '../infrastructure/api/errors';
import { APP_VERSION, getOrCreateDeviceId } from '../infrastructure/api/config';
import { clearSession, readSession, saveSession, SESSION_EXPIRED_EVENT, type DashboardSession, type UserContextResource } from '../infrastructure/api/session';
import { getLocale } from '../i18n';

interface LoginPayload { identifier: string; password: string; }
interface LoginResponse { token: string; token_type?: string; user: UserContextResource; }
interface AuthContextValue {
  session: DashboardSession | null;
  user: UserContextResource | null;
  isLoading: boolean;
  isOfflineSession: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  can: (permission: string | string[]) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DASHBOARD_STAFF_ROLES = new Set([
  'tenant_owner', 'tenant_admin', 'super_admin', 'operations_manager', 'dispatcher', 'warehouse_operator',
  'customer_service', 'accountant', 'auditor', 'branch_manager', 'management', 'operations', 'accounting', 'support',
]);

function isDashboardUser(user: UserContextResource | null | undefined) {
  if (!user) return false;
  const roles = user.roles ?? [];
  if (roles.some((role) => DASHBOARD_STAFF_ROLES.has(role))) return true;
  const permissions = user.permissions ?? [];
  return permissions.some((permission) => !permission.startsWith('merchant.') && !permission.startsWith('driver.'));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DashboardSession | null>(() => readSession());
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback((next: DashboardSession | null) => {
    if (next) saveSession(next); else clearSession();
    setSession(next);
  }, []);

  const refreshSession = useCallback(async () => {
    const current = readSession();
    if (!current?.token) { setSession(null); setIsLoading(false); return false; }
    if (!isDashboardUser(current.user)) { persist(null); setIsOfflineSession(false); setIsLoading(false); return false; }
    try {
      const result = await api.get<UserContextResource>('/api/v1/me', { retries: 1 });
      if (!isDashboardUser(result.data)) {
        persist(null);
        setIsOfflineSession(false);
        setError(getLocale() === 'en' ? 'This account is for the mobile app and cannot access the company dashboard.' : 'هذا الحساب مخصص للتطبيق ولا يملك صلاحية دخول لوحة الشركة.');
        return false;
      }
      const next = { ...current, user: result.data, cachedAt: new Date().toISOString() };
      persist(next);
      setIsOfflineSession(false);
      setError(null);
      return true;
    } catch (err) {
      if (isNetworkLikeError(err) && current.user?.id) {
        setSession(current);
        setIsOfflineSession(true);
        setError(friendlyApiMessage(err));
        return true;
      }
      persist(null);
      setIsOfflineSession(false);
      setError(friendlyApiMessage(err));
      return false;
    } finally { setIsLoading(false); }
  }, [persist]);

  useEffect(() => { void refreshSession(); }, [refreshSession]);

  useEffect(() => {
    const expired = () => { persist(null); setIsOfflineSession(false); setError(getLocale() === 'en' ? 'Your session expired. Please sign in again.' : 'انتهت الجلسة. سجّل الدخول مرة أخرى.'); };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  }, [persist]);

  const login = useCallback(async ({ identifier, password }: LoginPayload) => {
    setIsLoading(true); setError(null);
    try {
      const result = await api.post<LoginResponse>('/api/v1/auth/login', {
        identifier: identifier.trim(), password,
        device_id: getOrCreateDeviceId(),
        device_name: `${navigator.platform || 'Web'} Dashboard`,
        app_version: APP_VERSION,
        locale: getLocale(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }, { retries: 0 });
      if (!isDashboardUser(result.data.user)) {
        try { await api.post('/api/v1/auth/logout', undefined, { retries: 0, headers: { Authorization: `Bearer ${result.data.token}` } }); } catch { /* best-effort token revocation */ }
        persist(null);
        setError(getLocale() === 'en' ? 'This account is for the mobile app and cannot access the company dashboard.' : 'هذا الحساب مخصص للتطبيق ولا يملك صلاحية دخول لوحة الشركة.');
        return false;
      }
      const next: DashboardSession = { token: result.data.token, tokenType: result.data.token_type ?? 'Bearer', user: result.data.user, cachedAt: new Date().toISOString() };
      persist(next); setIsOfflineSession(false); return true;
    } catch (err) { setError(friendlyApiMessage(err)); return false; }
    finally { setIsLoading(false); }
  }, [persist]);

  const logout = useCallback(async () => {
    try { if (readSession()?.token) await api.post('/api/v1/auth/logout', undefined, { retries: 0 }); } catch { /* local logout must always complete */ }
    persist(null); setIsOfflineSession(false); setError(null);
  }, [persist]);

  const can = useCallback((permission: string | string[]) => {
    const required = Array.isArray(permission) ? permission : [permission];
    if (!session?.user) return false;
    const roles = new Set(session.user.roles ?? []);
    if (roles.has('tenant_owner') || roles.has('super_admin')) return true;
    const permissions = new Set(session.user.permissions ?? []);
    return required.some((item) => permissions.has(item));
  }, [session]);

  const hasRole = useCallback((role: string | string[]) => {
    const roles = new Set(session?.user.roles ?? []);
    return (Array.isArray(role) ? role : [role]).some((item) => roles.has(item));
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({ session, user: session?.user ?? null, isLoading, isOfflineSession, error, login, logout, refreshSession, can, hasRole }), [session, isLoading, isOfflineSession, error, login, logout, refreshSession, can, hasRole]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
