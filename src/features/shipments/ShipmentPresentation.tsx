import { useState } from 'react';
import { AlertCircle, Banknote, CheckSquare, Eye, Printer, Square, Truck, X } from 'lucide-react';
import { Drawer, Modal } from '../../components/ui/Ui';
import type { Shipment } from '../../domain/logistics/entities';
import { getCsvValue, type CsvPreview } from './csvImport';
import {
  calculateShipmentFinancials,
  financialStatusConfig,
  formatAge,
  formatCurrency,
  formatDateTime,
  paymentTypeLabels,
  priorityConfig,
  statusConfig,
  taskStatusConfig,
} from '../../utils/helpers';

export type ShipmentAction = 'assign' | 'settlement';
export type BulkAction = 'assign' | 'print';
export type ShipmentColumn = 'customer' | 'merchant' | 'area' | 'driver' | 'status' | 'task' | 'collection' | 'updated';

const formatNumber = (value: number) => value.toLocaleString('ar-EG');

export function ShipmentRow({ shipment, checked, onToggle, onOpen, onPrint, now, visibleColumns }: { shipment: Shipment; checked: boolean; onToggle: () => void; onOpen: () => void; onPrint: () => void; now: number; visibleColumns: ShipmentColumn[] }) {
  const status = statusConfig[shipment.status];
  const task = taskStatusConfig[shipment.taskStatus];
  const financial = financialStatusConfig[shipment.financialStatus];
  const priority = priorityConfig[shipment.priority];
  const isDelayed = shipment.expectedDeliveryAt && new Date(shipment.expectedDeliveryAt).getTime() < now && !['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status);

  return (
    <tr className={`table-row ${checked ? 'selected-row' : ''} ${isDelayed ? 'delayed-row' : ''}`}>
      <td><button className="table-check" onClick={onToggle} aria-label={`تحديد ${shipment.id}`}>{checked ? <CheckSquare size={17} /> : <Square size={17} />}</button></td>
      <td><button className="tracking-link" onClick={onOpen}>{shipment.id}</button><small className="table-subline">{shipment.trackingNumber}</small></td>
      {visibleColumns.includes('customer') && <td><strong>{shipment.customerName}</strong><small className="table-subline" dir="ltr">{shipment.customerPhone}</small></td>}
      {visibleColumns.includes('merchant') && <td>{shipment.merchantName}</td>}
      {visibleColumns.includes('area') && <td>{shipment.governorate}<small className="table-subline">{shipment.city}</small></td>}
      {visibleColumns.includes('driver') && <td>{shipment.driverName ?? <span className="missing-value">غير معين</span>}</td>}
      {visibleColumns.includes('status') && <td><span className="status-badge" style={{ color: status.color, background: status.bg }}>{status.label}</span><span className="mini-badge" style={{ color: priority.color, background: priority.bg }}>{priority.label}</span></td>}
      {visibleColumns.includes('task') && <td><span className="status-badge" style={{ color: task.color, background: task.bg }}>{task.label}</span>{shipment.exceptionReason && <small className="table-subline exception-text">{shipment.exceptionReason}</small>}</td>}
      {visibleColumns.includes('collection') && <td><strong className="amount">{formatCurrency(shipment.expectedCollection)}</strong><small className="table-subline" style={{ color: financial.color }}>{financial.label}</small></td>}
      {visibleColumns.includes('updated') && <td>{formatAge(shipment.lastUpdatedAt)}{isDelayed && <small className="table-subline delayed-text">متأخرة عن الموعد</small>}</td>}
      <td><div className="row-actions"><button className="btn-icon sm" onClick={onOpen} aria-label={`عرض ${shipment.id}`}><Eye size={15} /></button><button className="btn-icon sm" onClick={onPrint} aria-label={`طباعة ${shipment.id}`}><Printer size={15} /></button></div></td>
    </tr>
  );
}

export function SelectionBar({ count, total, totalCod, onAssign, onPrint, onClear }: { count: number; total: number; totalCod: number; onAssign: () => void; onPrint: () => void; onClear: () => void }) {
  return (
    <div className="selection-bar glass-panel">
      <div><strong>تم تحديد {formatNumber(count)} من {formatNumber(total)} نتيجة ظاهرة</strong><small>إجمالي التحصيل المتوقع: {formatCurrency(totalCod)}</small></div>
      <div className="selection-actions"><button className="outline-btn" onClick={onAssign}><Truck size={15} /> تعيين مندوب</button><button className="outline-btn" onClick={onPrint}><Printer size={15} /> طباعة</button><button className="icon-plain" onClick={onClear} aria-label="إلغاء التحديد"><X size={17} /></button></div>
    </div>
  );
}

export function ShipmentDrawer({ shipment, relatedShipments, attempts, activeAction, drivers, onClose, onAction, onCancelAction, onSubmitAction, onPrint }: { shipment: Shipment; relatedShipments: Shipment[]; attempts: string[]; activeAction: ShipmentAction | null; drivers: Array<{ id: string; name: string }>; onClose: () => void; onAction: (action: ShipmentAction) => void; onCancelAction: () => void; onSubmitAction: (payload: Record<string, string>) => void; onPrint: () => void }) {
  const financials = calculateShipmentFinancials(shipment);
  const status = statusConfig[shipment.status];
  const task = taskStatusConfig[shipment.taskStatus];
  const financial = financialStatusConfig[shipment.financialStatus];
  const priority = priorityConfig[shipment.priority];

  return (
    <Drawer className="detail-drawer" title={shipment.id} description={`ملف الشحنة — آخر تحديث ${formatAge(shipment.lastUpdatedAt)}`} onClose={onClose} footer={<button className="btn-primary full-width" onClick={onPrint}><Printer size={16} /> طباعة البوليصة</button>}>
        <div className="drawer-status-strip">
          <span style={{ color: status.color, background: status.bg }}>{status.label}</span>
          <span style={{ color: task.color, background: task.bg }}>{task.label}</span>
          <span style={{ color: financial.color, background: financial.bg }}>{financial.label}</span>
          <span style={{ color: priority.color, background: priority.bg }}>{priority.label}</span>
        </div>

        <div className="drawer-body">
          {shipment.exceptionReason && <div className="drawer-alert"><AlertCircle size={17} /><div><strong>سبب احتياج التدخل</strong><p>{shipment.exceptionReason}</p></div></div>}

          <section className="detail-section"><h4>بيانات المستلم والعنوان</h4><div className="detail-grid"><DetailRow label="الاسم" value={shipment.customerName} /><DetailRow label="الهاتف" value={shipment.customerPhone} dir="ltr" /><DetailRow label="المحافظة" value={shipment.governorate} /><DetailRow label="المدينة" value={shipment.city} /><DetailRow label="العنوان" value={shipment.address} wide /></div></section>
          <section className="detail-section"><h4>بيانات التشغيل</h4><div className="detail-grid"><DetailRow label="التاجر" value={shipment.merchantName} /><DetailRow label="المندوب" value={shipment.driverName ?? 'غير معين'} /><DetailRow label="نوع الدفع" value={paymentTypeLabels[shipment.paymentType]} /><DetailRow label="كود التتبع" value={shipment.trackingNumber} dir="ltr" /><DetailRow label="عدد المحاولات" value={formatNumber(shipment.attemptCount)} /><DetailRow label="موعد التوصيل" value={shipment.expectedDeliveryAt ? formatDateTime(shipment.expectedDeliveryAt) : 'غير محدد'} /></div></section>
          <section className="detail-section"><h4>عناصر البوليصة</h4><div className="shipment-items-table"><div className="shipment-items-head"><span>العنصر</span><span>المطلوب</span><span>المسلم</span><span>إعادة محاولة</span><span>مرتجع</span></div>{shipment.items.map((item, index) => <div className="shipment-items-row" key={item.id ?? `${shipment.id}-${index}`}><span><strong>{item.name}</strong><small>{formatCurrency(item.price)} للوحدة{item.dispositionReason ? ` · ${item.dispositionReason}` : ''}</small></span><span>{formatNumber(item.quantity)}</span><span className="success-text">{formatNumber(item.deliveredQuantity ?? (shipment.status === 'delivered' ? item.quantity : 0))}</span><span>{formatNumber(item.pendingQuantity ?? 0)}</span><span className="danger-value">{formatNumber(item.returnedQuantity ?? 0)}</span></div>)}</div></section>
          {(shipment.parentShipmentId || shipment.childShipmentIds?.length || relatedShipments.length > 0) && <section className="detail-section"><h4>تقسيم البوليصة</h4><div className="shipment-relations">{shipment.parentShipmentId && <div><span>البوليصة الأصلية</span><strong>{shipment.parentShipmentId}</strong></div>}{relatedShipments.map((item) => <div key={item.id}><span>{item.status === 'returned' ? 'جزء مرتجع' : item.status === 'postponed' ? 'جزء لإعادة المحاولة' : 'جزء تابع'}</span><strong>{item.id}</strong><small>{statusConfig[item.status].label} · {formatCurrency(item.expectedCollection)}</small></div>)}</div><p className="drawer-policy-note">رسوم الشحن الأساسية محفوظة على البوليصة الأصلية فقط، ولا تتكرر على الأجزاء التابعة.</p></section>}
          {shipment.deliveryProof && <section className="detail-section"><h4>إثبات التسليم المعتمد</h4><div className="proof-card"><div className="proof-preview">صورة إثبات</div><div className="detail-grid"><DetailRow label="المستلم" value={shipment.deliveryProof.recipientName} /><DetailRow label="وقت الالتقاط" value={formatDateTime(shipment.deliveryProof.capturedAt)} /><DetailRow label="حالة المراجعة" value={shipment.deliveryProof.reviewStatus === 'accepted' ? 'معتمد' : shipment.deliveryProof.reviewStatus === 'needsReview' ? 'يحتاج مراجعة' : 'معلق'} /><DetailRow label="دقة الموقع" value={shipment.deliveryProof.location ? `${formatNumber(shipment.deliveryProof.location.accuracyMeters)} متر` : 'غير متاح'} /><DetailRow label="المسافة من العنوان" value={shipment.deliveryProof.location?.distanceFromDestinationMeters !== undefined ? `${formatNumber(shipment.deliveryProof.location.distanceFromDestinationMeters)} متر` : 'غير متاح'} /><DetailRow label="مرجع الصورة" value={shipment.deliveryProof.reference} dir="ltr" wide /></div></div></section>}
          {shipment.merchantVisibleStatus && <section className="detail-section"><h4>الحالة الظاهرة للتاجر</h4><div className="merchant-visible-state"><strong>{shipment.merchantVisibleStatus}</strong><small>هذه هي الصياغة الرسمية التي أصدرتها شركة الشحن، وليست تحديث المندوب الخام.</small></div></section>}

          <section className="detail-section"><h4>سجل الحركة</h4><Timeline shipment={shipment} attempts={attempts} /></section>
          <section className="detail-section"><h4>التفاصيل المالية</h4><div className="financial-grid"><DetailRow label="إجمالي المنتجات" value={formatCurrency(financials.itemsSubtotal)} /><DetailRow label="رسوم الشحن" value={formatCurrency(financials.deliveryFee)} /><DetailRow label="المطلوب تحصيله" value={formatCurrency(financials.expectedCollection)} bold /><DetailRow label="المحصل فعليًا" value={formatCurrency(financials.collectedCash)} /><DetailRow label="تم توريده" value={formatCurrency(financials.remittedCash)} /><DetailRow label="فرق التحصيل" value={formatCurrency(financials.cashVariance)} danger={financials.cashVariance !== 0} /></div></section>
          <section className="detail-section"><h4>الإجراءات المتاحة</h4><div className="shipment-ops-grid"><button className="outline-btn" onClick={() => onAction('assign')}><Truck size={16} /> تعيين مندوب</button><button className="outline-btn" onClick={() => onAction('settlement')} disabled={shipment.collectedCash === 0}><Banknote size={16} /> طلب تسوية</button></div><p className="drawer-policy-note">تحديثات الحالة ومحاولات التسليم تأتي من دورة التشغيل الرسمية وتطبيق المندوب، ولا يتم إنشاؤها يدويًا من لوحة الإدارة.</p></section>
        </div>

        {activeAction && <ShipmentActionDialog action={activeAction} shipment={shipment} drivers={drivers} onCancel={onCancelAction} onSubmit={onSubmitAction} />}
    </Drawer>
  );
}

function ShipmentActionDialog({ action, shipment, drivers, onCancel, onSubmit }: { action: ShipmentAction; shipment: Shipment; drivers: Array<{ id: string; name: string }>; onCancel: () => void; onSubmit: (payload: Record<string, string>) => void }) {
  const [driverId, setDriverId] = useState(shipment.driverId ?? drivers[0]?.id ?? '');
  const title = action === 'assign' ? 'تعيين مندوب' : 'إرسال إلى التسوية';
  return (
    <div className="drawer-action-panel" role="dialog" aria-modal="true" aria-label={title}>
      <div className="drawer-header compact"><div><h3>{title}</h3><p className="drawer-id">{shipment.id}</p></div><button className="btn-icon sm" onClick={onCancel} aria-label="إغلاق"><X size={14} /></button></div>
      <div className="shipment-action-body">
        {action === 'assign' && <label className="form-field"><span>المندوب</span><select className="input-glass" value={driverId} onChange={(event) => setDriverId(event.target.value)}>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label>}
        {action === 'settlement' && <div className="dialog-summary"><Banknote size={18} /><div><strong>{formatCurrency(shipment.collectedCash)}</strong><p>سيتم إنشاء طلب تسوية رسمي على الخادم وربطه بالتاجر.</p></div></div>}
        <div className="dialog-actions"><button className="outline-btn" onClick={onCancel}>إلغاء</button><button className="btn-primary" onClick={() => onSubmit({ driverId })} disabled={action === 'assign' && !driverId}>تنفيذ</button></div>
      </div>
    </div>
  );
}

export function BulkActionDialog({ action, shipments, drivers, onCancel, onSubmit }: { action: BulkAction; shipments: Shipment[]; drivers: Array<{ id: string; name: string }>; onCancel: () => void; onSubmit: (payload: Record<string, string>) => void }) {
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? '');
  const totalCod = shipments.reduce((sum, shipment) => sum + shipment.expectedCollection, 0);
  const urgentCount = shipments.filter((shipment) => shipment.priority === 'urgent').length;
  const title = { assign: 'تعيين مندوب للشحنات المحددة', print: 'طباعة البوليصات المحددة' }[action];
  return <Modal title={title} description={`${formatNumber(shipments.length)} شحنة`} onClose={onCancel} footer={<><button className="outline-btn" onClick={onCancel}>إلغاء</button><button className="btn-primary" onClick={() => onSubmit({ driverId })}>تنفيذ</button></>}>
    <div className="shipment-action-body">
      <div className="bulk-summary"><div><span>إجمالي التحصيل</span><strong>{formatCurrency(totalCod)}</strong></div><div><span>شحنات عاجلة</span><strong>{formatNumber(urgentCount)}</strong></div><div><span>المناطق</span><strong>{formatNumber(new Set(shipments.map((shipment) => shipment.governorate)).size)}</strong></div></div>
      {action === 'assign' && <label className="form-field"><span>اختر المندوب</span><select className="input-glass" value={driverId} onChange={(event) => setDriverId(event.target.value)}>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label>}
      {action === 'print' && <div className="dialog-summary"><Printer size={18} /><p>ستفتح معاينة البوالص لاختيار مقاس 10×15 أو A4 وعدد النسخ قبل نافذة الطباعة.</p></div>}
    </div>
  </Modal>;
}

