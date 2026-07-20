import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Banknote, Clock3, Edit3, Eye, KeyRound, MapPin, Package, Plus, Search, ShieldOff, Trash2, TrendingUp, UserCheck, Users, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useDrivers } from '../application/logistics/useLogisticsData';
import { Modal, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Driver } from '../domain/logistics/entities';
import { formatAge, formatCurrency, formatDateTime } from '../utils/helpers';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { drivers, summary } = useDrivers();
  const localDrivers = drivers;
  const { execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<DriverDialog>(null);
  const [form, setForm] = useState<DriverFormState>(emptyForm);
  const [password, setPassword] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const profileId = searchParams.get('driver');
  const profile = localDrivers.find((driver) => driver.id === profileId) ?? null;

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
      capacity: String(driver.capacity),
      username: driver.userCode ?? driver.id.toLowerCase(),
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

  const saveNewDriver = async () => {
    const phone = form.phone.trim();
    if (!/^01\d{9}$/.test(phone)) { setActionMessage('رقم الهاتف يجب أن يكون ١١ رقمًا ويبدأ بـ01.'); return; }
    if (localDrivers.some((item) => item.phone === phone || item.userCode === form.username.trim())) { setActionMessage('رقم الهاتف أو اسم المستخدم مستخدم بالفعل.'); return; }
    const nextNumber = Math.max(0, ...localDrivers.map((item) => Number(item.id.replace(/\D/g, '')) || 0)) + 1;
    const newDriver: Driver = {
      id: `DRV-${String(nextNumber).padStart(3, '0')}`, name: form.name.trim() || 'مندوب جديد', phone,
      zone: form.zone.trim() || 'غير محدد', shipmentsCount: 0, pendingCash: 0, deliveredToday: 0,
      status: 'active', availability: 'available', capacity: Math.max(1, Number(form.capacity) || 8), activeLoad: 0,
      shiftEndsAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), lastLocationUpdateAt: new Date().toISOString(), successRate: 0,
      userCode: form.username.trim() || `driver${nextNumber}`, vehicleType: 'motorcycle',
    };
    const result = await execute({ type: 'driver/upsert', driver: newDriver });
    setActionMessage(result.message); showToast(result.message, result.ok ? 'success' : 'danger'); if (result.ok) closeDialog();
  };

  const saveDriverEdit = async (driver: Driver) => {
    const phone = form.phone.trim();
    if (!/^01\d{9}$/.test(phone)) { setActionMessage('رقم الهاتف غير صحيح.'); return; }
    if (localDrivers.some((item) => item.id !== driver.id && (item.phone === phone || item.userCode === form.username.trim()))) { setActionMessage('رقم الهاتف أو اسم المستخدم مستخدم بالفعل.'); return; }
    const updated: Driver = { ...driver, name: form.name.trim() || driver.name, phone, zone: form.zone.trim() || driver.zone, capacity: Math.max(driver.activeLoad, Number(form.capacity) || driver.capacity), userCode: form.username.trim() || driver.userCode };
    const result = await execute({ type: 'driver/upsert', driver: updated });
    setActionMessage(result.message); showToast(result.message, result.ok ? 'success' : 'danger'); if (result.ok) closeDialog();
  };

  const savePassword = (driver: Driver) => { setActionMessage(`تمت محاكاة طلب تغيير كلمة السر لـ ${driver.name}. سيُنقل لاحقًا إلى خدمة الهوية.`); closeDialog(); };

  const blockDriver = async (driver: Driver) => {
    const result = await execute({ type: 'driver/upsert', driver: { ...driver, status: 'off', availability: 'offline' } });
    setActionMessage(result.message); showToast(result.message, result.ok ? 'success' : 'danger'); if (result.ok) closeDialog();
  };

  const deleteDriver = async (driver: Driver) => {
    const result = await execute({ type: 'driver/delete', driverId: driver.id });
    setActionMessage(result.message); showToast(result.message, result.ok ? 'success' : 'danger'); if (result.ok) closeDialog();
  };

  const openProfile = (driver: Driver) => {
    const next = new URLSearchParams(searchParams); next.set('driver', driver.id); setSearchParams(next, { replace: true });
  };
  const closeProfile = () => {
    const next = new URLSearchParams(searchParams); next.delete('driver'); setSearchParams(next, { replace: true });
  };

  return (
    <div className="drivers-page compact-page">
      <div className="drivers-summary compact-summary">
        <div className="driver-summary-card glass-card compact-card">
          <Users size={18} className="ds-icon blue" />
          <div>
            <p className="ds-label">المناديب النشطين</p>
            <p className="ds-value">{localDrivers.filter((driver) => driver.status === 'active').length} / {localDrivers.length}</p>
          </div>
        </div>
        <div className="driver-summary-card glass-card compact-card">
          <Banknote size={18} className="ds-icon amber" />
          <div>
            <p className="ds-label">تحصيل معلق</p>
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
                placeholder="بحث باسم المندوب، الهاتف، المنطقة..."
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
                <th>المنطقة</th>
                <th>الحالة</th>
                <th>العهدة</th>
                <th>تم اليوم</th>
                <th>تحصيل معلق</th>
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
                      <button className="btn-icon sm" title="فتح ملف المندوب" aria-label="فتح ملف المندوب" onClick={() => openProfile(driver)}><Eye size={14} /></button>
                      <button className="btn-icon sm" title="تعديل بيانات المندوب" aria-label="تعديل بيانات المندوب" onClick={() => openEditDialog(driver)}><Edit3 size={14} /></button>
                      <button className="btn-icon sm" title="تغيير كلمة السر" aria-label="تغيير كلمة السر" onClick={() => openPasswordDialog(driver)}><KeyRound size={14} /></button>
                      <button className="btn-icon sm" title="حظر المندوب" aria-label="حظر المندوب" onClick={() => setDialog({ type: 'block', driver })}><ShieldOff size={14} /></button>
                      <button className="btn-icon sm danger" title="حذف الحساب" aria-label="حذف الحساب" onClick={() => setDialog({ type: 'delete', driver })}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {profile && <DriverProfile driver={profile} onClose={closeProfile} onEdit={() => { closeProfile(); openEditDialog(profile); }} />}

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

function DriverProfile({ driver, onClose, onEdit }: { driver: Driver; onClose: () => void; onEdit: () => void }) {
  const [now] = useState(() => Date.now());
  const loadRatio = driver.capacity ? Math.round((driver.activeLoad / driver.capacity) * 100) : 0;
  const alerts = [
    driver.pendingCash > 10000 ? `عهدة نقدية مرتفعة: ${formatCurrency(driver.pendingCash)}` : null,
    now - new Date(driver.lastLocationUpdateAt).getTime() > 15 * 60 * 1000 ? `آخر تحديث للموقع منذ ${formatAge(driver.lastLocationUpdateAt)}` : null,
    driver.successRate < 85 ? `نسبة النجاح منخفضة: ${driver.successRate.toLocaleString('ar-EG')}٪` : null,
    driver.activeLoad >= driver.capacity ? 'المندوب وصل للحد الأقصى للسعة' : null,
  ].filter(Boolean) as string[];
  return <Modal wide title={driver.name} description={`${driver.id} — ${driver.zone}`} onClose={onClose} footer={<><button className="outline-btn" onClick={onClose}>إغلاق</button><button className="btn-primary" onClick={onEdit}><Edit3 size={15}/> تعديل البيانات</button></>}>
    <div className="driver-profile-status"><StatusBadge label={driver.status === 'active' ? 'الحساب فعال' : 'الحساب موقوف'} tone={driver.status === 'active' ? 'success' : 'danger'}/><StatusBadge label={{ available: 'متاح', busy: 'في توصيل', break: 'استراحة', offline: 'غير متصل' }[driver.availability]} tone={driver.availability === 'available' ? 'success' : driver.availability === 'offline' ? 'neutral' : 'warning'}/><span dir="ltr">{driver.phone}</span></div>
    <div className="driver-profile-grid">
      <ProfileMetric icon={<Package size={18}/>} label="الحمولة الحالية" value={`${driver.activeLoad.toLocaleString('ar-EG')} / ${driver.capacity.toLocaleString('ar-EG')}`} detail={`${loadRatio.toLocaleString('ar-EG')}٪ من السعة`} />
      <ProfileMetric icon={<TrendingUp size={18}/>} label="نسبة النجاح" value={`${driver.successRate.toLocaleString('ar-EG')}٪`} detail={`${driver.deliveredToday.toLocaleString('ar-EG')} تسليمات اليوم`} />
      <ProfileMetric icon={<Banknote size={18}/>} label="العهدة النقدية" value={formatCurrency(driver.pendingCash)} detail="تحتاج توريد ومطابقة" />
      <ProfileMetric icon={<Clock3 size={18}/>} label="نهاية الوردية" value={formatDateTime(driver.shiftEndsAt)} detail={`الموقع: ${formatAge(driver.lastLocationUpdateAt)}`} />
    </div>
    <div className="driver-profile-sections"><section className="glass-card"><h4><MapPin size={17}/> الوضع التشغيلي</h4><p>المنطقة الأساسية: <strong>{driver.zone}</strong></p><p>آخر تحديث موقع: <strong>{formatDateTime(driver.lastLocationUpdateAt)}</strong></p><p>الشحنات المسجلة على العهدة: <strong>{driver.shipmentsCount.toLocaleString('ar-EG')}</strong></p><div className="driver-load-track"><i style={{ width: `${Math.min(100, loadRatio)}%` }}/></div></section><section className="glass-card"><h4><Activity size={17}/> تنبيهات الملف</h4>{alerts.length ? <div className="driver-alert-list">{alerts.map((alert) => <div key={alert}><AlertTriangle size={15}/><span>{alert}</span></div>)}</div> : <p className="driver-all-good">لا توجد تنبيهات حرجة على المندوب.</p>}</section></div>
  </Modal>;
}
function ProfileMetric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <div className="driver-profile-metric glass-card"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></div>; }

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
          <span>المنطقة</span>
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
          <button className="btn-icon sm" onClick={onCancel} title="تقفيل" aria-label="إغلاق"><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}


