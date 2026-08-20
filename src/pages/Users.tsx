import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, KeyRound, LockKeyhole, MoreHorizontal, Plus, Shield, ShieldCheck, UserCheck, UserCog, Users, X } from 'lucide-react';
import { useAdminMetrics, useUsersAndRoles } from '../application/admin/useAdminData';
import { Modal, StatusBadge } from '../components/ui/Ui';
import type { AccountStatus, AdminRole, PermissionKey, StaffScopeType, UserAccount } from '../domain/admin/entities';
import { accountStatusLabels, roleLabels, statusTone } from '../domain/admin/presentation';
import './AdminOperations.css';

type UsersTab = 'staff' | 'roles' | 'review';
const scopeLabels: Record<StaffScopeType, string> = { tenant: 'كل الشركة', branch: 'فرع', warehouse: 'مخزن', region: 'منطقة تشغيل' };
const permissionLabels: Partial<Record<PermissionKey, string>> = {
  'shipments.read': 'عرض الشحنات', 'shipments.assignDriver': 'إسناد مندوب', 'shipments.confirmIntake': 'تأكيد وصول الشحنات',
  'driverUpdates.review': 'مراجعة تحديثات المناديب', 'driverUpdates.approve': 'اعتماد تحديث مندوب', 'driverUpdates.reject': 'رفض تحديث مندوب',
  'returns.receive': 'استلام المرتجعات', 'returns.assign': 'إسناد المرتجعات', 'exceptions.create': 'إنشاء استثناء',
  'drivers.read': 'عرض المناديب', 'drivers.manage': 'إدارة المناديب', 'merchants.read': 'عرض التجار', 'merchants.review': 'مراجعة التجار',
  'settlements.read': 'عرض التسويات', 'settlements.prepare': 'إعداد التسويات', 'settlements.review': 'مراجعة التسويات', 'settlements.approve': 'اعتماد التسويات', 'settlements.pay': 'تسجيل دفع التسوية',
  'remittances.read': 'عرض توريدات المناديب', 'remittances.reconcile': 'مطابقة التوريدات', 'remittances.approve': 'اعتماد التوريدات',
  'journal.read': 'عرض القيود', 'journal.post': 'ترحيل القيود', 'journal.reverse': 'عكس القيود', 'accounting.periodClose': 'إغلاق الفترة المحاسبية', 'accounting.periodReopen': 'إعادة فتح الفترة',
  'reports.read': 'عرض التقارير', 'users.manage': 'إدارة المستخدمين', 'audit.read': 'عرض سجل التدقيق',
};

const highRiskPermissions = new Set<PermissionKey>(['settlements.approve','settlements.pay','remittances.approve','journal.post','journal.reverse','accounting.periodClose','accounting.periodReopen','users.manage']);

