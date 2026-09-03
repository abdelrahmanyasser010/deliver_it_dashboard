import { useMemo, useState } from 'react';
import { Barcode, Camera, CheckCircle2, ClipboardCheck, MapPin, PackageCheck, Route, Search, Truck, Undo2, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, PageSkeleton } from '../components/AsyncState';
import { StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Shipment } from '../domain/logistics/entities';
import { reportedStatusLabels } from '../domain/operations/presentation';
import { formatAge, formatCurrency, statusConfig } from '../utils/helpers';
import './OperationsCenter.css';

type OpsTab = 'pickupRequests' | 'officeReview' | 'deliveryAssignments' | 'driverUpdates' | 'returns';
const tabs: Array<{ id: OpsTab; label: string; icon: typeof Route }> = [
  { id: 'pickupRequests', label: 'طلبات الاستلام', icon: PackageCheck },
  { id: 'officeReview', label: 'تأكيد الوصول', icon: Barcode },
  { id: 'deliveryAssignments', label: 'تكليف التوصيل', icon: Truck },
  { id: 'driverUpdates', label: 'تحديثات المناديب', icon: ClipboardCheck },
  { id: 'returns', label: 'المرتجعات', icon: Undo2 },
];
const isOpsTab = (value: string | null): value is OpsTab => tabs.some((tab) => tab.id === value);
const number = (value: number) => value.toLocaleString('ar-EG');

