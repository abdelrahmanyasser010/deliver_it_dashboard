import { useMemo, useState, type ReactNode } from 'react';
import { Banknote, BarChart3, Building2, CalendarRange, ClipboardCheck, Copy, Edit3, Eye, MapPin, MessageCircle, Package, Search, Store, TrendingUp } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Merchant, Shipment } from '../domain/logistics/entities';
import { formatCurrency } from '../utils/helpers';
import './Merchants.css';

type MerchantDialog = 'edit' | 'shipments' | 'settlement';
type MerchantProfileTab = 'overview' | 'branches' | 'pricing' | 'performance';

function toWhatsAppUrl(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const egyptianNumber = digits.startsWith('0') ? `2${digits}` : digits;
  return `https://wa.me/${egyptianNumber}`;
}

function isEgyptianPhone(value: string) {
  return /^01[0125]\d{8}$/.test(value.replace(/\s/g, ''));
}

export function MerchantsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const merchants = useMemo(() => state?.merchants ?? [], [state?.merchants]);
  const shipments = useMemo(() => state?.shipments ?? [], [state?.shipments]);
  const [query, setQuery] = useState('');
  const [contactMerchantId, setContactMerchantId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ type: MerchantDialog; merchantId: string } | null>(null);
  const profileId = searchParams.get('merchant');
  const [profileTab, setProfileTab] = useState<MerchantProfileTab>('overview');


  const summary = useMemo(() => ({
    totalMerchants: merchants.length,
    pendingSettlement: merchants.reduce((sum, merchant) => sum + merchant.pendingSettlement, 0),
    totalOrderValue: merchants.reduce((sum, merchant) => sum + merchant.totalOrderValue, 0),
  }), [merchants]);

  const filteredMerchants = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('ar-EG');
    if (!value) return merchants;
    return merchants.filter((merchant) => `${merchant.name} ${merchant.phone} ${merchant.id} ${merchant.branchName}`.toLocaleLowerCase('ar-EG').includes(value));
  }, [merchants, query]);

  const contactMerchant = merchants.find((merchant) => merchant.id === contactMerchantId) ?? null;
  const profileMerchant = merchants.find((merchant) => merchant.id === profileId) ?? null;
  const activeDialogMerchant = merchants.find((merchant) => merchant.id === dialog?.merchantId) ?? null;

  const merchantShipments = (merchantId: string) => shipments.filter((shipment) => shipment.merchantId === merchantId);
  const eligibleSettlementShipments = (merchantId: string) => merchantShipments(merchantId).filter((shipment) => ['remitted', 'inSettlement'].includes(shipment.financialStatus) && shipment.settlementStatus === 'unsettled');

  const handleCopyPhone = async (phone: string) => {
    await navigator.clipboard?.writeText(phone);
    showToast(`تم نسخ رقم التاجر: ${phone}`, 'success');
  };

  const openProfile = (merchant: Merchant) => {
    setProfileTab('overview');
    const next = new URLSearchParams(searchParams);
    next.set('merchant', merchant.id);
    setSearchParams(next, { replace: true });
  };

  const closeProfile = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('merchant');
    setSearchParams(next, { replace: true });
  };

  const saveMerchant = async (merchant: Merchant) => {
    if (!merchant.name.trim()) { showToast('اسم التاجر مطلوب.', 'warning'); return false; }
    if (!isEgyptianPhone(merchant.phone)) { showToast('رقم الهاتف يجب أن يكون رقمًا مصريًا صحيحًا.', 'warning'); return false; }
    const duplicate = merchants.some((item) => item.id !== merchant.id && item.phone.replace(/\s/g, '') === merchant.phone.replace(/\s/g, ''));
    if (duplicate) { showToast('رقم الهاتف مستخدم لتاجر آخر.', 'warning'); return false; }
    const result = await execute({ type: 'merchant/upsert', merchant, actor: 'مدير النظام التجريبي' });
    showToast(result.message, result.ok ? 'success' : 'danger');
    return result.ok;
  };

  const createSettlement = async (shipmentIds: string[]) => {
    const result = await execute({ type: 'settlement/create', shipmentIds, actor: 'مسؤول المحاسبة التجريبي' });
    showToast(result.message, result.ok ? 'success' : 'warning');
    if (result.ok && result.createdId) navigate(`/settlements?settlement=${result.createdId}`);
    return result.ok;
  };

  return (
    <div className="merchants-page">
      <div className="merchants-summary compact-summary">
        <div className="ms-card glass-card compact-card"><Store size={18} style={{ color: '#0EA5E9' }} /><div><p className="ms-label">إجمالي التجار</p><p className="ms-value">{summary.totalMerchants.toLocaleString('ar-EG')} متجر</p></div></div>
        <div className="ms-card glass-card compact-card"><TrendingUp size={18} style={{ color: '#10B981' }} /><div><p className="ms-label">قيمة الأوردرات</p><p className="ms-value">{formatCurrency(summary.totalOrderValue)}</p></div></div>
        <div className="ms-card glass-card compact-card"><Banknote size={18} style={{ color: '#EF4444' }} /><div><p className="ms-label">تسويات معلقة</p><p className="ms-value">{formatCurrency(summary.pendingSettlement)}</p></div></div>
        <button className="ms-card glass-card compact-card merchant-shortcut" onClick={() => navigate('/applications')}><ClipboardCheck size={18} style={{ color: '#F59E0B' }} /><div><p className="ms-label">طلبات التجار</p><p className="ms-value">مراجعة</p></div></button>
      </div>

      <section className="merchants-management glass-card">
        <div className="management-toolbar">
          <div><h3>إدارة التجار</h3><p>ملف تشغيلي ومالي موحد مشتق من نفس بيانات الشحنات.</p></div>
          <div className="toolbar-actions"><div className="management-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث باسم التاجر، الهاتف، الكود..." /></div></div>
        </div>
        <div className="table-wrapper">
          <table className="data-table compact-table">
            <thead><tr><th>الكود</th><th>التاجر</th><th>الهاتف</th><th>الشحنات</th><th>قيمة الأوردرات</th><th>تسوية معلقة</th><th>انضم في</th><th>إجراءات</th></tr></thead>
            <tbody>{filteredMerchants.map((merchant) => (
              <tr key={merchant.id} className="table-row">
                <td className="tracking-num">{merchant.id}</td><td className="bold-cell">{merchant.name}</td><td dir="ltr">{merchant.phone}</td>
                <td><Package size={13} className="inline-icon" /> {merchant.shipmentsCount.toLocaleString('ar-EG')}</td><td className="amount">{formatCurrency(merchant.totalOrderValue)}</td>
                <td><span className="merchant-debt">{formatCurrency(merchant.pendingSettlement)}</span></td><td className="date">{merchant.joinedAt}</td>
                <td><div className="driver-row-actions">
                  <button className="btn-icon sm" aria-label={`فتح ملف ${merchant.name}`} onClick={() => openProfile(merchant)}><Eye size={14} /></button>
                  <button className="btn-icon sm" aria-label={`تعديل ${merchant.name}`} onClick={() => setDialog({ type: 'edit', merchantId: merchant.id })}><Edit3 size={14} /></button>
                  <button className="btn-icon sm" aria-label={`عرض شحنات ${merchant.name}`} onClick={() => setDialog({ type: 'shipments', merchantId: merchant.id })}><Package size={14} /></button>
                  <button className="btn-icon sm" aria-label={`إنشاء تسوية ${merchant.name}`} onClick={() => setDialog({ type: 'settlement', merchantId: merchant.id })}><Banknote size={14} /></button>
                  <button className="btn-icon sm" aria-label={`التواصل مع ${merchant.name}`} onClick={() => setContactMerchantId(merchant.id)}><MessageCircle size={14} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      {profileMerchant && <MerchantProfile merchant={profileMerchant} shipments={merchantShipments(profileMerchant.id)} tab={profileTab} onTab={setProfileTab} onClose={closeProfile} onOpenShipments={() => navigate(`/shipments?merchant=${encodeURIComponent(profileMerchant.name)}`)} />}

      {contactMerchant && <Modal title={`تواصل مع ${contactMerchant.name}`} description="عرض ونسخ بيانات التواصل أو فتح واتساب." onClose={() => setContactMerchantId(null)} footer={<><button className="outline-btn" onClick={() => setContactMerchantId(null)}>إغلاق</button><button className="btn-secondary" onClick={() => void handleCopyPhone(contactMerchant.phone)}><Copy size={15} /> نسخ الرقم</button><button className="btn-primary" onClick={() => window.open(toWhatsAppUrl(contactMerchant.phone), '_blank', 'noopener,noreferrer')}><MessageCircle size={15} /> فتح واتساب</button></>}><div className="contact-phone-box"><span>رقم الهاتف</span><strong dir="ltr">{contactMerchant.phone}</strong></div></Modal>}

      {dialog && activeDialogMerchant && <MerchantActionDialog
        type={dialog.type}
        merchant={activeDialogMerchant}
        shipments={merchantShipments(activeDialogMerchant.id)}
        eligibleShipmentIds={eligibleSettlementShipments(activeDialogMerchant.id).map((shipment) => shipment.id)}
        onClose={() => setDialog(null)}
        onSave={async (merchant) => { if (await saveMerchant(merchant)) setDialog(null); }}
        onCreateSettlement={async (ids) => { if (await createSettlement(ids)) setDialog(null); }}
        onOpenShipments={() => { setDialog(null); navigate(`/shipments?merchant=${encodeURIComponent(activeDialogMerchant.name)}`); }}
      />}
    </div>
  );
}

function MerchantProfile({ merchant, shipments, tab, onTab, onClose, onOpenShipments }: { merchant: Merchant; shipments: Shipment[]; tab: MerchantProfileTab; onTab: (tab: MerchantProfileTab) => void; onClose: () => void; onOpenShipments: () => void }) {
  const performance = deriveMerchantPerformance(shipments);
  const branches = merchant.branches ?? [];
  const pricing = merchant.pricingRules ?? [];
  const tabs = [{ id: 'overview', label: 'نظرة عامة' }, { id: 'branches', label: 'الفروع والاستلام' }, { id: 'pricing', label: 'الأسعار' }, { id: 'performance', label: 'الأداء' }] as const;
  return <Modal wide title={merchant.name} description={`${merchant.id} — ${merchant.branchName}`} onClose={onClose} footer={<><button className="outline-btn" onClick={onClose}>إغلاق</button><button className="btn-primary" onClick={onOpenShipments}><Package size={15}/> فتح الشحنات</button></>}>
    <div className="merchant-profile-top"><StatusBadge label={merchant.priorityLevel === 'priority' ? 'تاجر أولوية' : 'تاجر قياسي'} tone={merchant.priorityLevel === 'priority' ? 'info' : 'neutral'}/><span dir="ltr">{merchant.phone}</span><span>انضم: {merchant.joinedAt}</span></div>
    <div className="merchant-profile-tabs">{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => onTab(item.id)}>{item.label}</button>)}</div>
    {tab === 'overview' && <div className="merchant-profile-grid"><ProfileBox icon={<Package size={18}/>} label="إجمالي الشحنات" value={merchant.shipmentsCount.toLocaleString('ar-EG')} detail="من المصدر الموحد"/><ProfileBox icon={<Banknote size={18}/>} label="مستحقات معلقة" value={formatCurrency(merchant.pendingSettlement)} detail={cycleLabelMerchant(merchant.settlementCycle)}/><ProfileBox icon={<TrendingUp size={18}/>} label="قيمة الأوردرات" value={formatCurrency(merchant.totalOrderValue)} detail="مشتقة من الشحنات"/><ProfileBox icon={<BarChart3 size={18}/>} label="نجاح التسليم" value={`${performance.successRate.toLocaleString('ar-EG')}٪`} detail={`مرتجعات ${performance.returnRate.toLocaleString('ar-EG')}٪`}/></div>}
    {tab === 'branches' && <div className="merchant-branches">{branches.length ? branches.map((branch) => <div className="glass-card" key={branch.id}><Building2 size={18}/><section><strong>{branch.name}</strong><small>{branch.active ? 'نشط' : 'غير نشط'} · {branch.contactName}</small><p><MapPin size={14}/> {branch.address}</p><p><CalendarRange size={14}/> {branch.pickupWindow}</p></section></div>) : <p>لا توجد فروع مسجلة.</p>}</div>}
    {tab === 'pricing' && <div className="table-wrapper"><table className="data-table"><thead><tr><th>النطاق</th><th>التوصيل</th><th>المرتجع</th><th>رسوم التحصيل</th><th>المدة</th></tr></thead><tbody>{pricing.map((rule) => <tr key={rule.id}><td>{rule.scope}</td><td>{formatCurrency(rule.deliveryFee)}</td><td>{formatCurrency(rule.returnFee)}</td><td>{formatCurrency(rule.collectionFee)}</td><td>{rule.estimatedDays.toLocaleString('ar-EG')} يوم</td></tr>)}</tbody></table></div>}
    {tab === 'performance' && <div className="merchant-performance"><PerformanceLine label="نجاح التسليم" value={performance.successRate}/><PerformanceLine label="جودة العناوين" value={performance.addressQuality}/><PerformanceLine label="المرتجعات" value={performance.returnRate} danger/><p>أكثر سبب مرتجع: {performance.topReturnReason || 'لا توجد بيانات'}. أعلى منطقة حجمًا: {performance.topGovernorate || 'لا توجد بيانات'}. متوسط التوصيل: {performance.averageDeliveryHours.toLocaleString('ar-EG')} ساعة.</p></div>}
  </Modal>;
}

