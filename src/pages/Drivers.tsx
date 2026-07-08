import { useMemo, useState } from 'react';
import { Banknote, Edit3, KeyRound, Plus, Search, ShieldOff, Trash2, UserCheck, Users, X } from 'lucide-react';
import { useDrivers } from '../application/logistics/useLogisticsData';
import type { Driver } from '../domain/logistics/entities';
import { formatCurrency } from '../utils/helpers';
import './Drivers.css';

type DriverDialog =
  | { type: 'create' }
  | { type: 'edit'; driver: Driver }
  | { type: 'password'; driver: Driver }
  | { type: 'block'; driver: Driver }
  | { type: 'delete'; driver: Driver }
  | null;

interface DriverFormState {
  name: string;
  phone: string;
  zone: string;
  capacity: string;
  username: string;
}

const emptyForm: DriverFormState = {
  name: '',
  phone: '',
  zone: '',
  capacity: '8',
  username: '',
};

export function DriversPage() {
  const { drivers, summary } = useDrivers();
  const [localDrivers, setLocalDrivers] = useState(drivers);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<DriverDialog>(null);
  const [form, setForm] = useState<DriverFormState>(emptyForm);
  const [password, setPassword] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filteredDrivers = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('ar-EG');
    if (!value) return localDrivers;

    return localDrivers.filter((driver) => (
      driver.name.toLocaleLowerCase('ar-EG').includes(value) ||
      driver.phone.includes(value) ||
      driver.zone.toLocaleLowerCase('ar-EG').includes(value) ||
      driver.id.toLocaleLowerCase('ar-EG').includes(value)
    ));
  }, [localDrivers, query]);

  const openCreateDialog = () => {
    setForm(emptyForm);
    setDialog({ type: 'create' });
  };

  const openEditDialog = (driver: Driver) => {
    setForm({
      name: driver.name,
      phone: driver.phone,
      zone: driver.zone,
      capacity: String(Math.max(driver.shipmentsCount, 8)),
      username: driver.id.toLowerCase(),
    });
    setDialog({ type: 'edit', driver });
  };

  const openPasswordDialog = (driver: Driver) => {
    setPassword('');
    setDialog({ type: 'password', driver });
  };

  const closeDialog = () => {
    setDialog(null);
    setPassword('');
  };

  const saveNewDriver = () => {
    const nextIndex = localDrivers.length + 1;
    const newDriver: Driver = {
      id: `DRV-${String(nextIndex).padStart(3, '0')}`,
      name: form.name.trim() || 'مندوب جديد',
      phone: form.phone.trim() || '01000000000',
      zone: form.zone.trim() || 'غير محدد',
      shipmentsCount: Number(form.capacity) || 0,
      pendingCash: 0,
      deliveredToday: 0,
      status: 'active',
    };

    setLocalDrivers((items) => [newDriver, ...items]);
    setActionMessage(`تم إضافة المندوب: ${newDriver.name}`);
    closeDialog();
  };

  const saveDriverEdit = (driver: Driver) => {
    setLocalDrivers((items) => items.map((item) => (
      item.id === driver.id
        ? {
            ...item,
            name: form.name.trim() || item.name,
            phone: form.phone.trim() || item.phone,
            zone: form.zone.trim() || item.zone,
            shipmentsCount: Number(form.capacity) || item.shipmentsCount,
          }
        : item
    )));
    setActionMessage(`تم تعديل بيانات المندوب: ${form.name || driver.name}`);
    closeDialog();
  };

  const savePassword = (driver: Driver) => {
    setActionMessage(`تم تغيير كلمة سر المندوب: ${driver.name}`);
    closeDialog();
  };

  const blockDriver = (driver: Driver) => {
    setLocalDrivers((items) => items.map((item) => (
      item.id === driver.id ? { ...item, status: 'off' } : item
    )));
    setActionMessage(`تم حظر المندوب: ${driver.name}`);
    closeDialog();
  };

  const deleteDriver = (driver: Driver) => {
    setLocalDrivers((items) => items.filter((item) => item.id !== driver.id));
    setActionMessage(`تم حذف حساب المندوب: ${driver.name}`);
    closeDialog();
  };

  return (
    <div className="drivers-page compact-page">
      <div className="drivers-summary compact-summary">
        <div className="driver-summary-card glass-card compact-card">
          <Users size={18} className="ds-icon blue" />
          <div>
            <p className="ds-label">المناديب النشطون</p>
            <p className="ds-value">{localDrivers.filter((driver) => driver.status === 'active').length} / {localDrivers.length}</p>
          </div>
        </div>
        <div className="driver-summary-card glass-card compact-card">
          <Banknote size={18} className="ds-icon amber" />
          <div>
            <p className="ds-label">كاش معلق</p>
            <p className="ds-value">{formatCurrency(localDrivers.reduce((sum, driver) => sum + driver.pendingCash, 0) || summary.pendingCash)}</p>
          </div>
        </div>
        <div className="driver-summary-card glass-card compact-card">
          <UserCheck size={18} className="ds-icon purple" />
          <div>
            <p className="ds-label">تسليمات اليوم</p>
            <p className="ds-value">{localDrivers.reduce((sum, driver) => sum + driver.deliveredToday, 0)}</p>
          </div>
        </div>
      </div>

      <section className="drivers-management glass-card">
        <div className="management-toolbar">
          <div>
            <h3>إدارة المناديب</h3>
            <p>إضافة، تعديل، حظر، حذف، وتغيير كلمة السر من نفس الشاشة.</p>
          </div>
          <div className="toolbar-actions">
            <div className="management-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="بحث باسم المندوب، الهاتف، الزون..."
              />
            </div>
            <button className="btn-primary" onClick={openCreateDialog}>
              <Plus size={16} />
              إضافة مندوب
            </button>
          </div>
        </div>

        {actionMessage && <div className="management-feedback">{actionMessage}</div>}

        <div className="table-wrapper">
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>المندوب</th>
                <th>الهاتف</th>
                <th>الزون</th>
                <th>الحالة</th>
                <th>العهدة</th>
                <th>تم اليوم</th>
                <th>كاش معلق</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => (
                <tr key={driver.id} className="table-row">
                  <td className="tracking-num">{driver.id}</td>
                  <td className="bold-cell">{driver.name}</td>
                  <td dir="ltr">{driver.phone}</td>
                  <td>{driver.zone}</td>
                  <td>
                    <span className={`driver-status-pill ${driver.status}`}>
                      {driver.status === 'active' ? 'نشط' : 'محظور'}
                    </span>
                  </td>
                  <td>{driver.shipmentsCount}</td>
                  <td className="amount">{driver.deliveredToday}</td>
                  <td className="amount">{formatCurrency(driver.pendingCash)}</td>
                  <td>
                    <div className="driver-row-actions">
                      <button className="btn-icon sm" title="تعديل بيانات المندوب" onClick={() => openEditDialog(driver)}><Edit3 size={14} /></button>
                      <button className="btn-icon sm" title="تغيير كلمة السر" onClick={() => openPasswordDialog(driver)}><KeyRound size={14} /></button>
                      <button className="btn-icon sm" title="حظر المندوب" onClick={() => setDialog({ type: 'block', driver })}><ShieldOff size={14} /></button>
                      <button className="btn-icon sm danger" title="حذف الحساب" onClick={() => setDialog({ type: 'delete', driver })}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {dialog?.type === 'create' && (
        <DriverFormDialog
          title="إضافة مندوب جديد"
          form={form}
          onChange={setForm}
          onCancel={closeDialog}
          onSubmit={saveNewDriver}
          submitLabel="إضافة المندوب"
        />
      )}

      {dialog?.type === 'edit' && (
        <DriverFormDialog
          title={`تعديل ${dialog.driver.name}`}
          form={form}
          onChange={setForm}
          onCancel={closeDialog}
          onSubmit={() => saveDriverEdit(dialog.driver)}
          submitLabel="حفظ التعديل"
        />
      )}

      {dialog?.type === 'password' && (
        <ConfirmDialog
          title="تغيير كلمة السر"
          description={`اكتب كلمة سر جديدة للمندوب ${dialog.driver.name}.`}
          onCancel={closeDialog}
          onConfirm={() => savePassword(dialog.driver)}
          confirmLabel="تغيير كلمة السر"
        >
          <label className="dialog-field">
            <span>كلمة السر الجديدة</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
            />
          </label>
        </ConfirmDialog>
      )}

      {dialog?.type === 'block' && (
        <ConfirmDialog
          title="تأكيد حظر المندوب"
          description={`هل تريد حظر ${dialog.driver.name}؟ لن يستطيع استلام شحنات جديدة حتى إعادة تفعيله.`}
          onCancel={closeDialog}
          onConfirm={() => blockDriver(dialog.driver)}
          confirmLabel="حظر المندوب"
          danger
        />
      )}

      {dialog?.type === 'delete' && (
        <ConfirmDialog
          title="تأكيد حذف الحساب"
          description={`هل تريد حذف حساب ${dialog.driver.name}؟ يفضل استخدام الحظر لو كان لديه شحنات أو معاملات مالية.`}
          onCancel={closeDialog}
          onConfirm={() => deleteDriver(dialog.driver)}
          confirmLabel="حذف الحساب"
          danger
        />
      )}
    </div>
  );
}

