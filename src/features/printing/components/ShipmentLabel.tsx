import type { Shipment } from '../../../domain/logistics/entities';
import { formatCurrency, formatDateTime } from '../../../utils/helpers';
import { BarcodeSvg } from './BarcodeSvg';

export interface LabelPrintOptions {
  showCodAmount: boolean;
  showContents: boolean;
  showMerchantPhone: boolean;
  showDeliveryNotes: boolean;
  companyName: string;
  footerText: string;
}

export const defaultLabelOptions: LabelPrintOptions = {
  showCodAmount: true,
  showContents: true,
  showMerchantPhone: true,
  showDeliveryNotes: true,
  companyName: 'DELIVER IT — ديليفر إت للشحن',
  footerText: 'شكراً لتعاملكم معنا · يرجى فحص الشحنة بحضور المندوب',
};

interface ShipmentLabelProps {
  shipment: Shipment;
  options?: Partial<LabelPrintOptions>;
  layoutMode?: 'thermal' | 'a4-1' | 'a4-2' | 'a4-4';
}

export function ShipmentLabel({
  shipment,
  options = {},
  layoutMode = 'a4-4',
}: ShipmentLabelProps) {
  const opts = { ...defaultLabelOptions, ...options };
  const trackingCode = shipment.trackingNumber || shipment.id;

  const itemsCount = shipment.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || shipment.items?.length || 1;
  const itemsDescription = shipment.items?.map((item) => `${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`).join('، ');

  const noteText = shipment.exceptionReason || '';
  const isFragile = noteText.includes('كسر') || noteText.includes('زجاج') || shipment.priority === 'urgent';
  const isExchange = noteText.includes('استبدال') || noteText.includes('تبديل');

  return (
    <article className={`shipping-label-card layout-${layoutMode}`}>
      {/* Label Header */}
      <header className="label-header">
        <div className="company-brand">
          <div className="company-logo-badge">D</div>
          <div>
            <h2 className="company-title">{opts.companyName}</h2>
            <span className="service-tag">شحن سريع داخل الجمهورية</span>
          </div>
        </div>
        <div className="label-meta">
          <span className="created-date">{formatDateTime(shipment.createdAt)}</span>
          <span className="governorate-badge">{shipment.governorate}</span>
        </div>
      </header>

      {/* Barcode & Tracking Section */}
      <section className="label-barcode-section">
        <BarcodeSvg value={trackingCode} height={52} barWidth={1.7} displayValue={true} />
        <div className="tracking-meta-row">
          <span className="tracking-id-text">بوليصة رقم: <strong>{shipment.id}</strong></span>
          {shipment.city && <span className="city-tag">{shipment.city}</span>}
        </div>
      </section>

      {/* Recipient / Delivery Box */}
      <section className="label-section recipient-box">
        <div className="section-title">بيانات المستلم</div>
        <div className="recipient-grid">
          <div className="field-group full">
            <span className="label-key">الاسم:</span>
            <strong className="recipient-name">{shipment.customerName}</strong>
          </div>
          <div className="field-group">
            <span className="label-key">الهاتف:</span>
            <strong className="phone-num" dir="ltr">{shipment.customerPhone}</strong>
          </div>
          <div className="field-group full">
            <span className="label-key">العنوان:</span>
            <span className="full-address">{shipment.address}</span>
          </div>
        </div>
      </section>

      {/* Merchant Info Box */}
      <section className="label-section merchant-box">
        <div className="section-title">الراسل (التاجر)</div>
        <div className="merchant-info-row">
          <strong>{shipment.merchantName}</strong>
        </div>
      </section>

      {/* Package Contents & COD Details */}
      <section className="label-details-grid">
        {opts.showContents && (
          <div className="detail-box contents-box">
            <span className="detail-label">المحتويات والقطع</span>
            <div className="detail-value">
              <strong>{itemsCount} قطعة</strong>
              {itemsDescription && <p className="description-text">{itemsDescription}</p>}
            </div>
          </div>
        )}

        {opts.showCodAmount && (
          <div className="detail-box cod-box">
            <span className="detail-label">المبلغ المطلوب تحصيله (COD)</span>
            <div className="cod-amount-badge">
              {shipment.expectedCollection > 0 ? (
                <>
                  <strong className="amount-num">{formatCurrency(shipment.expectedCollection)}</strong>
                  <small>شامل رسوم الشحن والمنتجات</small>
                </>
              ) : (
                <strong className="paid-badge">مدفوع بالكامل (خالص)</strong>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Notes & Special Flags */}
      {(opts.showDeliveryNotes && noteText) || isFragile || isExchange ? (
        <section className="label-notes-section">
          {isFragile && <span className="special-badge fragile">⚠️ قابل للكسر - احذر عند النقل</span>}
          {isExchange && <span className="special-badge exchange">🔄 طرد استبدال</span>}
          {noteText && <p className="delivery-note">📝 <strong>ملاحظات:</strong> {noteText}</p>}
        </section>
      ) : null}

      {/* Label Footer */}
      <footer className="label-footer">
        <p>{opts.footerText}</p>
        <span className="label-page-mark">Deliver It Logistics System</span>
      </footer>
    </article>
  );
}