export function CsvPreviewDialog({ preview, onCancel, onConfirm }: { preview: CsvPreview; onCancel: () => void; onConfirm: () => void }) {
  const validRows = preview.rows.filter((row) => row.errors.length === 0 && !row.duplicate);
  const invalidRows = preview.rows.length - validRows.length;
  return <Modal wide className="csv-preview-modal" title={preview.fileName} description="مراجعة قبل الاستيراد — لن تتم إضافة أي شحنة قبل التأكيد." onClose={onCancel} footer={<><button className="outline-btn" onClick={onCancel}>إلغاء</button><button className="btn-primary" onClick={onConfirm} disabled={validRows.length === 0}>استيراد {formatNumber(validRows.length)} شحنة صالحة</button></>}>
    <div className="csv-summary"><span className="success">صالحة: {formatNumber(validRows.length)}</span><span className="danger">مرفوضة أو مكررة: {formatNumber(invalidRows)}</span><span>الإجمالي: {formatNumber(preview.rows.length)}</span></div>
    <div className="table-wrapper csv-table-wrap"><table className="data-table compact-table"><thead><tr><th>الصف</th><th>العميل</th><th>الهاتف</th><th>العنوان</th><th>المبلغ</th><th>النتيجة</th></tr></thead><tbody>{preview.rows.slice(0, 50).map((row) => <tr key={row.rowNumber}><td>{formatNumber(row.rowNumber)}</td><td>{getCsvValue(row.data, ['customerName', 'العميل', 'name']) || '-'}</td><td dir="ltr">{getCsvValue(row.data, ['phone', 'customerPhone', 'الهاتف']) || '-'}</td><td>{getCsvValue(row.data, ['address', 'العنوان']) || '-'}</td><td>{getCsvValue(row.data, ['total', 'المبلغ', 'amount']) || '-'}</td><td>{row.duplicate ? <span className="csv-error">مكرر</span> : row.errors.length > 0 ? <span className="csv-error">{row.errors.join('، ')}</span> : <span className="csv-valid">صالح</span>}</td></tr>)}</tbody></table></div>
  </Modal>;
}

