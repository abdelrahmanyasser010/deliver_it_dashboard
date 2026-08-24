import { Barcode, CheckCircle2, PenLine, RotateCcw, ScanLine, TriangleAlert, Undo2, XCircle } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { EmptyState, PageSkeleton } from '../components/AsyncState';
import { MetricCard, Modal, SectionHeader, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Shipment } from '../domain/logistics/entities';
import { createClientId } from '../utils/id';
import './BarcodeIntake.css';

export function BarcodeIntakePage() {
  const { state, isLoading, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const [pickupTaskId, setPickupTaskId] = useState('');
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [lastScan, setLastScan] = useState<{ code: string; status: 'success' | 'duplicate' | 'unexpected'; message: string } | null>(null);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [newFee, setNewFee] = useState<number>(0);
  const [feeReason, setFeeReason] = useState<string>('طرد كبير الحجم (أبعاد كرتونة ضخمة)');
  const [customReason, setCustomReason] = useState<string>('');
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
    if (result.ok) { setActiveBatchId(batchId); setInput(''); setLastScan(null); }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = input.trim(); if (!code || !activeBatch) return;
    setInput('');
    const shipment = shipments.find((item) => item.id === code || item.trackingNumber === code);
    const resolvedCode = shipment?.id ?? code;

    if (activeBatch.scannedShipmentIds.includes(resolvedCode)) {
      setLastScan({ code: resolvedCode, status: 'duplicate', message: '⚠ تم مسح هذه الشحنة مسبقًا' }); beep(220);
    } else if (!activeBatch.expectedShipmentIds.includes(resolvedCode)) {
      setLastScan({ code: resolvedCode, status: 'unexpected', message: '✕ الشحنة ليست ضمن هذه الدفعة' }); beep(220);
    } else {
      setLastScan({ code: resolvedCode, status: 'success', message: `✓ تم الاستلام — ${resolvedCode} — ${shipment?.customerName ?? ''}` }); beep(780);
    }

    await run({ type: 'barcode/scan', batchId: activeBatch.id, shipmentId: resolvedCode });
    inputRef.current?.focus();
  };

  const closeBatch = async () => { if (!activeBatch) return; const result = await run({ type: 'barcode/close', batchId: activeBatch.id }); if (result.ok) { setActiveBatchId(null); setLastScan(null); } };

  const startEditFee = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setNewFee(shipment.deliveryFee);
    setFeeReason('طرد كبير الحجم (أبعاد كرتونة ضخمة)');
    setCustomReason('');
  };

  const submitEditFee = async () => {
    if (!editingShipment) return;
    const finalReason = feeReason === 'other' ? customReason.trim() : (customReason.trim() ? `${feeReason} — ${customReason.trim()}` : feeReason);
    await run({
      type: 'shipment/overrideFee',
      shipmentId: editingShipment.id,
      deliveryFee: newFee,
      reason: finalReason || 'تعديل رسوم الشحن عند الاستلام',
    });
    setEditingShipment(null);
  };

  return <div className="barcode-page">
    <header className="barcode-header-row">
      <div className="barcode-title-col">
        <h2>استلام الشحنات بالباركود</h2>
        <p>مسح سريع لطلبات الاستلام لضمان مطابقة الشحنات وتسجيلها وتعديل الرسوم عند الحاجة.</p>
      </div>
      {!activeBatch && (
        <div className="barcode-batch-selector">
          <select className="input-glass" value={pickupTaskId || selectedTask?.id || ''} onChange={(event) => setPickupTaskId(event.target.value)}>
            <option value="">اختر طلب الاستلام...</option>
            {pickupTasks.map((task) => <option key={task.id} value={task.id}>{task.id} — {task.merchantName} ({task.items.length})</option>)}
          </select>
          <button className="btn-primary" onClick={() => void createBatch()} disabled={!selectedTask}><Barcode size={15}/> بدء الدفعة</button>
        </div>
      )}
    </header>

    <div className="barcode-metrics">
      <MetricCard label="المتوقع" value={activeBatch ? activeBatch.expectedShipmentIds.length.toString() : selectedTask ? selectedTask.items.length.toString() : '—'} detail={activeBatch?.merchantName ?? selectedTask?.merchantName ?? 'اختر مهمة'} icon={Barcode}/>
      <MetricCard label="تم المسح" value={activeBatch ? activeBatch.scannedShipmentIds.length.toString() : selectedTask ? '0' : '—'} detail="مسح صحيح" icon={CheckCircle2} tone="success"/>
      <MetricCard label="الناقص" value={activeBatch ? missing.length.toString() : selectedTask ? selectedTask.items.length.toString() : '—'} detail="لم يتم مسحها" icon={TriangleAlert} tone={missing.length ? 'warning' : 'success'}/>
      <MetricCard label="مشكلات المسح" value={activeBatch ? (activeBatch.unexpectedShipmentIds.length + activeBatch.duplicateScans.length).toString() : selectedTask ? '0' : '—'} detail="غير متوقع أو مكرر" icon={XCircle} tone="danger"/>
    </div>

    {!activeBatch ? (
      <div className="barcode-empty-state">
        <ScanLine size={32} />
        <p>لا توجد دفعة مفتوحة. اختر طلب استلام من الأعلى لبدء المسح.</p>
      </div>
    ) : (
      <>
        <section className="scanner-workflow glass-card">
          <div className="scanner-main">
            <div className="scanner-progress-info">
              <h3>مسح دفعة {activeBatch.id}</h3>
              <span className="progress-text">{activeBatch.scannedShipmentIds.length} من {activeBatch.expectedShipmentIds.length} شحنة</span>
            </div>
            
            {lastScan && (
              <div className={`scan-feedback ${lastScan.status}`}>
                {lastScan.message}
              </div>
            )}

            <form className="scanner-form" onSubmit={handleScanSubmit}>
              <input ref={inputRef} autoFocus value={input} onChange={(event) => setInput(event.target.value)} placeholder="مرر الباركود أو اكتب SHP-0001..." dir="ltr" />
              <button type="submit" className="btn-primary sr-only">مسح</button>
            </form>
          </div>
          <div className="scanner-actions">
            <button className="outline-btn" disabled={!activeBatch.scannedShipmentIds.length} onClick={() => { void run({ type: 'barcode/undo', batchId: activeBatch.id }); inputRef.current?.focus(); }}><Undo2 size={15}/> تراجع عن المسح الأخير</button>
            <button className="btn-primary" onClick={() => void closeBatch()} disabled={missing.length > 0}>إغلاق الدفعة المكتملة</button>
          </div>
        </section>

        <div className="barcode-layout">
          <section className="glass-card">
            <SectionHeader title="سجل المسح" description="السجل محفوظ داخل الدفعة — يمكنك تعديل رسوم أي طرد كبير أو زائد الوزن."/>
            <div className="scan-list">
              {activeBatch.scannedShipmentIds.map((id) => {
                const shipment = shipments.find((item) => item.id === id);
                return (
                  <div key={`ok-${id}`} className="scan-row success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span><CheckCircle2 size={17}/></span>
                      <div>
                        <strong>{id}</strong>
                        <small>{shipment ? `${shipment.customerName} — ${shipment.merchantName} (${shipment.deliveryFee} ج.م)` : 'شحنة'}</small>
                        {shipment?.feeOverrideReason && <small style={{ color: '#EAB308', display: 'block' }}>💡 {shipment.feeOverrideReason}</small>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {shipment && (
                        <button
                          className="outline-btn sm"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                          onClick={() => startEditFee(shipment)}
                          title="تعديل الرسوم أو الوزن"
                        >
                          <PenLine size={13}/> تعديل الرسوم
                        </button>
                      )}
                      <StatusBadge label="صحيح" tone="success"/>
                    </div>
                  </div>
                );
              })}
              {activeBatch.duplicateScans.map((id,index) => <div key={`dup-${id}-${index}`} className="scan-row duplicate"><span><RotateCcw size={17}/></span><div><strong>{id}</strong><small>تم مسحه من قبل</small></div><StatusBadge label="مكرر" tone="danger"/><em>مراجعة</em></div>)}
              {activeBatch.unexpectedShipmentIds.map((id,index) => <div key={`unexpected-${id}-${index}`} className="scan-row unexpected"><span><XCircle size={17}/></span><div><strong>{id}</strong><small>غير موجود في طلب الاستلام</small></div><StatusBadge label="غير متوقع" tone="danger"/><em>مراجعة</em></div>)}
            </div>
          </section>
          <section className="glass-card">
            <SectionHeader title="الشحنات الناقصة" description="تتحدث بعد كل مسح."/>
            {missing.length === 0 ? <EmptyState title="اكتملت الدفعة" description="يمكن إغلاقها وتحديث الشحنات."/> : <div className="missing-list">{missing.map((id) => { const shipment = expectedShipments.find((item) => item?.id === id); return <div key={id}><span><strong>{id}</strong><small>{shipment?.customerName}</small></span><em>{shipment?.merchantName}</em></div>; })}</div>}
          </section>
        </div>
      </>
    )}

    {editingShipment && (
      <Modal
        title={`تعديل رسوم الشحنة ${editingShipment.id}`}
        description="تسجيل رسوم خاصة بسبب الحجم أو الوزن الزائد مع إشعار التاجر بالسبب."
        onClose={() => setEditingShipment(null)}
        footer={
          <>
            <button className="outline-btn" onClick={() => setEditingShipment(null)}>إلغاء</button>
            <button className="btn-primary" onClick={() => void submitEditFee()}>حفظ واعتماد الرسوم</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label className="form-field">
            <span>سعر الشحن الجديد (ج.م)</span>
            <input
              type="number"
              min="0"
              className="input-glass"
              value={newFee}
              onChange={(e) => setNewFee(Number(e.target.value))}
            />
          </label>
          <label className="form-field">
            <span>سبب التعديل</span>
            <select
              className="input-glass"
              value={feeReason}
              onChange={(e) => setFeeReason(e.target.value)}
            >
              <option value="طرد كبير الحجم (أبعاد كرتونة ضخمة)">طرد كبير الحجم (أبعاد كرتونة ضخمة)</option>
              <option value="وزن زائد عن الوزن المسموح">وزن زائد عن الوزن المسموح</option>
              <option value="تعديل وجهة التسليم لمحافظة أخرى">تعديل وجهة التسليم لمحافظة أخرى</option>
              <option value="خصم تعاقدي خاص للتاجر">خصم تعاقدي خاص للتاجر</option>
              <option value="other">سبب آخر (كتابة مخصصة)...</option>
            </select>
          </label>
          <label className="form-field">
            <span>ملاحظة تظهر للتاجر في البوليصة والحساب</span>
            <input
              type="text"
              className="input-glass"
              placeholder="اكتب توضيحًا للتاجر..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          </label>
        </div>
      </Modal>
    )}
  </div>;
}

