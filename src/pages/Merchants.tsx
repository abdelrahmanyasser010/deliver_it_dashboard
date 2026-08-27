import { useMemo, useState, type ReactNode } from 'react';
import { Archive, Banknote, BarChart3, Building2, CalendarRange, ClipboardCheck, Edit3, Eye, MessageCircle, MoreHorizontal, Package, Search, Store, TrendingUp } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Merchant, Shipment } from '../domain/logistics/entities';
import { formatCurrency, statusConfig } from '../utils/helpers';
import './Merchants.css';

type MerchantDialog = 'edit' | 'settlement' | 'archive';
type MerchantProfileTab = 'overview' | 'shipments' | 'financial' | 'pricing';
const merchantStatusLabels = { pending_onboarding: 'استكمال التفعيل', active: 'نشط', suspended: 'موقوف', archived: 'مؤرشف' } as const;
const merchantStatusTone = (status: Merchant['status']) => status === 'active' ? 'success' : status === 'pending_onboarding' ? 'warning' : status === 'suspended' ? 'danger' : 'neutral';

function isEgyptianPhone(value: string) { return /^01[0125]\d{8}$/.test(value.replace(/\s/g, '')); }
function merchantCode(merchant: Merchant) { return merchant.code ?? merchant.id.replace(/^BRN-/, 'MRC-'); }

