import { useState } from 'react';
import { Eye, Plus, Shield, ShieldCheck, UserCheck, UserCog, UserX, Users, X } from 'lucide-react';
import { useUsersAndRoles } from '../application/admin/useAdminData';
import { Modal, StatusBadge } from '../components/ui/Ui';
import type { AccountStatus, AdminRole, UserAccount } from '../domain/admin/entities';
import { accountStatusLabels, roleLabels, statusTone } from '../domain/admin/presentation';
import './AdminOperations.css';

type UsersTab = 'staff' | 'roles';

const permissionLabels: Record<string, string> = {
  'shipments.read': 'عرض الشحنات',
  'shipments.assignDriver': 'إسناد الشحنات للمناديب',
  'shipments.confirmIntake': 'استلام وتأكيد الشحنات',
  'driverUpdates.review': 'مراجعة تحديثات المناديب',
  'driverUpdates.approve': 'اعتماد تحديث مندوب',
  'driverUpdates.reject': 'رفض تحديث مندوب',
  'returns.receive': 'استلام المرتجعات',
  'returns.assign': 'إسناد المرتجعات',
  'exceptions.create': 'إنشاء استثناء',
  'drivers.read': 'عرض المناديب',
  'drivers.manage': 'إدارة المناديب',
  'merchants.read': 'عرض التجار',
  'merchants.review': 'مراجعة التجار',
  'settlements.read': 'عرض التسويات',
  'settlements.prepare': 'إعداد التسويات',
  'settlements.review': 'مراجعة التسويات',
  'settlements.approve': 'اعتماد التسويات',
  'settlements.pay': 'تسجيل دفع التسوية',
  'remittances.read': 'عرض توريدات المناديب',
  'remittances.reconcile': 'مطابقة التوريدات',
  'remittances.approve': 'اعتماد التوريدات',
  'journal.read': 'عرض القيود',
  'journal.post': 'ترحيل القيود',
  'journal.reverse': 'عكس القيود',
  'accounting.periodClose': 'إغلاق الفترة المحاسبية',
  'accounting.periodReopen': 'إعادة فتح الفترة',
  'reports.read': 'عرض التقارير',
  'users.manage': 'إدارة المستخدمين',
  'audit.read': 'عرض سجل العمليات',
};

