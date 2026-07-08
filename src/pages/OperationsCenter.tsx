import { useMemo, useState, type ReactNode } from 'react';
import { Bell, CheckCircle2, ClipboardCheck, PackageCheck, PackageSearch, Route, ScanLine, Send, Truck, UserCheck, XCircle } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import './OperationsCenter.css';

type OpsTab = 'pickupRequests' | 'pickupReview' | 'assignment' | 'driverUpdates';
type PickupLineStatus = 'waiting' | 'verified' | 'missing' | 'returned';
type DriverDecision = 'pending' | 'approved' | 'review' | 'changed';

const formatNumber = (value: number) => value.toLocaleString('ar-EG');

interface PickupRequest {
  id: string;
  merchantName: string;
  zone: string;
  address: string;
  phone: string;
  shipments: string[];
  codTotal: number;
  drivers: string[];
  priority: 'normal' | 'high';
}

interface PickupReviewLine {
  id: string;
  merchantName: string;
  driverName: string;
  status: PickupLineStatus;
  codAmount: number;
}

interface DeliveryShipment {
  id: string;
  zone: string;
  customerName: string;
  addressHint: string;
  codAmount: number;
  priority: number;
}

interface DriverCandidate {
  id: string;
  name: string;
  zone: string;
  capacity: number;
  activeLoad: number;
  score: number;
}

interface DeliveryBox {
  id: string;
  zone: string;
  shipmentIds: string[];
  selectedDriverId?: string;
  sent?: boolean;
}

interface DriverUpdate {
  id: string;
  shipmentId: string;
  driverName: string;
  merchantName: string;
  customerName: string;
  fromStatus: string;
  toStatus: string;
  note: string;
  risk: 'low' | 'medium' | 'high';
  decision: DriverDecision;
}

const pickupRequestsSeed: PickupRequest[] = [
  { id: 'PKG-1041', merchantName: 'متجر الأزياء', zone: 'مدينة نصر', address: 'شارع مصطفى النحاس', phone: '01011223344', shipments: ['SHP-1001', 'SHP-1002', 'SHP-1003', 'SHP-1004', 'SHP-1005'], codTotal: 4850, drivers: ['أحمد سامي', 'محمد علي'], priority: 'high' },
  { id: 'PKG-1042', merchantName: 'هوم ديكور', zone: 'الهرم', address: 'شارع العريش', phone: '01122334455', shipments: ['SHP-1010', 'SHP-1011', 'SHP-1012'], codTotal: 3120, drivers: ['خالد إبراهيم', 'ياسر عمر'], priority: 'normal' },
  { id: 'PKG-1043', merchantName: 'إلكترونيات بلس', zone: 'الدقي', address: 'شارع التحرير', phone: '01299887766', shipments: ['SHP-1020', 'SHP-1021', 'SHP-1022', 'SHP-1023'], codTotal: 12900, drivers: ['ياسر عمر', 'محمد علي'], priority: 'high' },
];

const reviewSeed: PickupReviewLine[] = [
  { id: 'SHP-1003', merchantName: 'متجر الأزياء', driverName: 'أحمد سامي', status: 'verified', codAmount: 1200 },
  { id: 'SHP-1011', merchantName: 'هوم ديكور', driverName: 'خالد إبراهيم', status: 'missing', codAmount: 450 },
];

