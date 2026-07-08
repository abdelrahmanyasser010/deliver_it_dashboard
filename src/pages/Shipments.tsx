import { useState } from 'react';
import { Banknote, Clock3, Eye, Printer, RefreshCcw, Search, Truck, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  ALL_STATUS,
  type FilterStatus,
  useShipments,
} from '../application/logistics/useLogisticsData';
import type { Shipment, ShipmentStatus } from '../domain/logistics/entities';
import {
  calculateShipmentFinancials,
  formatCurrency,
  paymentTypeLabels,
  statusConfig,
} from '../utils/helpers';
import './Shipments.css';

const statusOptions: { value: FilterStatus; label: string }[] = [
  { value: ALL_STATUS, label: 'جميع الحالات' },
  { value: 'receivedAtOffice', label: 'في المقر' },
  { value: 'deliveredToDriver', label: 'مع المندوب' },
  { value: 'inTransit', label: 'في الطريق' },
  { value: 'delivered', label: 'تم التسليم' },
  { value: 'postponed', label: 'مؤجل' },
  { value: 'failedToDeliver', label: 'فشل التسليم' },
  { value: 'returned', label: 'مرتجع' },
];

const drivers = [
  { id: 'DRV-001', name: 'محمد علي' },
  { id: 'DRV-002', name: 'أحمد سامي' },
  { id: 'DRV-004', name: 'خالد إبراهيم' },
  { id: 'DRV-005', name: 'ياسر عمر' },
];

type ShipmentAction = 'assign' | 'status' | 'attempt' | 'settlement';

