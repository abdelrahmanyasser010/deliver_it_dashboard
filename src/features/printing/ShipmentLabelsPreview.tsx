import { useMemo, useState } from 'react';
import { Copy, Printer, X } from 'lucide-react';
import type { Shipment } from '../../domain/logistics/entities';
import type { PrintingSettings } from '../../domain/settings/entities';
import { formatCurrency } from '../../utils/helpers';
import { Code128Barcode } from './Code128Barcode';
import './ShipmentLabelsPreview.css';

type PrintFormat = 'thermal' | 'a4';

export function ShipmentLabelsPreview({ shipments, settings, onClose }: { shipments: Shipment[]; settings?: PrintingSettings; onClose: () => void }) {
  const [format, setFormat] = useState<PrintFormat>(settings?.defaultLabelFormat ?? 'thermal');
  const [copies, setCopies] = useState(settings?.defaultCopies ?? 1);
  const labels = useMemo(() => Array.from({ length: Math.max(1, copies) }).flatMap(() => shipments), [shipments, copies]);
  const pages = useMemo(() => format === 'a4' ? chunk(labels, 4) : labels.map((item) => [item]), [labels, format]);
  const print = () => { document.body.dataset.shipmentPrint = 'active'; window.setTimeout(() => { window.print(); window.setTimeout(() => delete document.body.dataset.shipmentPrint, 150); }, 40); };
  return <div className="print-preview-overlay" role="dialog" aria-modal="true" aria-label="معاينة طباعة البوالص">
    <section className="print-preview-panel glass-panel"><header><div><h3>معاينة طباعة البوالص</h3><p>{shipments.length.toLocaleString('ar-EG')} شحنة · {labels.length.toLocaleString('ar-EG')} نسخة</p></div><button className="btn-icon" onClick={onClose} aria-label="إغلاق"><X size={17}/></button></header><div className="print-settings"><label><span>المقاس</span><select value={format} onChange={(event) => setFormat(event.target.value as PrintFormat)}><option value="thermal">حراري 10 × 15 سم</option><option value="a4">A4 — أربع بوالص في الصفحة</option></select></label><label><span>عدد النسخ</span><input type="number" min="1" max="5" value={copies} onChange={(event) => setCopies(Math.max(1, Math.min(5, Number(event.target.value) || 1)))}/></label><div className="print-preview-summary"><Copy size={16}/><span>{pages.length.toLocaleString('ar-EG')} صفحة طباعة</span></div></div><div className={`print-preview-canvas ${format}`}>{pages.map((page, pageIndex) => <div className={`print-page-preview ${format}`} key={`preview-${pageIndex}`}>{page.map((shipment) => <ShipmentLabel key={`${pageIndex}-${shipment.id}`} shipment={shipment} settings={settings}/>)}</div>)}</div><footer><button className="outline-btn" onClick={onClose}>إلغاء</button><button className="btn-primary" onClick={print}><Printer size={16}/> طباعة {labels.length.toLocaleString('ar-EG')} بوليصة</button></footer></section>
    <div className={`shipment-print-area ${format}`} aria-hidden="true"><style>{format === 'thermal' ? '@page { size: 100mm 150mm; margin: 0; }' : '@page { size: A4; margin: 8mm; }'}</style>{pages.map((page, pageIndex) => <div className={`shipment-print-page ${format}`} key={`print-${pageIndex}`}>{page.map((shipment) => <ShipmentLabel key={`${pageIndex}-${shipment.id}-print`} shipment={shipment} settings={settings}/>)}</div>)}</div>
  </div>;
}

function ShipmentLabel({ shipment, settings }: { shipment: Shipment; settings?: PrintingSettings }) {
  const items = shipment.items.reduce((sum, item) => sum + item.quantity, 0);
  return <article className="shipping-label" dir="rtl"><div className="label-brand"><strong>DELIVER IT</strong><span>بوليصة شحن</span></div><div className="label-tracking"><Code128Barcode value={shipment.trackingNumber || shipment.id}/><strong dir="ltr">{shipment.trackingNumber || shipment.id}</strong></div><div className="label-grid"><div className="label-wide"><span>المستلم</span><strong>{shipment.customerName}</strong><em dir="ltr">{shipment.customerPhone}</em></div><div><span>المحافظة</span><strong>{shipment.governorate}</strong></div><div><span>المدينة</span><strong>{shipment.city}</strong></div><div className="label-wide"><span>العنوان</span><strong>{shipment.address}</strong></div><div><span>COD</span><strong>{settings?.showCod === false ? '—' : formatCurrency(shipment.expectedCollection)}</strong></div><div><span>عدد القطع</span><strong>{items.toLocaleString('ar-EG')}</strong></div><div className="label-wide"><span>التاجر</span><strong>{shipment.merchantName}</strong></div>{settings?.showContents && <div className="label-wide"><span>المحتويات</span><strong>{shipment.items.map((item) => `${item.name} × ${item.quantity}`).join('، ')}</strong></div>}</div><div className="label-footer"><span>{shipment.paymentType === 'cashOnDelivery' ? 'COD' : 'مدفوع مسبقًا'}</span><span>{shipment.priority === 'urgent' ? 'عاجل' : shipment.priority === 'high' ? 'أولوية' : 'قياسي'}</span><span dir="ltr">{shipment.id}</span></div></article>;
}
function chunk<T>(items: T[], size: number) { const result: T[][] = []; for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size)); return result; }