const deliveryShipments: DeliveryShipment[] = [
  { id: 'SHP-2001', zone: 'مدينة نصر', customerName: 'سارة محمود', addressHint: 'عباس العقاد', codAmount: 650, priority: 98 },
  { id: 'SHP-2002', zone: 'مدينة نصر', customerName: 'منة أحمد', addressHint: 'مصطفى النحاس', codAmount: 420, priority: 94 },
  { id: 'SHP-2003', zone: 'مدينة نصر', customerName: 'طارق محمد', addressHint: 'مكرم عبيد', codAmount: 1100, priority: 89 },
  { id: 'SHP-2004', zone: 'مدينة نصر', customerName: 'دينا علي', addressHint: 'النادي الأهلي', codAmount: 300, priority: 84 },
  { id: 'SHP-2005', zone: 'مدينة نصر', customerName: 'كريم إبراهيم', addressHint: 'الحي العاشر', codAmount: 730, priority: 77 },
  { id: 'SHP-2010', zone: 'الهرم', customerName: 'نهى سالم', addressHint: 'المطبعة', codAmount: 900, priority: 92 },
  { id: 'SHP-2011', zone: 'الهرم', customerName: 'عمرو خالد', addressHint: 'العريش', codAmount: 510, priority: 81 },
  { id: 'SHP-2012', zone: 'الهرم', customerName: 'سلمى عادل', addressHint: 'مشعل', codAmount: 670, priority: 74 },
  { id: 'SHP-2020', zone: 'الدقي', customerName: 'محمود علي', addressHint: 'ميدان المساحة', codAmount: 1250, priority: 96 },
  { id: 'SHP-2021', zone: 'الدقي', customerName: 'يمنى حسن', addressHint: 'شارع التحرير', codAmount: 760, priority: 88 },
  { id: 'SHP-2022', zone: 'الدقي', customerName: 'أحمد فؤاد', addressHint: 'البحوث', codAmount: 540, priority: 70 },
];

const drivers: DriverCandidate[] = [
  { id: 'DRV-001', name: 'محمد علي', zone: 'مدينة نصر', capacity: 10, activeLoad: 3, score: 96 },
  { id: 'DRV-002', name: 'أحمد سامي', zone: 'مدينة نصر', capacity: 8, activeLoad: 4, score: 88 },
  { id: 'DRV-004', name: 'خالد إبراهيم', zone: 'الهرم', capacity: 7, activeLoad: 2, score: 91 },
  { id: 'DRV-005', name: 'ياسر عمر', zone: 'الدقي', capacity: 6, activeLoad: 1, score: 84 },
];

const updatesSeed: DriverUpdate[] = [
  { id: 'UPD-8101', shipmentId: 'SHP-2001', driverName: 'محمد علي', merchantName: 'إلكترونيات بلس', customerName: 'سارة محمود', fromStatus: 'مع المندوب', toStatus: 'تم التسليم', note: 'تم التحصيل بالكامل وإثبات التسليم موجود', risk: 'low', decision: 'pending' },
  { id: 'UPD-8102', shipmentId: 'SHP-2010', driverName: 'خالد إبراهيم', merchantName: 'هوم ديكور', customerName: 'نهى سالم', fromStatus: 'في الطريق', toStatus: 'فشل التسليم', note: 'العميل لا يرد بعد محاولتين', risk: 'medium', decision: 'pending' },
  { id: 'UPD-8103', shipmentId: 'SHP-2020', driverName: 'ياسر عمر', merchantName: 'متجر الأزياء', customerName: 'محمود علي', fromStatus: 'مع المندوب', toStatus: 'مرتجع', note: 'العميل رفض الاستلام بسبب المقاس', risk: 'high', decision: 'pending' },
];

const tabs: { id: OpsTab; label: string; icon: ReactNode }[] = [
  { id: 'pickupRequests', label: 'استلام من التجار', icon: <PackageSearch size={16} /> },
  { id: 'pickupReview', label: 'تأكيد الاستلام', icon: <ScanLine size={16} /> },
  { id: 'assignment', label: 'إسناد التوصيل', icon: <Route size={16} /> },
  { id: 'driverUpdates', label: 'اعتماد الحالات', icon: <Bell size={16} /> },
];