export function MerchantsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const merchants = useMemo(() => state?.merchants ?? [], [state?.merchants]);
  const shipments = useMemo(() => state?.shipments ?? [], [state?.shipments]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialog, setDialog] = useState<{ type: MerchantDialog; merchantId: string } | null>(null);
  const [menuMerchantId, setMenuMerchantId] = useState<string | null>(null);
  const profileId = searchParams.get('merchant');
  const [profileTab, setProfileTab] = useState<MerchantProfileTab>('overview');

  const summary = useMemo(() => ({
    activeMerchants: merchants.filter((m) => (m.status ?? 'active') === 'active').length,
    pendingSettlement: merchants.reduce((sum, merchant) => sum + merchant.pendingSettlement, 0),
    shipmentValue: merchants.reduce((sum, merchant) => sum + merchant.totalOrderValue, 0),
    pendingApplications: 1,
  }), [merchants]);

  const filteredMerchants = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('ar-EG');
    return merchants.filter((merchant) => (!value || `${merchant.name} ${merchant.phone} ${merchantCode(merchant)} ${merchant.email ?? ''}`.toLocaleLowerCase('ar-EG').includes(value)) && (statusFilter === 'all' || (merchant.status ?? 'active') === statusFilter));
  }, [merchants, query, statusFilter]);

  const profileMerchant = merchants.find((merchant) => merchant.id === profileId) ?? null;
  const activeDialogMerchant = merchants.find((merchant) => merchant.id === dialog?.merchantId) ?? null;
  const merchantShipments = (merchantId: string) => shipments.filter((shipment) => shipment.merchantId === merchantId);
  const eligibleSettlementShipments = (merchantId: string) => merchantShipments(merchantId).filter((shipment) => ['remitted','inSettlement'].includes(shipment.financialStatus) && shipment.settlementStatus === 'unsettled');

  const openProfile = (merchant: Merchant, tab: MerchantProfileTab = 'overview') => { setProfileTab(tab); const next = new URLSearchParams(searchParams); next.set('merchant', merchant.id); setSearchParams(next, { replace: true }); setMenuMerchantId(null); };
  const closeProfile = () => { const next = new URLSearchParams(searchParams); next.delete('merchant'); setSearchParams(next, { replace: true }); };
  const saveMerchant = async (merchant: Merchant) => {
    if (!merchant.name.trim()) { showToast('اسم التاجر مطلوب.', 'warning'); return false; }
    if (!isEgyptianPhone(merchant.phone)) { showToast('رقم الهاتف يجب أن يكون رقمًا مصريًا صحيحًا.', 'warning'); return false; }
    const duplicate = merchants.some((item) => item.id !== merchant.id && item.phone.replace(/\s/g, '') === merchant.phone.replace(/\s/g, ''));
    if (duplicate) { showToast('رقم الهاتف مستخدم لتاجر آخر.', 'warning'); return false; }
    const result = await execute({ type: 'merchant/upsert', merchant, actor: 'مدير حسابات التجار' }); showToast(result.message, result.ok ? 'success' : 'danger'); return result.ok;
  };
  const createSettlement = async (shipmentIds: string[]) => { const result = await execute({ type: 'settlement/create', shipmentIds, actor: 'مسؤول المحاسبة' }); showToast(result.message, result.ok ? 'success' : 'warning'); if (result.ok && result.createdId) navigate(`/settlements?settlement=${result.createdId}`); return result.ok; };
  const openConversation = (merchant: Merchant) => { const room = state?.chatRooms.find((item) => item.category === 'merchant' && item.name === merchant.name); if (room) navigate(`/chat?room=${room.id}`); else { navigate('/chat'); showToast(`لا توجد محادثة مفتوحة مع ${merchant.name}. في الـBackend سيتم إنشاء Conversation عند الحاجة.`, 'info'); } };

  return <div className="merchants-page">
    <div className="merchants-summary compact-summary">
      <button className="ms-card glass-card compact-card merchant-shortcut" onClick={() => setStatusFilter('active')}><Store size={18} style={{ color:'#0EA5E9' }}/><div><p className="ms-label">التجار النشطون</p><p className="ms-value">{summary.activeMerchants.toLocaleString('ar-EG')} متجر</p></div></button>
      <div className="ms-card glass-card compact-card"><TrendingUp size={18} style={{ color:'#10B981' }}/><div><p className="ms-label">إجمالي قيمة الشحنات</p><p className="ms-value">{formatCurrency(summary.shipmentValue)}</p></div></div>
      <button className="ms-card glass-card compact-card merchant-shortcut" onClick={() => navigate('/settlements')}><Banknote size={18} style={{ color:'#EF4444' }}/><div><p className="ms-label">مستحقات تحت التسوية</p><p className="ms-value">{formatCurrency(summary.pendingSettlement)}</p></div></button>
      <button className="ms-card glass-card compact-card merchant-shortcut" onClick={() => navigate('/applications')}><ClipboardCheck size={18} style={{ color:'#F59E0B' }}/><div><p className="ms-label">طلبات انضمام</p><p className="ms-value">مراجعة</p></div></button>
    </div>

    <section className="merchants-management glass-card">
      <div className="management-toolbar">
        <div>
          <h3>إدارة التجار</h3>
        </div>
        <div className="toolbar-filters">
          <div className="management-search">
            <Search size={16}/>
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="اسم التاجر، الكود، الهاتف..."/>
          </div>
          <select className="input-glass select-filter" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
            <option value="all">كل الحالات</option>
            {Object.entries(merchantStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="data-table compact-table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>التاجر</th>
              <th>الحالة</th>
              <th>الهاتف</th>
              <th>الشحنات</th>
              <th>قيمة الشحنات</th>
              <th>مستحقات</th>
              <th>دورة التسوية</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredMerchants.map((merchant) => <tr key={merchant.id}>
              <td className="tracking-num">{merchantCode(merchant)}</td>
              <td><button className="tracking-link" onClick={()=>openProfile(merchant)} style={{ fontWeight: 700 }}>{merchant.name}</button></td>
              <td><StatusBadge label={merchantStatusLabels[merchant.status ?? 'active']} tone={merchantStatusTone(merchant.status ?? 'active')}/></td>
              <td dir="ltr">{merchant.phone}</td>
              <td><button className="tracking-link" onClick={()=>openProfile(merchant,'shipments')}>{merchant.shipmentsCount.toLocaleString('ar-EG')}</button></td>
              <td className="amount">{formatCurrency(merchant.totalOrderValue)}</td>
              <td><button className="tracking-link merchant-debt" onClick={()=>openProfile(merchant,'financial')}>{formatCurrency(merchant.pendingSettlement)}</button></td>
              <td>{cycleLabelMerchant(merchant.settlementCycle)}</td>
              <td>
                <div className="merchant-actions-v2">
                  <button className="btn-icon sm" onClick={()=>openProfile(merchant)} title="عرض التفاصيل" aria-label={`عرض ${merchant.name}`}><Eye size={15}/></button>
                  <div className="merchant-more-wrap">
                    <button className="btn-icon sm" onClick={()=>setMenuMerchantId(menuMerchantId===merchant.id?null:merchant.id)} title="خيارات إضافية" aria-label={`المزيد لـ ${merchant.name}`}><MoreHorizontal size={15}/></button>
                    {menuMerchantId===merchant.id && <div className="merchant-row-menu glass-panel">
                      <button onClick={()=>{setDialog({type:'edit',merchantId:merchant.id});setMenuMerchantId(null);}}><Edit3 size={14}/> تعديل البيانات</button>
                      <button onClick={()=>openProfile(merchant,'shipments')}><Package size={14}/> الشحنات</button>
                      <button onClick={()=>openProfile(merchant,'financial')}><Banknote size={14}/> المستحقات والتسويات</button>
                      <button onClick={()=>openConversation(merchant)}><MessageCircle size={14}/> فتح المحادثة</button>
                      <button onClick={()=>{setDialog({type:'archive',merchantId:merchant.id});setMenuMerchantId(null);}}><Archive size={14}/> أرشفة</button>
                    </div>}
                  </div>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {profileMerchant && <MerchantProfile merchant={profileMerchant} shipments={merchantShipments(profileMerchant.id)} settlements={(state?.settlements ?? []).filter((item)=>item.merchantId===profileMerchant.id)} tab={profileTab} onTab={setProfileTab} onClose={closeProfile} onOpenShipments={()=>navigate(`/shipments?merchant=${encodeURIComponent(profileMerchant.name)}`)} onOpenChat={()=>openConversation(profileMerchant)} onCreateSettlement={()=>{closeProfile(); setDialog({type:'settlement',merchantId:profileMerchant.id});}}/>} 
    {dialog && activeDialogMerchant && <MerchantActionDialog type={dialog.type} merchant={activeDialogMerchant} shipments={merchantShipments(activeDialogMerchant.id)} eligibleShipmentIds={eligibleSettlementShipments(activeDialogMerchant.id).map((shipment)=>shipment.id)} onClose={()=>setDialog(null)} onSave={async (merchant)=>{if(await saveMerchant(merchant))setDialog(null);}} onCreateSettlement={async(ids)=>{if(await createSettlement(ids))setDialog(null);}} onArchive={async(reason)=>{const result=await execute({type:'merchant/archive',merchantId:activeDialogMerchant.id,reason});showToast(result.message,result.ok?'success':'danger');if(result.ok)setDialog(null);}}/>}
  </div>;
}

const payoutMethodLabel = (method?: string) => ({ bank: 'تحويل بنكي', instapay: 'Instapay', wallet: 'محفظة إلكترونية', cash: 'نقدي' }[method ?? 'bank'] ?? 'تحويل بنكي');
const settlementStatusLabels: Record<string, string> = { draft: 'مسودة', underReview: 'تحت المراجعة', approved: 'معتمدة', paid: 'مدفوعة', reconciled: 'مطابقة', disputed: 'عليها اعتراض', cancelled: 'ملغاة' };

function MerchantProfile({ merchant, shipments, settlements, tab, onTab, onClose, onOpenShipments, onOpenChat, onCreateSettlement }: { merchant:Merchant; shipments:Shipment[]; settlements:Array<{id:string;status:string;netPayable:number;periodStart:string;periodEnd:string}>; tab:MerchantProfileTab; onTab:(tab:MerchantProfileTab)=>void; onClose:()=>void; onOpenShipments:()=>void; onOpenChat:()=>void; onCreateSettlement:()=>void }) {
  const performance = deriveMerchantPerformance(shipments);
  const pricing = merchant.pricingRules ?? [];
  const tabs: Array<{id:MerchantProfileTab; label:string}> = [
    { id: 'overview', label: 'الملخص والمعلومات' },
    { id: 'shipments', label: `الشحنات (${shipments.length.toLocaleString('ar-EG')})` },
    { id: 'financial', label: 'المستحقات والتسويات' },
    { id: 'pricing', label: 'قائمة الأسعار' },
  ];
  const recent = shipments.slice(0, 10);
  const statusCounts = new Map<string, number>();
  shipments.forEach((s) => statusCounts.set(s.status, (statusCounts.get(s.status) ?? 0) + 1));

  return (
    <Modal wide title={merchant.name} description={`${merchantCode(merchant)} — ${merchant.legalName || 'متجر مسجل'}`} onClose={onClose} footer={<>
      <button className="outline-btn" onClick={onOpenChat}><MessageCircle size={15}/> المحادثة المباشرة</button>
      <button className="btn-primary" onClick={onOpenShipments}><Package size={15}/> كل شحنات التاجر</button>
    </>}>
      <div className="merchant-profile-top">
        <StatusBadge label={merchantStatusLabels[merchant.status ?? 'active']} tone={merchantStatusTone(merchant.status ?? 'active')}/>
        <StatusBadge label={merchant.priorityLevel === 'priority' ? 'تاجر أولوية' : 'تاجر قياسي'} tone={merchant.priorityLevel === 'priority' ? 'info' : 'neutral'}/>
        <span dir="ltr" style={{ fontWeight: 700 }}>{merchant.phone}</span>
        <span>مسؤول الحساب: <strong>{merchant.accountManagerName ?? 'غير محدد'}</strong></span>
      </div>

      <div className="merchant-profile-tabs">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => onTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="merchant-profile-grid">
            <ProfileBox icon={<Package size={18}/>} label="إجمالي الشحنات" value={merchant.shipmentsCount.toLocaleString('ar-EG')} detail="اضغط تبويب الشحنات للتفاصيل"/>
            <ProfileBox icon={<Banknote size={18}/>} label="مستحقات تحت التسوية" value={formatCurrency(merchant.pendingSettlement)} detail={cycleLabelMerchant(merchant.settlementCycle)}/>
            <ProfileBox icon={<TrendingUp size={18}/>} label="قيمة الشحنات المسلمة" value={formatCurrency(merchant.totalOrderValue)} detail="إجمالي قيمة البضائع"/>
            <ProfileBox icon={<BarChart3 size={18}/>} label="نسبة نجاح التسليم" value={`${performance.successRate.toLocaleString('ar-EG')}٪`} detail={`مرتجعات ${performance.returnRate.toLocaleString('ar-EG')}٪`}/>
          </div>
          <div className="merchant-overview-meta glass-card">
            <div><small>البريد الإلكتروني</small><strong>{merchant.email ?? 'غير مسجل'}</strong></div>
            <div><small>دورة التسوية</small><strong>{cycleLabelMerchant(merchant.settlementCycle)}</strong></div>
            <div><small>طريقة تحويل المستحقات</small><strong>{payoutMethodLabel(merchant.settlementMethod)}</strong></div>
            <div><small>الاسم القانوني</small><strong>{merchant.legalName ?? merchant.name}</strong></div>
          </div>
        </>
      )}

      {tab === 'shipments' && (
        <>
          <div className="merchant-status-summary">
            {[...statusCounts.entries()].slice(0, 6).map(([st, count]) => (
              <button key={st} onClick={() => onOpenShipments()}>
                <span>{statusConfig[st as keyof typeof statusConfig]?.label ?? st}</span>
                <strong>{count.toLocaleString('ar-EG')}</strong>
              </button>
            ))}
          </div>
          <div className="table-wrapper">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>رقم الشحنة</th>
                  <th>المستلم</th>
                  <th>المحافظة</th>
                  <th>الحالة</th>
                  <th>قيمة التحصيل عند التسليم</th>
                </tr>
              </thead>
              <tbody>
                {recent.length ? recent.map((shipment) => (
                  <tr key={shipment.id}>
                    <td className="tracking-num">{shipment.id}</td>
                    <td>{shipment.customerName}</td>
                    <td>{shipment.governorate}</td>
                    <td><StatusBadge label={statusConfig[shipment.status]?.label ?? shipment.status} tone={shipment.status === 'delivered' ? 'success' : shipment.status === 'returned' || shipment.status === 'failedToDeliver' ? 'danger' : 'info'}/></td>
                    <td className="amount">{formatCurrency(shipment.expectedCollection)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد شحنات مسجلة لهذا التاجر.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'financial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="merchant-profile-grid">
            <ProfileBox icon={<Banknote size={18}/>} label="المستحق الحالي المعلق" value={formatCurrency(merchant.pendingSettlement)} detail="مجموع الشحنات المسلمة غير المسوّاة"/>
            <ProfileBox icon={<CalendarRange size={18}/>} label="دورة التسوية" value={cycleLabelMerchant(merchant.settlementCycle)} detail="حسب العقد والاتفاق"/>
            <ProfileBox icon={<Building2 size={18}/>} label="طريقة التحويل" value={payoutMethodLabel(merchant.settlementMethod)} detail="الحساب المعتمد للتاجر"/>
            <ProfileBox icon={<TrendingUp size={18}/>} label="إجمالي مبيعات المتجر" value={formatCurrency(merchant.totalOrderValue)} detail="كل الشحنات المكتملة"/>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.4rem 0' }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800 }}>سجل كشوف التسويات السابقة</h4>
            <button className="btn-primary" onClick={onCreateSettlement} style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}>
              <Banknote size={15}/> إنشاء تسوية جديدة من الشحنات المؤهلة
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>رقم التسوية</th>
                  <th>فترة التسوية</th>
                  <th>صافي المبلغ</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {settlements.length ? settlements.map((item) => (
                  <tr key={item.id}>
                    <td className="tracking-num">{item.id}</td>
                    <td>{new Date(item.periodStart).toLocaleDateString('ar-EG')} — {new Date(item.periodEnd).toLocaleDateString('ar-EG')}</td>
                    <td className="amount" style={{ color: '#10B981', fontWeight: 700 }}>{formatCurrency(item.netPayable)}</td>
                    <td><StatusBadge label={settlementStatusLabels[item.status] ?? item.status} tone={item.status === 'paid' ? 'success' : item.status === 'approved' ? 'info' : 'warning'}/></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.2rem', color: 'var(--text-muted)' }}>لا توجد تسويات سابقة لهذا التاجر حتى الآن.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <>
          <div className="merchant-overview-meta glass-card">
            <div><small>نوع ملف التسعير</small><strong>{merchant.priorityLevel === 'priority' ? 'عقد أولوية خاص' : 'التسعير القياسي'}</strong></div>
            <div><small>تأثير تعديل الأسعار</small><strong>يتم تطبيق الأسعار على الشحنات الجديدة فقط</strong></div>
          </div>
          <div className="table-wrapper">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>النطاق / المحافظة</th>
                  <th>سعر التوصيل</th>
                  <th>رسوم المرتجع</th>
                  <th>رسوم التحصيل</th>
                  <th>المدة المتوقعة</th>
                </tr>
              </thead>
              <tbody>
                {pricing.length ? pricing.map((rule) => (
                  <tr key={rule.id}>
                    <td>{rule.scope}</td>
                    <td>{formatCurrency(rule.deliveryFee)}</td>
                    <td>{formatCurrency(rule.returnFee)}</td>
                    <td>{formatCurrency(rule.collectionFee)}</td>
                    <td>{rule.estimatedDays.toLocaleString('ar-EG')} يوم</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>يطبق جدول الأسعار العام الافتراضي.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

function MerchantActionDialog({ type, merchant, shipments, eligibleShipmentIds, onClose, onSave, onCreateSettlement, onArchive }: { type:MerchantDialog; merchant:Merchant; shipments:Array<{id:string;customerName?:string;governorate?:string;financialStatus:string;expectedCollection:number;deliveryFee?:number;discount?:number}>; eligibleShipmentIds:string[]; onClose:()=>void; onSave:(merchant:Merchant)=>Promise<void>; onCreateSettlement:(ids:string[])=>Promise<void>; onArchive:(reason:string)=>Promise<void> }) {
  const [form,setForm]=useState({ name:merchant.name, legalName:merchant.legalName??'', phone:merchant.phone, email:merchant.email??'', settlementCycle:merchant.settlementCycle, status:merchant.status??'active', accountManagerName:merchant.accountManagerName??'', settlementMethod:merchant.settlementMethod??'bank' });
  const [selectedIds,setSelectedIds]=useState<string[]>(eligibleShipmentIds);
  const [archiveReason,setArchiveReason]=useState('انتهاء التعاقد');
  
  const toggle=(id:string)=>setSelectedIds((items)=>items.includes(id)?items.filter((item)=>item!==id):[...items,id]);
  const selectAll = () => setSelectedIds([...eligibleShipmentIds]);
  const deselectAll = () => setSelectedIds([]);

  const eligibleShipments = shipments.filter((s) => eligibleShipmentIds.includes(s.id));
  const selectedShipments = shipments.filter((s) => selectedIds.includes(s.id));
  const gross = selectedShipments.reduce((sum, s) => sum + (s.expectedCollection || 0), 0);
  const estimatedFees = selectedShipments.reduce((sum, s) => sum + (s.deliveryFee || 0) + (s.discount || 0), 0);
  const netPayable = Math.max(0, gross - estimatedFees);

  return (
    <Modal
      wide={type==='settlement' || type==='edit'}
      title={type==='edit' ? 'تعديل بيانات التاجر' : type==='settlement' ? 'إنشاء تسوية مالية جديدة' : 'أرشفة التاجر'}
      description={`${merchant.name} — ${merchantCode(merchant)}`}
      onClose={onClose}
      footer={<>
        <button className="outline-btn" onClick={onClose}>إلغاء</button>
        {type==='edit' ? (
          <button className="btn-primary" onClick={()=>void onSave({...merchant,...form})}>حفظ البيانات</button>
        ) : type==='settlement' ? (
          <button className="btn-primary" disabled={!selectedIds.length} onClick={()=>void onCreateSettlement(selectedIds)}>
            <Banknote size={15}/> تأكيد إنشاء التسوية ({selectedIds.length.toLocaleString('ar-EG')} شحنة)
          </button>
        ) : (
          <button className="btn-primary danger-action" disabled={!archiveReason.trim()} onClick={()=>void onArchive(archiveReason)}>
            تأكيد الأرشفة
          </button>
        )}
      </>}
    >
      {type === 'edit' && (
        <div className="admin-form-grid">
          <label className="form-field">
            <span>الاسم التجاري (اسم المتجر)</span>
            <input className="input-glass" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="مثال: متجر الأزياء"/>
          </label>
          <label className="form-field">
            <span>رقم الهاتف الرئيسي</span>
            <input className="input-glass" dir="ltr" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} placeholder="010xxxxxxxx"/>
          </label>
          <label className="form-field">
            <span>البريد الإلكتروني</span>
            <input className="input-glass" dir="ltr" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="name@store.com"/>
          </label>
          <label className="form-field">
            <span>الاسم القانوني / السجل التجاري</span>
            <input className="input-glass" value={form.legalName} onChange={(e)=>setForm({...form,legalName:e.target.value})} placeholder="الاسم المسجل بالسجل التجاري"/>
          </label>
          <label className="form-field">
            <span>دورة التسوية المالية</span>
            <select className="input-glass" value={form.settlementCycle} onChange={(e)=>setForm({...form,settlementCycle:e.target.value as Merchant['settlementCycle']})}>
              <option value="daily">يومية</option>
              <option value="twiceWeekly">مرتين أسبوعيًا</option>
              <option value="weekly">أسبوعية</option>
            </select>
          </label>
          <label className="form-field">
            <span>طريقة تحويل المستحقات</span>
            <select className="input-glass" value={form.settlementMethod} onChange={(e)=>setForm({...form,settlementMethod:e.target.value as NonNullable<Merchant['settlementMethod']>})}>
              <option value="bank">تحويل بنكي</option>
              <option value="instapay">Instapay</option>
              <option value="wallet">محفظة إلكترونية</option>
              <option value="cash">نقدي</option>
            </select>
          </label>
          <label className="form-field">
            <span>حالة الحساب</span>
            <select className="input-glass" value={form.status} onChange={(e)=>setForm({...form,status:e.target.value as NonNullable<Merchant['status']>})}>
              {Object.entries(merchantStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>مسؤول الحساب</span>
            <input className="input-glass" value={form.accountManagerName} onChange={(e)=>setForm({...form,accountManagerName:e.target.value})} placeholder="اسم الموظف المسؤول"/>
          </label>
        </div>
      )}

      {type === 'settlement' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="merchant-profile-grid">
            <div className="settlement-stat-box glass-card">
              <span>الشحنات المؤهلة</span>
              <strong>{eligibleShipmentIds.length.toLocaleString('ar-EG')}</strong>
            </div>
            <div className="settlement-stat-box glass-card" style={{ borderColor: 'rgba(14,165,233,0.4)' }}>
              <span>الشحنات المحددة للتسوية</span>
              <strong style={{ color: '#38BDF8' }}>{selectedIds.length.toLocaleString('ar-EG')}</strong>
            </div>
            <div className="settlement-stat-box glass-card">
              <span>إجمالي التحصيل عند التسليم</span>
              <strong>{formatCurrency(gross)}</strong>
            </div>
            <div className="settlement-stat-box glass-card" style={{ borderColor: 'rgba(16,185,129,0.4)' }}>
              <span>صافي المستحق للتاجر</span>
              <strong style={{ color: '#34D399' }}>{formatCurrency(netPayable)}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              حدد الشحنات المراد محاسبة التاجر عليها وتضمينها في هذه الدفعة:
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="outline-btn"
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                onClick={selectedIds.length === eligibleShipmentIds.length ? deselectAll : selectAll}
              >
                {selectedIds.length === eligibleShipmentIds.length ? 'إلغاء تحديد الكل' : 'تحديد كل الشحنات'}
              </button>
            </div>
          </div>

          <div className="table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto' }}>
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th style={{ width: '36px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === eligibleShipmentIds.length && eligibleShipmentIds.length > 0}
                      onChange={() => selectedIds.length === eligibleShipmentIds.length ? deselectAll() : selectAll()}
                    />
                  </th>
                  <th>رقم الشحنة</th>
                  <th>المستلم</th>
                  <th>المحافظة</th>
                  <th>تحصيل عند التسليم</th>
                  <th>رسوم الشحن</th>
                  <th>الصافي</th>
                </tr>
              </thead>
              <tbody>
                {eligibleShipments.length ? eligibleShipments.map((shipment) => {
                  const isChecked = selectedIds.includes(shipment.id);
                  const cod = shipment.expectedCollection || 0;
                  const fee = (shipment.deliveryFee || 0) + (shipment.discount || 0);
                  const net = Math.max(0, cod - fee);
                  return (
                    <tr
                      key={shipment.id}
                      onClick={() => toggle(shipment.id)}
                      style={{ cursor: 'pointer', background: isChecked ? 'rgba(14, 165, 233, 0.08)' : undefined }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                        />
                      </td>
                      <td className="tracking-num">{shipment.id}</td>
                      <td>{shipment.customerName || 'عميل شحن'}</td>
                      <td>{shipment.governorate || '—'}</td>
                      <td className="amount">{formatCurrency(cod)}</td>
                      <td>{formatCurrency(fee)}</td>
                      <td className="amount" style={{ color: '#10B981', fontWeight: 700 }}>{formatCurrency(net)}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                      لا توجد شحنات مكتملة معلقة لهذا التاجر حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            💡 <strong>ملاحظة:</strong> الشحنات غير المحددة ستظل محفوظة في رصيد التاجر المعلق للمحاسبة عليها في تسوية لاحقة عند اكتمال تحصيلها.
          </div>
        </div>
      )}

      {type === 'archive' && (
        <div>
          <p className="confirm-description">الأرشفة تحفظ كل بيانات وتاريخ التاجر وشحناته وتسوياته مع إيقاف الحساب.</p>
          <label className="form-field full" style={{ marginTop: '1rem' }}>
            <span>سبب الأرشفة</span>
            <textarea className="input-glass" rows={3} value={archiveReason} onChange={(e)=>setArchiveReason(e.target.value)} placeholder="أدخل سبب الأرشفة..."/>
          </label>
        </div>
      )}
    </Modal>
  );
}

function deriveMerchantPerformance(shipments: Shipment[]) {
  const completed = shipments.filter((item) => ['delivered', 'partiallyDelivered', 'returned', 'failedToDeliver'].includes(item.status));
  const delivered = completed.filter((item) => ['delivered', 'partiallyDelivered'].includes(item.status)).length;
  const returned = completed.filter((item) => item.status === 'returned').length;
  return {
    successRate: completed.length ? Math.round((delivered / completed.length) * 100) : 0,
    returnRate: completed.length ? Math.round((returned / completed.length) * 100) : 0,
  };
}

function ProfileBox({icon,label,value,detail}:{icon:ReactNode;label:string;value:string;detail:string}){return <div className="merchant-profile-box glass-card"><span>{icon}</span><section><small>{label}</small><strong>{value}</strong><em>{detail}</em></section></div>;}
function cycleLabelMerchant(value:Merchant['settlementCycle']){return {daily:'تسوية يومية',twiceWeekly:'مرتين أسبوعيًا',weekly:'تسوية أسبوعية'}[value];}


