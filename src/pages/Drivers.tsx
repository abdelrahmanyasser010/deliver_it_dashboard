import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Archive, Banknote, Clock3, Edit3, Eye, KeyRound, MapPin, MoreHorizontal, Package, Plus, Search, ShieldOff, TrendingUp, UserCheck, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useDrivers } from '../application/logistics/useLogisticsData';
import { Modal, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Driver } from '../domain/logistics/entities';
import { formatAge, formatCurrency, formatDateTime } from '../utils/helpers';
import './Drivers.css';

type DriverDialog = { type: 'create' } | { type: 'edit'; driver: Driver } | { type: 'reset'; driver: Driver } | { type: 'suspend'; driver: Driver } | { type: 'archive'; driver: Driver } | null;
interface DriverFormState { name: string; phone: string; branchName: string; serviceAreas: string[]; maxBatchShipments: string; maxOpenTasks: string; taskTypes: Array<'pickup' | 'delivery' | 'returns'>; vehicleType: 'motorcycle' | 'car' | 'van'; username: string; }
const availableAreas = ['مدينة نصر','مصر الجديدة','القاهرة الجديدة','الدقي','الهرم','الجيزة','المنصورة','الإسكندرية'];
const branches = ['فرع القاهرة','فرع الجيزة','فرع الإسكندرية','فرع الدلتا'];
const emptyForm: DriverFormState = { name: '', phone: '', branchName: branches[0], serviceAreas: ['مدينة نصر'], maxBatchShipments: '8', maxOpenTasks: '15', taskTypes: ['pickup','delivery','returns'], vehicleType: 'motorcycle', username: '' };
const operationalLabels = { off_shift: 'خارج الوردية', available: 'متاح', busy: 'مشغول', pickup_task: 'في مهمة استلام', delivery_task: 'في مهمة توصيل', offline: 'غير متصل' } as const;
const accountLabels = { active: 'فعال', suspended: 'موقوف', archived: 'مؤرشف' } as const;

