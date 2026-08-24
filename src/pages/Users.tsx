import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Plus, Shield, ShieldCheck, UserCheck, UserCog, UserX, Users, X } from 'lucide-react';
import { ErrorState, PageSkeleton } from '../components/AsyncState';
import { Modal } from '../components/ui/Ui';
import { api } from '../infrastructure/api/client';
import { friendlyApiMessage } from '../infrastructure/api/errors';
import './AdminOperations.css';

type StaffStatus = 'invited' | 'active' | 'suspended' | 'locked' | 'archived' | string;
type StaffRole = { id: string; key: string; name: string; permission_keys: string[]; description?: string | null; system_role: boolean; version: number };
type StaffUser = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: StaffStatus;
  identity_status?: string;
  membership_status?: string;
  branch_id?: string | null;
  scope?: { type?: string; ids?: string[] } | null;
  mfa_required?: boolean;
  mfa_enabled?: boolean;
  last_login_at?: string | null;
  last_activity_at?: string | null;
  roles: Array<{ id: string; key: string; name: string }>;
  permissions?: string[];
  active_sessions_count?: number;
  resource_version: number;
};

type UsersTab = 'staff' | 'roles';
type UserForm = { name: string; email: string; phone: string; roleId: string; mfaRequired: boolean };

const statusLabel = (status: string) => ({ active: 'نشط', suspended: 'موقوف', archived: 'مؤرشف', locked: 'مقفل أمنيًا', invited: 'تمت الدعوة' }[status] ?? status);
const statusTone = (status: string) => ({ active: 'success', suspended: 'danger', archived: 'neutral', locked: 'danger', invited: 'info' }[status] ?? 'neutral');
const formatWhen = (value?: string | null) => value ? new Date(value).toLocaleString('ar-EG') : '—';
const actionId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function UsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<UsersTab>('staff');
  const [dialogUser, setDialogUser] = useState<StaffUser | 'new' | null>(null);
  const [profileUser, setProfileUser] = useState<StaffUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [userResult, roleResult] = await Promise.all([
        api.get<StaffUser[]>('/api/v1/staff-users', { query: { page: 1, per_page: 100 } }),
        api.get<StaffRole[]>('/api/v1/roles'),
      ]);
      setUsers(userResult.data ?? []);
      setRoles(roleResult.data ?? []);
    } catch (raw) { setError(friendlyApiMessage(raw)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeUsers = useMemo(() => users.filter((user) => user.status === 'active').length, [users]);
  const suspendedUsers = useMemo(() => users.filter((user) => user.status === 'suspended').length, [users]);

  const saveUser = async (form: UserForm, current?: StaffUser) => {
    const selectedRole = roles.find((role) => role.id === form.roleId);
    if (!selectedRole) { setMessage('اختر دورًا صالحًا من الأدوار الحالية.'); return; }
    const key = current?.id ?? 'new'; setBusyId(key); setMessage(null);
    try {
      if (!current) {
        const clientActionId = actionId('web-staff-invite');
        await api.post('/api/v1/staff-users/invitations', {
          name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null,
          role_ids: [selectedRole.id], mfa_required: form.mfaRequired, client_action_id: clientActionId,
        }, { idempotencyKey: clientActionId, retries: 1 });
        setMessage(`تم إنشاء دعوة ${form.name.trim()} بنجاح. يحدد الخادم مسار تفعيل الحساب وإعداد كلمة المرور.`);
      } else {
        await api.patch(`/api/v1/staff-users/${current.id}`, {
          name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null,
          role_ids: [selectedRole.id], mfa_required: form.mfaRequired, resource_version: current.resource_version,
        }, { retries: 0 });
        setMessage(`تم تحديث بيانات ${form.name.trim()} بنجاح.`);
      }
      setDialogUser(null); await load();
    } catch (raw) { setMessage(friendlyApiMessage(raw)); }
    finally { setBusyId(null); }
  };

  const toggleSuspend = async (user: StaffUser) => {
    const reactivate = user.status === 'suspended';
    setBusyId(user.id); setMessage(null);
    try {
      const clientActionId = actionId(reactivate ? 'web-staff-reactivate' : 'web-staff-suspend');
      await api.post(`/api/v1/staff-users/${user.id}/${reactivate ? 'reactivate' : 'suspend'}`, {
        resource_version: user.resource_version,
        client_action_id: clientActionId,
        ...(reactivate ? {} : { reason_code: 'manual_admin_action', notes: 'تغيير حالة الحساب من لوحة الإدارة' }),
      }, { idempotencyKey: clientActionId, retries: 1 });
      setMessage(reactivate ? `تمت إعادة تفعيل حساب ${user.name}.` : `تم إيقاف حساب ${user.name}.`);
      setProfileUser(null); await load();
    } catch (raw) { setMessage(friendlyApiMessage(raw)); }
    finally { setBusyId(null); }
  };

  if (loading && !users.length) return <PageSkeleton rows={4}/>;
  if (error && !users.length) return <ErrorState message={error} onRetry={() => void load()}/>;

  return <div className="admin-page users-v2">
    <div className="admin-summary-grid">
      <SummaryCard label="إجمالي المستخدمين" value={users.length} icon={<Users size={20}/>} gradient="linear-gradient(135deg,#0284c7,#0369a1)" />
      <SummaryCard label="الحسابات النشطة" value={activeUsers} icon={<UserCheck size={20}/>} gradient="linear-gradient(135deg,#10B981,#059669)" />
      <SummaryCard label="الحسابات الموقوفة" value={suspendedUsers} icon={<UserX size={20}/>} gradient="linear-gradient(135deg,#EF4444,#B91C1C)" />
      <SummaryCard label="أدوار النظام" value={roles.length} icon={<Shield size={20}/>} gradient="linear-gradient(135deg,#6366f1,#4338ca)" />
    </div>

    <div className="reports-tabs glass-card users-tabs">
      <button className={`reports-tab ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}><Users size={17}/> المستخدمون</button>
      <button className={`reports-tab ${tab === 'roles' ? 'active' : ''}`} onClick={() => setTab('roles')}><ShieldCheck size={17}/> الأدوار والصلاحيات</button>
    </div>

    {message && <div className="management-feedback">{message}</div>}
    {error && <div className="management-feedback">{error}</div>}

    {tab === 'staff' && <section className="glass-card">
      <div className="section-title-row"><div><h3>موظفو لوحة التحكم</h3><p className="section-subtitle">الحسابات والأدوار هنا تأتي من الخادم. إضافة مستخدم ترسل دعوة آمنة ولا تنشئ كلمة مرور محلية.</p></div><button className="btn-primary" onClick={() => setDialogUser('new')}><Plus size={16}/> دعوة مستخدم</button></div>
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>المعرف</th><th>الموظف</th><th>الهاتف</th><th>الدور</th><th>الحالة</th><th>آخر نشاط</th><th>الإجراءات</th></tr></thead><tbody>
        {users.map((user) => <tr key={user.id}><td className="tracking-num">{user.id.slice(0,8)}</td><td><button className="tracking-link user-name-link" onClick={() => setProfileUser(user)}>{user.name}</button><small className="muted-cell">{user.email || '—'}</small></td><td dir="ltr" style={{textAlign:'right'}}>{user.phone || '—'}</td><td><strong>{user.roles.map((role) => role.name).join('، ') || 'بدون دور'}</strong></td><td><span className={`tone-badge ${statusTone(user.status)}`}>{statusLabel(user.status)}</span></td><td>{formatWhen(user.last_activity_at || user.last_login_at)}</td><td><div className="row-actions"><button className="btn-icon sm" onClick={() => setProfileUser(user)} title="عرض التفاصيل"><Eye size={15}/></button><button className="btn-icon sm" onClick={() => setDialogUser(user)} title="تعديل المستخدم"><UserCog size={15}/></button></div></td></tr>)}
      </tbody></table></div>
    </section>}

    {tab === 'roles' && <section className="glass-card"><div className="section-title-row"><div><h3>الأدوار والصلاحيات</h3><p className="section-subtitle">تعرض كما يعرّفها الخادم. لا توجد صلاحيات ثابتة مخزنة في واجهة الإنتاج.</p></div></div><div className="admin-role-grid">{roles.map((role) => <article key={role.id} className="request-card"><div><p className="request-title">{role.name}</p><p className="request-meta">{role.description || role.key}</p></div><div><span className={`tone-badge ${role.system_role ? 'info' : 'neutral'}`}>{role.system_role ? 'دور نظام' : 'دور مخصص'}</span><p className="request-meta">{role.permission_keys.length.toLocaleString('ar-EG')} صلاحية</p></div></article>)}</div></section>}

    {profileUser && <Modal title={profileUser.name} description="بيانات الوصول والحماية المسجلة على الخادم." onClose={() => setProfileUser(null)} footer={<button className="outline-btn" onClick={() => setProfileUser(null)}>إغلاق</button>}><div className="admin-detail-list"><ProfileRow label="البريد" value={profileUser.email || '—'}/><ProfileRow label="الهاتف" value={profileUser.phone || '—'}/><ProfileRow label="الأدوار" value={profileUser.roles.map((role)=>role.name).join('، ') || '—'}/><ProfileRow label="الحالة" value={statusLabel(profileUser.status)}/><ProfileRow label="MFA" value={profileUser.mfa_enabled ? 'مفعّل' : profileUser.mfa_required ? 'مطلوب التفعيل' : 'غير مطلوب'}/><ProfileRow label="الجلسات النشطة" value={String(profileUser.active_sessions_count ?? 0)}/><ProfileRow label="آخر نشاط" value={formatWhen(profileUser.last_activity_at || profileUser.last_login_at)}/></div><div className="toolbar-actions user-security-actions" style={{marginTop:'1.25rem'}}><button className="outline-btn danger-link" disabled={busyId===profileUser.id || profileUser.status==='archived'} onClick={() => void toggleSuspend(profileUser)}>{profileUser.status === 'suspended' ? 'إعادة تفعيل الحساب' : 'إيقاف الحساب مؤقتًا'}</button></div></Modal>}

    {dialogUser && <UserDialog user={dialogUser === 'new' ? undefined : dialogUser} roles={roles} busy={busyId === (dialogUser === 'new' ? 'new' : dialogUser.id)} onCancel={() => setDialogUser(null)} onSave={saveUser}/>} 
  </div>;
}

function UserDialog({ user, roles, busy, onCancel, onSave }: { user?: StaffUser; roles: StaffRole[]; busy: boolean; onCancel: () => void; onSave: (form: UserForm, current?: StaffUser) => Promise<void> }) {
  const [form, setForm] = useState<UserForm>(() => ({ name:user?.name ?? '', email:user?.email ?? '', phone:user?.phone ?? '', roleId:user?.roles[0]?.id ?? roles[0]?.id ?? '', mfaRequired:Boolean(user?.mfa_required) }));
  const update = (patch: Partial<UserForm>) => setForm((current) => ({...current,...patch}));
  return <div className="admin-dialog-overlay" onClick={() => { if(!busy) onCancel(); }}><div className="admin-dialog glass-panel" onClick={(event)=>event.stopPropagation()}><div className="section-title-row"><div><h3>{user ? 'تعديل بيانات المستخدم' : 'دعوة مستخدم جديد'}</h3><p className="section-subtitle">{user ? 'يتم تحديث الهوية والدور على الخادم.' : 'سيستلم المستخدم مسار تفعيل آمن لإعداد وصوله. لا تُنشأ كلمة مرور داخل اللوحة.'}</p></div><button className="btn-icon sm" disabled={busy} onClick={onCancel} aria-label="إغلاق"><X size={14}/></button></div><div className="admin-form-grid">
    <label className="form-field"><span>الاسم الكامل</span><input className="input-glass" value={form.name} onChange={(e)=>update({name:e.target.value})}/></label>
    <label className="form-field"><span>البريد الإلكتروني</span><input className="input-glass" dir="ltr" value={form.email} onChange={(e)=>update({email:e.target.value})}/></label>
    <label className="form-field"><span>رقم الهاتف</span><input className="input-glass" dir="ltr" value={form.phone} onChange={(e)=>update({phone:e.target.value})}/></label>
    <label className="form-field"><span>الدور الوظيفي</span><select className="input-glass" value={form.roleId} onChange={(e)=>update({roleId:e.target.value})}><option value="">اختر دورًا</option>{roles.map((role)=><option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
    <label className="form-field"><span>الحماية متعددة العوامل</span><select className="input-glass" value={form.mfaRequired?'required':'optional'} onChange={(e)=>update({mfaRequired:e.target.value==='required'})}><option value="optional">حسب سياسة الحساب</option><option value="required">مطلوبة</option></select></label>
  </div><div className="toolbar-actions dialog-actions"><button className="outline-btn" disabled={busy} onClick={onCancel}>إلغاء</button><button className="btn-primary" disabled={busy || !form.name.trim() || !form.roleId || (!form.email.trim() && !form.phone.trim())} onClick={() => void onSave(form,user)}>{busy?'جارٍ الحفظ...':user?'حفظ التعديلات':'إرسال الدعوة'}</button></div></div></div>;
}

function SummaryCard({ label, value, icon, gradient }: { label: string; value: number; icon: React.ReactNode; gradient: string }) { return <div className="admin-summary-card glass-card"><div className="admin-summary-icon" style={{background:gradient}}>{icon}</div><div><p className="admin-summary-label">{label}</p><p className="admin-summary-value">{value.toLocaleString('ar-EG')}</p></div></div>; }
function ProfileRow({ label, value }: { label: string; value: string }) { return <div className="contact-phone-box"><span>{label}</span><strong>{value}</strong></div>; }
