import { useState } from 'react';
import { Banknote, Camera, MapPin, MessageCircle, Plus, Printer, RotateCcw, Save, Scale, Settings2, Trash2 } from 'lucide-react';
import { ErrorState, PageSkeleton } from '../components/AsyncState';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  defaultGovernorateRates,
  defaultTenantOperationalSettings,
  defaultWhatsAppTemplate,
  type FeeMode,
  type GovernorateRate,
  type MerchantSpecificRate,
  type PricingPolicySettings,
  type PrintingSettings,
  type ProofPolicySettings,
  type WeightTierRate,
  type WhatsAppNotificationSettings,
} from '../domain/settings/entities';
import { formatCurrency } from '../utils/helpers';
import './Settings.css';

type SettingsTab = 'rates' | 'merchant_rates' | 'weight_pickup' | 'pricing' | 'proof' | 'printing' | 'whatsapp';

const tabs: Array<{ id: SettingsTab; label: string; description: string; icon: typeof Banknote }> = [
  { id: 'rates', label: 'أسعار المحافظات', description: 'سعر التاجر، تكلفة المندوب، وربح الشحنة.', icon: MapPin },
  { id: 'merchant_rates', label: 'أسعار التجار الخاصة', description: 'اتفاقات خاصة حسب التاجر والمحافظة.', icon: Banknote },
  { id: 'weight_pickup', label: 'الأوزان والاستلام', description: 'الكيلو الزائد، الاستلام من التاجر، ومكافأة المندوب.', icon: Scale },
  { id: 'pricing', label: 'رسوم إضافية وضريبة', description: 'المرتجع، المحاولات، التحصيل، والضريبة.', icon: Banknote },
  { id: 'proof', label: 'إثبات التسليم', description: 'الصورة، اسم المستلم، ودقة الموقع.', icon: Camera },
  { id: 'printing', label: 'الطباعة والبوليصة', description: 'المقاس والنسخ والبيانات الظاهرة.', icon: Printer },
  { id: 'whatsapp', label: 'رسائل واتساب', description: 'اسم الشركة وقالب رسالة التتبع.', icon: MessageCircle },
];

