import { Barcode, CheckCircle2, PackageCheck, RotateCcw, ScanLine, TriangleAlert, Undo2, XCircle } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { EmptyState, PageSkeleton } from '../components/AsyncState';
import { MetricCard, SectionHeader, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { createClientId } from '../utils/id';
import './BarcodeIntake.css';

export function BarcodeIntakePage() {
  const { state, isLoading, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const [pickupTaskId, setPickupTaskId] = useState('');
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const shipments = useMemo(() => state?.shipments ?? [], [state?.shipments]);
  const pickupTasks = useMemo(() => state?.pickupTasks.filter((task) => task.status !== 'approved') ?? [], [state?.pickupTasks]);
  const activeBatch = state?.barcodeBatches.find((batch) => batch.id === activeBatchId) ?? state?.barcodeBatches.find((batch) => batch.status === 'open') ?? null;
  const selectedTask = pickupTasks.find((task) => task.id === pickupTaskId) ?? pickupTasks[0] ?? null;
  const expectedShipments = useMemo(() => activeBatch ? activeBatch.expectedShipmentIds.map((id) => shipments.find((item) => item.id === id)).filter(Boolean) : [], [activeBatch, shipments]);
  const missing = activeBatch ? activeBatch.expectedShipmentIds.filter((id) => !activeBatch.scannedShipmentIds.includes(id)) : [];

  if (isLoading || !state) return <PageSkeleton rows={4}/>;
  const run = async (command: Parameters<typeof execute>[0]) => { const result = await execute(command); showToast(result.message, result.ok ? 'success' : 'warning'); return result; };
  const beep = (frequency: number) => { try { const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!Context) return; const context = new Context(); const oscillator = context.createOscillator(); oscillator.frequency.value = frequency; oscillator.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .08); } catch { /* browser may block audio */ } };
  const createBatch = async () => {
    if (!selectedTask) { showToast('لا توجد مهمة استلام متاحة لإنشاء دفعة.', 'warning'); return; }
    const batchId = createClientId('BAR');
    const result = await run({ type: 'barcode/create', batch: { id: batchId, pickupTaskId: selectedTask.id, merchantId: selectedTask.merchantId, merchantName: selectedTask.merchantName, expectedShipmentIds: selectedTask.items.filter((item) => item.expected).map((item) => item.shipmentId), scannedShipmentIds: [], unexpectedShipmentIds: [], duplicateScans: [], status: 'open', createdAt: new Date().toISOString(), operatorName: 'موظف المخزن' } });
    if (result.ok) { setActiveBatchId(batchId); setInput(''); inputRef.current?.focus(); }
  };
  const scan = async () => {
    const code = input.trim(); if (!code || !activeBatch) return;
    const shipment = shipments.find((item) => item.id === code || item.trackingNumber === code);
    const result = await run({ type: 'barcode/scan', batchId: activeBatch.id, shipmentId: shipment?.id ?? code });
    beep(result.ok ? 780 : 220); setInput(''); inputRef.current?.focus();
  };
  const closeBatch = async () => { if (!activeBatch) return; const result = await run({ type: 'barcode/close', batchId: activeBatch.id }); if (result.ok) setActiveBatchId(null); };

  return <div className="barcode-page"><SectionHeader title="استلام الشحنات بالباركود" description="دفعات مرتبطة بطلبات الاستلام؛ إغلاق الدفعة يحدث حالات الشحنات وسجلها التشغيلي." actions={<div className="toolbar-actions"><select className="input-glass" value={pickupTaskId || selectedTask?.id || ''} onChange={(event) => setPickupTaskId(event.target.value)} disabled={Boolean(activeBatch)}><option value="">اختر طلب الاستلام</option>{pickupTasks.map((task) => <option key={task.id} value={task.id}>{task.id} — {task.merchantName} ({task.items.length})</option>)}</select><button className="outline-btn" onClick={() => void createBatch()} disabled={Boolean(activeBatch) || !selectedTask}><Barcode size={15}/> بدء دفعة</button></div>}/>
    <div className="barcode-metrics"><MetricCard label="المتوقع" value={(activeBatch?.expectedShipmentIds.length ?? 0).toLocaleString('ar-EG')} detail={activeBatch?.merchantName ?? 'اختر مهمة'} icon={Barcode}/><MetricCard label="تم المسح" value={(activeBatch?.scannedShipmentIds.length ?? 0).toLocaleString('ar-EG')} detail="مسح صحيح" icon={CheckCircle2} tone="success"/><MetricCard label="الناقص" value={missing.length.toLocaleString('ar-EG')} detail="لم يتم مسحها" icon={TriangleAlert} tone={missing.length ? 'warning' : 'success'}/><MetricCard label="غير متوقع أو مكرر" value={((activeBatch?.unexpectedShipmentIds.length ?? 0) + (activeBatch?.duplicateScans.length ?? 0)).toLocaleString('ar-EG')} detail="يحتاج مراجعة" icon={XCircle} tone="danger"/></div>
    {!activeBatch ? <section className="glass-card"><EmptyState title="لا توجد دفعة مفتوحة" description="اختر طلب استلام ثم ابدأ دفعة جديدة. كل دفعة تحفظ رقم الطلب والتاجر والمستخدم." actionLabel="بدء الدفعة المختارة" onAction={() => void createBatch()}/></section> : <><section className="scanner-card glass-card"><div className="scanner-icon"><ScanLine size={32}/></div><div><h3>{activeBatch.id}</h3><p>{activeBatch.merchantName} · المشغل {activeBatch.operatorName}</p></div><div className="scanner-input"><input ref={inputRef} autoFocus value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void scan(); }} placeholder="SHP-0001 أو كود التتبع"/><button className="btn-primary" onClick={() => void scan()}><PackageCheck size={16}/> تأكيد المسح</button></div><div className="scanner-actions"><button className="outline-btn" disabled={!activeBatch.scannedShipmentIds.length} onClick={() => void run({ type: 'barcode/undo', batchId: activeBatch.id })}><Undo2 size={15}/> تراجع</button><button className="btn-primary" onClick={() => void closeBatch()} disabled={missing.length > 0}>إغلاق الدفعة</button></div></section><div className="barcode-layout"><section className="glass-card"><SectionHeader title="سجل المسح" description="السجل محفوظ داخل الدفعة."/><div className="scan-list">{activeBatch.scannedShipmentIds.map((id) => { const shipment = shipments.find((item) => item.id === id); return <div key={`ok-${id}`} className="scan-row success"><span><CheckCircle2 size={17}/></span><div><strong>{id}</strong><small>{shipment ? `${shipment.customerName} — ${shipment.merchantName}` : 'شحنة'}</small></div><StatusBadge label="صحيح" tone="success"/><em>مسجل</em></div>; })}{activeBatch.duplicateScans.map((id,index) => <div key={`dup-${id}-${index}`} className="scan-row duplicate"><span><RotateCcw size={17}/></span><div><strong>{id}</strong><small>تم مسحه من قبل</small></div><StatusBadge label="مكرر" tone="danger"/><em>مراجعة</em></div>)}{activeBatch.unexpectedShipmentIds.map((id,index) => <div key={`unexpected-${id}-${index}`} className="scan-row unexpected"><span><XCircle size={17}/></span><div><strong>{id}</strong><small>غير موجود في طلب الاستلام</small></div><StatusBadge label="غير متوقع" tone="danger"/><em>مراجعة</em></div>)}</div></section><section className="glass-card"><SectionHeader title="الشحنات الناقصة" description="تتحدث من الـStore بعد كل مسح."/>{missing.length === 0 ? <EmptyState title="اكتملت الدفعة" description="يمكن إغلاقها وتحديث الشحنات."/> : <div className="missing-list">{missing.map((id) => { const shipment = expectedShipments.find((item) => item?.id === id); return <div key={id}><span><strong>{id}</strong><small>{shipment?.customerName}</small></span><em>{shipment?.merchantName}</em></div>; })}</div>}</section></div></>}
  </div>;
}