function Timeline({ shipment, attempts }: { shipment: Shipment; attempts: string[] }) {
  const items = [
    { title: 'تم إنشاء الشحنة', detail: `${shipment.merchantName} — ${formatDateTime(shipment.createdAt)}`, done: true },
    { title: 'وصلت مكتب الشحن', detail: 'تم استلامها ومراجعتها داخليًا', done: ['receivedAtOffice', 'deliveredToDriver', 'inTransit', 'delivered', 'partiallyDelivered', 'postponed', 'failedToDeliver', 'returned'].includes(shipment.status) },
    { title: 'تم تعيين مندوب', detail: shipment.driverName ?? 'لم يتم تعيين مندوب بعد', done: Boolean(shipment.driverName) },
    { title: 'آخر حالة تشغيلية', detail: `${statusConfig[shipment.status].label} — ${formatDateTime(shipment.statusChangedAt)}`, done: true },
  ];
  return <div className="timeline-list">{items.map((item) => <div key={item.title} className={`timeline-item ${item.done ? 'done' : ''}`}><span className="timeline-dot" /><div><strong>{item.title}</strong><small>{item.detail}</small></div></div>)}{attempts.map((attempt, index) => <div key={`${shipment.id}-attempt-${index}`} className="timeline-item warning"><span className="timeline-dot" /><div><strong>محاولة تسليم</strong><small>{attempt}</small></div></div>)}</div>;
}

function DetailRow({ label, value, dir, bold, wide, danger }: { label: string; value: string; dir?: 'ltr' | 'rtl'; bold?: boolean; wide?: boolean; danger?: boolean }) {
  return <div className={`detail-row ${wide ? 'wide' : ''}`}><span className="detail-label">{label}</span><span className={`detail-value ${bold ? 'bold-value' : ''} ${danger ? 'danger-value' : ''}`} dir={dir}>{value}</span></div>;
}