export function SettingsPage() {
  const { state, isLoading, error, refetch, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const [activeTab, setActiveTab] = useState<SettingsTab>('rates');
  const [pricing, setPricing] = useState<PricingPolicySettings>(() => structuredClone(state?.settings.pricing ?? defaultTenantOperationalSettings.pricing));
  const [proof, setProof] = useState<ProofPolicySettings>(() => structuredClone(state?.settings.proof ?? defaultTenantOperationalSettings.proof));
  const [printing, setPrinting] = useState<PrintingSettings>(() => structuredClone(state?.settings.printing ?? defaultTenantOperationalSettings.printing));
  const [whatsApp, setWhatsApp] = useState<WhatsAppNotificationSettings>(() => structuredClone(state?.settings.notifications?.whatsApp ?? defaultTenantOperationalSettings.notifications.whatsApp));
  const [saving, setSaving] = useState(false);

  if (isLoading) return <PageSkeleton rows={5} />;
  if (error || !state) return <ErrorState message={error ?? 'تعذر تحميل إعدادات الشركة.'} onRetry={refetch} />;

  const save = async () => {
    setSaving(true);
    const command = ['rates', 'weight_pickup', 'pricing'].includes(activeTab)
      ? { type: 'settings/updatePricing' as const, policy: pricing }
      : activeTab === 'proof'
        ? { type: 'settings/updateProof' as const, policy: proof }
        : activeTab === 'whatsapp'
          ? { type: 'settings/updateNotifications' as const, policy: { ...state.settings.notifications, whatsApp } }
          : { type: 'settings/updatePrinting' as const, policy: printing };
    const result = await execute(command);
    showToast(result.message, result.ok ? 'success' : 'danger');
    setSaving(false);
  };

  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <div className="settings-page">
      <div className="settings-layout">
        <aside className="settings-tabs-sidebar" aria-label="أقسام الإعدادات">
          <div className="settings-tabs-header">
            <Settings2 size={20} className="settings-header-icon" />
            <div>
              <strong>سياسات الشركة</strong>
              <span>التسعير والتشغيل والمستندات</span>
            </div>
          </div>
          <div className="settings-tabs-list">
            {tabs.map(({ id, label, description, icon: Icon }) => (
              <button key={id} type="button" className={`settings-nav-btn ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
                <div className="nav-btn-icon"><Icon size={18} /></div>
                <div className="nav-btn-content">
                  <span className="nav-btn-title">{label}</span>
                  <span className="nav-btn-desc">{description}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="settings-content-wrapper">
          <div className="settings-panel-card">
            <div className="panel-top-toolbar">
              <div className="panel-title-wrap">
                <h2>{active.label}</h2>
                <p>{active.description}</p>
              </div>
              <button type="button" className="btn-primary settings-save-btn" disabled={saving} onClick={() => void save()}>
                <Save size={16} />
                <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
              </button>
            </div>

            <div className="panel-body">
              {activeTab === 'rates' && <GovernorateRatesSettings value={pricing} onChange={setPricing} />}
              {activeTab === 'merchant_rates' && <MerchantRatesSettings value={pricing} merchants={state.merchants} onChange={setPricing} />}
              {activeTab === 'weight_pickup' && <WeightAndPickupSettings value={pricing} onChange={setPricing} />}
              {activeTab === 'pricing' && <PricingSettings value={pricing} onChange={setPricing} />}
              {activeTab === 'proof' && <ProofSettings value={proof} onChange={setProof} />}
              {activeTab === 'printing' && <PrintingSettingsPanel value={printing} onChange={setPrinting} />}
              {activeTab === 'whatsapp' && <WhatsAppSettingsPanel value={whatsApp} onChange={setWhatsApp} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, suffix, min = 0, max }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; min?: number; max?: number }) {
  return (
    <label className="setting-field-card">
      <span className="field-label">{label}</span>
      <div className="field-input-box">
        <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        {suffix && <em className="field-suffix">{suffix}</em>}
      </div>
    </label>
  );
}

function Toggle({ checked, label, description, onChange }: { checked: boolean; label: string; description: string; onChange: (value: boolean) => void }) {
  return (
    <label className="setting-toggle-card">
      <div className="toggle-info">
        <strong>{label}</strong>
        <small>{description}</small>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function FeeEditor({ title, mode, value, onMode, onValue }: { title: string; mode: FeeMode; value: number; onMode: (mode: FeeMode) => void; onValue: (value: number) => void }) {
  return (
    <div className="fee-editor-card">
      <strong>{title}</strong>
      <div className="fee-editor-controls">
        <select value={mode} onChange={(event) => onMode(event.target.value as FeeMode)}>
          <option value="disabled">بدون رسوم</option>
          <option value="fixed">مبلغ ثابت</option>
          <option value="percentage">نسبة مئوية</option>
        </select>
        <div className="fee-input-box">
          <input type="number" min="0" value={value} disabled={mode === 'disabled'} onChange={(event) => onValue(Number(event.target.value))} />
          <span>{mode === 'percentage' ? '%' : 'ج.م'}</span>
        </div>
      </div>
    </div>
  );
}

function GovernorateRatesSettings({ value, onChange }: { value: PricingPolicySettings; onChange: (value: PricingPolicySettings) => void }) {
  const rates = value.governorateRates?.length ? value.governorateRates : defaultGovernorateRates;
  const totalMerchant = rates.reduce((sum, rate) => sum + (rate.merchantDeliveryFee ?? rate.deliveryFee), 0);
  const totalDriver = rates.reduce((sum, rate) => sum + (rate.driverDeliveryCost ?? 0), 0);
  const avgProfit = rates.length ? Math.round((totalMerchant - totalDriver) / rates.length) : 0;

  const updateRate = (id: string, field: keyof GovernorateRate, val: string | number) => {
    const next = rates.map((rate) => {
      if (rate.id !== id) return rate;
      const updated = { ...rate, [field]: val };
      if (field === 'merchantDeliveryFee') updated.deliveryFee = Number(val);
      if (field === 'deliveryFee') updated.merchantDeliveryFee = Number(val);
      return updated;
    });
    onChange({ ...value, governorateRates: next });
  };

  const addRate = () => {
    const newRate: GovernorateRate = {
      id: `gov-custom-${Date.now()}`,
      governorate: 'نطاق جديد',
      merchantDeliveryFee: 60,
      driverDeliveryCost: 40,
      deliveryFee: 60,
      returnFee: 30,
      estimatedDays: 1,
    };
    onChange({ ...value, governorateRates: [...rates, newRate] });
  };

  return (
    <div className="rates-settings-section">
      <div className="report-kpi-grid">
        <div className="report-kpi glass-card"><div><p className="report-kpi-label">متوسط سعر التاجر</p><p className="report-kpi-value">{formatCurrency(Math.round(totalMerchant / Math.max(1, rates.length)))}</p></div></div>
        <div className="report-kpi glass-card"><div><p className="report-kpi-label">متوسط تكلفة المندوب</p><p className="report-kpi-value">{formatCurrency(Math.round(totalDriver / Math.max(1, rates.length)))}</p></div></div>
        <div className="report-kpi glass-card"><div><p className="report-kpi-label">متوسط ربح الشحنة</p><p className="report-kpi-value" style={{ color: avgProfit >= 0 ? '#34D399' : '#F87171' }}>{formatCurrency(avgProfit)}</p></div></div>
      </div>

      <div className="rates-actions-bar">
        <p className="rates-notice">كل محافظة لها سعر يظهر للتاجر وتكلفة داخلية للمندوب. الفرق بينهم هو ربح الشحن قبل المصاريف التشغيلية.</p>
        <div className="rates-btn-group">
          <button type="button" className="outline-btn" onClick={() => onChange({ ...value, governorateRates: defaultGovernorateRates })}><RotateCcw size={14} /> استعادة الافتراضي</button>
          <button type="button" className="btn-primary" onClick={addRate}><Plus size={14} /> إضافة نطاق</button>
        </div>
      </div>

      <div className="table-responsive-box">
        <table className="data-table rates-table">
          <thead>
            <tr>
              <th>المحافظة / النطاق</th>
              <th>سعر التاجر</th>
              <th>تكلفة المندوب</th>
              <th>ربح الشحنة</th>
              <th>رسوم المرتجع</th>
              <th>مدة التوصيل</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => {
              const merchantFee = rate.merchantDeliveryFee ?? rate.deliveryFee;
              const driverCost = rate.driverDeliveryCost ?? 0;
              return (
                <tr key={rate.id}>
                  <td><input className="rates-input" value={rate.governorate} onChange={(event) => updateRate(rate.id, 'governorate', event.target.value)} /></td>
                  <td><input className="rates-input" type="number" min="0" value={merchantFee} onChange={(event) => updateRate(rate.id, 'merchantDeliveryFee', Number(event.target.value))} /></td>
                  <td><input className="rates-input" type="number" min="0" value={driverCost} onChange={(event) => updateRate(rate.id, 'driverDeliveryCost', Number(event.target.value))} /></td>
                  <td><strong style={{ color: merchantFee - driverCost >= 0 ? '#34D399' : '#F87171' }}>{formatCurrency(merchantFee - driverCost)}</strong></td>
                  <td><input className="rates-input" type="number" min="0" value={rate.returnFee} onChange={(event) => updateRate(rate.id, 'returnFee', Number(event.target.value))} /></td>
                  <td><input className="rates-input" type="number" min="1" max="14" value={rate.estimatedDays} onChange={(event) => updateRate(rate.id, 'estimatedDays', Number(event.target.value))} /></td>
                  <td><button type="button" className="btn-icon sm danger-link" onClick={() => onChange({ ...value, governorateRates: rates.filter((item) => item.id !== rate.id) })} title="حذف النطاق"><Trash2 size={14} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="settings-alert-box">أي شحنة جديدة تحتفظ بنسخة من السعر وقت الإنشاء. تغيير السعر هنا لا يعيد حساب الشحنات أو التسويات القديمة.</div>
    </div>
  );
}

function MerchantRatesSettings({ value, merchants, onChange }: { value: PricingPolicySettings; merchants: Array<{ id: string; name: string }>; onChange: (value: PricingPolicySettings) => void }) {
  const rates = value.merchantSpecificRates ?? [];
  const governorates = value.governorateRates?.length ? value.governorateRates : defaultGovernorateRates;
  const firstMerchant = merchants[0];
  const updateRate = (id: string, field: keyof MerchantSpecificRate, val: string | number | boolean) => {
    onChange({ ...value, merchantSpecificRates: rates.map((rate) => rate.id === id ? { ...rate, [field]: val } : rate) });
  };
  const addRate = () => {
    const merchant = firstMerchant ?? { id: 'merchant-custom', name: 'تاجر جديد' };
    const rate: MerchantSpecificRate = {
      id: `mrate-${Date.now()}`,
      merchantId: merchant.id,
      merchantName: merchant.name,
      governorate: governorates[0]?.governorate ?? 'القاهرة',
      merchantDeliveryFee: governorates[0]?.merchantDeliveryFee ?? 45,
      driverDeliveryCost: governorates[0]?.driverDeliveryCost ?? 28,
      returnFee: governorates[0]?.returnFee ?? 25,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      active: true,
    };
    onChange({ ...value, merchantSpecificRates: [rate, ...rates] });
  };

  return (
    <div className="rates-settings-section">
      <div className="rates-actions-bar">
        <p className="rates-notice">السعر الخاص يسبق سعر المحافظة العام عند حساب شحنة نفس التاجر ونفس المحافظة. استخدمه للعقود الكبيرة أو الخصومات المؤقتة.</p>
        <button type="button" className="btn-primary" onClick={addRate}><Plus size={14} /> إضافة سعر خاص</button>
      </div>
      <div className="table-responsive-box">
        <table className="data-table rates-table">
          <thead><tr><th>التاجر</th><th>المحافظة</th><th>سعر التاجر</th><th>تكلفة المندوب</th><th>ربح الشحنة</th><th>رسوم المرتجع</th><th>من تاريخ</th><th>نشط</th><th>إجراء</th></tr></thead>
          <tbody>
            {rates.map((rate) => {
              const merchantFee = rate.merchantDeliveryFee;
              const driverCost = rate.driverDeliveryCost;
              return (
                <tr key={rate.id}>
                  <td>
                    <select className="rates-input" value={rate.merchantId} onChange={(event) => {
                      const merchant = merchants.find((item) => item.id === event.target.value);
                      onChange({ ...value, merchantSpecificRates: rates.map((item) => item.id === rate.id ? { ...item, merchantId: event.target.value, merchantName: merchant?.name ?? item.merchantName } : item) });
                    }}>
                      {merchants.length ? merchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name}</option>) : <option value={rate.merchantId}>{rate.merchantName}</option>}
                    </select>
                  </td>
                  <td><select className="rates-input" value={rate.governorate} onChange={(event) => updateRate(rate.id, 'governorate', event.target.value)}>{governorates.map((item) => <option key={item.id} value={item.governorate}>{item.governorate}</option>)}</select></td>
                  <td><input className="rates-input" type="number" min="0" value={merchantFee} onChange={(event) => updateRate(rate.id, 'merchantDeliveryFee', Number(event.target.value))} /></td>
                  <td><input className="rates-input" type="number" min="0" value={driverCost} onChange={(event) => updateRate(rate.id, 'driverDeliveryCost', Number(event.target.value))} /></td>
                  <td><strong style={{ color: merchantFee - driverCost >= 0 ? '#34D399' : '#F87171' }}>{formatCurrency(merchantFee - driverCost)}</strong></td>
                  <td><input className="rates-input" type="number" min="0" value={rate.returnFee} onChange={(event) => updateRate(rate.id, 'returnFee', Number(event.target.value))} /></td>
                  <td><input className="rates-input" type="date" value={rate.effectiveFrom} onChange={(event) => updateRate(rate.id, 'effectiveFrom', event.target.value)} /></td>
                  <td><input type="checkbox" checked={rate.active} onChange={(event) => updateRate(rate.id, 'active', event.target.checked)} /></td>
                  <td><button type="button" className="btn-icon sm danger-link" onClick={() => onChange({ ...value, merchantSpecificRates: rates.filter((item) => item.id !== rate.id) })} title="حذف السعر الخاص"><Trash2 size={14} /></button></td>
                </tr>
              );
            })}
            {!rates.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '1rem' }}>لا توجد أسعار خاصة. السعر العام للمحافظة هو المستخدم حاليا.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WeightAndPickupSettings({ value, onChange }: { value: PricingPolicySettings; onChange: (value: PricingPolicySettings) => void }) {
  const tiers = value.weightTiers ?? [];
  const updateTier = (id: string, field: keyof WeightTierRate, val: number | undefined) => {
    onChange({ ...value, weightTiers: tiers.map((tier) => tier.id === id ? { ...tier, [field]: val } : tier) });
  };
  const addTier = () => onChange({ ...value, weightTiers: [...tiers, { id: `weight-${Date.now()}`, fromKg: value.baseWeightKg, toKg: value.baseWeightKg + 5, merchantExtraFee: value.extraWeightKgFee, driverExtraCost: Math.round(value.extraWeightKgFee * 0.6) }] });

  return (
    <div className="policy-settings-section">
      <div className="policy-block">
        <div className="policy-block-header">
          <Scale size={20} className="text-cyan" />
          <div><h3>الأوزان والاستلام من التاجر</h3><p>اضبط تكلفة الوزن الزائد ومتى يدفع التاجر رسوم استلام صغيرة.</p></div>
        </div>
        <div className="policy-grid-inputs three-cols">
          <NumberField label="الوزن الأساسي داخل سعر الشحن" value={value.baseWeightKg} min={1} max={50} suffix="كجم" onChange={(baseWeightKg) => onChange({ ...value, baseWeightKg })} />
          <NumberField label="سعر الكيلو الزائد" value={value.extraWeightKgFee} min={0} max={300} suffix="ج.م" onChange={(extraWeightKgFee) => onChange({ ...value, extraWeightKgFee })} />
          <NumberField label="مكافأة مندوب الاستلام" value={value.driverPickupReward} min={0} max={500} suffix="ج.م" onChange={(driverPickupReward) => onChange({ ...value, driverPickupReward })} />
          <NumberField label="الحد المجاني للاستلام" value={value.pickupFreeThreshold} min={1} max={100} suffix="شحنة" onChange={(pickupFreeThreshold) => onChange({ ...value, pickupFreeThreshold })} />
          <NumberField label="رسوم الاستلام تحت الحد" value={value.pickupFeeUnderThreshold} min={0} max={500} suffix="ج.م" onChange={(pickupFeeUnderThreshold) => onChange({ ...value, pickupFeeUnderThreshold })} />
        </div>
      </div>
      <div className="policy-block">
        <div className="policy-block-header">
          <Scale size={20} className="text-cyan" />
          <div><h3>شرائح الوزن الزائد</h3><p>كل شريحة تضيف مبلغا على سعر التاجر وتكلفة المندوب عند تجاوز الوزن الأساسي.</p></div>
          <button type="button" className="outline-btn" onClick={addTier}><Plus size={14} /> إضافة شريحة</button>
        </div>
        <div className="table-responsive-box">
          <table className="data-table rates-table">
            <thead><tr><th>من كجم</th><th>إلى كجم</th><th>زيادة سعر التاجر</th><th>زيادة تكلفة المندوب</th><th>هامش الشريحة</th><th>إجراء</th></tr></thead>
            <tbody>{tiers.map((tier) => <tr key={tier.id}><td><input className="rates-input" type="number" min="0" value={tier.fromKg} onChange={(event) => updateTier(tier.id, 'fromKg', Number(event.target.value))} /></td><td><input className="rates-input" type="number" min="0" value={tier.toKg ?? ''} placeholder="مفتوح" onChange={(event) => updateTier(tier.id, 'toKg', event.target.value ? Number(event.target.value) : undefined)} /></td><td><input className="rates-input" type="number" min="0" value={tier.merchantExtraFee} onChange={(event) => updateTier(tier.id, 'merchantExtraFee', Number(event.target.value))} /></td><td><input className="rates-input" type="number" min="0" value={tier.driverExtraCost} onChange={(event) => updateTier(tier.id, 'driverExtraCost', Number(event.target.value))} /></td><td><strong>{formatCurrency(tier.merchantExtraFee - tier.driverExtraCost)}</strong></td><td><button type="button" className="btn-icon sm danger-link" onClick={() => onChange({ ...value, weightTiers: tiers.filter((item) => item.id !== tier.id) })} title="حذف الشريحة"><Trash2 size={14} /></button></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PricingSettings({ value, onChange }: { value: PricingPolicySettings; onChange: (value: PricingPolicySettings) => void }) {
  return (
    <div className="policy-settings-section">
      <div className="policy-block">
        <div className="policy-block-header">
          <Banknote size={20} className="text-cyan" />
          <div><h3>الرسوم الإضافية والضريبة</h3><p>رسوم المرتجع والمحاولة الإضافية والتحصيل عند التسليم والضريبة.</p></div>
        </div>
        <div className="fee-grid-inputs">
          <FeeEditor title="رسوم المرتجع" mode={value.returnFeeMode} value={value.returnFeeValue} onMode={(returnFeeMode) => onChange({ ...value, returnFeeMode })} onValue={(returnFeeValue) => onChange({ ...value, returnFeeValue })} />
          <FeeEditor title="رسوم المحاولة الإضافية" mode={value.extraAttemptFeeMode} value={value.extraAttemptFeeValue} onMode={(extraAttemptFeeMode) => onChange({ ...value, extraAttemptFeeMode })} onValue={(extraAttemptFeeValue) => onChange({ ...value, extraAttemptFeeValue })} />
          <FeeEditor title="رسوم التحصيل عند التسليم" mode={value.collectionFeeMode} value={value.collectionFeeValue} onMode={(collectionFeeMode) => onChange({ ...value, collectionFeeMode })} onValue={(collectionFeeValue) => onChange({ ...value, collectionFeeValue })} />
        </div>
        <div className="policy-grid-inputs" style={{ marginTop: '1.25rem' }}>
          <NumberField label="الحد الأدنى لرسوم التحصيل" value={value.collectionFeeMinimum} suffix="ج.م" onChange={(collectionFeeMinimum) => onChange({ ...value, collectionFeeMinimum })} />
          <NumberField label="الحد الأقصى لرسوم التحصيل" value={value.collectionFeeMaximum} suffix="ج.م" onChange={(collectionFeeMaximum) => onChange({ ...value, collectionFeeMaximum })} />
          <NumberField label="نسبة الضريبة" value={value.vatRate} min={0} max={100} suffix="%" onChange={(vatRate) => onChange({ ...value, vatRate })} />
        </div>
        <div className="toggle-grid-inputs" style={{ marginTop: '1.25rem' }}>
          <Toggle checked={value.vatEnabled} label="تفعيل ضريبة القيمة المضافة" description="تطبق فقط على البنود المحددة." onChange={(vatEnabled) => onChange({ ...value, vatEnabled })} />
          <Toggle checked={value.pricesIncludeVat} label="الأسعار شاملة الضريبة" description="عند إيقافها تضاف الضريبة فوق الرسوم." onChange={(pricesIncludeVat) => onChange({ ...value, pricesIncludeVat })} />
          <Toggle checked={value.taxableShippingFee} label="سعر الشحن خاضع للضريبة" description="تطبيق الضريبة على سعر الشحن الأساسي." onChange={(taxableShippingFee) => onChange({ ...value, taxableShippingFee })} />
          <Toggle checked={value.taxableReturnFee} label="رسوم المرتجع خاضعة" description="تطبيق الضريبة على رسوم المرتجع." onChange={(taxableReturnFee) => onChange({ ...value, taxableReturnFee })} />
        </div>
      </div>
    </div>
  );
}

function ProofSettings({ value, onChange }: { value: ProofPolicySettings; onChange: (value: ProofPolicySettings) => void }) {
  return (
    <div className="policy-settings-section">
      <div className="policy-block">
        <div className="policy-block-header"><Camera size={20} className="text-cyan" /><div><h3>سياسة إثبات التسليم</h3><p>تحدد ما يجب أن يرسله المندوب قبل اعتماد الحالة.</p></div></div>
        <div className="toggle-grid-inputs">
          <Toggle checked={value.photoRequired} label="الصورة إلزامية" description="يجب رفع صورة واضحة عند التسليم." onChange={(photoRequired) => onChange({ ...value, photoRequired })} />
          <Toggle checked={value.photoFromCameraOnly} label="التصوير المباشر فقط" description="منع اختيار صورة قديمة من المعرض." onChange={(photoFromCameraOnly) => onChange({ ...value, photoFromCameraOnly })} />
          <Toggle checked={value.recipientNameRequired} label="اسم المستلم إلزامي" description="تسجيل اسم الشخص الذي استلم الشحنة." onChange={(recipientNameRequired) => onChange({ ...value, recipientNameRequired })} />
          <Toggle checked={value.gpsRequired} label="الموقع إلزامي" description="تسجيل لقطة GPS عند كل تسليم أو محاولة." onChange={(gpsRequired) => onChange({ ...value, gpsRequired })} />
        </div>
        <div className="policy-grid-inputs four-cols" style={{ marginTop: '1.25rem' }}>
          <NumberField label="عدد الصور" value={value.minimumPhotoCount} min={0} max={5} suffix="صورة" onChange={(minimumPhotoCount) => onChange({ ...value, minimumPhotoCount })} />
          <NumberField label="دقة GPS المفضلة" value={value.preferredAccuracyMeters} min={1} suffix="متر" onChange={(preferredAccuracyMeters) => onChange({ ...value, preferredAccuracyMeters })} />
          <NumberField label="أقصى دقة مقبولة" value={value.maximumAccuracyMeters} min={value.preferredAccuracyMeters} suffix="متر" onChange={(maximumAccuracyMeters) => onChange({ ...value, maximumAccuracyMeters })} />
          <NumberField label="نطاق الوصول للعنوان" value={value.deliveryGeofenceMeters} min={20} suffix="متر" onChange={(deliveryGeofenceMeters) => onChange({ ...value, deliveryGeofenceMeters })} />
        </div>
      </div>
    </div>
  );
}

function PrintingSettingsPanel({ value, onChange }: { value: PrintingSettings; onChange: (value: PrintingSettings) => void }) {
  return (
    <div className="policy-settings-section">
      <div className="policy-block">
        <div className="policy-block-header"><Printer size={20} className="text-cyan" /><div><h3>إعدادات الطباعة والبوليصة</h3><p>المقاس والنسخ والبيانات الافتراضية قبل الطباعة.</p></div></div>
        <div className="policy-grid-inputs">
          <label className="setting-field-card"><span className="field-label">مقاس البوليصة الافتراضي</span><div className="field-input-box"><select value={value.defaultLabelFormat} onChange={(event) => onChange({ ...value, defaultLabelFormat: event.target.value as PrintingSettings['defaultLabelFormat'] })}><option value="thermal">حراري 10 × 15 سم</option><option value="a4">ورق A4 - أربع بوالص في الصفحة</option></select></div></label>
          <NumberField label="عدد النسخ الافتراضي" value={value.defaultCopies} min={1} max={5} suffix="نسخة" onChange={(defaultCopies) => onChange({ ...value, defaultCopies })} />
        </div>
        <div className="toggle-grid-inputs" style={{ marginTop: '1.25rem' }}>
          <Toggle checked={value.showCod} label="إظهار مبلغ التحصيل على البوليصة" description="طباعة المبلغ المطلوب من المستلم بشكل بارز." onChange={(showCod) => onChange({ ...value, showCod })} />
          <Toggle checked={value.showContents} label="إظهار محتويات الشحنة" description="عرض المنتجات داخل البوليصة." onChange={(showContents) => onChange({ ...value, showContents })} />
        </div>
      </div>
    </div>
  );
}

function WhatsAppSettingsPanel({ value, onChange }: { value: WhatsAppNotificationSettings; onChange: (val: WhatsAppNotificationSettings) => void }) {
  const variables = ['{اسم_العميل}', '{رقم_الشحنة}', '{اسم_التاجر}', '{اسم_شركة_الشحن}', '{المحافظة}', '{مدة_التسليم}', '{المبلغ}', '{رابط_التتبع}'];
  const sampleText = (value.defaultTemplate || defaultWhatsAppTemplate)
    .replaceAll('{اسم_العميل}', 'محمد أحمد')
    .replaceAll('{رقم_الشحنة}', 'SHP-90812')
    .replaceAll('{اسم_التاجر}', 'متجر الأناقة')
    .replaceAll('{اسم_شركة_الشحن}', value.companyName || 'FIX 365')
    .replaceAll('{المحافظة}', 'الإسكندرية')
    .replaceAll('{مدة_التسليم}', 'خلال يومين عمل')
    .replaceAll('{المبلغ}', '450 ج.م')
    .replaceAll('{رابط_التتبع}', 'https://fix365.app/track/SHP-90812');

  return (
    <div className="whatsapp-settings-section">
      <div className="toggle-grid-inputs">
        <Toggle checked={value.enabled} label="تفعيل رسائل واتساب" description="إظهار زر واتساب في مسارات الشحن والتواصل." onChange={(enabled) => onChange({ ...value, enabled })} />
      </div>
      <div className="policy-grid-inputs" style={{ marginTop: '1.25rem' }}>
        <label className="setting-field-card"><span className="field-label">اسم شركة الشحن في الرسالة</span><div className="field-input-box"><input type="text" value={value.companyName} onChange={(event) => onChange({ ...value, companyName: event.target.value })} /></div></label>
      </div>
      <div className="template-editor-card" style={{ marginTop: '1.25rem' }}>
        <strong className="field-label">قالب الرسالة</strong>
        <div className="variable-badges-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', margin: '.75rem 0' }}>
          {variables.map((variable) => <button key={variable} type="button" className="chip-badge" onClick={() => onChange({ ...value, defaultTemplate: `${value.defaultTemplate || ''} ${variable}`.trim() })}>+ {variable}</button>)}
        </div>
        <textarea className="input-glass" rows={4} style={{ width: '100%', fontFamily: 'inherit', padding: '.75rem', lineHeight: 1.7 }} value={value.defaultTemplate} onChange={(event) => onChange({ ...value, defaultTemplate: event.target.value })} />
      </div>
      <div className="whatsapp-preview-box" style={{ marginTop: '1.25rem' }}>
        <strong>معاينة الرسالة</strong>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{sampleText}</p>
      </div>
    </div>
  );
}