export function ShipmentsPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('merchant') ?? '');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(ALL_STATUS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ShipmentAction | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [shipmentOverrides, setShipmentOverrides] = useState<Record<string, Partial<Shipment>>>({});
  const [attempts, setAttempts] = useState<Record<string, string[]>>({});

  const sourceShipments = useShipments(query, statusFilter);
  const filtered = sourceShipments.map((shipment) => ({
    ...shipment,
    ...shipmentOverrides[shipment.id],
  }));
  const selected = filtered.find((shipment) => shipment.id === selectedId) ?? null;
  const selectedFinancials = selected ? calculateShipmentFinancials(selected) : null;

  const updateShipment = (shipmentId: string, patch: Partial<Shipment>, message: string) => {
    setShipmentOverrides((current) => ({
      ...current,
      [shipmentId]: { ...current[shipmentId], ...patch },
    }));
    setLastAction(message);
  };

  const handlePrint = (shipment: Shipment) => {
    setLastAction(`تم تجهيز بوليصة ${shipment.id} للطباعة عبر Enzo Printer أو طابعة المتصفح.`);
    window.print();
  };

  return (
    <div className="shipments-page">
      <div className="filters-bar glass-card">
        <div className="search-field">
          <Search size={16} className="search-icon" />
          <input
            className="input-glass search-input"
            type="text"
            placeholder="بحث برقم الشحنة، اسم العميل، المندوب..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button className="clear-btn" onClick={() => setQuery('')} title="مسح البحث">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="status-filters">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={`filter-pill ${statusFilter === option.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="ml-auto results-count">
          <span>{filtered.length}</span> شحنة
        </div>
      </div>

      <div className="table-container glass-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم الشحنة</th>
                <th>العميل</th>
                <th>الهاتف</th>
                <th>المحافظة</th>
                <th>المندوب</th>
                <th>الحالة</th>
                <th>نوع الدفع</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-row">لا توجد نتائج مطابقة</td>
                </tr>
              ) : filtered.map((shipment) => {
                const cfg = statusConfig[shipment.status];

                return (
                  <tr key={shipment.id} className="table-row">
                    <td className="tracking-num">{shipment.id}</td>
                    <td className="bold-cell">{shipment.customerName}</td>
                    <td className="phone-cell" dir="ltr">{shipment.customerPhone}</td>
                    <td>{shipment.governorate}</td>
                    <td>{shipment.driverName ?? <span className="unassigned">غير معين</span>}</td>
                    <td>
                      <span className="status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-badge ${shipment.paymentType}`}>
                        {paymentTypeLabels[shipment.paymentType]}
                      </span>
                    </td>
                    <td className="amount">{formatCurrency(shipment.total)}</td>
                    <td className="date">{shipment.createdAt}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon sm" title="عرض التفاصيل" onClick={() => setSelectedId(shipment.id)}>
                          <Eye size={15} />
                        </button>
                        <button className="btn-icon sm" title="طباعة بوليصة" onClick={() => handlePrint(shipment)}>
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="drawer-overlay" onClick={() => setSelectedId(null)}>
          <div className="detail-drawer glass-panel" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3>تفاصيل الشحنة</h3>
                <p className="drawer-id">{selected.id}</p>
              </div>
              <button className="btn-icon" onClick={() => setSelectedId(null)} title="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              {lastAction && <div className="operation-feedback">{lastAction}</div>}

              <section className="detail-section">
                <h4>بيانات العميل</h4>
                <DetailRow label="الاسم" value={selected.customerName} />
                <DetailRow label="الهاتف" value={selected.customerPhone} dir="ltr" />
                <DetailRow label="المحافظة" value={selected.governorate} />
                <DetailRow label="المدينة" value={selected.city} />
                <DetailRow label="العنوان" value={selected.address} />
              </section>

              <section className="detail-section">
                <h4>بيانات الشحنة</h4>
                <DetailRow label="المندوب" value={selected.driverName ?? 'غير معين'} />
                <DetailRow label="المتجر" value={selected.merchantName} />
                <DetailRow label="نوع الدفع" value={paymentTypeLabels[selected.paymentType]} />
                <DetailRow label="التاريخ" value={selected.createdAt} />
              </section>

              <section className="detail-section">
                <h4>عمليات التشغيل</h4>
                <div className="shipment-ops-grid">
                  <button className="outline-btn" onClick={() => setActiveAction('assign')}>
                    <Truck size={16} />
                    تعيين مندوب
                  </button>
                  <button className="outline-btn" onClick={() => setActiveAction('status')}>
                    <RefreshCcw size={16} />
                    تحديث الحالة
                  </button>
                  <button className="outline-btn" onClick={() => setActiveAction('attempt')}>
                    <Clock3 size={16} />
                    محاولة تسليم
                  </button>
                  <button className="outline-btn" onClick={() => setActiveAction('settlement')}>
                    <Banknote size={16} />
                    طلب تسوية
                  </button>
                </div>
              </section>

              {attempts[selected.id]?.length > 0 && (
                <section className="detail-section">
                  <h4>محاولات التسليم</h4>
                  <div className="attempt-list">
                    {attempts[selected.id].map((attempt, index) => (
                      <div key={`${selected.id}-${index}`} className="attempt-row">{attempt}</div>
                    ))}
                  </div>
                </section>
              )}

              <section className="detail-section">
                <h4>التفاصيل المالية</h4>
                <DetailRow label="إجمالي المنتجات" value={formatCurrency(selectedFinancials?.itemsSubtotal ?? 0)} />
                <DetailRow label="رسوم الشحن" value={formatCurrency(selectedFinancials?.deliveryFee ?? 0)} />
                <DetailRow label="الخصم" value={formatCurrency(selectedFinancials?.discount ?? 0)} />
                <DetailRow label="المبلغ النهائي" value={formatCurrency(selectedFinancials?.finalTotal ?? 0)} bold />
              </section>

              <div className="drawer-actions">
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handlePrint(selected)}>
                  <Printer size={16} />
                  طباعة البوليصة
                </button>
              </div>
            </div>
          </div>

          {activeAction && (
            <ShipmentActionDialog
              action={activeAction}
              shipment={selected}
              onCancel={() => setActiveAction(null)}
              onSubmit={(payload) => {
                if (activeAction === 'assign') {
                  const driver = drivers.find((item) => item.id === payload.driverId);
                  if (driver) {
                    updateShipment(selected.id, { driverId: driver.id, driverName: driver.name, status: 'deliveredToDriver' }, `تم تعيين ${selected.id} إلى ${driver.name}.`);
                  }
                }

                if (activeAction === 'status') {
                  updateShipment(selected.id, { status: payload.status as ShipmentStatus }, `تم تحديث حالة ${selected.id} إلى ${statusConfig[payload.status as ShipmentStatus].label}.`);
                }

                if (activeAction === 'attempt') {
                  const note = payload.note || 'محاولة تسليم بدون ملاحظة';
                  setAttempts((current) => ({
                    ...current,
                    [selected.id]: [...(current[selected.id] ?? []), note],
                  }));
                  updateShipment(selected.id, { status: 'postponed' }, `تم تسجيل محاولة تسليم للشحنة ${selected.id}.`);
                }

                if (activeAction === 'settlement') {
                  updateShipment(selected.id, { settlementStatus: 'settled' }, `تم إنشاء طلب تسوية للشحنة ${selected.id} وإرساله للمحاسبة.`);
                }

                setActiveAction(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ShipmentActionDialog({
  action,
  shipment,
  onCancel,
  onSubmit,
}: {
  action: ShipmentAction;
  shipment: Shipment;
  onCancel: () => void;
  onSubmit: (payload: Record<string, string>) => void;
}) {
  const [driverId, setDriverId] = useState(shipment.driverId ?? drivers[0].id);
  const [status, setStatus] = useState<ShipmentStatus>(shipment.status);
  const [note, setNote] = useState('');

  const title = {
    assign: 'تعيين مندوب',
    status: 'تحديث حالة الشحنة',
    attempt: 'تسجيل محاولة تسليم',
    settlement: 'طلب تسوية',
  }[action];

  return (
    <div className="shipment-action-dialog glass-panel">
      <div className="drawer-header compact">
        <div>
          <h3>{title}</h3>
          <p className="drawer-id">{shipment.id}</p>
        </div>
        <button className="btn-icon sm" onClick={onCancel} title="إغلاق"><X size={14} /></button>
      </div>

      <div className="shipment-action-body">
        {action === 'assign' && (
          <label className="form-field">
            <span>المندوب</span>
            <select className="input-glass" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
          </label>
        )}

        {action === 'status' && (
          <label className="form-field">
            <span>الحالة الجديدة</span>
            <select className="input-glass" value={status} onChange={(event) => setStatus(event.target.value as ShipmentStatus)}>
              {statusOptions.filter((item) => item.value !== ALL_STATUS).map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
        )}

        {action === 'attempt' && (
          <label className="form-field">
            <span>ملاحظة المحاولة</span>
            <textarea className="input-glass" value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثال: العميل لا يرد، تم الاتفاق على التسليم غدا..." />
          </label>
        )}

        {action === 'settlement' && (
          <div className="operation-feedback">
            سيتم إرسال الشحنة للمحاسبة كمطلب تسوية مع ربطها بالمتجر والمبلغ المحصل.
          </div>
        )}

        <div className="contact-actions">
          <button className="outline-btn" onClick={onCancel}>إلغاء</button>
          <button
            className="btn-primary"
            onClick={() => onSubmit({ driverId, status, note })}
          >
            حفظ العملية
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  dir,
  bold,
}: {
  label: string;
  value: string;
  dir?: string;
  bold?: boolean;
}) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className={`detail-value ${bold ? 'bold-value' : ''}`} dir={dir}>{value}</span>
    </div>
  );
}
