import { useMemo, useState } from 'react';
import {
  Banknote,
  CheckSquare,
  Clock3,
  Eye,
  Printer,
  RefreshCcw,
  Search,
  Square,
  Truck,
  X,
} from 'lucide-react';
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
  { value: ALL_STATUS, label: 'كل الحالات' },
  { value: 'readyToShip', label: 'بانتظار الاستلام' },
  { value: 'receivedAtOffice', label: 'وصلت المكتب' },
  { value: 'deliveredToDriver', label: 'مع المندوب' },
  { value: 'inTransit', label: 'في الطريق' },
  { value: 'delivered', label: 'تم التسليم' },
  { value: 'postponed', label: 'مؤجلة' },
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
type BulkAction = 'assign' | 'status' | 'print';

export function ShipmentsPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('merchant') ?? '');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(ALL_STATUS);
  const [governorateFilter, setGovernorateFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [merchantFilter, setMerchantFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [activeAction, setActiveAction] = useState<ShipmentAction | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [shipmentOverrides, setShipmentOverrides] = useState<Record<string, Partial<Shipment>>>({});
  const [attempts, setAttempts] = useState<Record<string, string[]>>({});

  const sourceShipments = useShipments(query, statusFilter);
  const shipments = sourceShipments.map((shipment) => ({
    ...shipment,
    ...shipmentOverrides[shipment.id],
  }));

  const filterOptions = useMemo(() => {
    const governorates = [...new Set(shipments.map((shipment) => shipment.governorate))];
    const merchants = [...new Set(shipments.map((shipment) => shipment.merchantName))];
    const shipmentDrivers = [...new Set(shipments.map((shipment) => shipment.driverName).filter(Boolean) as string[])];

    return { governorates, merchants, shipmentDrivers };
  }, [shipments]);

  const filtered = shipments.filter((shipment) => {
    const matchesGovernorate = governorateFilter === 'all' || shipment.governorate === governorateFilter;
    const matchesDriver =
      driverFilter === 'all' ||
      (driverFilter === 'unassigned' && !shipment.driverName) ||
      shipment.driverName === driverFilter;
    const matchesMerchant = merchantFilter === 'all' || shipment.merchantName === merchantFilter;

    return matchesGovernorate && matchesDriver && matchesMerchant;
  });

  const selected = filtered.find((shipment) => shipment.id === selectedId) ?? null;
  const selectedFinancials = selected ? calculateShipmentFinancials(selected) : null;
  const checkedShipments = filtered.filter((shipment) => checkedIds.includes(shipment.id));
  const allVisibleSelected = filtered.length > 0 && filtered.every((shipment) => checkedIds.includes(shipment.id));

  const updateShipment = (shipmentId: string, patch: Partial<Shipment>, message?: string) => {
    setShipmentOverrides((current) => ({
      ...current,
      [shipmentId]: { ...current[shipmentId], ...patch },
    }));
    if (message) setLastAction(message);
  };

  const handlePrint = (targets: Shipment[]) => {
    const label = targets.length === 1 ? `بوليصة ${targets[0].id}` : `${targets.length} بوليصات`;
    setLastAction(`تم تجهيز ${label} للطباعة عبر Enzo Printer أو طابعة المتصفح.`);
    window.print();
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setCheckedIds((current) => current.filter((id) => !filtered.some((shipment) => shipment.id === id)));
      return;
    }

    setCheckedIds((current) => [...new Set([...current, ...filtered.map((shipment) => shipment.id)])]);
  };

  const toggleShipment = (shipmentId: string) => {
    setCheckedIds((current) =>
      current.includes(shipmentId)
        ? current.filter((id) => id !== shipmentId)
        : [...current, shipmentId],
    );
  };

  const clearFilters = () => {
    setQuery('');
    setStatusFilter(ALL_STATUS);
    setGovernorateFilter('all');
    setDriverFilter('all');
    setMerchantFilter('all');
  };

  return (
    <div className="shipments-page">
      <div className="filters-bar glass-card">
        <div className="search-field">
          <Search size={16} className="search-icon" />
          <input
            className="input-glass search-input"
            type="text"
            placeholder="بحث برقم الشحنة، العميل، المندوب، أو التاجر"
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

        <div className="results-count">
          <span>{filtered.length}</span> شحنة
        </div>
      </div>

      <div className="advanced-filters glass-card">
        <select className="input-glass" value={governorateFilter} onChange={(event) => setGovernorateFilter(event.target.value)}>
          <option value="all">كل المحافظات</option>
          {filterOptions.governorates.map((governorate) => (
            <option key={governorate} value={governorate}>{governorate}</option>
          ))}
        </select>

        <select className="input-glass" value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)}>
          <option value="all">كل المناديب</option>
          <option value="unassigned">غير معين</option>
          {filterOptions.shipmentDrivers.map((driver) => (
            <option key={driver} value={driver}>{driver}</option>
          ))}
        </select>

        <select className="input-glass" value={merchantFilter} onChange={(event) => setMerchantFilter(event.target.value)}>
          <option value="all">كل التجار</option>
          {filterOptions.merchants.map((merchant) => (
            <option key={merchant} value={merchant}>{merchant}</option>
          ))}
        </select>

        <button className="outline-btn compact-btn" onClick={clearFilters}>إعادة ضبط</button>
      </div>

      {checkedShipments.length > 0 && (
        <div className="selection-bar glass-card">
          <strong>تم تحديد {checkedShipments.length} شحنة</strong>
          <div className="selection-actions">
            <button className="outline-btn compact-btn" onClick={() => setBulkAction('assign')}>
              <Truck size={15} />
              تعيين مندوب
            </button>
            <button className="outline-btn compact-btn" onClick={() => setBulkAction('status')}>
              <RefreshCcw size={15} />
              تحديث الحالة
            </button>
            <button className="outline-btn compact-btn" onClick={() => setBulkAction('print')}>
              <Printer size={15} />
              طباعة البوليصات
            </button>
            <button className="ghost-link" onClick={() => setCheckedIds([])}>إلغاء التحديد</button>
          </div>
        </div>
      )}

      {lastAction && <div className="operation-feedback page-feedback">{lastAction}</div>}

      <div className="table-container glass-card">
        <div className="table-wrapper">
          <table className="data-table shipments-table">
            <thead>
              <tr>
                <th>
                  <button className="table-check" onClick={toggleAllVisible} title="تحديد المعروض">
                    {allVisibleSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                  </button>
                </th>
                <th>رقم الشحنة</th>
                <th>العميل</th>
                <th>المحافظة</th>
                <th>التاجر</th>
                <th>المندوب</th>
                <th>الحالة</th>
                <th>الدفع</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="empty-row">لا توجد نتائج مطابقة للفلاتر الحالية</td>
                </tr>
              ) : filtered.map((shipment) => {
                const cfg = statusConfig[shipment.status];
                const checked = checkedIds.includes(shipment.id);

                return (
                  <tr key={shipment.id} className={`table-row ${checked ? 'selected-row' : ''}`}>
                    <td>
                      <button className="table-check" onClick={() => toggleShipment(shipment.id)} title="تحديد الشحنة">
                        {checked ? <CheckSquare size={17} /> : <Square size={17} />}
                      </button>
                    </td>
                    <td className="tracking-num">{shipment.id}</td>
                    <td>
                      <strong>{shipment.customerName}</strong>
                      <small className="cell-sub" dir="ltr">{shipment.customerPhone}</small>
                    </td>
                    <td>{shipment.governorate}</td>
                    <td>{shipment.merchantName}</td>
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
                        <button className="btn-icon sm" title="طباعة بوليصة" onClick={() => handlePrint([shipment])}>
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
                <DetailRow label="التاجر" value={selected.merchantName} />
                <DetailRow label="نوع الدفع" value={paymentTypeLabels[selected.paymentType]} />
                <DetailRow label="التاريخ" value={selected.createdAt} />
              </section>

              <section className="detail-section">
                <h4>سجل الحركة</h4>
                <Timeline shipment={selected} attempts={attempts[selected.id] ?? []} />
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

              <section className="detail-section">
                <h4>التفاصيل المالية</h4>
                <DetailRow label="إجمالي المنتجات" value={formatCurrency(selectedFinancials?.itemsSubtotal ?? 0)} />
                <DetailRow label="رسوم الشحن" value={formatCurrency(selectedFinancials?.deliveryFee ?? 0)} />
                <DetailRow label="الخصم" value={formatCurrency(selectedFinancials?.discount ?? 0)} />
                <DetailRow label="المبلغ النهائي" value={formatCurrency(selectedFinancials?.finalTotal ?? 0)} bold />
              </section>

              <div className="drawer-actions">
                <button className="btn-primary full-btn" onClick={() => handlePrint([selected])}>
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

      {bulkAction && (
        <BulkActionDialog
          action={bulkAction}
          count={checkedShipments.length}
          onCancel={() => setBulkAction(null)}
          onSubmit={(payload) => {
            if (bulkAction === 'assign') {
              const driver = drivers.find((item) => item.id === payload.driverId);
              if (driver) {
                checkedShipments.forEach((shipment) => {
                  updateShipment(shipment.id, { driverId: driver.id, driverName: driver.name, status: 'deliveredToDriver' });
                });
                setLastAction(`تم تعيين ${checkedShipments.length} شحنة إلى ${driver.name}.`);
              }
            }

            if (bulkAction === 'status') {
              checkedShipments.forEach((shipment) => {
                updateShipment(shipment.id, { status: payload.status as ShipmentStatus });
              });
              setLastAction(`تم تحديث ${checkedShipments.length} شحنة إلى ${statusConfig[payload.status as ShipmentStatus].label}.`);
            }

            if (bulkAction === 'print') {
              handlePrint(checkedShipments);
            }

            setCheckedIds([]);
            setBulkAction(null);
          }}
        />
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
            <textarea
              className="input-glass"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="مثال: العميل لا يرد، تم الاتفاق على التسليم غدا..."
            />
          </label>
        )}

        {action === 'settlement' && (
          <div className="operation-feedback">
            سيتم إرسال الشحنة للمحاسبة كطلب تسوية مع ربطها بالتاجر والمبلغ المحصل.
          </div>
        )}

        <div className="contact-actions">
          <button className="outline-btn" onClick={onCancel}>إلغاء</button>
          <button className="btn-primary" onClick={() => onSubmit({ driverId, status, note })}>
            حفظ العملية
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkActionDialog({
  action,
  count,
  onCancel,
  onSubmit,
}: {
  action: BulkAction;
  count: number;
  onCancel: () => void;
  onSubmit: (payload: Record<string, string>) => void;
}) {
  const [driverId, setDriverId] = useState(drivers[0].id);
  const [status, setStatus] = useState<ShipmentStatus>('deliveredToDriver');

  const title = {
    assign: 'تعيين مندوب للشحنات المحددة',
    status: 'تحديث حالة الشحنات المحددة',
    print: 'طباعة البوليصات المحددة',
  }[action];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal glass-panel bulk-modal" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header compact">
          <div>
            <h3>{title}</h3>
            <p className="drawer-id">{count} شحنة</p>
          </div>
          <button className="btn-icon sm" onClick={onCancel} title="إغلاق"><X size={14} /></button>
        </div>

        <div className="shipment-action-body">
          {action === 'assign' && (
            <label className="form-field">
              <span>اختر المندوب</span>
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

          {action === 'print' && (
            <div className="operation-feedback">
              سيتم تجهيز كل البوليصات المحددة للطباعة دفعة واحدة.
            </div>
          )}

          <div className="contact-actions">
            <button className="outline-btn" onClick={onCancel}>إلغاء</button>
            <button className="btn-primary" onClick={() => onSubmit({ driverId, status })}>
              تنفيذ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Timeline({ shipment, attempts }: { shipment: Shipment; attempts: string[] }) {
  const items = [
    { title: 'تم إنشاء الشحنة', detail: `${shipment.merchantName} - ${shipment.createdAt}`, done: true },
    { title: 'وصلت مكتب الشحن', detail: 'تم استلامها ومراجعتها داخليا', done: ['receivedAtOffice', 'deliveredToDriver', 'inTransit', 'delivered', 'postponed', 'failedToDeliver', 'returned'].includes(shipment.status) },
    { title: 'تم تسليمها للمندوب', detail: shipment.driverName ?? 'لم يتم تعيين مندوب بعد', done: Boolean(shipment.driverName) },
    { title: 'تحديث التسليم', detail: statusConfig[shipment.status].label, done: ['delivered', 'postponed', 'failedToDeliver', 'returned'].includes(shipment.status) },
  ];

  return (
    <div className="timeline-list">
      {items.map((item) => (
        <div key={item.title} className={`timeline-item ${item.done ? 'done' : ''}`}>
          <span className="timeline-dot" />
          <div>
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
          </div>
        </div>
      ))}
      {attempts.map((attempt, index) => (
        <div key={`${shipment.id}-attempt-${index}`} className="timeline-item warning">
          <span className="timeline-dot" />
          <div>
            <strong>محاولة تسليم</strong>
            <small>{attempt}</small>
          </div>
        </div>
      ))}
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