export function DriversPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { drivers, summary } = useDrivers();
  const { state, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const [query, setQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [dialog, setDialog] = useState<DriverDialog>(null);
  const [form, setForm] = useState<DriverFormState>(emptyForm);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const profileId = searchParams.get('driver');
  const profile = drivers.find((driver) => driver.id === profileId) ?? null;

  const filteredDrivers = useMemo(() => drivers.filter((driver) => {
    const value = query.trim().toLocaleLowerCase('ar-EG');
    const account = driver.accountStatus ?? (driver.status === 'active' ? 'active' : 'suspended');
    const areas = driver.serviceAreas?.length ? driver.serviceAreas : [driver.zone];
    return (!value || `${driver.name} ${driver.phone} ${driver.id} ${areas.join(' ')}`.toLocaleLowerCase('ar-EG').includes(value))
      && (accountFilter === 'all' || account === accountFilter)
      && (shiftFilter === 'all' || (shiftFilter === 'on' ? driver.onShift : !driver.onShift))
      && (areaFilter === 'all' || areas.includes(areaFilter));
  }), [drivers, query, accountFilter, shiftFilter, areaFilter]);

  const liveDrivers = drivers.filter((driver) => (driver.accountStatus ?? (driver.status === 'active' ? 'active' : 'suspended')) === 'active' && driver.onShift).length;
  const activeAccounts = drivers.filter((driver) => (driver.accountStatus ?? (driver.status === 'active' ? 'active' : 'suspended')) === 'active').length;
  const currentCod = drivers.reduce((sum, driver) => sum + driver.pendingCash, 0) || summary.pendingCash;
  const deliveredToday = drivers.reduce((sum, driver) => sum + driver.deliveredToday, 0);

  const openCreate = () => { setForm(emptyForm); setDialog({ type: 'create' }); };
  const openEdit = (driver: Driver) => { setForm({ name: driver.name, phone: driver.phone, branchName: driver.branchName ?? branches[0], serviceAreas: driver.serviceAreas?.length ? driver.serviceAreas : [driver.zone], maxBatchShipments: String(driver.maxBatchShipments ?? driver.capacity), maxOpenTasks: String(driver.maxOpenTasks ?? Math.max(driver.capacity, 12)), taskTypes: driver.taskTypes?.length ? driver.taskTypes : ['pickup','delivery','returns'], vehicleType: driver.vehicleType ?? 'motorcycle', username: driver.userCode ?? '' }); setDialog({ type: 'edit', driver }); };
  const closeDialog = () => setDialog(null);
  const run = async (command: Parameters<typeof execute>[0]) => { const result = await execute(command); setActionMessage(result.message); showToast(result.message, result.ok ? 'success' : 'danger'); return result; };

  const buildDriver = (existing?: Driver): Driver => {
    const nextNumber = Math.max(0, ...drivers.map((item) => Number(item.id.replace(/\D/g, '')) || 0)) + 1;
    const id = existing?.id ?? `DRV-${String(nextNumber).padStart(3,'0')}`;
    const maxBatch = Math.max(1, Number(form.maxBatchShipments) || 8);
    const maxOpen = Math.max(maxBatch, Number(form.maxOpenTasks) || 15);
    const areas = form.serviceAreas.length ? form.serviceAreas : ['غير محدد'];
    return { ...(existing ?? { id, shipmentsCount: 0, pendingCash: 0, deliveredToday: 0, status: 'active' as const, availability: 'offline' as const, capacity: maxBatch, activeLoad: 0, shiftEndsAt: new Date(Date.now() + 8 * 3600000).toISOString(), lastLocationUpdateAt: new Date().toISOString(), successRate: 0 }), id, name: form.name.trim(), phone: form.phone.trim(), zone: areas[0], capacity: maxBatch, maxBatchShipments: maxBatch, maxOpenTasks: maxOpen, branchName: form.branchName, branchId: `BR-${branches.indexOf(form.branchName) + 1}`, serviceAreas: areas, taskTypes: form.taskTypes, vehicleType: form.vehicleType, userCode: form.username.trim() || `driver${nextNumber}`, accountStatus: existing?.accountStatus ?? 'active', operationalStatus: existing?.operationalStatus ?? 'off_shift', onShift: existing?.onShift ?? false, lastSeenAt: existing?.lastSeenAt ?? new Date().toISOString() };
  };

  const saveDriver = async (existing?: Driver) => {
    if (!form.name.trim()) { setActionMessage('اسم المندوب مطلوب.'); return; }
    if (!/^01\d{9}$/.test(form.phone.trim())) { setActionMessage('رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ01.'); return; }
    if (drivers.some((item) => item.id !== existing?.id && item.phone === form.phone.trim())) { setActionMessage('رقم الهاتف مستخدم بالفعل.'); return; }
    const result = await run({ type: 'driver/upsert', driver: buildDriver(existing) }); if (result.ok) closeDialog();
  };

  const openProfile = (driver: Driver) => { const next = new URLSearchParams(searchParams); next.set('driver', driver.id); setSearchParams(next, { replace: true }); };
  const closeProfile = () => { const next = new URLSearchParams(searchParams); next.delete('driver'); setSearchParams(next, { replace: true }); };

  return <div className="drivers-page compact-page">
    <div className="drivers-summary compact-summary">
      <button className="driver-summary-card glass-card compact-card drill-card" onClick={() => setShiftFilter('on')}><Users size={18} className="ds-icon blue"/><div><p className="ds-label">على وردية الآن</p><p className="ds-value">{liveDrivers.toLocaleString('ar-EG')} <small>من {activeAccounts.toLocaleString('ar-EG')} حسابات مفعلة</small></p></div></button>
      <button className="driver-summary-card glass-card compact-card drill-card" onClick={() => setActionMessage('اضغط على عهدة أي مندوب لعرض الشحنات التي كونت المبلغ والتوريدات المرتبطة.') }><Banknote size={18} className="ds-icon amber"/><div><p className="ds-label">عهدة COD الحالية</p><p className="ds-value">{formatCurrency(currentCod)}</p></div></button>
      <button className="driver-summary-card glass-card compact-card drill-card"><UserCheck size={18} className="ds-icon purple"/><div><p className="ds-label">تم التسليم اليوم</p><p className="ds-value">{deliveredToday.toLocaleString('ar-EG')}</p></div></button>
    </div>

    <section className="drivers-management glass-card">
      <div className="management-toolbar">
        <div>
          <h3>إدارة المناديب</h3>
        </div>
        <div className="toolbar-actions">
          <div className="management-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="الاسم، الهاتف، الكود أو المنطقة..."/></div>
          <button className="btn-primary" onClick={openCreate}><Plus size={16}/> إضافة مندوب</button>
        </div>
      </div>
      <div className="driver-filter-row"><select className="input-glass" value={accountFilter} onChange={(e)=>setAccountFilter(e.target.value)}><option value="all">كل حالات الحساب</option><option value="active">فعال</option><option value="suspended">موقوف</option><option value="archived">مؤرشف</option></select><select className="input-glass" value={shiftFilter} onChange={(e)=>setShiftFilter(e.target.value)}><option value="all">كل حالات الوردية</option><option value="on">على وردية</option><option value="off">خارج الوردية</option></select><select className="input-glass" value={areaFilter} onChange={(e)=>setAreaFilter(e.target.value)}><option value="all">كل المناطق</option>{availableAreas.map((area)=><option key={area}>{area}</option>)}</select></div>
      {actionMessage && <div className="management-feedback">{actionMessage}</div>}
      <div className="table-wrapper"><table className="data-table compact-table"><thead><tr><th>الكود</th><th>المندوب</th><th>الحساب</th><th>التشغيل</th><th>المناطق</th><th>الحمولة</th><th>تم اليوم</th><th>عهدة COD</th><th>إجراءات</th></tr></thead><tbody>{filteredDrivers.map((driver) => { const account = driver.accountStatus ?? (driver.status === 'active' ? 'active' : 'suspended'); const operational = driver.operationalStatus ?? (driver.availability === 'available' ? 'available' : driver.availability === 'busy' ? 'busy' : 'offline'); return <tr key={driver.id}><td className="tracking-num">{driver.id}</td><td><button className="tracking-link" onClick={() => openProfile(driver)}>{driver.name}</button><small className="muted-cell" dir="ltr">{driver.phone}</small></td><td><StatusBadge label={accountLabels[account]} tone={account === 'active' ? 'success' : account === 'suspended' ? 'danger' : 'neutral'}/></td><td><StatusBadge label={driver.onShift ? operationalLabels[operational] : 'خارج الوردية'} tone={driver.onShift && operational === 'available' ? 'success' : operational === 'offline' ? 'neutral' : 'warning'}/></td><td>{(driver.serviceAreas ?? [driver.zone]).slice(0,2).join('، ')}{(driver.serviceAreas?.length ?? 0) > 2 ? '…' : ''}</td><td>{driver.activeLoad.toLocaleString('ar-EG')} / {(driver.maxOpenTasks ?? driver.capacity).toLocaleString('ar-EG')}</td><td>{driver.deliveredToday.toLocaleString('ar-EG')}</td><td><button className="tracking-link amount" onClick={() => openProfile(driver)}>{formatCurrency(driver.pendingCash)}</button></td><td>
                <div className="driver-row-actions">
                  <button className="btn-icon sm" onClick={() => openProfile(driver)} title="عرض التفاصيل" aria-label={`عرض ${driver.name}`}><Eye size={15}/></button>
                  <button className="btn-icon sm" onClick={() => openEdit(driver)} title="تعديل المندوب" aria-label={`تعديل ${driver.name}`}><MoreHorizontal size={15}/></button>
                </div>
              </td></tr>; })}</tbody></table></div>
    </section>

    {profile && <DriverProfile driver={profile} shipments={(state?.shipments ?? []).filter((shipment) => shipment.driverId === profile.id)} onClose={closeProfile} onEdit={() => { closeProfile(); openEdit(profile); }} onReset={() => setDialog({ type: 'reset', driver: profile })} onSuspend={() => setDialog({ type: 'suspend', driver: profile })} onArchive={() => setDialog({ type: 'archive', driver: profile })}/>} 
    {dialog?.type === 'create' && <DriverFormDialog title="إضافة مندوب جديد" form={form} onChange={setForm} onCancel={closeDialog} onSubmit={() => void saveDriver()} submitLabel="إضافة المندوب"/>}
    {dialog?.type === 'edit' && <DriverFormDialog title={`تعديل ${dialog.driver.name}`} form={form} onChange={setForm} onCancel={closeDialog} onSubmit={() => void saveDriver(dialog.driver)} submitLabel="حفظ التعديل"/>}
    {dialog?.type === 'reset' && <ResetAccessDialog driver={dialog.driver} onCancel={closeDialog} onSubmit={async (invalidateSessions, forcePasswordChange) => { const result = await run({ type: 'driver/resetAccess', driverId: dialog.driver.id, invalidateSessions, forcePasswordChange }); if (result.ok) closeDialog(); }}/>} 
    {dialog?.type === 'suspend' && <SuspendDriverDialog driver={dialog.driver} onCancel={closeDialog} onSubmit={async (reason, handling) => { const updated: Driver = { ...dialog.driver, status: 'off', availability: 'offline', accountStatus: 'suspended', operationalStatus: 'offline', onShift: false }; const result = await run({ type: 'driver/upsert', driver: updated, actor: `إيقاف: ${reason} / ${handling}` }); if (result.ok) closeDialog(); }}/>} 
    {dialog?.type === 'archive' && <ArchiveDriverDialog driver={dialog.driver} onCancel={closeDialog} onSubmit={async (reason) => { const result = await run({ type: 'driver/archive', driverId: dialog.driver.id, reason }); if (result.ok) closeDialog(); }}/>} 
  </div>;
}

function DriverProfile({ driver, shipments, onClose, onEdit, onReset, onSuspend, onArchive }: { driver: Driver; shipments: Array<{ id:string; status:string; expectedCollection:number; collectedCash:number; remittedCash:number }>; onClose:()=>void; onEdit:()=>void; onReset:()=>void; onSuspend:()=>void; onArchive:()=>void }) {
  const [tab,setTab] = useState<'summary'|'tasks'|'finance'|'access'>('summary');
  const account = driver.accountStatus ?? (driver.status === 'active' ? 'active' : 'suspended');
  const operational = driver.operationalStatus ?? (driver.availability === 'available' ? 'available' : driver.availability === 'busy' ? 'busy' : 'offline');
  const loadRatio = (driver.maxOpenTasks ?? driver.capacity) ? Math.round(driver.activeLoad / (driver.maxOpenTasks ?? driver.capacity) * 100) : 0;
  const openTasks = shipments.filter((item) => !['delivered','partiallyDelivered','returned'].includes(item.status));
  const codRows = shipments.filter((item) => item.collectedCash > item.remittedCash);
  const alerts = [driver.pendingCash > 10000 ? `عهدة COD مرتفعة: ${formatCurrency(driver.pendingCash)}` : null, Date.now() - new Date(driver.lastLocationUpdateAt).getTime() > 15*60*1000 ? `الموقع لم يتحدث منذ ${formatAge(driver.lastLocationUpdateAt)}` : null, driver.successRate < 85 ? `نسبة النجاح منخفضة: ${driver.successRate.toLocaleString('ar-EG')}٪` : null].filter(Boolean) as string[];
  return <Modal wide title={driver.name} description={`${driver.id} — ${driver.branchName ?? driver.zone}`} onClose={onClose} footer={<><button className="outline-btn" onClick={onClose}>إغلاق</button><button className="btn-primary" onClick={onEdit}><Edit3 size={15}/> تعديل البيانات</button></>}><div className="driver-profile-status"><StatusBadge label={`الحساب: ${accountLabels[account]}`} tone={account === 'active' ? 'success' : account === 'suspended' ? 'danger' : 'neutral'}/><StatusBadge label={driver.onShift ? operationalLabels[operational] : 'خارج الوردية'} tone={driver.onShift && operational === 'available' ? 'success' : 'warning'}/><span dir="ltr">{driver.phone}</span></div><div className="merchant-profile-tabs"><button className={tab==='summary'?'active':''} onClick={()=>setTab('summary')}>الملخص</button><button className={tab==='tasks'?'active':''} onClick={()=>setTab('tasks')}>المهام ({openTasks.length.toLocaleString('ar-EG')})</button><button className={tab==='finance'?'active':''} onClick={()=>setTab('finance')}>العهدة</button><button className={tab==='access'?'active':''} onClick={()=>setTab('access')}>الوصول</button></div>{tab==='summary' && <><div className="driver-profile-grid"><ProfileMetric icon={<Package size={18}/>} label="المهام المفتوحة" value={`${driver.activeLoad.toLocaleString('ar-EG')} / ${(driver.maxOpenTasks ?? driver.capacity).toLocaleString('ar-EG')}`} detail={`${loadRatio.toLocaleString('ar-EG')}٪ من السعة`}/><ProfileMetric icon={<TrendingUp size={18}/>} label="نسبة النجاح" value={`${driver.successRate.toLocaleString('ar-EG')}٪`} detail={`${driver.deliveredToday.toLocaleString('ar-EG')} تم اليوم`}/><ProfileMetric icon={<Banknote size={18}/>} label="عهدة COD" value={formatCurrency(driver.pendingCash)} detail="تتطلب توريد ومطابقة"/><ProfileMetric icon={<Clock3 size={18}/>} label="الوردية" value={driver.onShift ? `حتى ${formatDateTime(driver.shiftEndsAt)}` : 'خارج الوردية'} detail={`آخر ظهور ${driver.lastSeenAt ? formatAge(driver.lastSeenAt) : formatAge(driver.lastLocationUpdateAt)}`}/></div><div className="driver-profile-sections"><section className="glass-card"><h4><MapPin size={17}/> النطاق والمركبة</h4><p>الفرع: <strong>{driver.branchName ?? 'غير محدد'}</strong></p><p>المناطق: <strong>{(driver.serviceAreas ?? [driver.zone]).join('، ')}</strong></p><p>المركبة: <strong>{driver.vehicleType ?? 'غير محددة'} {driver.vehicleNumber ? `· ${driver.vehicleNumber}` : ''}</strong></p><p>آخر GPS: <strong>{formatDateTime(driver.lastLocationUpdateAt)}</strong></p></section><section className="glass-card"><h4><Activity size={17}/> تنبيهات الملف</h4>{alerts.length ? <div className="driver-alert-list">{alerts.map((alert)=><div key={alert}><AlertTriangle size={15}/><span>{alert}</span></div>)}</div> : <p className="driver-all-good">لا توجد تنبيهات حرجة.</p>}</section></div></>}{tab==='tasks' && <div className="table-wrapper"><table className="data-table"><thead><tr><th>الشحنة</th><th>الحالة</th><th>التحصيل المتوقع</th></tr></thead><tbody>{openTasks.length ? openTasks.map((item)=><tr key={item.id}><td className="tracking-num">{item.id}</td><td>{item.status}</td><td>{formatCurrency(item.expectedCollection)}</td></tr>) : <tr><td colSpan={3}>لا توجد مهام مفتوحة.</td></tr>}</tbody></table></div>}{tab==='finance' && <div><div className="contact-phone-box"><span>إجمالي عهدة COD الحالية</span><strong>{formatCurrency(driver.pendingCash)}</strong></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>الشحنة</th><th>المحصل</th><th>المورد</th><th>المتبقي</th></tr></thead><tbody>{codRows.map((item)=><tr key={item.id}><td className="tracking-num">{item.id}</td><td>{formatCurrency(item.collectedCash)}</td><td>{formatCurrency(item.remittedCash)}</td><td>{formatCurrency(item.collectedCash-item.remittedCash)}</td></tr>)}</tbody></table></div></div>}{tab==='access' && <div className="driver-access-actions"><p>معرف الدخول: <strong dir="ltr">{driver.userCode ?? driver.phone}</strong></p><p>الإدارة لا تنشئ أو ترى كلمة مرور المندوب. إعادة التعيين تتم عبر خدمة الهوية.</p><div className="toolbar-actions"><button className="outline-btn" onClick={onReset}><KeyRound size={15}/> إعادة تعيين الدخول</button><button className="outline-btn" onClick={onSuspend}><ShieldOff size={15}/> إيقاف المندوب</button><button className="outline-btn danger-link" onClick={onArchive}><Archive size={15}/> أرشفة</button></div></div>}</Modal>;
}

function DriverFormDialog({ title, form, onChange, onCancel, onSubmit, submitLabel }: { title:string; form:DriverFormState; onChange:(form:DriverFormState)=>void; onCancel:()=>void; onSubmit:()=>void; submitLabel:string }) {
  const update = <K extends keyof DriverFormState>(field: K, value: DriverFormState[K]) => onChange({ ...form, [field]: value });
  const toggleArea = (area:string) => update('serviceAreas', form.serviceAreas.includes(area) ? form.serviceAreas.filter((item)=>item!==area) : [...form.serviceAreas, area]);
  const toggleTask = (task:'pickup'|'delivery'|'returns') => update('taskTypes', form.taskTypes.includes(task) ? form.taskTypes.filter((item)=>item!==task) : [...form.taskTypes,task]);

  return <Modal wide title={title} description="تحديد البيانات التشغيلية ونطاق العمل للمندوب" onClose={onCancel} footer={<>
    <button className="outline-btn" onClick={onCancel}>إلغاء</button>
    <button className="btn-primary" onClick={onSubmit} disabled={!form.name.trim() || !form.phone.trim() || !form.serviceAreas.length || !form.taskTypes.length}>{submitLabel}</button>
  </>}>
    <div className="admin-form-grid">
      <label className="form-field">
        <span>اسم المندوب الكامل</span>
        <input className="input-glass" value={form.name} onChange={(e)=>update('name',e.target.value)} placeholder="مثال: محمد علي"/>
      </label>
      <label className="form-field">
        <span>رقم الهاتف (تسجيل الدخول)</span>
        <input className="input-glass" dir="ltr" value={form.phone} onChange={(e)=>update('phone',e.target.value)} placeholder="010xxxxxxxx"/>
      </label>
      <label className="form-field">
        <span>نوع المركبة</span>
        <select className="input-glass" value={form.vehicleType} onChange={(e)=>update('vehicleType',e.target.value as DriverFormState['vehicleType'])}>
          <option value="motorcycle">موتوسيكل</option>
          <option value="car">سيارة</option>
          <option value="van">فان / نقل</option>
        </select>
      </label>
      <label className="form-field">
        <span>أقصى عدد مهام مفتوحة</span>
        <input className="input-glass" type="number" min="1" max="100" value={form.maxOpenTasks} onChange={(e)=>update('maxOpenTasks',e.target.value)}/>
      </label>

      <div className="form-field full">
        <span>مناطق العمل المخصصة</span>
        <div className="chips-selector-grid">
          {availableAreas.map((area)=>(
            <button
              type="button"
              key={area}
              className={`chip-toggle ${form.serviceAreas.includes(area) ? 'active' : ''}`}
              onClick={()=>toggleArea(area)}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      <div className="form-field full">
        <span>أنواع المهام المسموحة</span>
        <div className="chips-selector-grid">
          <button type="button" className={`chip-toggle ${form.taskTypes.includes('pickup') ? 'active' : ''}`} onClick={()=>toggleTask('pickup')}>
            استلام من التجار (Pickup)
          </button>
          <button type="button" className={`chip-toggle ${form.taskTypes.includes('delivery') ? 'active' : ''}`} onClick={()=>toggleTask('delivery')}>
            توصيل للعملاء (Delivery)
          </button>
          <button type="button" className={`chip-toggle ${form.taskTypes.includes('returns') ? 'active' : ''}`} onClick={()=>toggleTask('returns')}>
            استرجاع مرتجعات (Returns)
          </button>
        </div>
      </div>
    </div>
  </Modal>;
}

function ResetAccessDialog({ driver, onCancel, onSubmit }: { driver:Driver; onCancel:()=>void; onSubmit:(invalidate:boolean, force:boolean)=>void }) {
  const [invalidate,setInvalidate]=useState(true);
  const [force,setForce]=useState(true);
  return <Modal title="إعادة تعيين الدخول" description={`إعادة ضبط جلسات وتسجيل الدخول لـ ${driver.name}`} onClose={onCancel} footer={<>
    <button className="outline-btn" onClick={onCancel}>إلغاء</button>
    <button className="btn-primary" onClick={()=>onSubmit(invalidate,force)}>إرسال إعادة التعيين</button>
  </>}>
    <p className="confirm-description">سيتم إرسال كود تسجيل دخول جديد إلى {driver.name}.</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
      <label className="setting-toggle">
        <span><strong>تسجيل الخروج من جميع الأجهزة</strong><small>إلغاء أي جلسة نشطة حاليًا لتطبيق المندوب.</small></span>
        <input type="checkbox" checked={invalidate} onChange={(e)=>setInvalidate(e.target.checked)}/>
      </label>
      <label className="setting-toggle">
        <span><strong>إلزام تغيير كلمة المرور</strong><small>يُطلب منه تعيين كلمة سر جديدة عند أول فتح.</small></span>
        <input type="checkbox" checked={force} onChange={(e)=>setForce(e.target.checked)}/>
      </label>
    </div>
  </Modal>;
}

function SuspendDriverDialog({ driver,onCancel,onSubmit }:{driver:Driver;onCancel:()=>void;onSubmit:(reason:string,handling:string)=>void}) {
  const [reason,setReason]=useState('مخالفة تشغيلية');
  const [handling,setHandling]=useState('finish-current');
  return <Modal title="إيقاف المندوب مؤقتًا" description={driver.name} onClose={onCancel} footer={<>
    <button className="outline-btn" onClick={onCancel}>إلغاء</button>
    <button className="btn-primary danger-action" onClick={()=>onSubmit(reason,handling)} disabled={!reason.trim()}>تأكيد الإيقاف</button>
  </>}>
    <div className="suspend-impact">
      <AlertTriangle size={18}/>
      <div>
        <strong>{driver.name}</strong>
        <p>{driver.activeLoad.toLocaleString('ar-EG')} مهام مفتوحة · {formatCurrency(driver.pendingCash)} عهدة COD · {driver.onShift ? 'وردية مفتوحة' : 'خارج الوردية'}</p>
      </div>
    </div>
    <div className="admin-form-grid" style={{ marginTop: '1rem' }}>
      <label className="form-field full">
        <span>التعامل مع المهام الحالية</span>
        <select className="input-glass" value={handling} onChange={(e)=>setHandling(e.target.value)}>
          <option value="finish-current">يكمل الحالية ويُمنع من مهام جديدة</option>
          <option value="reassign">سحب المهام وإعادة إسنادها</option>
          <option value="immediate">إيقاف فوري</option>
        </select>
      </label>
      <label className="form-field full">
        <span>سبب الإيقاف</span>
        <textarea className="input-glass" rows={3} value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="أدخل سبب إيقاف الحساب..."/>
      </label>
    </div>
  </Modal>;
}

function ArchiveDriverDialog({ driver,onCancel,onSubmit }:{driver:Driver;onCancel:()=>void;onSubmit:(reason:string)=>void}) {
  const [reason,setReason]=useState('انتهاء التعاقد');
  return <Modal title="أرشفة المندوب" description={driver.name} onClose={onCancel} footer={<>
    <button className="outline-btn" onClick={onCancel}>إلغاء</button>
    <button className="btn-primary danger-action" onClick={()=>onSubmit(reason)} disabled={!reason.trim()}>أرشفة {driver.name}</button>
  </>}>
    <p className="confirm-description">الأرشفة تحفظ كل بيانات وتاريخ المندوب مع إيقاف الحساب نهائيًا.</p>
    <label className="form-field full" style={{ marginTop: '1rem' }}>
      <span>سبب الأرشفة</span>
      <textarea className="input-glass" rows={3} value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="أدخل سبب الأرشفة..."/>
    </label>
  </Modal>;
}

function ProfileMetric({ icon,label,value,detail }:{icon:React.ReactNode;label:string;value:string;detail:string}) {
  return <div className="driver-profile-metric glass-card"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></div>;
}

