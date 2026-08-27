import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Archive, Banknote, Clock3, Edit3, Eye, KeyRound, MapPin, MessageCircle, MoreHorizontal, Package, Plus, Search, ShieldOff, TrendingUp, UserCheck, Users, Wallet } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDrivers } from '../application/logistics/useLogisticsData';
import { Modal, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { friendlyApiMessage } from '../infrastructure/api/errors';
import { loadBranches, loadZones, type BranchReference, type ZoneReference } from '../infrastructure/api/masterData';
import type { Driver } from '../domain/logistics/entities';
import { formatAge, formatCurrency, formatDateTime } from '../utils/helpers';
import './Drivers.css';

type DriverDialog =
  | { type: 'create' }
  | { type: 'edit'; driver: Driver }
  | { type: 'reset'; driver: Driver }
  | { type: 'suspend'; driver: Driver }
  | { type: 'reactivate'; driver: Driver }
  | { type: 'archive'; driver: Driver }
  | { type: 'remit'; driver: Driver }
  | null;
type SuspendPolicy = 'complete_current_tasks' | 'withdraw_and_reassign' | 'immediate_stop';
interface DriverFormState {
  name: string;
  phone: string;
  code: string;
  branchId: string;
  primaryZoneId: string;
  serviceAreaIds: string[];
  maxBatchShipments: string;
  maxOpenTasks: string;
  taskTypes: Array<'pickup' | 'delivery' | 'returns'>;
}
const emptyForm: DriverFormState = { name: '', phone: '', code: '', branchId: '', primaryZoneId: '', serviceAreaIds: [], maxBatchShipments: '8', maxOpenTasks: '15', taskTypes: ['pickup','delivery','returns'] };
const operationalLabels = { off_shift: 'خارج الوردية', available: 'متاح', busy: 'مشغول', pickup_task: 'في مهمة استلام', delivery_task: 'في مهمة توصيل', offline: 'غير متصل' } as const;
const accountLabels = { active: 'فعال', restricted: 'مقيّد حتى إنهاء المهام', suspended: 'موقوف', archived: 'مؤرشف' } as const;

export function DriversPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { drivers, summary } = useDrivers();
  const { state, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const { user, can } = useAuth();
  const [query, setQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [dialog, setDialog] = useState<DriverDialog>(null);
  const [menuDriverId, setMenuDriverId] = useState<string | null>(null);
  const [form, setForm] = useState<DriverFormState>(emptyForm);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchReference[]>([]);
  const [zones, setZones] = useState<ZoneReference[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const profileId = searchParams.get('driver');
  const profile = drivers.find((driver) => driver.id === profileId) ?? null;
  const [profileTab, setProfileTab] = useState<'summary' | 'tasks' | 'finance' | 'access'>('summary');

  const currentBranchId = user?.membership?.branch_id ?? '';
  const canCreateDriver = can('drivers.create');
  const canUpdateDriver = can('drivers.update');
  const canSuspendDriver = can('drivers.suspend');
  const canArchiveDriver = can('drivers.archive');
  const canResetDriverAccess = can('drivers.reset_access');
  const canReadBranches = can('branches.manage');
  const canReadZones = can('zones.manage');

  useEffect(() => {
    let active = true;
    setReferenceLoading(true);
    setReferenceError(null);
    Promise.all([
      canReadBranches ? loadBranches() : Promise.resolve([]),
      canReadZones ? loadZones() : Promise.reject(new Error('لا توجد صلاحية لقراءة المناطق المطلوبة لإدارة المناديب.')),
    ]).then(([branchRows, zoneRows]) => {
      if (!active) return;
      setBranches(branchRows);
      setZones(zoneRows);
    }).catch((error) => {
      if (!active) return;
      setReferenceError(error instanceof Error && !(error as { status?: unknown }).status ? error.message : friendlyApiMessage(error));
      setZones([]);
    }).finally(() => { if (active) setReferenceLoading(false); });
    return () => { active = false; };
  }, [canReadBranches, canReadZones]);

  const branchOptions = useMemo(() => {
    const map = new Map(branches.map((branch) => [branch.id, branch]));
    for (const driver of drivers) {
      if (driver.branchId && !map.has(driver.branchId)) map.set(driver.branchId, { id: driver.branchId, name: driver.branchName || driver.branchId, status: 'active' });
    }
    if (currentBranchId && !map.has(currentBranchId)) map.set(currentBranchId, { id: currentBranchId, name: 'فرع حسابك', status: 'active' });
    return [...map.values()];
  }, [branches, drivers, currentBranchId]);
  const zoneNameById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);
  const branchNameById = useMemo(() => new Map(branchOptions.map((branch) => [branch.id, branch.name])), [branchOptions]);
  const areaNames = useCallback((driver: Driver) => {
    const ids = driver.serviceAreaIds?.length ? driver.serviceAreaIds : (driver.zoneId ? [driver.zoneId] : []);
    if (ids.length) return ids.map((id) => zoneNameById.get(id) ?? (id === driver.zoneId ? driver.zone : id));
    return driver.zone ? [driver.zone] : [];
  }, [zoneNameById]);

  const filteredDrivers = useMemo(() => drivers.filter((driver) => {
    const value = query.trim().toLocaleLowerCase('ar-EG');
    const account = driver.accountStatus ?? (driver.status === 'active' ? 'active' : 'suspended');
    const areas = areaNames(driver);
    return (!value || `${driver.name} ${driver.phone} ${driver.id} ${areas.join(' ')}`.toLocaleLowerCase('ar-EG').includes(value))
      && (accountFilter === 'all' || account === accountFilter)
      && (shiftFilter === 'all' || (shiftFilter === 'on' ? driver.onShift : !driver.onShift))
      && (areaFilter === 'all' || (driver.serviceAreaIds ?? [driver.zoneId]).filter(Boolean).includes(areaFilter));
  }), [drivers, query, accountFilter, shiftFilter, areaFilter, areaNames]);

  const liveDrivers = drivers.filter((driver) => (driver.accountStatus ?? (driver.status === 'active' ? 'active' : 'suspended')) === 'active' && driver.onShift).length;
  const activeAccounts = drivers.filter((driver) => (driver.accountStatus ?? (driver.status === 'active' ? 'active' : 'suspended')) === 'active').length;
  const currentCod = drivers.reduce((sum, driver) => sum + driver.pendingCash, 0) || summary.pendingCash;
  const deliveredToday = drivers.reduce((sum, driver) => sum + driver.deliveredToday, 0);

  const defaultBranchId = currentBranchId || branchOptions[0]?.id || '';
  const zonesForBranch = (branchId: string) => zones.filter((zone) => !branchId || !zone.branch_id || zone.branch_id === branchId);

  const openCreate = () => {
    if (!canCreateDriver) { showToast('لا تملك صلاحية إضافة مندوب.', 'danger'); return; }
    if (referenceLoading) { showToast('جارٍ تحميل الفروع والمناطق من الخادم.', 'info'); return; }
    if (referenceError || !zones.length) { showToast(referenceError ?? 'لا توجد مناطق نشطة متاحة على الخادم.', 'danger'); return; }
    const branchId = defaultBranchId;
    const firstZone = zonesForBranch(branchId)[0] ?? zones[0];
    setForm({ ...emptyForm, branchId, primaryZoneId: firstZone?.id ?? '', serviceAreaIds: firstZone ? [firstZone.id] : [] });
    setDialog({ type: 'create' });
  };
  const openEdit = (driver: Driver) => {
    if (!canUpdateDriver) { showToast('لا تملك صلاحية تعديل بيانات المندوب.', 'danger'); return; }
    if (referenceLoading) { showToast('جارٍ تحميل الفروع والمناطق من الخادم.', 'info'); return; }
    if (referenceError || !zones.length) { showToast(referenceError ?? 'تعذر تحميل المناطق من الخادم.', 'danger'); return; }
    const serviceAreaIds = driver.serviceAreaIds?.length ? driver.serviceAreaIds : (driver.zoneId ? [driver.zoneId] : []);
    const primaryZoneId = driver.zoneId || serviceAreaIds[0] || '';
    setForm({
      name: driver.name,
      phone: driver.phone,
      code: driver.userCode ?? '',
      branchId: driver.branchId ?? defaultBranchId,
      primaryZoneId,
      serviceAreaIds: serviceAreaIds.length ? serviceAreaIds : (zones[0] ? [zones[0].id] : []),
      maxBatchShipments: String(driver.maxBatchShipments ?? driver.capacity),
      maxOpenTasks: String(driver.maxOpenTasks ?? Math.max(driver.capacity, 12)),
      taskTypes: driver.taskTypes?.length ? driver.taskTypes : ['pickup','delivery','returns'],
    });
    setDialog({ type: 'edit', driver });
  };
  const closeDialog = () => setDialog(null);
  const run = async (command: Parameters<typeof execute>[0]) => { const result = await execute(command); setActionMessage(result.message); showToast(result.message, result.ok ? 'success' : 'danger'); return result; };

  const buildDriver = (existing?: Driver): Driver => {
    const maxBatch = Math.max(1, Number(form.maxBatchShipments) || 8);
    const maxOpen = Math.max(maxBatch, Number(form.maxOpenTasks) || 15);
    const primaryZone = zones.find((zone) => zone.id === form.primaryZoneId);
    const selectedAreaIds = form.serviceAreaIds.includes(form.primaryZoneId) ? form.serviceAreaIds : [form.primaryZoneId, ...form.serviceAreaIds].filter(Boolean);
    const id = existing?.id ?? 'new-driver';
    return {
      ...(existing ?? { id, shipmentsCount: 0, pendingCash: 0, deliveredToday: 0, status: 'active' as const, availability: 'offline' as const, capacity: maxBatch, activeLoad: 0, shiftEndsAt: '', lastLocationUpdateAt: '', successRate: 0 }),
      id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      userCode: form.code.trim(),
      branchId: form.branchId || undefined,
      branchName: form.branchId ? (branchNameById.get(form.branchId) ?? existing?.branchName) : undefined,
      zoneId: form.primaryZoneId,
      zone: primaryZone?.name ?? existing?.zone ?? form.primaryZoneId,
      serviceAreaIds: selectedAreaIds,
      capacity: maxBatch,
      maxBatchShipments: maxBatch,
      maxOpenTasks: maxOpen,
      taskTypes: form.taskTypes,
      accountStatus: existing?.accountStatus ?? 'active',
      operationalStatus: existing?.operationalStatus ?? 'offline',
      onShift: existing?.onShift ?? false,
    };
  };

  const saveDriver = async (existing?: Driver) => {
    if (!form.name.trim()) { setActionMessage('اسم المندوب مطلوب.'); return; }
    if (!form.code.trim()) { setActionMessage('كود المندوب مطلوب.'); return; }
    if (!/^01\d{9}$/.test(form.phone.trim())) { setActionMessage('رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ01.'); return; }
    if (drivers.some((item) => item.id !== existing?.id && item.phone === form.phone.trim())) { setActionMessage('رقم الهاتف مستخدم بالفعل.'); return; }
    if (!form.primaryZoneId || !form.serviceAreaIds.length) { setActionMessage('اختر المنطقة الرئيسية ومنطقة عمل واحدة على الأقل.'); return; }
    if (!form.taskTypes.length) { setActionMessage('اختر نوع مهمة واحدًا على الأقل.'); return; }
    const maxBatch = Number(form.maxBatchShipments);
    const maxOpen = Number(form.maxOpenTasks);
    if (!Number.isFinite(maxBatch) || maxBatch < 1 || !Number.isFinite(maxOpen) || maxOpen < maxBatch) { setActionMessage('حد المهام المفتوحة يجب أن يساوي أو يزيد عن حجم الدفعة.'); return; }
    const result = await run({ type: 'driver/upsert', driver: buildDriver(existing) }); if (result.ok) closeDialog();
  };

  const openProfile = (driver: Driver, tab: 'summary' | 'tasks' | 'finance' | 'access' = 'summary') => {
    setProfileTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('driver', driver.id);
    setSearchParams(next, { replace: true });
    setMenuDriverId(null);
  };
  const closeProfile = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('driver');
    setSearchParams(next, { replace: true });
  };

  const openConversation = (driver: Driver) => {
    const room = state?.chatRooms.find((item) => item.category === 'driver' && item.name === driver.name);
    if (room) navigate(`/chat?room=${room.id}`);
    else {
      navigate('/chat');
      showToast(`لا توجد محادثة نشطة مع المندوب ${driver.name}.`, 'info');
    }
    setMenuDriverId(null);
  };

  return <div className="drivers-page compact-page">
    <div className="drivers-summary compact-summary">
      <button className="driver-summary-card glass-card compact-card drill-card" onClick={() => setShiftFilter('on')}><Users size={18} className="ds-icon blue"/><div><p className="ds-label">على وردية الآن</p><p className="ds-value">{liveDrivers.toLocaleString('ar-EG')} <small>من {activeAccounts.toLocaleString('ar-EG')} حسابات مفعلة</small></p></div></button>
      <button className="driver-summary-card glass-card compact-card drill-card" onClick={() => setActionMessage('اضغط على تحصيل أي مندوب لعرض الشحنات التي كونت المبلغ والتوريدات المرتبطة.') }><Banknote size={18} className="ds-icon amber"/><div><p className="ds-label">تحصيل مع المناديب</p><p className="ds-value">{formatCurrency(currentCod)}</p></div></button>
      <button className="driver-summary-card glass-card compact-card drill-card"><UserCheck size={18} className="ds-icon purple"/><div><p className="ds-label">تم التسليم اليوم</p><p className="ds-value">{deliveredToday.toLocaleString('ar-EG')}</p></div></button>
    </div>

    <section className="drivers-management glass-card">
      <div className="management-toolbar">
        <div>
          <h3>إدارة المناديب</h3>
        </div>
        <div className="toolbar-actions">
          <div className="management-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="الاسم، الهاتف، الكود أو المنطقة..."/></div>
          {canCreateDriver && <button className="btn-primary" onClick={openCreate} disabled={referenceLoading || Boolean(referenceError) || !zones.length} title={referenceError ?? undefined}><Plus size={16}/> إضافة مندوب</button>}
        </div>
      </div>
      <div className="driver-filter-row"><select className="input-glass" value={accountFilter} onChange={(e)=>setAccountFilter(e.target.value)}><option value="all">كل حالات الحساب</option><option value="active">فعال</option><option value="restricted">مقيّد</option><option value="suspended">موقوف</option><option value="archived">مؤرشف</option></select><select className="input-glass" value={shiftFilter} onChange={(e)=>setShiftFilter(e.target.value)}><option value="all">كل حالات الوردية</option><option value="on">على وردية</option><option value="off">خارج الوردية</option></select><select className="input-glass" value={areaFilter} onChange={(e)=>setAreaFilter(e.target.value)} disabled={referenceLoading}><option value="all">كل المناطق</option>{zones.map((zone)=><option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></div>
      {referenceError && <div className="management-feedback">تعذر تحميل بيانات المناطق/الفروع: {referenceError}</div>}
      {actionMessage && <div className="management-feedback">{actionMessage}</div>}
      <div className="table-wrapper"><table className="data-table compact-table"><thead><tr><th>الكود</th><th>المندوب</th><th>الحساب</th><th>التشغيل</th><th>المناطق</th><th>الحمولة</th><th>تم اليوم</th><th>التحصيل معه</th><th>إجراءات</th></tr></thead><tbody>{filteredDrivers.map((driver) => { const account = driver.accountStatus ?? (driver.status === 'active' ? 'active' : 'suspended'); const operational = driver.operationalStatus ?? (driver.availability === 'available' ? 'available' : driver.availability === 'busy' ? 'busy' : 'offline'); const names = areaNames(driver); return <tr key={driver.id}><td className="tracking-num">{driver.userCode || driver.id}</td><td><button className="tracking-link" onClick={() => openProfile(driver)}>{driver.name}</button><small className="muted-cell" dir="ltr">{driver.phone}</small></td><td><StatusBadge label={accountLabels[account]} tone={account === 'active' ? 'success' : account === 'restricted' ? 'warning' : account === 'suspended' ? 'danger' : 'neutral'}/></td><td><StatusBadge label={driver.onShift ? operationalLabels[operational] : 'خارج الوردية'} tone={driver.onShift && operational === 'available' ? 'success' : operational === 'offline' ? 'neutral' : 'warning'}/></td><td>{names.slice(0,2).join('، ') || 'غير محدد'}{names.length > 2 ? '…' : ''}</td><td>{driver.activeLoad.toLocaleString('ar-EG')} / {(driver.maxOpenTasks ?? driver.capacity).toLocaleString('ar-EG')}</td><td>{driver.deliveredToday.toLocaleString('ar-EG')}</td><td><button className="tracking-link amount" onClick={() => openProfile(driver)}>{formatCurrency(driver.pendingCash)}</button></td><td>
                <div className="driver-row-actions">
                  <button className="btn-icon sm" onClick={() => openProfile(driver)} title="عرض التفاصيل" aria-label={`عرض ${driver.name}`}><Eye size={15}/></button>
                  <div className="merchant-more-wrap">
                    <button className="btn-icon sm" onClick={() => setMenuDriverId(menuDriverId === driver.id ? null : driver.id)} title="خيارات إضافية" aria-label={`المزيد لـ ${driver.name}`}><MoreHorizontal size={15}/></button>
                    {menuDriverId === driver.id && (
                      <div className="merchant-row-menu glass-panel">
                        {canUpdateDriver && account !== 'archived' && <button onClick={() => { openEdit(driver); setMenuDriverId(null); }}><Edit3 size={14}/> تعديل البيانات</button>}
                        <button onClick={() => openProfile(driver, 'tasks')}><Package size={14}/> المهام والشحنات</button>
                        <button onClick={() => openProfile(driver, 'finance')}><Banknote size={14}/> التحصيل والتوريدات</button>
                        <button onClick={() => openConversation(driver)}><MessageCircle size={14}/> فتح المحادثة</button>
                        {canSuspendDriver && account === 'active' && <button onClick={() => { setDialog({ type: 'suspend', driver }); setMenuDriverId(null); }}><ShieldOff size={14}/> إيقاف المندوب</button>}
                        {canSuspendDriver && (account === 'suspended' || account === 'restricted') && <button onClick={() => { setDialog({ type: 'reactivate', driver }); setMenuDriverId(null); }}><UserCheck size={14}/> إعادة تفعيل</button>}
                        {canArchiveDriver && account !== 'archived' && <button onClick={() => { setDialog({ type: 'archive', driver }); setMenuDriverId(null); }}><Archive size={14}/> أرشفة</button>}
                      </div>
                    )}
                  </div>
                </div>
              </td></tr>; })}</tbody></table></div>
    </section>

    {profile && (
      <DriverProfile
        driver={profile}
        initialTab={profileTab}
        areaNames={areaNames(profile)}
        branchName={profile.branchId ? (branchNameById.get(profile.branchId) ?? profile.branchName) : profile.branchName}
        shipments={(state?.shipments ?? []).filter((shipment) => shipment.driverId === profile.id)}
        onClose={closeProfile}
        onEdit={canUpdateDriver && profile.accountStatus !== 'archived' ? () => { closeProfile(); openEdit(profile); } : undefined}
        onRemit={() => setDialog({ type: 'remit', driver: profile })}
        onReset={canResetDriverAccess && profile.accountStatus !== 'archived' ? () => setDialog({ type: 'reset', driver: profile }) : undefined}
        onSuspend={canSuspendDriver && profile.accountStatus === 'active' ? () => setDialog({ type: 'suspend', driver: profile }) : undefined}
        onReactivate={canSuspendDriver && (profile.accountStatus === 'suspended' || profile.accountStatus === 'restricted') ? () => setDialog({ type: 'reactivate', driver: profile }) : undefined}
        onArchive={canArchiveDriver && profile.accountStatus !== 'archived' ? () => setDialog({ type: 'archive', driver: profile }) : undefined}
      />
    )}
    {dialog?.type === 'create' && <DriverFormDialog title="إضافة مندوب جديد" form={form} branches={branchOptions} zones={zones} canSelectBranch={canReadBranches} onChange={setForm} onCancel={closeDialog} onSubmit={() => void saveDriver()} submitLabel="إضافة المندوب"/>}
    {dialog?.type === 'edit' && <DriverFormDialog title={`تعديل ${dialog.driver.name}`} form={form} branches={branchOptions} zones={zones} canSelectBranch={canReadBranches} onChange={setForm} onCancel={closeDialog} onSubmit={() => void saveDriver(dialog.driver)} submitLabel="حفظ التعديل"/>}
    {dialog?.type === 'reset' && <ResetAccessDialog driver={dialog.driver} onCancel={closeDialog} onSubmit={async (invalidateSessions, forcePasswordChange) => { const result = await run({ type: 'driver/resetAccess', driverId: dialog.driver.id, invalidateSessions, forcePasswordChange }); if (result.ok) closeDialog(); }}/>} 
    {dialog?.type === 'suspend' && <SuspendDriverDialog driver={dialog.driver} onCancel={closeDialog} onSubmit={async (reason, policy) => { const result = await run({ type: 'driver/suspend', driverId: dialog.driver.id, reason, policy }); if (result.ok) closeDialog(); }}/>} 
    {dialog?.type === 'reactivate' && <ReactivateDriverDialog driver={dialog.driver} onCancel={closeDialog} onSubmit={async (reason) => { const result = await run({ type: 'driver/reactivate', driverId: dialog.driver.id, reason }); if (result.ok) closeDialog(); }}/>} 
    {dialog?.type === 'archive' && <ArchiveDriverDialog driver={dialog.driver} onCancel={closeDialog} onSubmit={async (reason) => { const result = await run({ type: 'driver/archive', driverId: dialog.driver.id, reason }); if (result.ok) closeDialog(); }}/>} 
    {dialog?.type === 'remit' && (
      <RemitDriverDialog
        driver={dialog.driver}
        shipments={(state?.shipments ?? []).filter((shipment) => shipment.driverId === dialog.driver.id)}
        onCancel={closeDialog}
        onSubmit={async (remits) => {
          for (const remit of remits) {
            await run({
              type: 'finance/reconcileShipment',
              shipmentId: remit.shipmentId,
              remittedCash: remit.remittedCash,
              note: remit.note,
            });
          }
          closeDialog();
          showToast(`تم توريد وتقفيل تحصيل ${dialog.driver.name} بنجاح!`, 'success');
        }}
      />
    )} 
  </div>;
}

function DriverProfile({ driver, shipments, areaNames, branchName, initialTab = 'summary', onClose, onEdit, onRemit, onReset, onSuspend, onReactivate, onArchive }: {
  driver: Driver;
  shipments: Array<{ id:string; status:string; expectedCollection:number; collectedCash:number; remittedCash:number }>;
  areaNames: string[];
  branchName?: string;
  initialTab?: 'summary'|'tasks'|'finance'|'access';
  onClose:()=>void;
  onEdit?:()=>void;
  onRemit?:()=>void;
  onReset?:()=>void;
  onSuspend?:()=>void;
  onReactivate?:()=>void;
  onArchive?:()=>void;
}) {
  const [tab,setTab] = useState<'summary'|'tasks'|'finance'|'access'>(initialTab);
  const account = driver.accountStatus ?? (driver.status === 'active' ? 'active' : 'suspended');
  const operational = driver.operationalStatus ?? (driver.availability === 'available' ? 'available' : driver.availability === 'busy' ? 'busy' : 'offline');
  const loadRatio = (driver.maxOpenTasks ?? driver.capacity) ? Math.round(driver.activeLoad / (driver.maxOpenTasks ?? driver.capacity) * 100) : 0;
  const openTasks = shipments.filter((item) => !['delivered','partiallyDelivered','returned'].includes(item.status));
  const codRows = shipments.filter((item) => item.collectedCash > item.remittedCash);
  const locationAge = driver.lastLocationUpdateAt ? formatAge(driver.lastLocationUpdateAt) : 'غير متاح';
  const lastSeenAge = driver.lastSeenAt ? formatAge(driver.lastSeenAt) : locationAge;
  const alerts = [
    driver.pendingCash > 10000 ? `التحصيل مع المندوب مرتفع: ${formatCurrency(driver.pendingCash)}` : null,
    driver.lastLocationUpdateAt && Date.now() - new Date(driver.lastLocationUpdateAt).getTime() > 15*60*1000 ? `الموقع لم يتحدث منذ ${locationAge}` : null,
    driver.successRate < 85 ? `نسبة النجاح منخفضة: ${driver.successRate.toLocaleString('ar-EG')}٪` : null,
  ].filter(Boolean) as string[];
  const accountTone = account === 'active' ? 'success' : account === 'restricted' ? 'warning' : account === 'suspended' ? 'danger' : 'neutral';

  return <Modal wide title={driver.name} description={`${driver.userCode || driver.id} — ${branchName ?? driver.zone}`} onClose={onClose} footer={<>
    <button className="outline-btn" onClick={onClose}>إغلاق</button>
    {onEdit && <button className="btn-primary" onClick={onEdit}><Edit3 size={15}/> تعديل البيانات</button>}
  </>}>
    <div className="driver-profile-status">
      <StatusBadge label={`الحساب: ${accountLabels[account]}`} tone={accountTone}/>
      <StatusBadge label={driver.onShift ? operationalLabels[operational] : 'خارج الوردية'} tone={driver.onShift && operational === 'available' ? 'success' : operational === 'offline' ? 'neutral' : 'warning'}/>
      <span dir="ltr">{driver.phone}</span>
    </div>
    <div className="merchant-profile-tabs">
      <button className={tab==='summary'?'active':''} onClick={()=>setTab('summary')}>الملخص</button>
      <button className={tab==='tasks'?'active':''} onClick={()=>setTab('tasks')}>المهام ({openTasks.length.toLocaleString('ar-EG')})</button>
      <button className={tab==='finance'?'active':''} onClick={()=>setTab('finance')}>التحصيل والتوريد</button>
      <button className={tab==='access'?'active':''} onClick={()=>setTab('access')}>الوصول</button>
    </div>
    {tab==='summary' && <>
      <div className="driver-profile-grid">
        <ProfileMetric icon={<Package size={18}/>} label="المهام المفتوحة" value={`${driver.activeLoad.toLocaleString('ar-EG')} / ${(driver.maxOpenTasks ?? driver.capacity).toLocaleString('ar-EG')}`} detail={`${loadRatio.toLocaleString('ar-EG')}٪ من السعة`}/>
        <ProfileMetric icon={<TrendingUp size={18}/>} label="نسبة النجاح" value={`${driver.successRate.toLocaleString('ar-EG')}٪`} detail={`${driver.deliveredToday.toLocaleString('ar-EG')} تم اليوم`}/>
        <ProfileMetric icon={<Banknote size={18}/>} label="التحصيل معه" value={formatCurrency(driver.pendingCash)} detail="يتطلب توريد ومطابقة"/>
        <ProfileMetric icon={<Clock3 size={18}/>} label="الوردية" value={driver.onShift ? (driver.shiftEndsAt ? `حتى ${formatDateTime(driver.shiftEndsAt)}` : 'وردية مفتوحة') : 'خارج الوردية'} detail={`آخر ظهور ${lastSeenAge}`}/>
      </div>
      <div className="driver-profile-sections">
        <section className="glass-card"><h4><MapPin size={17}/> النطاق والمركبة</h4><p>الفرع: <strong>{branchName ?? 'غير محدد'}</strong></p><p>المناطق: <strong>{areaNames.join('، ') || 'غير محددة'}</strong></p><p>المركبة: <strong>{driver.vehicleType ?? 'غير محددة'} {driver.vehicleNumber ? `· ${driver.vehicleNumber}` : ''}</strong></p><p>آخر GPS: <strong>{driver.lastLocationUpdateAt ? formatDateTime(driver.lastLocationUpdateAt) : 'غير متاح'}</strong></p></section>
        <section className="glass-card"><h4><Activity size={17}/> تنبيهات الملف</h4>{alerts.length ? <div className="driver-alert-list">{alerts.map((alert)=><div key={alert}><AlertTriangle size={15}/><span>{alert}</span></div>)}</div> : <p className="driver-all-good">لا توجد تنبيهات حرجة.</p>}</section>
      </div>
    </>}
    {tab==='tasks' && <div className="table-wrapper"><table className="data-table"><thead><tr><th>الشحنة</th><th>الحالة</th><th>التحصيل المتوقع</th></tr></thead><tbody>{openTasks.length ? openTasks.map((item)=><tr key={item.id}><td className="tracking-num">{item.id}</td><td>{item.status}</td><td>{formatCurrency(item.expectedCollection)}</td></tr>) : <tr><td colSpan={3}>لا توجد مهام مفتوحة.</td></tr>}</tbody></table></div>}
    {tab==='finance' && <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="contact-phone-box" style={{ margin: 0 }}>
          <span>إجمالي تحصيل مع المناديب مع المندوب</span>
          <strong style={{ color: '#10B981', fontSize: '1.1rem' }}>{formatCurrency(driver.pendingCash)}</strong>
        </div>
        {onRemit && <button className="btn-primary" onClick={onRemit}><Wallet size={15}/> استلام وتوريد تحصيل المندوب</button>}
      </div>
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>الشحنة</th><th>المحصل</th><th>المورد</th><th>المتبقي</th></tr></thead><tbody>{codRows.length ? codRows.map((item)=><tr key={item.id}><td className="tracking-num">{item.id}</td><td>{formatCurrency(item.collectedCash)}</td><td>{formatCurrency(item.remittedCash)}</td><td className="amount" style={{ color: '#F59E0B', fontWeight: 700 }}>{formatCurrency(item.collectedCash-item.remittedCash)}</td></tr>) : <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد تحصيل معلق معلقة لهذا المندوب.</td></tr>}</tbody></table></div>
    </div>}
    {tab==='access' && <div className="driver-access-actions"><p>معرف الدخول: <strong dir="ltr">{driver.userCode ?? driver.phone}</strong></p><p>الإدارة لا تنشئ أو ترى كلمة مرور المندوب. إعادة التعيين تتم عبر خدمة الهوية.</p><div className="toolbar-actions">{onReset && <button className="outline-btn" onClick={onReset}><KeyRound size={15}/> إعادة تعيين الدخول</button>}{onSuspend && <button className="outline-btn" onClick={onSuspend}><ShieldOff size={15}/> إيقاف المندوب</button>}{onReactivate && <button className="outline-btn" onClick={onReactivate}><UserCheck size={15}/> إعادة تفعيل المندوب</button>}{onArchive && <button className="outline-btn danger-link" onClick={onArchive}><Archive size={15}/> أرشفة</button>}</div></div>}
  </Modal>;
}

function DriverFormDialog({ title, form, branches, zones, canSelectBranch, onChange, onCancel, onSubmit, submitLabel }: {
  title:string;
  form:DriverFormState;
  branches:BranchReference[];
  zones:ZoneReference[];
  canSelectBranch:boolean;
  onChange:(form:DriverFormState)=>void;
  onCancel:()=>void;
  onSubmit:()=>void;
  submitLabel:string;
}) {
  const update = <K extends keyof DriverFormState>(field: K, value: DriverFormState[K]) => onChange({ ...form, [field]: value });
  const visibleZones = zones.filter((zone) => !form.branchId || !zone.branch_id || zone.branch_id === form.branchId);
  const changeBranch = (branchId:string) => {
    const nextZones = zones.filter((zone) => !branchId || !zone.branch_id || zone.branch_id === branchId);
    const first = nextZones[0];
    onChange({ ...form, branchId, primaryZoneId: first?.id ?? '', serviceAreaIds: first ? [first.id] : [] });
  };
  const toggleArea = (zoneId:string) => {
    if (form.serviceAreaIds.includes(zoneId)) {
      const next = form.serviceAreaIds.filter((item)=>item!==zoneId);
      if (!next.length) return;
      onChange({ ...form, serviceAreaIds: next, primaryZoneId: form.primaryZoneId === zoneId ? next[0] : form.primaryZoneId });
    } else {
      update('serviceAreaIds', [...form.serviceAreaIds, zoneId]);
    }
  };
  const toggleTask = (task:'pickup'|'delivery'|'returns') => update('taskTypes', form.taskTypes.includes(task) ? form.taskTypes.filter((item)=>item!==task) : [...form.taskTypes,task]);

  return <Modal wide title={title} description="البيانات المرجعية للفروع والمناطق تأتي من الخادم فقط" onClose={onCancel} footer={<>
    <button className="outline-btn" onClick={onCancel}>إلغاء</button>
    <button className="btn-primary" onClick={onSubmit} disabled={!form.name.trim() || !form.phone.trim() || !form.code.trim() || !form.primaryZoneId || !form.serviceAreaIds.length || !form.taskTypes.length}>{submitLabel}</button>
  </>}>
    <div className="admin-form-grid">
      <label className="form-field"><span>اسم المندوب الكامل</span><input className="input-glass" value={form.name} onChange={(e)=>update('name',e.target.value)} placeholder="مثال: محمد علي"/></label>
      <label className="form-field"><span>رقم الهاتف (تسجيل الدخول)</span><input className="input-glass" dir="ltr" value={form.phone} onChange={(e)=>update('phone',e.target.value)} placeholder="010xxxxxxxx"/></label>
      <label className="form-field"><span>كود المندوب</span><input className="input-glass" dir="ltr" value={form.code} onChange={(e)=>update('code',e.target.value)} placeholder="DRV-001"/></label>
      <label className="form-field"><span>الفرع</span><select className="input-glass" value={form.branchId} onChange={(e)=>changeBranch(e.target.value)} disabled={!canSelectBranch}>{!form.branchId && <option value="">بدون فرع محدد</option>}{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>{!canSelectBranch && <small>الفرع مقيد بنطاق حسابك ولا يمكن تغييره من هذه الصلاحية.</small>}</label>
      <label className="form-field"><span>المنطقة الرئيسية</span><select className="input-glass" value={form.primaryZoneId} onChange={(e)=>{ const id=e.target.value; onChange({ ...form, primaryZoneId:id, serviceAreaIds: form.serviceAreaIds.includes(id) ? form.serviceAreaIds : [id,...form.serviceAreaIds].filter(Boolean) }); }}>{visibleZones.map((zone)=><option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
      <label className="form-field"><span>أقصى عدد شحنات في الدفعة</span><input className="input-glass" type="number" min="1" max="100" value={form.maxBatchShipments} onChange={(e)=>update('maxBatchShipments',e.target.value)}/></label>
      <label className="form-field"><span>أقصى عدد مهام مفتوحة</span><input className="input-glass" type="number" min="1" max="100" value={form.maxOpenTasks} onChange={(e)=>update('maxOpenTasks',e.target.value)}/></label>

      <div className="form-field full"><span>مناطق العمل المخصصة</span><div className="chips-selector-grid">{visibleZones.map((zone)=><button type="button" key={zone.id} className={`chip-toggle ${form.serviceAreaIds.includes(zone.id) ? 'active' : ''}`} onClick={()=>toggleArea(zone.id)}>{zone.name}{form.primaryZoneId===zone.id ? ' · الرئيسية' : ''}</button>)}</div>{!visibleZones.length && <small>لا توجد مناطق نشطة مرتبطة بهذا الفرع.</small>}</div>

      <div className="form-field full"><span>أنواع المهام المسموحة</span><div className="chips-selector-grid"><button type="button" className={`chip-toggle ${form.taskTypes.includes('pickup') ? 'active' : ''}`} onClick={()=>toggleTask('pickup')}>استلام من التجار</button><button type="button" className={`chip-toggle ${form.taskTypes.includes('delivery') ? 'active' : ''}`} onClick={()=>toggleTask('delivery')}>توصيل للعملاء</button><button type="button" className={`chip-toggle ${form.taskTypes.includes('returns') ? 'active' : ''}`} onClick={()=>toggleTask('returns')}>استرجاع مرتجعات</button></div></div>
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
    <p className="confirm-description">سيتم إرسال تعليمات إعادة تعيين الدخول عبر قناة الهوية المسجلة للمندوب، ولن تعرض لوحة الإدارة أي كلمة مرور أو رمز سري.</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
      <label className="setting-toggle">
        <span><strong>تسجيل الخروج من جميع الأجهزة</strong><small>إلغاء أي جلسة نشطة حاليًا لتطبيق المندوب.</small></span>
        <input type="checkbox" checked={invalidate} onChange={(e)=>setInvalidate(e.target.checked)}/>
      </label>
      <label className="setting-toggle">
        <span><strong>إلزام تغيير كلمة المرور</strong><small>يُطلب منه تعيين كلمة سر جديدة وفق سياسة الهوية عند أول دخول.</small></span>
        <input type="checkbox" checked={force} onChange={(e)=>setForce(e.target.checked)}/>
      </label>
    </div>
  </Modal>;
}

function SuspendDriverDialog({ driver,onCancel,onSubmit }:{driver:Driver;onCancel:()=>void;onSubmit:(reason:string,policy:SuspendPolicy)=>void}) {
  const [reason,setReason]=useState('مخالفة تشغيلية');
  const [policy,setPolicy]=useState<SuspendPolicy>('complete_current_tasks');
  return <Modal title="إيقاف المندوب" description={driver.name} onClose={onCancel} footer={<>
    <button className="outline-btn" onClick={onCancel}>إلغاء</button>
    <button className="btn-primary danger-action" onClick={()=>onSubmit(reason,policy)} disabled={!reason.trim()}>تأكيد الإيقاف</button>
  </>}>
    <div className="suspend-impact">
      <AlertTriangle size={18}/>
      <div>
        <strong>{driver.name}</strong>
        <p>{driver.activeLoad.toLocaleString('ar-EG')} مهام مفتوحة · {formatCurrency(driver.pendingCash)} تحصيل معه · {driver.onShift ? 'وردية مفتوحة' : 'خارج الوردية'}</p>
      </div>
    </div>
    <div className="admin-form-grid" style={{ marginTop: '1rem' }}>
      <label className="form-field full">
        <span>سياسة التعامل مع المهام الحالية</span>
        <select className="input-glass" value={policy} onChange={(e)=>setPolicy(e.target.value as SuspendPolicy)}>
          <option value="complete_current_tasks">يكمل المهام الحالية ويُمنع من استلام مهام جديدة</option>
          <option value="withdraw_and_reassign">سحب المهام القابلة للسحب وإعادة تكليفها</option>
          <option value="immediate_stop">إيقاف فوري للحساب والتشغيل</option>
        </select>
        {policy === 'complete_current_tasks' && <small>سيظهر الحساب كمقيّد حتى تنتهي المهام الحالية، ثم يمكن إدارته أو إعادة تفعيله.</small>}
        {policy === 'withdraw_and_reassign' && <small>قد تُنشأ حالات متابعة للشحنات التي لا يمكن سحبها بأمان بسبب الحيازة أو حالة التشغيل.</small>}
        {policy === 'immediate_stop' && <small>استخدم الإيقاف الفوري فقط عندما يلزم منع الوصول والتشغيل مباشرة.</small>}
      </label>
      <label className="form-field full">
        <span>سبب الإيقاف</span>
        <textarea className="input-glass" rows={3} value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="أدخل سبب إيقاف الحساب..."/>
      </label>
    </div>
  </Modal>;
}

function ReactivateDriverDialog({ driver,onCancel,onSubmit }:{driver:Driver;onCancel:()=>void;onSubmit:(reason:string)=>void}) {
  const [reason,setReason]=useState('إعادة السماح بالتشغيل بعد المراجعة');
  return <Modal title="إعادة تفعيل المندوب" description={driver.name} onClose={onCancel} footer={<>
    <button className="outline-btn" onClick={onCancel}>إلغاء</button>
    <button className="btn-primary" onClick={()=>onSubmit(reason)} disabled={!reason.trim()}>تأكيد إعادة التفعيل</button>
  </>}>
    <p className="confirm-description">سيعود الحساب إلى الحالة الفعالة وفق صلاحيات وسياسات التشغيل الحالية. لن يتم إنشاء مهام جديدة تلقائيًا بمجرد إعادة التفعيل.</p>
    <label className="form-field full" style={{ marginTop: '1rem' }}>
      <span>ملاحظة المراجعة</span>
      <textarea className="input-glass" rows={3} value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="اكتب سبب إعادة التفعيل..."/>
    </label>
  </Modal>;
}

function ArchiveDriverDialog({ driver,onCancel,onSubmit }:{driver:Driver;onCancel:()=>void;onSubmit:(reason:string)=>void}) {
  const [reason,setReason]=useState('انتهاء التعاقد');
  return <Modal title="أرشفة المندوب" description={driver.name} onClose={onCancel} footer={<>
    <button className="outline-btn" onClick={onCancel}>إلغاء</button>
    <button className="btn-primary danger-action" onClick={()=>onSubmit(reason)} disabled={!reason.trim()}>أرشفة {driver.name}</button>
  </>}>
    <div className="suspend-impact">
      <AlertTriangle size={18}/>
      <div><strong>الأرشفة عملية تشغيلية مقيدة.</strong><p>الخادم سيرفض الأرشفة إذا كان لدى المندوب مهام مفتوحة أو تحصيل غير مسوّى. يتم الاحتفاظ بالسجل التاريخي ولا تُحذف البيانات.</p></div>
    </div>
    <label className="form-field full" style={{ marginTop: '1rem' }}>
      <span>سبب الأرشفة</span>
      <textarea className="input-glass" rows={3} value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="أدخل سبب الأرشفة..."/>
    </label>
  </Modal>;
}

function ProfileMetric({ icon,label,value,detail }:{icon:React.ReactNode;label:string;value:string;detail:string}) {
  return <div className="driver-profile-metric glass-card"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></div>;
}

function RemitDriverDialog({
  driver,
  shipments,
  onCancel,
  onSubmit,
}: {
  driver: Driver;
  shipments: Array<{ id: string; status: string; collectedCash: number; remittedCash: number }>;
  onCancel: () => void;
  onSubmit: (shipmentRemits: Array<{ shipmentId: string; remittedCash: number; note: string }>) => Promise<void>;
}) {
  const pendingRows = shipments.filter((s) => s.collectedCash > s.remittedCash);
  const totalPending = pendingRows.reduce((sum, s) => sum + (s.collectedCash - s.remittedCash), 0);
  const [actualReceived, setActualReceived] = useState(totalPending);
  const [note, setNote] = useState(`توريد تحصيل معلق - ${driver.name}`);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const remits = pendingRows.map((s) => ({
        shipmentId: s.id,
        remittedCash: s.collectedCash,
        note: note.trim() || `توريد تحصيل ${driver.name}`,
      }));
      await onSubmit(remits);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`استلام وتوريد تحصيل ${driver.name}`}
      description="استلام تحصيل الشحنات عند التسليم من المندوب وإيداعه في الخزينة العامة للشركة."
      onClose={onCancel}
      footer={
        <>
          <button className="outline-btn" onClick={onCancel} disabled={submitting}>
            إلغاء
          </button>
          <button
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
            disabled={submitting || !pendingRows.length}
            onClick={handleConfirm}
          >
            <Banknote size={15} /> {submitting ? 'جارٍ التوريد…' : `تأكيد استلام ${formatCurrency(actualReceived)} وإيداعها`}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="report-kpi-grid">
          <div className="report-kpi glass-card">
            <div>
              <p className="report-kpi-label">عدد الشحنات المحصلة</p>
              <p className="report-kpi-value">{pendingRows.length.toLocaleString('ar-EG')}</p>
            </div>
          </div>
          <div className="report-kpi glass-card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
            <div>
              <p className="report-kpi-label">إجمالي التحصيل المعلق</p>
              <p className="report-kpi-value" style={{ color: '#34D399' }}>
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>
        </div>

        <label className="form-field">
          <span>المبلغ المستلم فعلياً من المندوب (ج.م)</span>
          <input
            type="number"
            className="input-glass"
            value={actualReceived}
            onChange={(e) => setActualReceived(Number(e.target.value))}
          />
        </label>

        <label className="form-field">
          <span>ملاحظة أو رقم إيصال التوريد للخزينة</span>
          <input
            className="input-glass"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثال: توريد وردية المساء - إيصال خزينة #482"
          />
        </label>

        <div className="table-wrapper" style={{ maxHeight: '180px', overflowY: 'auto' }}>
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th>رقم الشحنة</th>
                <th>المحصل</th>
                <th>المورد</th>
                <th>المتبقي للتقفيل</th>
              </tr>
            </thead>
            <tbody>
              {pendingRows.length ? (
                pendingRows.map((s) => (
                  <tr key={s.id}>
                    <td className="tracking-num">{s.id}</td>
                    <td>{formatCurrency(s.collectedCash)}</td>
                    <td>{formatCurrency(s.remittedCash)}</td>
                    <td className="amount" style={{ color: '#34D399', fontWeight: 700 }}>
                      {formatCurrency(s.collectedCash - s.remittedCash)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    لا توجد تحصيل معلق معلقة لهذا المندوب.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}