export function OperationsCenterPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: OpsTab = isOpsTab(requestedTab) ? requestedTab : 'pickupRequests';
  const [query, setQuery] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});
  const { state, isLoading, error, refetch, execute } = useDeliveryData();
  const { showToast } = useWorkspace();

  const selectTab = (tab: OpsTab) => { const next = new URLSearchParams(searchParams); next.set('tab', tab); setSearchParams(next, { replace: true }); };

  const shipments = state?.shipments ?? [];
  const drivers = useMemo(() => state?.drivers ?? [], [state?.drivers]);
  const pickupTasks = state?.pickupTasks ?? [];
  const batches = state?.deliveryBatches ?? [];
  const updates = state?.driverUpdates ?? [];
  const officeShipments = shipments.filter((shipment) => shipment.taskStatus === 'needsOfficeConfirmation' || shipment.status === 'readyToShip');
  const unassigned = shipments.filter((shipment) => shipment.taskStatus === 'needsDriverAssignment' && !shipment.driverId);
  const returns = state?.returnCases ?? [];
  const pendingUpdates = updates.filter((update) => update.status === 'pendingAdminApproval');
  const counts: Record<OpsTab, number> = { pickupRequests: pickupTasks.filter((task) => ['assigned', 'driverSubmitted', 'needsReview'].includes(task.status)).length, officeReview: officeShipments.length, deliveryAssignments: unassigned.length, driverUpdates: pendingUpdates.length, returns: returns.length };

  const run = async (command: Parameters<typeof execute>[0]) => { const result = await execute(command); showToast(result.message, result.ok ? 'success' : 'danger'); };
  const normalizedQuery = query.trim().toLocaleLowerCase('ar-EG');
  const matches = (values: Array<string | undefined>) => !normalizedQuery || values.some((value) => value?.toLocaleLowerCase('ar-EG').includes(normalizedQuery));

  const suggestedDrivers = useMemo(() => drivers.filter((driver) => driver.status === 'active' && (driver.accountStatus ?? 'active') === 'active' && driver.availability !== 'offline' && (driver.onShift ?? true)).sort((a, b) => (b.capacity - b.activeLoad) - (a.capacity - a.activeLoad)), [drivers]);
  const filteredUnassigned = unassigned.filter((shipment) => (!urgentOnly || shipment.priority === 'urgent') && matches([shipment.id, shipment.customerName, shipment.merchantName, shipment.governorate, shipment.city]));
  const filteredPickupTasks = pickupTasks.filter((task) => matches([task.id, task.merchantName, task.driverName]));
  const filteredOfficeShipments = officeShipments.filter((shipment) => matches([shipment.id, shipment.merchantName, shipment.customerName]));
  const filteredPendingUpdates = pendingUpdates.filter((update) => matches([update.id, update.shipmentId, update.driverName, update.merchantName]));
  const filteredReturns = returns.filter((returnCase) => matches([returnCase.id, returnCase.shipmentId, returnCase.merchantName, returnCase.assignedDriverName, returnCase.sourceDriverName]));
  const groupedUnassigned = Object.entries(filteredUnassigned.reduce<Record<string, Shipment[]>>((groups, shipment) => ({ ...groups, [shipment.governorate]: [...(groups[shipment.governorate] ?? []), shipment] }), {}));

  if (isLoading) return <PageSkeleton rows={5} />;
  if (error || !state) return <ErrorState message={error ?? 'تعذر تحميل مركز العمليات.'} onRetry={refetch} />;

  return <div className="operations-center">
    <header className="ops-command-bar glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <p className="page-kicker">مساحة العمل اليومية</p>
        <h2 style={{ margin: '0.2rem 0' }}>مركز العمليات</h2>
        <p style={{ margin: 0, opacity: 0.8, fontSize: '0.88rem' }}>متابعة وتوجيه الشحنات حسب مرحلة التنفيذ الميداني والتشغيلي.</p>
      </div>
      <nav className="ops-tabs" style={{ background: 'transparent', padding: 0, margin: 0, border: 0 }} aria-label="مراحل العمليات">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`ops-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => selectTab(id)}
          >
            <Icon size={15} />
            {label}
            <span className="nav-count-badge">{number(counts[id])}</span>
          </button>
        ))}
      </nav>
    </header>

    <section className="ops-toolbar glass-card">
      <div>
        <strong>{tabs.find((tab) => tab.id === activeTab)?.label}</strong>
        <span>المهام مرتبة من الأقدم والأكثر أولوية.</span>
      </div>
      <div className="search-field">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="بحث برقم الشحنة أو التاجر أو المنطقة"
          aria-label="بحث مركز العمليات"
        />
      </div>
      <label className="shipment-check">
        <input type="checkbox" checked={urgentOnly} onChange={(event) => setUrgentOnly(event.target.checked)} />
        عاجل فقط
      </label>
    </section>

    {activeTab === 'pickupRequests' && <section className="ops-section compact-flow">{filteredPickupTasks.map((task) => {
      const missing = task.items.filter((item) => item.expected && !item.driverConfirmed).length;
      return <article key={task.id} className="ops-row-card glass-card"><div className="ops-row-main"><div><div className="ops-title-line"><strong className="ops-title">{task.id} · {task.merchantName}</strong><StatusBadge label={task.status === 'driverSubmitted' ? 'مرسلة للاعتماد' : task.status === 'needsReview' ? 'تحتاج مراجعة' : task.status === 'approved' ? 'معتمدة' : 'مع المندوب'} tone={task.status === 'approved' ? 'success' : task.status === 'needsReview' ? 'danger' : 'warning'}/></div><p className="ops-meta">{task.merchantAddress} · المندوب {task.driverName}</p></div><div className="ops-row-number"><strong>{number(task.items.length)}</strong><span>شحنة</span></div></div><div className="shipment-check-grid">{task.items.map((item) => <span key={item.shipmentId} className={`shipment-check ${item.driverConfirmed ? 'selected' : ''}`}>{item.shipmentId} · {formatCurrency(item.codAmount)}</span>)}</div><div className="ops-row-actions">{missing > 0 && <span className="ops-badge danger">ناقص {number(missing)}</span>}<button className="outline-btn" onClick={() => void run({ type: 'pickup/review', taskId: task.id })}>مراجعة</button><button className="btn-primary" onClick={() => void run({ type: 'pickup/approve', taskId: task.id })} disabled={task.status === 'approved'}><CheckCircle2 size={15}/> اعتماد</button></div></article>;
    })}{filteredPickupTasks.length === 0 && <EmptyState title={pickupTasks.length === 0 ? 'لا توجد مهام استلام' : 'لا توجد نتائج مطابقة'} description={pickupTasks.length === 0 ? 'كل طلبات الاستلام الحالية تمت معالجتها.' : 'جرّب كلمة بحث مختلفة أو ألغِ عاجل فقط.'}/>}</section>}

    {activeTab === 'officeReview' && <section className="ops-section"><div className="ops-next-step glass-card"><div><strong>الاستلام بالباركود هو مصدر تأكيد الوصول</strong><span>أنشئ دفعة مرتبطة بطلب الاستلام؛ عند تقفيلها ستتحول الشحنات إلى «وصلت المكتب» وتظهر للتكليف.</span></div><button className="btn-primary" onClick={() => navigate('/barcode')}><Barcode size={16}/> فتح شاشة الباركود</button></div>{filteredOfficeShipments.slice(0, 12).map((shipment) => <ShipmentTaskRow key={shipment.id} shipment={shipment} action={<button className="outline-btn" onClick={() => navigate(`/shipments?shipment=${shipment.id}`)}>فتح الشحنة</button>} />)}{filteredOfficeShipments.length === 0 && <EmptyState title="لا توجد شحنات للتأكيد" description="لا توجد شحنات مطابقة للبحث في مرحلة تأكيد الوصول."/>}</section>}

    {activeTab === 'deliveryAssignments' && <section className="ops-section">{groupedUnassigned.map(([governorate, group]) => {
      const batch = batches.find((item) => item.status === 'draft' && item.shipmentIds.some((id) => group.some((shipment) => shipment.id === id)));
      const key = batch?.id ?? governorate;
      const groupAreas = new Set(group.flatMap((shipment) => [shipment.governorate, shipment.city].filter(Boolean)));
      const rankedDrivers = suggestedDrivers.slice().sort((a, b) => {
        const aMatch = groupAreas.has(a.zone) ? 1 : 0;
        const bMatch = groupAreas.has(b.zone) ? 1 : 0;
        return bMatch - aMatch || (b.capacity - b.activeLoad) - (a.capacity - a.activeLoad) || b.successRate - a.successRate;
      });
      const selectedDriver = selectedDrivers[key] ?? rankedDrivers[0]?.id ?? '';
      const driver = drivers.find((item) => item.id === selectedDriver);
      return <article key={key} className="glass-card" style={{ padding: '.9rem' }}><div className="ops-row-main"><div><div className="ops-title-line"><strong>{batch?.id ?? `دفعة ${governorate}`}</strong><StatusBadge label={`${number(group.length)} شحنة`} tone="info"/></div><p className="ops-meta">{governorate} · تحصيل متوقع {formatCurrency(group.reduce((sum, shipment) => sum + shipment.expectedCollection, 0))}</p></div><div className="ops-row-actions"><select className="ops-select" value={selectedDriver} onChange={(event) => setSelectedDrivers((current) => ({ ...current, [key]: event.target.value }))}>{rankedDrivers.map((item) => <option key={item.id} value={item.id}>{item.name} — {groupAreas.has(item.zone) ? 'نفس المنطقة' : item.zone} — متاح {number(Math.max(0, item.capacity - item.activeLoad))}</option>)}</select><button className="btn-primary" disabled={!selectedDriver} onClick={() => void run(batch ? { type: 'batch/assign', batchId: batch.id, driverId: selectedDriver } : { type: 'shipment/assignDriver', shipmentIds: group.map((shipment) => shipment.id), driverId: selectedDriver })}><Truck size={15}/> تكليف المندوب</button></div></div>{driver && <div className="driver-suggestion-row"><span className="score-pill">ترشيح {groupAreas.has(driver.zone) ? 'ممتاز' : 'مقبول'} · نجاح {number(driver.successRate)}٪</span><span className="ops-meta">{driver.zone} · حمولة {number(driver.activeLoad)}/{number(driver.capacity)} · تحصيل معه {formatCurrency(driver.pendingCash)}</span></div>}<div className="shipment-check-grid">{group.map((shipment) => <button key={shipment.id} className="shipment-check selected" onClick={() => navigate(`/shipments?shipment=${shipment.id}`)}>{shipment.id}</button>)}</div></article>;
    })}{groupedUnassigned.length === 0 && <EmptyState title="لا توجد شحنات بلا مندوب" description="كل الشحنات الجاهزة تم توزيعها."/>}</section>}

    {activeTab === 'driverUpdates' && <section className="ops-section compact-flow">{filteredPendingUpdates.map((update) => <article key={update.id} className="ops-row-card glass-card driver-update-card"><div className="ops-row-main"><div><div className="ops-title-line"><strong>{update.shipmentId}</strong><StatusBadge label={`تقرير المندوب: ${reportedStatusLabels[update.reportedStatus]}`} tone="warning"/><StatusBadge label={['returned','failed'].includes(update.reportedStatus) ? 'حساسية عالية' : update.reportedStatus === 'delivered' && update.evidenceReference && update.location ? 'حساسية منخفضة' : 'حساسية متوسطة'} tone={['returned','failed'].includes(update.reportedStatus) ? 'danger' : update.reportedStatus === 'delivered' && update.evidenceReference && update.location ? 'success' : 'warning'}/></div><p className="ops-meta">{update.driverName} · {update.merchantName} · {update.customerName}</p><small className="ops-meta">الحالة الرسمية الحالية: {statusConfig[shipments.find((item) => item.id === update.shipmentId)?.status ?? 'readyToShip'].label} · {update.note ?? update.evidence}</small></div><span className="ops-badge info">تحديث ميداني غير ظاهر للتاجر</span></div>{update.partialDeliveryLines && <div className="partial-review-grid">{update.partialDeliveryLines.map((line) => <div key={`${update.id}-${line.itemIndex}`}><strong>{line.itemName}</strong><span>المطلوب {number(line.orderedQuantity)} · المسلم {number(line.deliveredQuantity)}</span><small>{line.undeliveredAction === 'retry' ? 'المتبقي: إعادة محاولة' : line.undeliveredAction === 'return' ? 'المتبقي: مرتجع للشركة' : 'تم بالكامل'}{line.reason ? ` · ${line.reason}` : ''}</small></div>)}</div>}{(update.evidenceReference || update.location) && <div className="evidence-review">{update.evidenceReference && <span><Camera size={14}/> صورة إثبات مرفقة</span>}{update.location && <span><MapPin size={14}/> دقة {number(update.location.accuracyMeters)} م · يبعد {number(update.location.distanceFromDestinationMeters ?? 0)} م عن العنوان</span>}{update.reportedCollectedCash !== undefined && <span>التحصيل المبلغ عنه: {formatCurrency(update.reportedCollectedCash)}</span>}</div>}{update.reviewReason && <div className="ops-badge warning">{update.reviewReason}</div>}<div className="company-decision-note">اعتماد الشركة سيُصدر الحالة الرسمية، ويقسم البوليصة تلقائيًا عند التسليم الجزئي. المندوب لا يرسل حالة مباشرة إلى التاجر.</div><div className="ops-row-actions"><button className="outline-btn" onClick={() => void run({ type: 'driverUpdate/reject', updateId: update.id })}><XCircle size={15}/> طلب توضيح / إرجاع للمندوب</button><button className="btn-primary" onClick={() => void run({ type: 'driverUpdate/approve', updateId: update.id })}><CheckCircle2 size={15}/> اعتماد وإصدار الحالة الرسمية</button></div></article>)}{filteredPendingUpdates.length === 0 && <EmptyState title={pendingUpdates.length === 0 ? 'لا توجد تحديثات معلقة' : 'لا توجد نتائج مطابقة'} description={pendingUpdates.length === 0 ? 'كل تحديثات المناديب تم اعتمادها أو مراجعتها.' : 'جرّب البحث برقم شحنة أو اسم مندوب آخر.'}/>}</section>}

    {activeTab === 'returns' && <section className="ops-section compact-flow">{filteredReturns.map((returnCase) => { const selectedDriver = selectedDrivers[returnCase.id] ?? suggestedDrivers[0]?.id ?? ''; return <article key={returnCase.id} className="ops-row-card glass-card return-case-card"><div><div className="ops-title-line"><strong>{returnCase.id} · {returnCase.shipmentId}</strong><StatusBadge label={returnStatusLabel(returnCase.status)} tone={returnCase.status === 'returnedToMerchant' ? 'success' : returnCase.status === 'returningToHub' ? 'warning' : 'info'}/></div><p className="ops-meta">{returnCase.merchantName} · {returnCase.itemSummary}</p><small className="ops-meta">{returnCase.reason} · رسوم المرتجع {formatCurrency(returnCase.returnFee)}</small></div><div><span className="ops-badge info">الكمية {number(returnCase.quantity)}</span>{returnCase.assignedDriverName && <p className="ops-meta">مندوب الإرجاع: {returnCase.assignedDriverName}</p>}</div><div className="ops-row-actions return-actions">{returnCase.status === 'returningToHub' && <button className="btn-primary" onClick={() => void run({ type: 'return/receiveAtHub', returnCaseId: returnCase.id })}>استلام وفحص في الشركة</button>}{['receivedAtHub','awaitingMerchantAssignment'].includes(returnCase.status) && <><select className="ops-select" value={selectedDriver} onChange={(event) => setSelectedDrivers((current) => ({ ...current, [returnCase.id]: event.target.value }))}>{suggestedDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select><button className="btn-primary" onClick={() => void run({ type: 'return/assignDriver', returnCaseId: returnCase.id, driverId: selectedDriver })}>تكليف للتاجر</button></>}{returnCase.status === 'assignedToDriver' && <button className="btn-primary" onClick={() => void run({ type: 'return/markOutForMerchant', returnCaseId: returnCase.id })}>تأكيد الخروج للتاجر</button>}{returnCase.status === 'outForMerchantReturn' && <button className="btn-primary" onClick={() => void run({ type: 'return/confirmMerchantReceipt', returnCaseId: returnCase.id, proofReference: `RETURN-PROOF-${returnCase.id}` })}>تأكيد استلام التاجر</button>}{returnCase.status === 'returnedToMerchant' && <span className="ops-badge success">تم إغلاق دورة المرتجع</span>}</div></article>; })}{filteredReturns.length === 0 && <EmptyState title={returns.length === 0 ? 'لا توجد مرتجعات معلقة' : 'لا توجد نتائج مطابقة'} description={returns.length === 0 ? 'دورة المرتجعات محدثة.' : 'جرّب البحث برقم شحنة أو اسم تاجر آخر.'}/>}</section>}
  </div>;
}


function returnStatusLabel(status: NonNullable<ReturnType<typeof useDeliveryData>['state']>['returnCases'][number]['status']) {
  return ({ returningToHub: 'في الطريق إلى الشركة', receivedAtHub: 'وصل الشركة', awaitingMerchantAssignment: 'ينتظر التكليف', assignedToDriver: 'تم تكليفه لمندوب', outForMerchantReturn: 'في الطريق إلى التاجر', returnedToMerchant: 'تم تسليمه للتاجر' } as const)[status];
}

function ShipmentTaskRow({ shipment, action }: { shipment: Shipment; action: React.ReactNode }) {
  return <article className="ops-row-card glass-card"><div><div className="ops-title-line"><strong>{shipment.id}</strong><StatusBadge label={statusConfig[shipment.status].label} tone={shipment.priority === 'urgent' ? 'danger' : 'warning'}/></div><p className="ops-meta">{shipment.merchantName} · {shipment.customerName} · {shipment.governorate}</p></div><div><span className="ops-badge warning">ينتظر منذ {formatAge(shipment.lastUpdatedAt)}</span>{shipment.exceptionReason && <p className="ops-meta">{shipment.exceptionReason}</p>}</div><div className="ops-row-actions">{action}</div></article>;
}