export function OperationsCenterPage() {
  const [activeTab, setActiveTab] = useState<OpsTab>('pickupRequests');
  const [pickupRequests, setPickupRequests] = useState(pickupRequestsSeed);
  const [reviewLines, setReviewLines] = useState(reviewSeed);
  const [capacity, setCapacity] = useState(5);
  const [boxes, setBoxes] = useState<DeliveryBox[]>(() => buildBoxes(deliveryShipments, 5));
  const [updates, setUpdates] = useState(updatesSeed);
  const [scanValue, setScanValue] = useState('');
  const [activityMessage, setActivityMessage] = useState<string | null>(null);

  const dashboardCounts = {
    pickupShipments: pickupRequests.reduce((sum, request) => sum + request.shipments.length, 0),
    reviewQueue: reviewLines.filter((line) => line.status === 'waiting' || line.status === 'missing').length,
    unsentBoxes: boxes.filter((box) => !box.sent).length,
    pendingUpdates: updates.filter((update) => update.decision === 'pending').length,
  };

  const visibleBoxes = useMemo(() => boxes.map((box) => ({
    ...box,
    shipments: box.shipmentIds.map((id) => deliveryShipments.find((shipment) => shipment.id === id)).filter(Boolean) as DeliveryShipment[],
  })), [boxes]);

  const switchTab = (tab: OpsTab) => {
    setActiveTab(tab);
    setActivityMessage(null);
  };

  const regenerateBoxes = (nextCapacity: number) => {
    setCapacity(nextCapacity);
    setBoxes(buildBoxes(deliveryShipments, nextCapacity));
    setActivityMessage(`تم إعادة ترتيب مجموعات التوصيل بسعة ${formatNumber(nextCapacity)} شحنات لكل مندوب.`);
  };

  const dispatchPickup = (requestId: string, driverName: string, shipmentIds: string[]) => {
    const request = pickupRequests.find((item) => item.id === requestId);
    if (!request || shipmentIds.length === 0) {
      setActivityMessage('حدد شحنة واحدة على الأقل قبل تكليف المندوب.');
      return;
    }

    const amountPerShipment = Math.round(request.codTotal / request.shipments.length);
    const newReviewLines = shipmentIds.map((shipmentId) => ({ id: shipmentId, merchantName: request.merchantName, driverName, status: 'waiting' as PickupLineStatus, codAmount: amountPerShipment }));

    setReviewLines((lines) => [...newReviewLines, ...lines.filter((line) => !shipmentIds.includes(line.id))]);
    setPickupRequests((requests) => requests.map((item) => {
      if (item.id !== requestId) return item;
      const remainingShipments = item.shipments.filter((shipmentId) => !shipmentIds.includes(shipmentId));
      return { ...item, shipments: remainingShipments, codTotal: amountPerShipment * remainingShipments.length };
    }).filter((item) => item.shipments.length > 0));
    setActivityMessage(`تم تكليف ${driverName} باستلام ${formatNumber(shipmentIds.length)} شحنات من ${request.merchantName}.`);
  };

  const scanShipment = () => {
    const normalized = scanValue.trim().toUpperCase();
    if (!normalized) return;

    const exists = reviewLines.some((line) => line.id.toUpperCase() === normalized);
    if (!exists) {
      setActivityMessage(`الشحنة ${normalized} غير موجودة في قائمة التأكيد.`);
      return;
    }

    setReviewLines((lines) => lines.map((line) => line.id.toUpperCase() === normalized ? { ...line, status: 'verified' } : line));
    setActivityMessage(`تم تعليم ${normalized} كمستلمة بالسكانر.`);
    setScanValue('');
  };

  const markReviewLine = (shipmentId: string, status: PickupLineStatus) => {
    setReviewLines((lines) => lines.map((line) => line.id === shipmentId ? { ...line, status } : line));
    setActivityMessage(`تم تحديث ${shipmentId}: ${pickupLineLabels[status]}.`);
  };

  const approveReviewed = () => {
    const approved = reviewLines.filter((line) => line.status === 'verified').length;
    if (approved === 0) {
      setActivityMessage('لا توجد شحنات معلمة كمستلمة لاعتمادها.');
      return;
    }

    setReviewLines((lines) => lines.filter((line) => line.status !== 'verified'));
    setActivityMessage(`تم اعتماد ${formatNumber(approved)} شحنات وإظهار نتيجة الاستلام للتاجر.`);
  };

  const chooseBoxDriver = (boxId: string, driverId: string) => {
    setBoxes((currentBoxes) => currentBoxes.map((box) => box.id === boxId ? { ...box, selectedDriverId: driverId } : box));
  };

  const sendBox = (boxId: string) => {
    const box = boxes.find((item) => item.id === boxId);
    const driver = drivers.find((item) => item.id === box?.selectedDriverId);
    if (!box || !driver) {
      setActivityMessage('اختر مندوب قبل إسناد الشحنات.');
      return;
    }

    setBoxes((currentBoxes) => currentBoxes.map((item) => item.id === boxId ? { ...item, sent: true } : item));
    setActivityMessage(`تم إسناد ${formatNumber(box.shipmentIds.length)} شحنات إلى ${driver.name}.`);
  };

  const assignReadyBoxes = () => {
    const readyBoxes = boxes.filter((box) => !box.sent && box.selectedDriverId);
    if (readyBoxes.length === 0) {
      setActivityMessage('لا توجد مجموعات جاهزة للإسناد. اختر مندوب لكل مجموعة أولا.');
      return;
    }

    setBoxes((currentBoxes) => currentBoxes.map((box) => !box.sent && box.selectedDriverId ? { ...box, sent: true } : box));
    setActivityMessage(`تم إسناد ${formatNumber(readyBoxes.length)} مجموعات توصيل للمناديب المقترحين.`);
  };

  const moveLastShipmentToNextBox = (boxId: string) => {
    let movedShipment: string | undefined;
    setBoxes((currentBoxes) => {
      const sourceIndex = currentBoxes.findIndex((box) => box.id === boxId);
      if (sourceIndex < 0 || sourceIndex === currentBoxes.length - 1) return currentBoxes;
      if (currentBoxes[sourceIndex].sent || currentBoxes[sourceIndex + 1].sent) return currentBoxes;

      movedShipment = currentBoxes[sourceIndex].shipmentIds.at(-1);
      if (!movedShipment) return currentBoxes;

      return currentBoxes.map((box, index) => {
        if (index === sourceIndex) return { ...box, shipmentIds: box.shipmentIds.slice(0, -1) };
        if (index === sourceIndex + 1) return { ...box, shipmentIds: [movedShipment as string, ...box.shipmentIds] };
        return box;
      }).filter((box) => box.shipmentIds.length > 0);
    });
    setActivityMessage(movedShipment ? `تم نقل ${movedShipment} للمجموعة التالية.` : 'لا يمكن التبديل مع المجموعة التالية في هذه الحالة.');
  };

  const decideUpdate = (updateId: string, decision: DriverDecision) => {
    const update = updates.find((item) => item.id === updateId);
    if (!update || update.decision !== 'pending') return;

    setUpdates((currentUpdates) => currentUpdates.map((item) => item.id === updateId ? { ...item, decision } : item));
    setActivityMessage(`${decisionLabels[decision]} للتحديث ${updateId}.`);
  };

  const approveLowRiskUpdates = () => {
    const lowRiskCount = updates.filter((update) => update.risk === 'low' && update.decision === 'pending').length;
    if (lowRiskCount === 0) {
      setActivityMessage('لا توجد تحديثات منخفضة المخاطر تنتظر الاعتماد.');
      return;
    }

    setUpdates((currentUpdates) => currentUpdates.map((update) => update.risk === 'low' && update.decision === 'pending' ? { ...update, decision: 'approved' } : update));
    setActivityMessage(`تم اعتماد ${formatNumber(lowRiskCount)} تحديثات منخفضة المخاطر.`);
  };

  return (
    <div className="operations-center">
      <header className="ops-command-bar glass-card">
        <div>
          <h2>مركز العمليات</h2>
          <p>شاشة قرار مختصرة: كلف المندوب، أكد الاستلام، أسند التوصيل، واعتمد تحديثات اليوم.</p>
        </div>
        <div className="ops-command-metrics">
          <MetricPill label="استلام" value={dashboardCounts.pickupShipments} tone="info" onClick={() => switchTab('pickupRequests')} />
          <MetricPill label="تأكيد" value={dashboardCounts.reviewQueue} tone="warning" onClick={() => switchTab('pickupReview')} />
          <MetricPill label="توصيل" value={dashboardCounts.unsentBoxes} tone="danger" onClick={() => switchTab('assignment')} />
          <MetricPill label="حالات" value={dashboardCounts.pendingUpdates} tone="warning" onClick={() => switchTab('driverUpdates')} />
        </div>
      </header>

      {activityMessage && <div className="ops-feedback">{activityMessage}</div>}

      <div className="ops-tabs glass-card">
        {tabs.map((tab) => (
          <button key={tab.id} className={`ops-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => switchTab(tab.id)}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pickupRequests' && <PickupRequestsTab requests={pickupRequests} onDispatch={dispatchPickup} />}
      {activeTab === 'pickupReview' && <PickupReviewTab reviewLines={reviewLines} scanValue={scanValue} onApproveReviewed={approveReviewed} onMarkReviewLine={markReviewLine} onScan={scanShipment} onScanValueChange={setScanValue} />}
      {activeTab === 'assignment' && <AssignmentTab boxes={visibleBoxes} capacity={capacity} onCapacityChange={regenerateBoxes} onChooseDriver={chooseBoxDriver} onMoveLastShipmentToNextBox={moveLastShipmentToNextBox} onSendBox={sendBox} onAssignReadyBoxes={assignReadyBoxes} />}
      {activeTab === 'driverUpdates' && <DriverUpdatesTab updates={updates} onApproveLowRisk={approveLowRiskUpdates} onDecideUpdate={decideUpdate} />}
    </div>
  );
}

function PickupRequestsTab({ requests, onDispatch }: { requests: PickupRequest[]; onDispatch: (requestId: string, driverName: string, shipmentIds: string[]) => void }) {
  const [selectedShipments, setSelectedShipments] = useState<Record<string, string[]>>(() => Object.fromEntries(pickupRequestsSeed.map((request) => [request.id, request.shipments])));
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>(() => Object.fromEntries(pickupRequestsSeed.map((request) => [request.id, request.drivers[0]])));

  const toggleShipment = (request: PickupRequest, shipmentId: string) => {
    setSelectedShipments((current) => {
      const selected = current[request.id] ?? request.shipments;
      const next = selected.includes(shipmentId) ? selected.filter((id) => id !== shipmentId) : [...selected, shipmentId];
      return { ...current, [request.id]: next };
    });
  };

  const selectAll = (request: PickupRequest) => setSelectedShipments((current) => ({ ...current, [request.id]: request.shipments }));

  if (requests.length === 0) return <EmptyState title="لا توجد طلبات استلام" text="كل طلبات التجار الحالية تم تكليف المناديب بها." />;

  return (
    <section className="ops-section compact-flow">
      {requests.map((request) => {
        const selected = selectedShipments[request.id]?.filter((id) => request.shipments.includes(id)) ?? request.shipments;
        const driverName = selectedDrivers[request.id] ?? request.drivers[0];

        return (
          <article key={request.id} className="ops-row-card glass-card">
            <div className="ops-row-main">
              <div>
                <div className="ops-title-line">
                  <p className="ops-title">{request.merchantName}</p>
                  <span className={`ops-badge ${request.priority === 'high' ? 'danger' : 'info'}`}>{request.priority === 'high' ? 'عاجل' : 'طبيعي'}</span>
                </div>
                <p className="ops-meta">{request.zone} - {request.address} - <span dir="ltr">{request.phone}</span></p>
              </div>
              <div className="ops-row-number">
                <strong>{formatNumber(request.shipments.length)}</strong>
                <span>بوليصة</span>
              </div>
            </div>

            <div className="shipment-check-grid">
              {request.shipments.map((shipmentId) => (
                <label key={shipmentId} className={`shipment-check ${selected.includes(shipmentId) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={selected.includes(shipmentId)} onChange={() => toggleShipment(request, shipmentId)} />
                  <span>{shipmentId}</span>
                </label>
              ))}
            </div>

            <div className="ops-row-actions">
              <label className="driver-select-field">
                <span>المندوب</span>
                <select className="ops-select" value={driverName} onChange={(event) => setSelectedDrivers((current) => ({ ...current, [request.id]: event.target.value }))}>
                  {request.drivers.map((driver) => <option key={driver} value={driver}>{driver}</option>)}
                </select>
              </label>
              <button className="outline-btn" onClick={() => selectAll(request)}><ClipboardCheck size={15} /> تحديد الكل</button>
              <button className="btn-primary" onClick={() => onDispatch(request.id, driverName, selected)} disabled={selected.length === 0}><UserCheck size={15} /> تكليف بالاستلام ({formatNumber(selected.length)})</button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function PickupReviewTab({ reviewLines, scanValue, onApproveReviewed, onMarkReviewLine, onScan, onScanValueChange }: { reviewLines: PickupReviewLine[]; scanValue: string; onApproveReviewed: () => void; onMarkReviewLine: (shipmentId: string, status: PickupLineStatus) => void; onScan: () => void; onScanValueChange: (value: string) => void }) {
  const verifiedCount = reviewLines.filter((line) => line.status === 'verified').length;

  return (
    <section className="ops-section">
      <div className="scanner-panel glass-card">
        <ScanLine size={20} />
        <input className="input-glass" dir="ltr" placeholder="SHP-1001" value={scanValue} onChange={(event) => onScanValueChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onScan(); }} />
        <button className="btn-primary" onClick={onScan}>تعليم كمستلم</button>
        <button className="outline-btn" onClick={onApproveReviewed}>اعتماد المعلم ({formatNumber(verifiedCount)})</button>
      </div>

      {reviewLines.length === 0 ? <EmptyState title="لا توجد شحنات للتأكيد" text="أي تكليف استلام يظهر هنا للمراجعة بالسكانر." /> : (
        <div className="review-table glass-card">
          <div className="table-wrapper">
            <table className="data-table compact-table">
              <thead><tr><th>البوليصة</th><th>التاجر</th><th>المندوب</th><th>الكاش</th><th>الحالة</th><th>قرار الشركة</th></tr></thead>
              <tbody>
                {reviewLines.map((line) => (
                  <tr key={line.id} className="table-row">
                    <td className="tracking-num">{line.id}</td><td>{line.merchantName}</td><td>{line.driverName}</td><td className="amount">{formatCurrency(line.codAmount)}</td>
                    <td><span className={`ops-badge ${pickupLineTone[line.status]}`}>{pickupLineLabels[line.status]}</span></td>
                    <td><div className="row-actions"><button className="btn-icon sm" title="تمت المراجعة" onClick={() => onMarkReviewLine(line.id, 'verified')}><CheckCircle2 size={14} /></button><button className="btn-icon sm" title="ناقص" onClick={() => onMarkReviewLine(line.id, 'missing')}><XCircle size={14} /></button><button className="btn-icon sm" title="مرتجع" onClick={() => onMarkReviewLine(line.id, 'returned')}><PackageCheck size={14} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function AssignmentTab({ boxes, capacity, onCapacityChange, onChooseDriver, onMoveLastShipmentToNextBox, onSendBox, onAssignReadyBoxes }: { boxes: Array<DeliveryBox & { shipments: DeliveryShipment[] }>; capacity: number; onCapacityChange: (capacity: number) => void; onChooseDriver: (boxId: string, driverId: string) => void; onMoveLastShipmentToNextBox: (boxId: string) => void; onSendBox: (boxId: string) => void; onAssignReadyBoxes: () => void }) {
  return (
    <section className="ops-section">
      <div className="ops-toolbar glass-card">
        <div><strong>قدرة المندوب</strong><span>الشحنات تتقسم لمجموعات حسب الزون والأولوية.</span></div>
        <div className="capacity-control">{[3, 5, 8, 10].map((value) => <button key={value} className={`capacity-chip ${capacity === value ? 'active' : ''}`} onClick={() => onCapacityChange(value)}>{formatNumber(value)}</button>)}</div>
        <button className="btn-primary" onClick={onAssignReadyBoxes}>إسناد كل الجاهز</button>
      </div>

      <div className="assignment-layout">
        <aside className="driver-candidates glass-card">
          <h4>ترشيح المناديب</h4>
          {drivers.map((driver) => <div key={driver.id} className="driver-candidate"><div><strong>{driver.name}</strong><p>{driver.zone} - حمولة {formatNumber(driver.activeLoad)}/{formatNumber(driver.capacity)}</p></div><span className="score-pill">{formatNumber(driver.score)}٪</span></div>)}
        </aside>

        <div className="delivery-box-grid">
          {boxes.map((box, index) => {
            const zoneDrivers = drivers.filter((driver) => driver.zone === box.zone);
            const selectedDriver = drivers.find((driver) => driver.id === box.selectedDriverId);
            const totalCod = box.shipments.reduce((sum, shipment) => sum + shipment.codAmount, 0);

            return (
              <article key={box.id} className={`delivery-box glass-card ${box.sent ? 'assigned' : ''}`}>
                <div className="delivery-box-header"><div><p className="ops-title">مجموعة توصيل {formatNumber(index + 1)}</p><p className="ops-meta">{box.zone} - {formatNumber(box.shipmentIds.length)} شحنات - {formatCurrency(totalCod)}</p></div><span className={`ops-badge ${box.sent ? 'success' : 'warning'}`}>{box.sent ? 'تم الإسناد' : 'جاهز'}</span></div>
                <div className="delivery-box-list">{box.shipments.map((shipment) => <div key={shipment.id} className="delivery-box-row"><span className="tracking-num">{shipment.id}</span><span>{shipment.addressHint}</span><strong>{formatNumber(shipment.priority)}</strong></div>)}</div>
                <div className="ops-row-actions">
                  <label className="driver-select-field"><span>المندوب</span><select className="ops-select" value={box.selectedDriverId ?? ''} onChange={(event) => onChooseDriver(box.id, event.target.value)} disabled={box.sent}><option value="">اختر مندوب</option>{zoneDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label>
                  <button className="outline-btn" onClick={() => onMoveLastShipmentToNextBox(box.id)} disabled={box.sent}>نقل آخر بوليصة</button>
                  <button className="btn-primary" onClick={() => onSendBox(box.id)} disabled={box.sent || !selectedDriver}><Send size={15} /> إسناد الشحنات</button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DriverUpdatesTab({ updates, onApproveLowRisk, onDecideUpdate }: { updates: DriverUpdate[]; onApproveLowRisk: () => void; onDecideUpdate: (updateId: string, decision: DriverDecision) => void }) {
  const pendingCount = updates.filter((update) => update.decision === 'pending').length;

  return (
    <section className="ops-section">
      <div className="ops-toolbar glass-card"><div><strong>{formatNumber(pendingCount)} تحديث ينتظر قرار</strong><span>اعتمد ما يظهر للتاجر، أو غير الحالة من الشركة، أو راجع المندوب.</span></div><button className="btn-primary" onClick={onApproveLowRisk}><CheckCircle2 size={15} /> اعتماد منخفض المخاطر</button></div>
      <div className="updates-grid">
        {updates.map((update) => <article key={update.id} className={`update-card glass-card ${update.decision !== 'pending' ? 'resolved' : ''}`}><div className="pickup-card-top"><div><p className="ops-title">{update.shipmentId} - {update.customerName}</p><p className="ops-meta">{update.driverName} - {update.merchantName}</p></div><span className={`ops-badge ${riskTone[update.risk]}`}>{riskLabels[update.risk]}</span></div><div className="status-change-line"><span>{update.fromStatus}</span><Send size={14} /><strong>{update.toStatus}</strong></div><p className="ops-meta">{update.note}</p>{update.decision === 'pending' ? <div className="ops-actions"><button className="btn-primary" onClick={() => onDecideUpdate(update.id, 'approved')}><CheckCircle2 size={15} /> اعتمده</button><button className="outline-btn" onClick={() => onDecideUpdate(update.id, 'changed')}>غير الحالة</button><button className="outline-btn" onClick={() => onDecideUpdate(update.id, 'review')}>راجع المندوب</button></div> : <p className="decision-note">{decisionLabels[update.decision]}</p>}</article>)}
      </div>
    </section>
  );
}

function MetricPill({ label, value, tone, onClick }: { label: string; value: number; tone: string; onClick: () => void }) {
  return <button className={`metric-pill ${tone}`} onClick={onClick}><span>{label}</span><strong>{formatNumber(value)}</strong></button>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-ops glass-card"><Truck size={22} /><strong>{title}</strong><span>{text}</span></div>;
}

function buildBoxes(shipments: DeliveryShipment[], capacity: number): DeliveryBox[] {
  const groupedByZone = shipments.slice().sort((a, b) => a.zone.localeCompare(b.zone, 'ar') || b.priority - a.priority).reduce<Record<string, DeliveryShipment[]>>((groups, shipment) => {
    groups[shipment.zone] = [...(groups[shipment.zone] ?? []), shipment];
    return groups;
  }, {});

  return Object.entries(groupedByZone).flatMap(([zone, zoneShipments]) => {
    const result: DeliveryBox[] = [];
    for (let index = 0; index < zoneShipments.length; index += capacity) {
      const shipmentIds = zoneShipments.slice(index, index + capacity).map((shipment) => shipment.id);
      const suggestedDriver = suggestDriver({ zone, shipmentIds });
      result.push({ id: `BOX-${zone.slice(0, 2)}-${String(result.length + 1).padStart(2, '0')}`, zone, shipmentIds, selectedDriverId: suggestedDriver?.id });
    }
    return result;
  });
}

function suggestDriver(box: Pick<DeliveryBox, 'zone' | 'shipmentIds'>): DriverCandidate | undefined {
  return drivers.filter((driver) => driver.zone === box.zone && driver.capacity - driver.activeLoad >= box.shipmentIds.length).sort((a, b) => b.score - a.score)[0];
}

const pickupLineLabels: Record<PickupLineStatus, string> = { waiting: 'بانتظار المراجعة', verified: 'تمت المراجعة', missing: 'ناقص', returned: 'مرتجع' };
const pickupLineTone: Record<PickupLineStatus, string> = { waiting: 'warning', verified: 'success', missing: 'danger', returned: 'danger' };
const riskLabels = { low: 'منخفض', medium: 'متوسط', high: 'عال' };
const riskTone = { low: 'success', medium: 'warning', high: 'danger' };
const decisionLabels: Record<DriverDecision, string> = { pending: 'بانتظار القرار', approved: 'تم اعتماده وسيظهر للتاجر', review: 'تم تحويله للمراجعة مع المندوب', changed: 'تم تغيير الحالة من الشركة' };