function DriverFormDialog({
  title,
  form,
  onChange,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  title: string;
  form: DriverFormState;
  onChange: (form: DriverFormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const updateField = (field: keyof DriverFormState, value: string) => {
    onChange({ ...form, [field]: value });
  };

  return (
    <DialogShell title={title} onCancel={onCancel}>
      <div className="driver-form-grid">
        <label className="dialog-field">
          <span>اسم المندوب</span>
          <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="مثال: محمد علي" />
        </label>
        <label className="dialog-field">
          <span>رقم الهاتف</span>
          <input dir="ltr" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="01000000000" />
        </label>
        <label className="dialog-field">
          <span>الزون</span>
          <input value={form.zone} onChange={(event) => updateField('zone', event.target.value)} placeholder="مدينة نصر" />
        </label>
        <label className="dialog-field">
          <span>الحد الأقصى للشحنات</span>
          <input type="number" value={form.capacity} onChange={(event) => updateField('capacity', event.target.value)} placeholder="8" />
        </label>
        <label className="dialog-field full">
          <span>اسم المستخدم / الكود</span>
          <input dir="ltr" value={form.username} onChange={(event) => updateField('username', event.target.value)} placeholder="driver-001" />
        </label>
      </div>
      <div className="dialog-actions">
        <button className="outline-btn" onClick={onCancel}>إلغاء</button>
        <button className="btn-primary" onClick={onSubmit}>{submitLabel}</button>
      </div>
    </DialogShell>
  );
}

function ConfirmDialog({
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel,
  danger,
  children,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <DialogShell title={title} onCancel={onCancel}>
      <p className="confirm-description">{description}</p>
      {children}
      <div className="dialog-actions">
        <button className="outline-btn" onClick={onCancel}>إلغاء</button>
        <button className={`btn-primary ${danger ? 'danger-action' : ''}`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </DialogShell>
  );
}

function DialogShell({ title, onCancel, children }: { title: string; onCancel: () => void; children: React.ReactNode }) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="driver-dialog glass-panel" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-header">
          <h3>{title}</h3>
          <button className="btn-icon sm" onClick={onCancel} title="إغلاق"><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