export function UsersPage() {
  const metrics = useAdminMetrics();
  const { users: seedUsers, roles } = useUsersAndRoles();
  const [users, setUsers] = useState<UserAccount[]>(seedUsers);
  const [tab, setTab] = useState<UsersTab>('staff');
  const [dialogUser, setDialogUser] = useState<UserAccount | 'new' | null>(null);
  const [profileUser, setProfileUser] = useState<UserAccount | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeUsers = users.filter((user) => user.status === 'active').length;
  const reviewItems = useMemo(() => users.filter((user) => user.status === 'invited' || (['superAdmin','accountant'].includes(user.role) && !user.mfaEnabled) || user.status === 'locked'), [users]);
  const criticalUsers = users.filter((user) => ['superAdmin','accountant'].includes(user.role)).length;

  const saveUser = (user: UserAccount) => {
    setUsers((rows) => rows.some((row) => row.id === user.id) ? rows.map((row) => row.id === user.id ? user : row) : [user, ...rows]);
    setMessage(dialogUser === 'new' ? `تم إنشاء دعوة الموظف ${user.name}. سيحدد كلمة المرور عند التفعيل.` : `تم تحديث وصول ${user.name} وتسجيل التغيير للمراجعة.`);
    setDialogUser(null);
  };

  const resetAccess = (user: UserAccount) => setMessage(`تم تجهيز طلب إعادة تعيين الدخول لـ ${user.name}: إلغاء الجلسات وإرسال رابط تفعيل جديد عند ربط خدمة الهوية.`);
  const endSessions = (user: UserAccount) => { setUsers((rows) => rows.map((row) => row.id === user.id ? { ...row, activeSessions: 0 } : row)); setMessage(`تم إنهاء جلسات ${user.name} في النسخة التجريبية.`); };
  const toggleSuspend = (user: UserAccount) => {
    if (user.role === 'superAdmin' && users.filter((item) => item.role === 'superAdmin' && item.status === 'active').length <= 1 && user.status === 'active') { setMessage('لا يمكن إيقاف آخر مدير نظام نشط.'); return; }
    setUsers((rows) => rows.map((row) => row.id === user.id ? { ...row, status: row.status === 'suspended' ? 'active' : 'suspended' } : row));
  };

  return <div className="admin-page users-v2">
    <div className="admin-summary-grid">
      <SummaryCard label="موظفو الشركة النشطون" value={activeUsers} icon={<Users size={20}/>} gradient="linear-gradient(135deg,#10B981,#059669)" />
      <SummaryCard label="أدوار النظام" value={roles.length} icon={<Shield size={20}/>} gradient="linear-gradient(135deg,#4F46E5,#7C3AED)" />
      <SummaryCard label="مراجعات وصول" value={reviewItems.length} icon={<UserCog size={20}/>} gradient="linear-gradient(135deg,#F59E0B,#D97706)" />
      <SummaryCard label="حسابات حساسة" value={criticalUsers || metrics.criticalEvents} icon={<LockKeyhole size={20}/>} gradient="linear-gradient(135deg,#EF4444,#B91C1C)" />
    </div>

    <div className="reports-tabs glass-card users-tabs">
      <button className={`reports-tab ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}><Users size={17}/> المستخدمون</button>
      <button className={`reports-tab ${tab === 'roles' ? 'active' : ''}`} onClick={() => setTab('roles')}><ShieldCheck size={17}/> الأدوار والصلاحيات</button>
      <button className={`reports-tab ${tab === 'review' ? 'active' : ''}`} onClick={() => setTab('review')}><UserCheck size={17}/> مراجعة الوصول</button>
    </div>

    {message && <div className="management-feedback">{message}</div>}

    {tab === 'staff' && <section className="glass-card">
      <div className="section-title-row"><div><h3>موظفو شركة الشحن</h3><p className="section-subtitle">هذه الصفحة للموظفين الداخليين فقط. حسابات المناديب والتجار تُدار من ملفاتهم التشغيلية.</p></div><button className="btn-primary" onClick={() => setDialogUser('new')}><Plus size={16}/> دعوة موظف</button></div>
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>الكود</th><th>الموظف</th><th>الدور</th><th>نطاق الوصول</th><th>الحالة</th><th>MFA</th><th>آخر نشاط</th><th>الإجراءات</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td className="tracking-num">{user.id}</td><td><button className="tracking-link user-name-link" onClick={() => setProfileUser(user)}>{user.name}</button><small className="muted-cell">{user.email}</small></td><td>{roleLabels[user.role]}<small className="muted-cell">{user.jobTitle ?? ''}</small></td><td>{user.scopeLabel ?? scopeLabels[user.scopeType ?? 'tenant']}</td><td><span className={`tone-badge ${statusTone[user.status]}`}>{accountStatusLabels[user.status]}</span></td><td><StatusBadge label={user.mfaEnabled ? 'مفعل' : ['superAdmin','accountant'].includes(user.role) ? 'مطلوب' : 'اختياري'} tone={user.mfaEnabled ? 'success' : ['superAdmin','accountant'].includes(user.role) ? 'warning' : 'neutral'}/></td><td>{user.lastSeenAt}<small className="muted-cell">{(user.activeSessions ?? 0).toLocaleString('ar-EG')} جلسة</small></td><td><div className="row-actions"><button className="outline-btn compact-btn" onClick={() => setProfileUser(user)}><Eye size={14}/> فتح</button><button className="btn-icon sm" onClick={() => setDialogUser(user)} aria-label={`إدارة ${user.name}`} title="إدارة الوصول"><MoreHorizontal size={15}/></button></div></td></tr>)}</tbody></table></div>
    </section>}

    {tab === 'roles' && <section className="glass-card"><div className="section-title-row"><div><h3>الأدوار والصلاحيات</h3><p className="section-subtitle">الصلاحيات مرتبطة بأفعال محددة، ولا توجد صلاحية عامة لتغيير حالة الشحنة أو إدارة كل العمليات المالية.</p></div></div><div className="roles-grid-v2">{roles.map((role) => <article key={role.role} className="role-card role-card-v2"><div className="role-card-head"><div><h4>{role.label}</h4><p className="role-description">{role.description}</p></div><StatusBadge label={role.sensitivity === 'critical' ? 'حساس جدًا' : role.sensitivity === 'high' ? 'حساس' : 'تشغيلي'} tone={role.sensitivity === 'critical' ? 'danger' : role.sensitivity === 'high' ? 'warning' : 'info'}/></div><div className="permission-list">{role.permissions.map((permission) => <span key={permission} className={`permission-chip ${highRiskPermissions.has(permission) ? 'critical-permission' : ''}`} title={permission}>{permissionLabels[permission] ?? permission}</span>)}</div><small className="muted-cell">{users.filter((user) => user.role === role.role && user.status !== 'archived').length.toLocaleString('ar-EG')} مستخدم</small></article>)}</div></section>}

    {tab === 'review' && <section className="glass-card"><div className="section-title-row"><div><h3>مراجعة الوصول</h3><p className="section-subtitle">حسابات تحتاج قرارًا أمنيًا أو إكمال التفعيل. لا تشمل طلبات انضمام التجار.</p></div></div>{reviewItems.length ? <div className="access-review-list">{reviewItems.map((user) => <article key={user.id} className="glass-card access-review-item"><AlertTriangle size={18}/><div><strong>{user.name} — {roleLabels[user.role]}</strong><p>{user.status === 'invited' ? 'لم يكمل تفعيل الحساب بعد.' : user.status === 'locked' ? 'الحساب مقفل أمنيًا ويحتاج مراجعة.' : 'دور حساس بدون MFA مفعل.'}</p></div><button className="outline-btn" onClick={() => setProfileUser(user)}>مراجعة</button></article>)}</div> : <p className="section-subtitle">لا توجد مراجعات وصول معلقة.</p>}</section>}

    {profileUser && <Modal wide title={profileUser.name} description={`${profileUser.id} — ${roleLabels[profileUser.role]}`} onClose={() => setProfileUser(null)} footer={<><button className="outline-btn" onClick={() => setProfileUser(null)}>إغلاق</button><button className="btn-primary" onClick={() => { setDialogUser(profileUser); setProfileUser(null); }}><UserCog size={15}/> إدارة الوصول</button></>}><div className="user-profile-grid"><ProfileRow label="الحالة" value={accountStatusLabels[profileUser.status]}/><ProfileRow label="نطاق الوصول" value={profileUser.scopeLabel ?? scopeLabels[profileUser.scopeType ?? 'tenant']}/><ProfileRow label="آخر تسجيل دخول" value={profileUser.lastLoginAt ?? profileUser.lastSeenAt}/><ProfileRow label="آخر نشاط" value={profileUser.lastSeenAt}/><ProfileRow label="الجلسات النشطة" value={(profileUser.activeSessions ?? 0).toLocaleString('ar-EG')}/><ProfileRow label="المصادقة متعددة العوامل" value={profileUser.mfaEnabled ? 'مفعلة' : 'غير مفعلة'}/></div><div className="permission-list profile-permissions">{roles.find((role) => role.role === profileUser.role)?.permissions.map((permission) => <span className="permission-chip" key={permission}>{permissionLabels[permission] ?? permission}</span>)}</div><div className="toolbar-actions user-security-actions"><button className="outline-btn" onClick={() => resetAccess(profileUser)}><KeyRound size={15}/> إعادة تعيين الدخول</button><button className="outline-btn" onClick={() => endSessions(profileUser)} disabled={(profileUser.activeSessions ?? 0) === 0}>إنهاء كل الجلسات</button><button className="outline-btn danger-link" onClick={() => toggleSuspend(profileUser)}>{profileUser.status === 'suspended' ? 'إعادة التفعيل' : 'تعليق الحساب'}</button></div></Modal>}

    {dialogUser && <UserDialog user={dialogUser} roles={roles.map((role) => role.role)} nextUserId={`USR-${String(Math.max(0, ...users.map((user) => Number(user.id.replace(/\D/g,'')) || 0)) + 1).padStart(3,'0')}`} onCancel={() => setDialogUser(null)} onSave={saveUser}/>} 
  </div>;
}

function UserDialog({ user, roles, nextUserId, onCancel, onSave }: { user: UserAccount | 'new'; roles: AdminRole[]; nextUserId: string; onCancel: () => void; onSave: (user: UserAccount) => void }) {
  const isNew = user === 'new';
  const [form, setForm] = useState<UserAccount>(() => isNew ? { id: nextUserId, name: '', phone: '', email: '', role: 'supportAgent', status: 'invited', city: 'القاهرة', lastSeenAt: 'لم يسجل الدخول', createdAt: new Date().toISOString(), scopeType: 'tenant', scopeLabel: 'كل الشركة', mfaEnabled: false, activeSessions: 0 } : user);
  const [reason, setReason] = useState('');
  const update = (patch: Partial<UserAccount>) => setForm((current) => ({ ...current, ...patch }));
  const sensitiveChange = !isNew && user.role !== form.role && (form.role === 'superAdmin' || form.role === 'accountant');
  return <div className="admin-dialog-overlay" onClick={onCancel}><div className="admin-dialog glass-panel" onClick={(event) => event.stopPropagation()}><div className="section-title-row"><div><h3>{isNew ? 'دعوة موظف جديد' : 'إدارة وصول الموظف'}</h3><p className="section-subtitle">المستخدم سيحدد كلمة المرور بنفسه. الدور والنطاق يطبقان على الخادم عند الربط.</p></div><button className="btn-icon sm" onClick={onCancel} aria-label="إغلاق"><X size={14}/></button></div><div className="admin-form-grid"><label className="form-field"><span>الاسم</span><input className="input-glass" value={form.name} onChange={(event) => update({ name: event.target.value })}/></label><label className="form-field"><span>الإيميل</span><input className="input-glass" dir="ltr" value={form.email} onChange={(event) => update({ email: event.target.value })}/></label><label className="form-field"><span>الهاتف</span><input className="input-glass" dir="ltr" value={form.phone} onChange={(event) => update({ phone: event.target.value })}/></label><label className="form-field"><span>الدور</span><select className="input-glass" value={form.role} onChange={(event) => update({ role: event.target.value as AdminRole })}>{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label><label className="form-field"><span>نطاق الصلاحية</span><select className="input-glass" value={form.scopeType ?? 'tenant'} onChange={(event) => update({ scopeType: event.target.value as StaffScopeType, scopeLabel: scopeLabels[event.target.value as StaffScopeType] })}>{Object.entries(scopeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>{!isNew && <label className="form-field"><span>الحالة</span><select className="input-glass" value={form.status} onChange={(event) => update({ status: event.target.value as AccountStatus })}>{Object.entries(accountStatusLabels).map(([status,label]) => <option key={status} value={status}>{label}</option>)}</select></label>}<label className="form-field full"><span>تفصيل النطاق</span><input className="input-glass" value={form.scopeLabel ?? ''} onChange={(event) => update({ scopeLabel: event.target.value })} placeholder="مثال: فرع القاهرة / مخزن الجيزة"/></label><label className="form-field full"><span><input type="checkbox" checked={Boolean(form.mfaEnabled)} onChange={(event) => update({ mfaEnabled: event.target.checked })}/> تفعيل MFA لهذا الحساب</span></label>{sensitiveChange && <label className="form-field full"><span>سبب رفع الصلاحية</span><textarea className="input-glass" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب إلزامي للتغيير الحساس"/></label>}</div>{sensitiveChange && <div className="management-feedback warning-feedback">سيتم منح صلاحيات مالية/إدارية حساسة. يلزم MFA وسبب موثق.</div>}<div className="toolbar-actions dialog-actions"><button className="outline-btn" onClick={onCancel}>إلغاء</button><button className="btn-primary" onClick={() => onSave({ ...form, mfaEnabled: sensitiveChange ? true : form.mfaEnabled })} disabled={!form.name.trim() || !form.email.trim() || (sensitiveChange && !reason.trim())}>{isNew ? 'إرسال الدعوة' : 'حفظ الوصول'}</button></div></div></div>;
}

function SummaryCard({ label, value, icon, gradient }: { label: string; value: number; icon: React.ReactNode; gradient: string }) { return <div className="admin-summary-card glass-card"><div className="admin-summary-icon" style={{ background: gradient }}>{icon}</div><div><p className="admin-summary-label">{label}</p><p className="admin-summary-value">{value}</p></div></div>; }
function ProfileRow({ label, value }: { label: string; value: string }) { return <div className="contact-phone-box"><span>{label}</span><strong>{value}</strong></div>; }
