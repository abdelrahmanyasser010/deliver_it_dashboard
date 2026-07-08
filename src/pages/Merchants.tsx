import { useMemo, useState } from 'react';
import { Banknote, ClipboardCheck, Copy, Edit3, MessageCircle, Package, Search, Store, TrendingUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMerchants } from '../application/logistics/useLogisticsData';
import type { Merchant } from '../domain/logistics/entities';
import { formatCurrency } from '../utils/helpers';
import './Merchants.css';

type MerchantDialog = 'edit' | 'shipments' | 'settlement';

function toWhatsAppUrl(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const egyptianNumber = digits.startsWith('0') ? `2${digits}` : digits;
  return `https://wa.me/${egyptianNumber}`;
}

export function MerchantsPage() {
  const navigate = useNavigate();
  const { merchants } = useMerchants();
  const [merchantRows, setMerchantRows] = useState(merchants);
  const [query, setQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [contactMerchantId, setContactMerchantId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ type: MerchantDialog; merchant: Merchant } | null>(null);

  const summary = useMemo(() => ({
    totalMerchants: merchantRows.length,
    pendingSettlement: merchantRows.reduce((sum, merchant) => sum + merchant.pendingSettlement, 0),
    totalOrderValue: merchantRows.reduce((sum, merchant) => sum + merchant.totalOrderValue, 0),
  }), [merchantRows]);

  const filteredMerchants = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('ar-EG');
    if (!value) return merchantRows;

    return merchantRows.filter((merchant) => (
      merchant.name.toLocaleLowerCase('ar-EG').includes(value) ||
      merchant.phone.includes(value) ||
      merchant.id.toLocaleLowerCase('ar-EG').includes(value)
    ));
  }, [merchantRows, query]);

  const contactMerchant = merchantRows.find((merchant) => merchant.id === contactMerchantId) ?? null;

  const handleCopyPhone = async (phone: string) => {
    await navigator.clipboard?.writeText(phone);
    setActionMessage(`تم نسخ رقم التاجر: ${phone}`);
  };

  const updateMerchant = (merchantId: string, patch: Partial<Merchant>, message: string) => {
    setMerchantRows((rows) => rows.map((merchant) => (
      merchant.id === merchantId ? { ...merchant, ...patch } : merchant
    )));
    setActionMessage(message);
  };

  return (
    <div className="merchants-page">
      <div className="merchants-summary compact-summary">
        <div className="ms-card glass-card compact-card">
          <Store size={18} style={{ color: '#0EA5E9' }} />
          <div>
            <p className="ms-label">إجمالي التجار</p>
            <p className="ms-value">{summary.totalMerchants} متجر</p>
          </div>
        </div>
        <div className="ms-card glass-card compact-card">
          <TrendingUp size={18} style={{ color: '#10B981' }} />
          <div>
            <p className="ms-label">قيمة الأوردرات</p>
            <p className="ms-value">{formatCurrency(summary.totalOrderValue)}</p>
          </div>
        </div>
        <div className="ms-card glass-card compact-card">
          <Banknote size={18} style={{ color: '#EF4444' }} />
          <div>
            <p className="ms-label">تسويات معلقة</p>
            <p className="ms-value">{formatCurrency(summary.pendingSettlement)}</p>
          </div>
        </div>
        <button className="ms-card glass-card compact-card merchant-shortcut" onClick={() => navigate('/applications')}>
          <ClipboardCheck size={18} style={{ color: '#F59E0B' }} />
          <div>
            <p className="ms-label">طلبات التجار</p>
            <p className="ms-value">مراجعة</p>
          </div>
        </button>
      </div>

      <section className="merchants-management glass-card">
        <div className="management-toolbar">
          <div>
            <h3>إدارة التجار</h3>
            <p>بحث سريع، متابعة شحنات، تسوية حساب، وتواصل من جدول واحد.</p>
          </div>
          <div className="toolbar-actions">
            <div className="management-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="بحث باسم التاجر، الهاتف، الكود..."
              />
            </div>
          </div>
        </div>

        {actionMessage && <div className="management-feedback">{actionMessage}</div>}

        <div className="table-wrapper">
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>التاجر</th>
                <th>الهاتف</th>
                <th>الشحنات</th>
                <th>قيمة الأوردرات</th>
                <th>تسوية معلقة</th>
                <th>انضم في</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredMerchants.map((merchant) => (
                <tr key={merchant.id} className="table-row">
                  <td className="tracking-num">{merchant.id}</td>
                  <td className="bold-cell">{merchant.name}</td>
                  <td dir="ltr">{merchant.phone}</td>
                  <td><Package size={13} className="inline-icon" /> {merchant.shipmentsCount}</td>
                  <td className="amount">{formatCurrency(merchant.totalOrderValue)}</td>
                  <td><span className="merchant-debt">{formatCurrency(merchant.pendingSettlement)}</span></td>
                  <td className="date">{merchant.joinedAt}</td>
                  <td>
                    <div className="driver-row-actions">
                      <button className="btn-icon sm" title="تعديل بيانات التاجر" onClick={() => setDialog({ type: 'edit', merchant })}><Edit3 size={14} /></button>
                      <button className="btn-icon sm" title="عرض الشحنات" onClick={() => setDialog({ type: 'shipments', merchant })}><Package size={14} /></button>
                      <button className="btn-icon sm" title="تسوية الحساب" onClick={() => setDialog({ type: 'settlement', merchant })}><Banknote size={14} /></button>
                      <button className="btn-icon sm" title="تواصل مع التاجر" onClick={() => setContactMerchantId(merchant.id)}><MessageCircle size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {contactMerchant && (
        <div className="merchant-contact-overlay" onClick={() => setContactMerchantId(null)}>
          <div className="merchant-contact-dialog glass-panel" onClick={(event) => event.stopPropagation()}>
            <div className="merchant-contact-header">
              <div>
                <h3>تواصل مع {contactMerchant.name}</h3>
                <p>على الويب الأفضل عرض الرقم أو نسخه أو فتح واتساب بدل زر اتصال مباشر.</p>
              </div>
              <button className="btn-icon sm" onClick={() => setContactMerchantId(null)} title="إغلاق">
                <X size={14} />
              </button>
            </div>

            <div className="contact-phone-box">
              <span>رقم الهاتف</span>
              <strong dir="ltr">{contactMerchant.phone}</strong>
            </div>

            <div className="contact-actions">
              <button className="btn-secondary" onClick={() => void handleCopyPhone(contactMerchant.phone)}>
                <Copy size={15} />
                نسخ الرقم
              </button>
              <button className="btn-primary" onClick={() => window.open(toWhatsAppUrl(contactMerchant.phone), '_blank', 'noopener,noreferrer')}>
                <MessageCircle size={15} />
                فتح واتساب
              </button>
            </div>
          </div>
        </div>
      )}

      {dialog && (
        <MerchantDialog
          dialog={dialog}
          onClose={() => setDialog(null)}
          onNavigateShipments={(merchant) => {
            setDialog(null);
            navigate(`/shipments?merchant=${encodeURIComponent(merchant.name)}`);
          }}
          onSave={(merchantId, patch, message) => {
            updateMerchant(merchantId, patch, message);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

function MerchantDialog({
  dialog,
  onClose,
  onSave,
  onNavigateShipments,
}: {
  dialog: { type: MerchantDialog; merchant: Merchant };
  onClose: () => void;
  onSave: (merchantId: string, patch: Partial<Merchant>, message: string) => void;
  onNavigateShipments: (merchant: Merchant) => void;
}) {
  const { type, merchant } = dialog;
  const [name, setName] = useState(merchant.name);
  const [phone, setPhone] = useState(merchant.phone);
  const [settlementAmount, setSettlementAmount] = useState(String(merchant.pendingSettlement));

  return (
    <div className="merchant-contact-overlay" onClick={onClose}>
      <div className="merchant-contact-dialog glass-panel" onClick={(event) => event.stopPropagation()}>
        <div className="merchant-contact-header">
          <div>
            <h3>{type === 'edit' ? 'تعديل بيانات التاجر' : type === 'shipments' ? 'شحنات التاجر' : 'تسوية الحساب'}</h3>
            <p>{merchant.name} - {merchant.id}</p>
          </div>
          <button className="btn-icon sm" onClick={onClose} title="إغلاق"><X size={14} /></button>
        </div>

        {type === 'edit' && (
          <div className="merchant-form-grid">
            <label className="form-field">
              <span>اسم التاجر</span>
              <input className="input-glass" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="form-field">
              <span>رقم الهاتف</span>
              <input className="input-glass" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
          </div>
        )}

        {type === 'shipments' && (
          <div className="merchant-shipment-preview">
            {Array.from({ length: Math.min(merchant.shipmentsCount, 5) }).map((_, index) => (
              <div key={`${merchant.id}-${index}`} className="merchant-shipment-row">
                <span className="tracking-num">SHP-{merchant.id.replace(/\D/g, '')}{index + 1}</span>
                <span>{index % 2 === 0 ? 'في الطريق' : 'بانتظار الاستلام'}</span>
              </div>
            ))}
          </div>
        )}

        {type === 'settlement' && (
          <div className="merchant-form-grid">
            <div className="contact-phone-box">
              <span>المستحق الحالي</span>
              <strong>{formatCurrency(merchant.pendingSettlement)}</strong>
            </div>
            <label className="form-field">
              <span>مبلغ التسوية</span>
              <input className="input-glass" type="number" value={settlementAmount} onChange={(event) => setSettlementAmount(event.target.value)} />
            </label>
          </div>
        )}

        <div className="contact-actions">
          <button className="outline-btn" onClick={onClose}>إلغاء</button>
          {type === 'shipments' ? (
            <button className="btn-primary" onClick={() => onNavigateShipments(merchant)}>فتح صفحة الشحنات</button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => {
                if (type === 'edit') {
                  onSave(merchant.id, { name, phone }, `تم تعديل بيانات التاجر: ${name}`);
                } else {
                  const amount = Math.max(0, Number(settlementAmount) || 0);
                  onSave(
                    merchant.id,
                    { pendingSettlement: Math.max(0, merchant.pendingSettlement - amount) },
                    `تم تسجيل تسوية بقيمة ${formatCurrency(amount)} للتاجر ${merchant.name}`,
                  );
                }
              }}
            >
              حفظ العملية
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