export function UsersPage() {
  const { users: seedUsers, roles } = useUsersAndRoles();
  const [users, setUsers] = useState<UserAccount[]>(seedUsers);
  const [tab, setTab] = useState<UsersTab>('staff');
  const [dialogUser, setDialogUser] = useState<UserAccount | 'new' | null>(null);
  const [profileUser, setProfileUser] = useState<UserAccount | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeUsers = users.filter((user) => user.status === 'active').length;
  const suspendedUsers = users.filter((user) => user.status === 'suspended').length;

  const saveUser = (user: UserAccount) => {
    setUsers((rows) => rows.some((row) => row.id === user.id) ? rows.map((row) => row.id === user.id ? user : row) : [user, ...rows]);
    setMessage(dialogUser === 'new' ? `تمت إضافة المستخدم ${user.name} بنجاح.` : `تم تحديث بيانات ${user.name} بنجاح.`);
    setDialogUser(null);
  };

  const toggleSuspend = (user: UserAccount) => {
    if (user.role === 'superAdmin' && users.filter((item) => item.role === 'superAdmin' && item.status === 'active').length <= 1 && user.status === 'active') {
      setMessage('لا يمكن إيقاف آخر مدير نظام نشط.');
      return;
    }
    const newStatus: AccountStatus = user.status === 'suspended' ? 'active' : 'suspended';
    setUsers((rows) => rows.map((row) => row.id === user.id ? { ...row, status: newStatus } : row));
    setMessage(newStatus === 'active' ? `تم تفعيل حساب ${user.name}.` : `تم إيقاف حساب ${user.name}.`);
    if (profileUser?.id === user.id) {
      setProfileUser((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

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

    {tab === 'staff' && <section className="glass-card">
      <div className="section-title-row">
        <div>
          <h3>موظفو لوحة التحكم</h3>
          <p className="section-subtitle">إدارة حسابات مستخدمي لوحة التحكم وتحديد أدوارهم وصلاحياتهم.</p>
        </div>
        <button className="btn-primary" onClick={() => setDialogUser('new')}><Plus size={16}/> إضافة مستخدم</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>الموظف</th>
              <th>رقم الهاتف</th>
              <th>الدور الوظيفي</th>
              <th>الحالة</th>
              <th>آخر نشاط</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => <tr key={user.id}>
              <td className="tracking-num">{user.id}</td>
              <td>
                <button className="tracking-link user-name-link" onClick={() => setProfileUser(user)}>{user.name}</button>
                <small className="muted-cell">{user.email}</small>
              </td>
              <td dir="ltr" style={{ textAlign: 'right' }}>{user.phone || '—'}</td>
              <td><strong>{roleLabels[user.role]}</strong></td>
              <td><span className={`tone-badge ${statusTone[user.status]}`}>{accountStatusLabels[user.status]}</span></td>
              <td><span>{user.lastSeenAt}</span></td>
              <td>
                <div className="row-actions">
                  <button className="btn-icon sm" onClick={() => setProfileUser(user)} title="عرض التفاصيل" aria-label={`عرض ${user.name}`}><Eye size={15}/></button>
                  <button className="btn-icon sm" onClick={() => setDialogUser(user)} title="تعديل المستخدم" aria-label={`تعديل ${user.name}`}><UserCog size={15}/></button>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>}

    {tab === 'roles' && <section className="glass-card">
      <div className="section-title-row">
        <div>
          <h3>الأدوار والصلاحيات</h3>
          <p className="section-subtitle">المسميات الوظيفية المعتمدة في النظام والصلاحيات المتاحة لكل دور.</p>
        </div>
      </div>
      <div className="roles-grid-v2">
        {roles.map((role) => <article key={role.role} className="role-card role-card-v2">
          <div className="role-card-head">
            <div>
              <h4>{role.label}</h4>
              <p className="role-description">{role.description}</p>
            </div>
            <StatusBadge label={`${users.filter((user) => user.role === role.role && user.status === 'active').length} مستخدم نشط`} tone="info"/>
          </div>
          <div className="permission-list">
            {role.permissions.map((permission) => <span key={permission} className="permission-chip">{permissionLabels[permission] ?? permission}</span>)}
          </div>
        </article>)}
      </div>
    </section>}

    {profileUser && <Modal wide title={profileUser.name} description={`${profileUser.id} — ${roleLabels[profileUser.role]}`} onClose={() => setProfileUser(null)} footer={<>
      <button className="outline-btn" onClick={() => setProfileUser(null)}>إغلاق</button>
      <button className="btn-primary" onClick={() => { setDialogUser(profileUser); setProfileUser(null); }}><UserCog size={15}/> تعديل المستخدم</button>
    </>}>
      <div className="user-profile-grid">
        <ProfileRow label="الاسم الكامل" value={profileUser.name}/>
        <ProfileRow label="البريد الإلكتروني" value={profileUser.email}/>
        <ProfileRow label="رقم الهاتف" value={profileUser.phone || '—'}/>
        <ProfileRow label="الدور الوظيفي" value={roleLabels[profileUser.role]}/>
        <ProfileRow label="الحالة" value={accountStatusLabels[profileUser.status]}/>
        <ProfileRow label="آخر نشاط" value={profileUser.lastSeenAt}/>
        <ProfileRow label="تاريخ الإنشاء" value={profileUser.createdAt}/>
      </div>
      <div className="toolbar-actions user-security-actions" style={{ marginTop: '1.25rem' }}>
        <button className="outline-btn danger-link" onClick={() => toggleSuspend(profileUser)}>
          {profileUser.status === 'suspended' ? 'إعادة تفعيل الحساب' : 'إيقاف الحساب مؤقتًا'}
        </button>
      </div>
    </Modal>}

    {dialogUser && <UserDialog
      user={dialogUser}
      roles={roles.map((role) => role.role)}
      nextUserId={`USR-${String(Math.max(0, ...users.map((user) => Number(user.id.replace(/\D/g,'')) || 0)) + 1).padStart(3,'0')}`}
      onCancel={() => setDialogUser(null)}
      onSave={saveUser}
    />} 
  </div>;
}

function UserDialog({ user, roles, nextUserId, onCancel, onSave }: { user: UserAccount | 'new'; roles: AdminRole[]; nextUserId: string; onCancel: () => void; onSave: (user: UserAccount) => void }) {
  const isNew = user === 'new';
  const [form, setForm] = useState<UserAccount>(() => isNew ? {
    id: nextUserId,
    name: '',
    phone: '',
    email: '',
    role: 'supportAgent',
    status: 'active',
    city: 'القاهرة',
    lastSeenAt: 'لم يسجل الدخول',
    createdAt: new Date().toLocaleDateString('ar-EG'),
  } : user);
  const [password, setPassword] = useState('');

  const update = (patch: Partial<UserAccount>) => setForm((current) => ({ ...current, ...patch }));

  return <div className="admin-dialog-overlay" onClick={onCancel}>
    <div className="admin-dialog glass-panel" onClick={(event) => event.stopPropagation()}>
      <div className="section-title-row">
        <div>
          <h3>{isNew ? 'إضافة مستخدم جديد' : 'تعديل بيانات المستخدم'}</h3>
          <p className="section-subtitle">{isNew ? 'أدخل بيانات الموظف ودوره ليتمكن من تسجيل الدخول.' : 'تحديث البيانات الأساسية والدور الوظيفي للمستخدم.'}</p>
        </div>
        <button className="btn-icon sm" onClick={onCancel} aria-label="إغلاق"><X size={14}/></button>
      </div>

      <div className="admin-form-grid">
        <label className="form-field">
          <span>الاسم الكامل</span>
          <input className="input-glass" value={form.name} onChange={(event) => update({ name: event.target.value })} placeholder="مثال: أحمد مصطفى"/>
        </label>
        <label className="form-field">
          <span>البريد الإلكتروني</span>
          <input className="input-glass" dir="ltr" value={form.email} onChange={(event) => update({ email: event.target.value })} placeholder="name@company.com"/>
        </label>
        <label className="form-field">
          <span>رقم الهاتف</span>
          <input className="input-glass" dir="ltr" value={form.phone} onChange={(event) => update({ phone: event.target.value })} placeholder="010xxxxxxxx"/>
        </label>
        <label className="form-field">
          <span>الدور الوظيفي</span>
          <select className="input-glass" value={form.role} onChange={(event) => update({ role: event.target.value as AdminRole })}>
            {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>{isNew ? 'كلمة المرور' : 'تغيير كلمة المرور (اختياري)'}</span>
          <input className="input-glass" type="password" dir="ltr" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isNew ? 'كلمة مرور الدخول' : 'اتركه فارغًا إن لم ترغب بالتغيير'}/>
        </label>
        {!isNew && <label className="form-field">
          <span>حالة الحساب</span>
          <select className="input-glass" value={form.status} onChange={(event) => update({ status: event.target.value as AccountStatus })}>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
          </select>
        </label>}
      </div>

      <div className="toolbar-actions dialog-actions">
        <button className="outline-btn" onClick={onCancel}>إلغاء</button>
        <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.name.trim() || !form.email.trim()}>
          {isNew ? 'إضافة المستخدم' : 'حفظ التعديلات'}
        </button>
      </div>
    </div>
  </div>;
}

function SummaryCard({ label, value, icon, gradient }: { label: string; value: number; icon: React.ReactNode; gradient: string }) {
  return <div className="admin-summary-card glass-card">
    <div className="admin-summary-icon" style={{ background: gradient }}>{icon}</div>
    <div>
      <p className="admin-summary-label">{label}</p>
      <p className="admin-summary-value">{value}</p>
    </div>
  </div>;
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return <div className="contact-phone-box">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>;
}
