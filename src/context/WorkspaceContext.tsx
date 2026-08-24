/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useDeliveryData } from './DeliveryDataContext';

export type WorkspaceRole = 'management' | 'operations' | 'accounting' | 'support';
export type NotificationCategory = 'operations' | 'financial' | 'merchant' | 'system';
export interface WorkspaceNotification { id: string; title: string; detail: string; path: string; time: string; category: NotificationCategory; priority: 'normal' | 'high' | 'urgent'; read: boolean; resolved: boolean; }
interface ToastMessage { id: number; message: string; tone: 'success' | 'warning' | 'danger' | 'info'; }
interface WorkspaceContextValue { role: WorkspaceRole; notifications: WorkspaceNotification[]; markNotificationRead: (id: string) => void; resolveNotification: (id: string) => void; markAllRead: () => void; toasts: ToastMessage[]; showToast: (message: string, tone?: ToastMessage['tone']) => void; dismissToast: (id: number) => void; }
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function workspaceRole(roles: string[], permissions: string[]): WorkspaceRole {
  const values = new Set(roles);
  if (['tenant_owner','tenant_admin','system_admin','super_admin','branch_manager','management'].some((role) => values.has(role))) return 'management';
  if (['accountant','auditor','finance_officer','accounting'].some((role) => values.has(role))) return 'accounting';
  if (['customer_service','support','support_agent'].some((role) => values.has(role))) return 'support';
  if (['operations_manager','dispatcher','warehouse_operator','operations'].some((role) => values.has(role))) return 'operations';
  if (permissions.some((permission) => permission.startsWith('accounting.') || permission.startsWith('ledger.') || permission.startsWith('settlements.'))) return 'accounting';
  if (permissions.some((permission) => permission.startsWith('conversations.') || permission.startsWith('messages.'))) return 'support';
  return 'operations';
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { state } = useDeliveryData();
  const role = useMemo(() => workspaceRole(user?.roles ?? [], user?.permissions ?? []), [user?.roles, user?.permissions]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [now] = useState(() => Date.now());
  const notifications = useMemo<WorkspaceNotification[]>(() => {
    if (!state) return [];
    const openShipments = state.shipments.filter((shipment) => !['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status));
    const delayed = openShipments.filter((shipment) => shipment.expectedDeliveryAt && new Date(shipment.expectedDeliveryAt).getTime() < now);
    const discrepancies = state.shipments.filter((shipment) => shipment.financialStatus === 'discrepancy');
    const pendingUpdates = state.driverUpdates.filter((update) => update.status === 'pendingAdminApproval');
    const approvedSettlements = state.settlements.filter((settlement) => settlement.status === 'approved');
    const unreadChats = state.chatRooms.reduce((sum, room) => sum + room.unread, 0);
    const definitions: Omit<WorkspaceNotification, 'read' | 'resolved'>[] = [];
    if (pendingUpdates.length) definitions.push({ id: 'live-driver-updates', title: 'تحديثات مناديب تحتاج اعتمادًا', detail: `${pendingUpdates.length.toLocaleString('ar-EG')} تحديثات مرتبطة بشحنات فعلية.`, path: '/operations?tab=driverUpdates', time: 'الآن', category: 'operations', priority: 'urgent' });
    if (delayed.length) definitions.push({ id: 'live-delays', title: 'شحنات تجاوزت موعد التسليم', detail: `${delayed.length.toLocaleString('ar-EG')} شحنات تحتاج إعادة جدولة أو تصعيد.`, path: '/exceptions?category=delay', time: 'الآن', category: 'operations', priority: 'high' });
    if (discrepancies.length) definitions.push({ id: 'live-financial', title: 'فروق تحصيل تحتاج مراجعة', detail: `${discrepancies.length.toLocaleString('ar-EG')} شحنات بها فرق مالي مفتوح.`, path: '/exceptions?category=financial', time: 'الآن', category: 'financial', priority: 'urgent' });
    if (approvedSettlements.length) definitions.push({ id: 'live-settlements', title: 'تسويات جاهزة للدفع', detail: `${approvedSettlements.length.toLocaleString('ar-EG')} تسويات معتمدة تنتظر تسجيل الدفع.`, path: '/settlements?status=approved', time: 'الآن', category: 'merchant', priority: 'normal' });
    if (unreadChats) definitions.push({ id: 'live-chat', title: 'رسائل غير مقروءة', detail: `${unreadChats.toLocaleString('ar-EG')} رسائل تحتاج متابعة.`, path: '/chat', time: 'الآن', category: 'operations', priority: 'normal' });
    return definitions.map((item) => ({ ...item, read: readIds.has(item.id), resolved: false }));
  }, [state, readIds, now]);
  const markNotificationRead = (id: string) => setReadIds((current) => new Set([...current, id]));
  const resolveNotification = markNotificationRead;
  const markAllRead = () => setReadIds(new Set(notifications.map((item) => item.id)));
  const dismissToast = (id: number) => setToasts((items) => items.filter((item) => item.id !== id));
  const showToast = (message: string, tone: ToastMessage['tone'] = 'success') => { const id = Date.now() + Math.floor(Math.random() * 1000); setToasts((items) => [...items, { id, message, tone }]); window.setTimeout(() => dismissToast(id), 4200); };
  const value = { role, notifications, markNotificationRead, resolveNotification, markAllRead, toasts, showToast, dismissToast };
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() { const context = useContext(WorkspaceContext); if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider'); return context; }
export const workspaceRoleLabels: Record<WorkspaceRole, string> = { management: 'الإدارة', operations: 'التشغيل', accounting: 'المحاسبة', support: 'خدمة العملاء' };