function deriveMerchantPerformance(shipments: Shipment[]) {
  const completed = shipments.filter((item) => ['delivered', 'returned', 'failedToDeliver'].includes(item.status));
  const delivered = completed.filter((item) => ['delivered', 'partiallyDelivered'].includes(item.status)).length;
  const returned = completed.filter((item) => item.status === 'returned').length;
  const governorates = new Map<string, number>();
  shipments.forEach((item) => governorates.set(item.governorate, (governorates.get(item.governorate) ?? 0) + 1));
  const topGovernorate = [...governorates.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const reasons = new Map<string, number>();
  shipments.filter((item) => item.exceptionReason).forEach((item) => reasons.set(item.exceptionReason!, (reasons.get(item.exceptionReason!) ?? 0) + 1));
  const topReturnReason = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const averageDeliveryHours = delivered ? Math.round(shipments.filter((item) => ['delivered', 'partiallyDelivered'].includes(item.status)).reduce((sum, item) => sum + Math.max(1, (new Date(item.statusChangedAt).getTime() - new Date(item.createdAt).getTime()) / 3600000), 0) / delivered) : 0;
  return { successRate: completed.length ? Math.round(delivered / completed.length * 100) : 0, returnRate: completed.length ? Math.round(returned / completed.length * 100) : 0, addressQuality: Math.max(0, 100 - Math.round(shipments.filter((item) => item.exceptionReason?.includes('عنوان')).length / Math.max(1, shipments.length) * 100)), averageDeliveryHours, topGovernorate, topReturnReason };
}

function PerformanceLine({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) { return <div><span>{label}</span><strong>{value.toLocaleString('ar-EG')}٪</strong><i className={danger ? 'danger' : ''} style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div>; }
function ProfileBox({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) { return <div className="merchant-profile-box glass-card"><span>{icon}</span><section><small>{label}</small><strong>{value}</strong><em>{detail}</em></section></div>; }
function cycleLabelMerchant(value: Merchant['settlementCycle']) { return { daily: 'تسوية يومية', twiceWeekly: 'مرتين أسبوعيًا', weekly: 'تسوية أسبوعية' }[value]; }

function MerchantActionDialog({ type, merchant, shipments, eligibleShipmentIds, onClose, onSave, onCreateSettlement, onOpenShipments }: { type: MerchantDialog; merchant: Merchant; shipments: Array<{ id: string; status: string; financialStatus: string; expectedCollection: number }>; eligibleShipmentIds: string[]; onClose: () => void; onSave: (merchant: Merchant) => Promise<void>; onCreateSettlement: (ids: string[]) => Promise<void>; onOpenShipments: () => void }) {
  const [name, setName] = useState(merchant.name);
  const [phone, setPhone] = useState(merchant.phone);
  const [selectedIds, setSelectedIds] = useState<string[]>(eligibleShipmentIds);
  const toggle = (id: string) => setSelectedIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  return <Modal wide={type !== 'edit'} title={type === 'edit' ? 'تعديل بيانات التاجر' : type === 'shipments' ? 'شحنات التاجر' : 'إنشاء تسوية من الشحنات المؤهلة'} description={`${merchant.name} — ${merchant.id}`} onClose={onClose} footer={<><button className="outline-btn" onClick={onClose}>إلغاء</button>{type === 'shipments' ? <button className="btn-primary" onClick={onOpenShipments}>فتح صفحة الشحنات</button> : type === 'edit' ? <button className="btn-primary" onClick={() => void onSave({ ...merchant, name: name.trim(), phone: phone.trim() })}>حفظ البيانات</button> : <button className="btn-primary" disabled={!selectedIds.length} onClick={() => void onCreateSettlement(selectedIds)}>إنشاء تسوية ({selectedIds.length.toLocaleString('ar-EG')})</button>}</>}>
    {type === 'edit' && <div className="merchant-form-grid"><label className="form-field"><span>اسم التاجر</span><input className="input-glass" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="form-field"><span>رقم الهاتف</span><input className="input-glass" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} /></label></div>}
    {type === 'shipments' && <div className="table-wrapper"><table className="data-table"><thead><tr><th>الشحنة</th><th>الحالة</th><th>الحالة المالية</th><th>التحصيل</th></tr></thead><tbody>{shipments.slice(0, 20).map((shipment) => <tr key={shipment.id}><td className="tracking-num">{shipment.id}</td><td>{shipment.status}</td><td>{shipment.financialStatus}</td><td>{formatCurrency(shipment.expectedCollection)}</td></tr>)}</tbody></table></div>}
    {type === 'settlement' && <div><div className="contact-phone-box"><span>الشحنات المؤهلة</span><strong>{eligibleShipmentIds.length.toLocaleString('ar-EG')}</strong></div>{eligibleShipmentIds.length ? <div className="merchant-shipment-preview">{shipments.filter((shipment) => eligibleShipmentIds.includes(shipment.id)).map((shipment) => <label key={shipment.id} className="merchant-shipment-row"><input type="checkbox" checked={selectedIds.includes(shipment.id)} onChange={() => toggle(shipment.id)} /><span className="tracking-num">{shipment.id}</span><span>{formatCurrency(shipment.expectedCollection)}</span></label>)}</div> : <p>لا توجد شحنات موردة وغير مسوّاة لهذا التاجر.</p>}</div>}
  </Modal>;
}
