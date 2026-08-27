import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Eye,
  FileText,
  Grid,
  Printer,
  SlidersHorizontal,
  SortAsc,
  X,
} from 'lucide-react';
import type { Shipment } from '../../../domain/logistics/entities';
import { defaultLabelOptions, type LabelPrintOptions, ShipmentLabel } from './ShipmentLabel';
import { validateShipmentsForPrinting } from '../utils/printValidation';
import '../styles/shipment-label-print.css';

export type PrintLayoutMode = 'a4-4' | 'a4-2' | 'a4-1' | 'thermal';

interface ShipmentLabelsPreviewModalProps {
  shipments: Shipment[];
  onClose: () => void;
  initialLayoutMode?: PrintLayoutMode;
}

export function ShipmentLabelsPreviewModal({
  shipments,
  onClose,
  initialLayoutMode = 'a4-4',
}: ShipmentLabelsPreviewModalProps) {
  const [layoutMode, setLayoutMode] = useState<PrintLayoutMode>(initialLayoutMode);
  const [copies, setCopies] = useState<number>(1);
  const [sortBy, setSortBy] = useState<'default' | 'governorate' | 'driver'>('default');
  const [options, setOptions] = useState<LabelPrintOptions>(defaultLabelOptions);

  // Validate shipments
  const { validShipments, invalidShipments } = useMemo(
    () => validateShipmentsForPrinting(shipments),
    [shipments]
  );

  // Sorted list of shipments
  const sortedShipments = useMemo(() => {
    const list = [...validShipments];
    if (sortBy === 'governorate') {
      list.sort((a, b) => (a.governorate || '').localeCompare(b.governorate || '', 'ar'));
    } else if (sortBy === 'driver') {
      list.sort((a, b) => (a.driverName || '').localeCompare(b.driverName || '', 'ar'));
    }
    return list;
  }, [validShipments, sortBy]);

  // Multiply by copies count
  const printItems = useMemo(() => {
    const items: Shipment[] = [];
    for (let c = 0; c < copies; c++) {
      items.push(...sortedShipments);
    }
    return items;
  }, [sortedShipments, copies]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Interactive Modal Dialog for Screen View */}
      <div className="admin-dialog-overlay" role="dialog" aria-modal="true">
        <div className="admin-dialog glass-panel print-preview-dialog" style={{ width: 'min(1100px, 96vw)', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <header className="flex-between" style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={20} className="text-gradient" />
                معاينة وإعدادات طباعة البوالص
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                إجمالي المحدد: {shipments.length} شحنة — جاهز للطباعة: {validShipments.length}
              </p>
            </div>
            <button className="btn-icon" onClick={onClose} aria-label="إغلاق">
              <X size={18} />
            </button>
          </header>

          {/* Body: Toolbar & Preview Area */}
          <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '1rem', padding: '1rem', flex: 1, overflow: 'hidden' }}>
            
            {/* Sidebar Settings Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', overflowY: 'auto' }}>
              
              {/* Validation Warning Alert */}
              {invalidShipments.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.7rem', borderRadius: 'var(--radius-sm)', color: '#FCA5A5', fontSize: '0.76rem' }}>
                  <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                    <AlertTriangle size={14} /> تنبيه: {invalidShipments.length} شحنات ببيانات ناقصة
                  </div>
                  <ul style={{ paddingRight: '1rem', margin: 0 }}>
                    {invalidShipments.slice(0, 3).map(({ shipment, errors }) => (
                      <li key={shipment.id}>{shipment.id}: {errors.map(e => e.message).join('، ')}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Layout Mode Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <Grid size={15} /> تخطيط الصفحة والمقاس
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <button
                    className={`outline-btn ${layoutMode === 'a4-4' ? 'btn-primary' : ''}`}
                    onClick={() => setLayoutMode('a4-4')}
                    style={{ justifyContent: 'flex-start', fontSize: '0.78rem' }}
                  >
                    <FileText size={14} /> A4 — 4 بوالص في الصفحة (موصى به)
                  </button>
                  <button
                    className={`outline-btn ${layoutMode === 'a4-2' ? 'btn-primary' : ''}`}
                    onClick={() => setLayoutMode('a4-2')}
                    style={{ justifyContent: 'flex-start', fontSize: '0.78rem' }}
                  >
                    <FileText size={14} /> A4 — بوليصتان في الصفحة
                  </button>
                  <button
                    className={`outline-btn ${layoutMode === 'a4-1' ? 'btn-primary' : ''}`}
                    onClick={() => setLayoutMode('a4-1')}
                    style={{ justifyContent: 'flex-start', fontSize: '0.78rem' }}
                  >
                    <FileText size={14} /> A4 — بوليصة واحدة كبيرة
                  </button>
                  <button
                    className={`outline-btn ${layoutMode === 'thermal' ? 'btn-primary' : ''}`}
                    onClick={() => setLayoutMode('thermal')}
                    style={{ justifyContent: 'flex-start', fontSize: '0.78rem' }}
                  >
                    <Printer size={14} /> حراري — 10 × 15 سم (Thermal Label)
                  </button>
                </div>
              </div>

              {/* Copies & Sorting */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <label className="form-field">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Copy size={13}/> النسخ</span>
                  <input
                    type="number"
                    className="input-glass"
                    min={1}
                    max={5}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </label>

                <label className="form-field">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><SortAsc size={13}/> الترتيب</span>
                  <select
                    className="input-glass"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  >
                    <option value="default">حسب التحديد</option>
                    <option value="governorate">المحافظة</option>
                    <option value="driver">المندوب</option>
                  </select>
                </label>
              </div>

              {/* Content Toggles */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <SlidersHorizontal size={15} /> إعدادات المحتوى
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.76rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={options.showCodAmount}
                      onChange={(e) => setOptions(o => ({ ...o, showCodAmount: e.target.checked }))}
                    />
                    <span>إظهار مبلغ التحصيل على البوليصة</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={options.showContents}
                      onChange={(e) => setOptions(o => ({ ...o, showContents: e.target.checked }))}
                    />
                    <span>إظهار المحتويات وعدد القطع</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={options.showMerchantPhone}
                      onChange={(e) => setOptions(o => ({ ...o, showMerchantPhone: e.target.checked }))}
                    />
                    <span>إظهار رقم هاتف التاجر</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={options.showDeliveryNotes}
                      onChange={(e) => setOptions(o => ({ ...o, showDeliveryNotes: e.target.checked }))}
                    />
                    <span>إظهار ملاحظات التوصيل</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Main Preview Scroll Area */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Eye size={15} /> معاينة شكل البوالص قبل الطباعة
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  إجمالي الصفحات التقديري: {Math.ceil(printItems.length / (layoutMode === 'a4-4' ? 4 : layoutMode === 'a4-2' ? 2 : 1))} صفحة
                </span>
              </div>

              <div className={`labels-preview-grid mode-${layoutMode}`}>
                {printItems.map((shipment, idx) => (
                  <ShipmentLabel
                    key={`${shipment.id}-${idx}`}
                    shipment={shipment}
                    options={options}
                    layoutMode={layoutMode}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <footer className="flex-between" style={{ padding: '0.8rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
            <button className="outline-btn" onClick={onClose}>
              إلغاء
            </button>

            <button
              className="btn-primary"
              onClick={handlePrint}
              disabled={validShipments.length === 0}
              style={{ padding: '0.6rem 1.4rem' }}
            >
              <Printer size={18} />
              طباعة {printItems.length} بوليصة الآن
            </button>
          </footer>

        </div>
      </div>

      {/* Hidden Printable Area for window.print() */}
      <div id="printable-waybills-area" style={{ display: 'none' }}>
        <div className={`printable-container layout-${layoutMode}`}>
          {printItems.map((shipment, idx) => (
            <ShipmentLabel
              key={`print-${shipment.id}-${idx}`}
              shipment={shipment}
              options={options}
              layoutMode={layoutMode}
            />
          ))}
        </div>
      </div>
    </>
  );
}

