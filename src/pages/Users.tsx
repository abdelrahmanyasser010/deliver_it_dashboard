import { useState } from 'react';
import { Edit3, Plus, Shield, UserCog, Users } from 'lucide-react';
import { useAdminMetrics, useUsersAndRoles } from '../application/admin/useAdminData';
import type { AccountStatus, AdminRole, UserAccount } from '../domain/admin/entities';
import { accountStatusLabels, roleLabels, statusTone } from '../domain/admin/presentation';
import './AdminOperations.css';

export function UsersPage() {
  const metrics = useAdminMetrics();
  const { users: seedUsers, roles } = useUsersAndRoles();
  const [users, setUsers] = useState<UserAccount[]>(seedUsers);
  const [dialogUser, setDialogUser] = useState<UserAccount | 'new' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const saveUser = (user: UserAccount) => {
    setUsers((rows) => (
      rows.some((row) => row.id === user.id)
        ? rows.map((row) => (row.id === user.id ? user : row))
        : [user, ...rows]
    ));
    setMessage(rowsMessage(user));
    setDialogUser(null);
  };

  return (
    <div className="admin-page">
      <div className="admin-summary-grid">
        <SummaryCard label="مستخدمين نشطين" value={metrics.activeUsers} icon={<Users size={20} />} gradient="linear-gradient(135deg,#10B981,#059669)" />
        <SummaryCard label="أدوار تشغيل" value={roles.length} icon={<Shield size={20} />} gradient="linear-gradient(135deg,#4F46E5,#7C3AED)" />
        <SummaryCard label="طلبات مراجعة" value={metrics.pendingApplications} icon={<UserCog size={20} />} gradient="linear-gradient(135deg,#F59E0B,#D97706)" />
        <SummaryCard label="أحداث حرجة" value={metrics.criticalEvents} icon={<Shield size={20} />} gradient="linear-gradient(135deg,#EF4444,#B91C1C)" />
      </div>

      <div className="operations-layout">
        <section className="glass-card">
          <div className="section-title-row">
            <div>
              <h3>المستخدمين</h3>
              <p className="section-subtitle">حسابات الإدارة، التجار، والمناديب من نفس نموذج الصلاحيات.</p>
            </div>
            <button className="btn-primary" onClick={() => setDialogUser('new')}>
              <Plus size={16} />
              إضافة مستخدم
            </button>
          </div>
          {message && <div className="management-feedback">{message}</div>}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                  <th>الهاتف</th>
                  <th>آخر ظهور</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td className="tracking-num">{user.id}</td>
                    <td>
                      <strong>{user.name}</strong>
                      <p className="muted-cell">{user.email}</p>
                    </td>
                    <td>{roleLabels[user.role]}</td>
                    <td><span className={`tone-badge ${statusTone[user.status]}`}>{accountStatusLabels[user.status]}</span></td>
                    <td dir="ltr">{user.phone}</td>
                    <td className="date">{user.lastSeenAt}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon sm" title="تعديل الصلاحيات" aria-label="تعديل الصلاحيات" onClick={() => setDialogUser(user)}><Edit3 size={14} /></button>
                        <button className="btn-icon sm" title="إدارة الحساب" aria-label="إدارة الحساب" onClick={() => setDialogUser(user)}><UserCog size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="glass-card">
          <div className="section-title-row">
            <div>
              <h3>الصلاحيات</h3>
              <p className="section-subtitle">نفس قواعد تشغيل التطبيق: الإدارة تنشئ المناديب وتراجع التجار.</p>
            </div>
          </div>
          {roles.map((role) => (
            <div key={role.role} className="role-card">
              <div>
                <h4>{role.label}</h4>
                <p className="role-description">{role.description}</p>
              </div>
              <div className="permission-list">
                {role.permissions.map((permission) => (
                  <span key={permission} className="permission-chip">{permission}</span>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>

      {dialogUser && (
        <UserDialog
          user={dialogUser}
          nextUserId={`USR-${String(users.length + 1).padStart(3, '0')}`}
          onCancel={() => setDialogUser(null)}
          onSave={saveUser}
        />
      )}
    </div>
  );
}

function rowsMessage(user: UserAccount) {
  return `تم حفظ حساب المستخدم: ${user.name}`;
}

function UserDialog({
  user,
  nextUserId,
  onCancel,
  onSave,
}: {
  user: UserAccount | 'new';
  nextUserId: string;
  onCancel: () => void;
  onSave: (user: UserAccount) => void;
}) {
  const isNew = user === 'new';
  const [form, setForm] = useState<UserAccount>(() => (isNew ? {
    id: nextUserId,
    name: '',
    phone: '',
    email: '',
    role: 'supportAgent',
    status: 'active',
    city: 'القاهرة',
    lastSeenAt: 'الآن',
    createdAt: '2026-07-07',
  } : user));

  const update = (patch: Partial<UserAccount>) => setForm((current) => ({ ...current, ...patch }));

  return (
    <div className="admin-dialog-overlay" onClick={onCancel}>
      <div className="admin-dialog glass-panel" onClick={(event) => event.stopPropagation()}>
        <div className="section-title-row">
          <div>
            <h3>{isNew ? 'إضافة مستخدم' : 'تعديل مستخدم'}</h3>
            <p className="section-subtitle">الدور والحالة يتحكمان في الوصول للوحة والتطبيق.</p>
          </div>
        </div>

        <div className="admin-form-grid">
          <label className="form-field">
            <span>الاسم</span>
            <input className="input-glass" value={form.name} onChange={(event) => update({ name: event.target.value })} />
          </label>
          <label className="form-field">
            <span>الإيميل</span>
            <input className="input-glass" value={form.email} onChange={(event) => update({ email: event.target.value })} />
          </label>
          <label className="form-field">
            <span>الهاتف</span>
            <input className="input-glass" dir="ltr" value={form.phone} onChange={(event) => update({ phone: event.target.value })} />
          </label>
          <label className="form-field">
            <span>الدور</span>
            <select className="input-glass" value={form.role} onChange={(event) => update({ role: event.target.value as AdminRole })}>
              {Object.entries(roleLabels).map(([role, label]) => (
                <option key={role} value={role}>{label}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>الحالة</span>
            <select className="input-glass" value={form.status} onChange={(event) => update({ status: event.target.value as AccountStatus })}>
              {Object.entries(accountStatusLabels).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="toolbar-actions dialog-actions">
          <button className="outline-btn" onClick={onCancel}>إلغاء</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.name || !form.phone || !form.email}>حفظ المستخدم</button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, gradient }: { label: string; value: number; icon: React.ReactNode; gradient: string }) {
  return (
    <div className="admin-summary-card glass-card">
      <div className="admin-summary-icon" style={{ background: gradient }}>{icon}</div>
      <div>
        <p className="admin-summary-label">{label}</p>
        <p className="admin-summary-value">{value}</p>
      </div>
    </div>
  );
}
