import { useState } from 'react';
import { Banknote, Camera, MapPin, Plus, Printer, RotateCcw, Save, Scale, Settings2, Trash2 } from 'lucide-react';
import { ErrorState, PageSkeleton } from '../components/AsyncState';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { defaultGovernorateRates, defaultTenantOperationalSettings, type FeeMode, type GovernorateRate, type PricingPolicySettings, type PrintingSettings, type ProofPolicySettings } from '../domain/settings/entities';
import './Settings.css';

type SettingsTab = 'rates' | 'weight_pickup' | 'pricing' | 'proof' | 'printing';
const tabs: Array<{ id: SettingsTab; label: string; description: string; icon: typeof Banknote }> = [
  { id: 'rates', label: 'أسعار المحافظات والمدن', description: 'جدول أسعار الشحن والمرتجع لكل نطاق جغرافي.', icon: MapPin },
  { id: 'weight_pickup', label: 'الأوزان واستلام الشحنات (Pickup)', description: 'الكيلو الزائد، شروط البيك أب المجاني، وأجر المندوب.', icon: Scale },
  { id: 'pricing', label: 'الرسوم والضرائب', description: 'المرتجع والمحاولات والتحصيل والضريبة.', icon: Banknote },
  { id: 'proof', label: 'إثبات التسليم', description: 'الصورة واسم المستلم والموقع.', icon: Camera },
  { id: 'printing', label: 'الطباعة والبوليصة', description: 'المقاس والنسخ والبيانات الظاهرة.', icon: Printer },
];

export function SettingsPage() {
  const { state, isLoading, error, refetch, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const [activeTab, setActiveTab] = useState<SettingsTab>('rates');
  const [pricing, setPricing] = useState<PricingPolicySettings>(() => structuredClone(state?.settings.pricing ?? defaultTenantOperationalSettings.pricing));
  const [proof, setProof] = useState<ProofPolicySettings>(() => structuredClone(state?.settings.proof ?? defaultTenantOperationalSettings.proof));
  const [printing, setPrinting] = useState<PrintingSettings>(() => structuredClone(state?.settings.printing ?? defaultTenantOperationalSettings.printing));
  const [saving, setSaving] = useState(false);

  if (isLoading) return <PageSkeleton rows={5} />;
  if (error || !state) return <ErrorState message={error ?? 'تعذر تحميل إعدادات الشركة.'} onRetry={refetch} />;

  const save = async () => {
    setSaving(true);
    const command = ['rates', 'weight_pickup', 'pricing'].includes(activeTab)
      ? { type: 'settings/updatePricing' as const, policy: pricing }
      : activeTab === 'proof'
        ? { type: 'settings/updateProof' as const, policy: proof }
        : { type: 'settings/updatePrinting' as const, policy: printing };
    const result = await execute(command);
    showToast(result.message, result.ok ? 'success' : 'danger');
    setSaving(false);
  };

  return <div className="settings-page">
    <header className="settings-hero glass-card">
      <div>
        <p className="page-kicker">سياسات شركة الشحن</p>
        <h2>إعدادات التشغيل والتسعير والسياسات</h2>
      </div>
      <div className="settings-hero-actions">
        <button className="btn-primary" disabled={saving} onClick={() => void save()}><Save size={15}/>{saving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}</button>
      </div>
    </header>

    <section className="settings-layout">
      <nav className="settings-tabs glass-card" aria-label="أقسام الإعدادات">
        {tabs.map(({ id, label, description, icon: Icon }) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}><Icon size={18}/><span><strong>{label}</strong><small>{description}</small></span></button>)}
      </nav>

      <div className="settings-content glass-card">
        {activeTab === 'rates' && <GovernorateRatesSettings value={pricing} onChange={setPricing}/>}
        {activeTab === 'weight_pickup' && <WeightAndPickupSettings value={pricing} onChange={setPricing}/>}
        {activeTab === 'pricing' && <PricingSettings value={pricing} onChange={setPricing}/>} 
        {activeTab === 'proof' && <ProofSettings value={proof} onChange={setProof}/>} 
        {activeTab === 'printing' && <PrintingSettingsPanel value={printing} onChange={setPrinting}/>}
      </div>
    </section>
  </div>;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="settings-section-heading"><div className="settings-section-icon"><Settings2 size={20}/></div><div><h3>{title}</h3><p>{description}</p></div></div>;
}

function Toggle({ checked, label, description, onChange }: { checked: boolean; label: string; description: string; onChange: (value: boolean) => void }) {
  return <label className="setting-toggle"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)}/><i aria-hidden="true"/></label>;
}

function NumberField({ label, value, onChange, suffix, min = 0, max }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; min?: number; max?: number }) {
  return <label className="setting-field"><span>{label}</span><div><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))}/>{suffix && <em>{suffix}</em>}</div></label>;
}

function FeeEditor({ title, mode, value, onMode, onValue }: { title: string; mode: FeeMode; value: number; onMode: (mode: FeeMode) => void; onValue: (value: number) => void }) {
  return <div className="fee-editor"><strong>{title}</strong><div className="fee-editor-row"><select value={mode} onChange={(event) => onMode(event.target.value as FeeMode)}><option value="disabled">بدون رسوم</option><option value="fixed">مبلغ ثابت</option><option value="percentage">نسبة مئوية</option></select><div><input type="number" min="0" value={value} disabled={mode === 'disabled'} onChange={(event) => onValue(Number(event.target.value))}/><span>{mode === 'percentage' ? '٪' : 'ج.م'}</span></div></div></div>;
}

function GovernorateRatesSettings({ value, onChange }: { value: PricingPolicySettings; onChange: (value: PricingPolicySettings) => void }) {
  const rates = value.governorateRates?.length ? value.governorateRates : defaultGovernorateRates;

  const updateRate = (id: string, field: keyof GovernorateRate, val: string | number) => {
    const next = rates.map((r) => r.id === id ? { ...r, [field]: val } : r);
    onChange({ ...value, governorateRates: next });
  };

  const addRate = () => {
    const newRate: GovernorateRate = {
      id: `gov-custom-${Date.now()}`,
      governorate: 'نطاق جديد',
      deliveryFee: 50,
      returnFee: 25,
      estimatedDays: 1,
    };
    onChange({ ...value, governorateRates: [...rates, newRate] });
  };

  const removeRate = (id: string) => {
    onChange({ ...value, governorateRates: rates.filter((r) => r.id !== id) });
  };

  const resetToDefaults = () => {
    onChange({ ...value, governorateRates: defaultGovernorateRates });
  };

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <SectionHeading
        title="جدول أسعار المحافظات والنطاقات الجغرافية"
        description="الأسعار العامة المعتمدة لشركة الشحن؛ تطبق افتراضيًا على الشحنات ما لم يُخصص للتاجر عقد أسعار خاص."
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="outline-btn" onClick={resetToDefaults} title="استعادة الأسعار الافتراضية"><RotateCcw size={14}/> استعادة الافتراضي</button>
        <button className="btn-primary" onClick={addRate}><Plus size={14}/> إضافة نطاق جديد</button>
      </div>
    </div>

    <div className="table-wrapper">
      <table className="data-table compact-table">
        <thead>
          <tr>
            <th>المحافظة / النطاق الجغرافي</th>
            <th style={{ width: '130px' }}>سعر الشحن (ج.م)</th>
            <th style={{ width: '130px' }}>رسوم المرتجع (ج.م)</th>
            <th style={{ width: '130px' }}>المدة المتوقعة (أيام)</th>
            <th style={{ width: '60px', textAlign: 'center' }}>إجراء</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((rate) => (
            <tr key={rate.id}>
              <td>
                <input
                  className="input-glass"
                  style={{ width: '100%', padding: '0.4rem 0.6rem' }}
                  value={rate.governorate}
                  onChange={(e) => updateRate(rate.id, 'governorate', e.target.value)}
                />
              </td>
              <td>
                <input
                  className="input-glass"
                  style={{ width: '100%', padding: '0.4rem 0.6rem' }}
                  type="number"
                  min="0"
                  value={rate.deliveryFee}
                  onChange={(e) => updateRate(rate.id, 'deliveryFee', Number(e.target.value))}
                />
              </td>
              <td>
                <input
                  className="input-glass"
                  style={{ width: '100%', padding: '0.4rem 0.6rem' }}
                  type="number"
                  min="0"
                  value={rate.returnFee}
                  onChange={(e) => updateRate(rate.id, 'returnFee', Number(e.target.value))}
                />
              </td>
              <td>
                <input
                  className="input-glass"
                  style={{ width: '100%', padding: '0.4rem 0.6rem' }}
                  type="number"
                  min="1"
                  max="14"
                  value={rate.estimatedDays}
                  onChange={(e) => updateRate(rate.id, 'estimatedDays', Number(e.target.value))}
                />
              </td>
              <td style={{ textAlign: 'center' }}>
                <button
                  className="btn-icon sm danger-link"
                  onClick={() => removeRate(rate.id)}
                  title="حذف هذا النطاق"
                >
                  <Trash2 size={14}/>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <aside className="settings-note">أي تعديل في هذه القائمة يطبّق على الشحنات المستقبلية، ولا يغيّر أسعار الشحنات أو التسويات المحسوبة مسبقًا.</aside>
  </>;
}

function WeightAndPickupSettings({ value, onChange }: { value: PricingPolicySettings; onChange: (value: PricingPolicySettings) => void }) {
  const baseWeight = value.baseWeightKg ?? 3;
  const extraKgFee = value.extraWeightKgFee ?? 10;
  const freeThreshold = value.pickupFreeThreshold ?? 5;
  const pickupFee = value.pickupFeeUnderThreshold ?? 30;
  const driverReward = value.driverPickupReward ?? 20;

  return <>
    <SectionHeading
      title="سياسة الأوزان واستلام الشحنات (Pickup)"
      description="تحديد شروط الوزن المسموح، تسعير الكيلو الإضافي، وشروط استلام الشحنات المجانية ومكافأة المندوب."
    />

    <h4 style={{ margin: '1.2rem 0 0.5rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
      ⚖️ سياسة الأوزان والكيلو الزائد (Weight Policy)
    </h4>
    <div className="settings-number-grid">
      <NumberField
        label="الوزن الأساسي المسموح (شامل في سعر الشحن)"
        value={baseWeight}
        min={1}
        max={50}
        suffix="كجم"
        onChange={(val) => onChange({ ...value, baseWeightKg: val })}
      />
      <NumberField
        label="سعر الكيلو الزائد فوق الوزن المسموح"
        value={extraKgFee}
        min={0}
        max={200}
        suffix="ج.م / كجم"
        onChange={(val) => onChange({ ...value, extraWeightKgFee: val })}
      />
    </div>
    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
      💡 <strong>مثال:</strong> شحنة وزنها 5 كجم سيتم احتساب أول {baseWeight} كجم بالسعر الأساسي، ويضاف (2 كجم × {extraKgFee} ج.م = {2 * extraKgFee} ج.م) تكلفة وزن إضافي.
    </p>

    <h4 style={{ margin: '1.2rem 0 0.5rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
      🛵 سياسة الاستلام من التاجر (Pickup Policy)
    </h4>
    <div className="settings-number-grid">
      <NumberField
        label="الحد الأدنى لعدد الشحنات للبيك أب المجاني"
        value={freeThreshold}
        min={1}
        max={100}
        suffix="شحنة"
        onChange={(val) => onChange({ ...value, pickupFreeThreshold: val })}
      />
      <NumberField
        label="رسوم الاستلام للدفعات الصغيرة (أقل من الحد الأدنى)"
        value={pickupFee}
        min={0}
        max={500}
        suffix="ج.م"
        onChange={(val) => onChange({ ...value, pickupFeeUnderThreshold: val })}
      />
      <NumberField
        label="أجر / عمولة مندوب الاستلام عن المشوار"
        value={driverReward}
        min={0}
        max={500}
        suffix="ج.م"
        onChange={(val) => onChange({ ...value, driverPickupReward: val })}
      />
    </div>
    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
      💡 <strong>آلية العمل:</strong> إذا سلّم التاجر {freeThreshold} شحنات فأكثر فالاستلام مجاني تماماً؛ وإذا سلّم أقل يُخصم {pickupFee} ج.م رسوم بيك أب. ويتقاضى المندوب {driverReward} ج.م عن المشوار في الحالتين.
    </p>
  </>;
}

function PricingSettings({ value, onChange }: { value: PricingPolicySettings; onChange: (value: PricingPolicySettings) => void }) {
  return <>
    <SectionHeading title="سياسة الرسوم والضرائب الإضافية" description="القيم الافتراضية بلا رسوم إضافية وبلا ضريبة، ويمكن للشركة تفعيلها من هنا لاحقًا."/>
    <div className="fee-grid">
      <FeeEditor title="رسوم المرتجع" mode={value.returnFeeMode} value={value.returnFeeValue} onMode={(returnFeeMode) => onChange({ ...value, returnFeeMode })} onValue={(returnFeeValue) => onChange({ ...value, returnFeeValue })}/>
      <FeeEditor title="رسوم المحاولة الإضافية" mode={value.extraAttemptFeeMode} value={value.extraAttemptFeeValue} onMode={(extraAttemptFeeMode) => onChange({ ...value, extraAttemptFeeMode })} onValue={(extraAttemptFeeValue) => onChange({ ...value, extraAttemptFeeValue })}/>
      <FeeEditor title="رسوم التحصيل Collection Fee" mode={value.collectionFeeMode} value={value.collectionFeeValue} onMode={(collectionFeeMode) => onChange({ ...value, collectionFeeMode })} onValue={(collectionFeeValue) => onChange({ ...value, collectionFeeValue })}/>
    </div>
    <div className="settings-number-grid">
      <NumberField label="الحد الأدنى لرسوم التحصيل" value={value.collectionFeeMinimum} suffix="ج.م" onChange={(collectionFeeMinimum) => onChange({ ...value, collectionFeeMinimum })}/>
      <NumberField label="الحد الأقصى لرسوم التحصيل" value={value.collectionFeeMaximum} suffix="ج.م" onChange={(collectionFeeMaximum) => onChange({ ...value, collectionFeeMaximum })}/>
    </div>
    <div className="settings-card-grid">
      <Toggle checked={value.vatEnabled} label="تفعيل ضريبة القيمة المضافة" description="مغلقة افتراضيًا، وتُحسب فقط على البنود المحددة أدناه." onChange={(vatEnabled) => onChange({ ...value, vatEnabled })}/>
      <Toggle checked={value.pricesIncludeVat} label="الأسعار شاملة الضريبة" description="عند إيقافها تضاف الضريبة فوق الرسوم المسجلة." onChange={(pricesIncludeVat) => onChange({ ...value, pricesIncludeVat })}/>
    </div>
    <div className="settings-number-grid"><NumberField label="نسبة الضريبة" value={value.vatRate} min={0} max={100} suffix="٪" onChange={(vatRate) => onChange({ ...value, vatRate })}/></div>
    <div className="taxable-grid">
      <Toggle checked={value.taxableShippingFee} label="رسوم الشحن خاضعة" description="تطبيق الضريبة على رسوم الشحن الأساسية." onChange={(taxableShippingFee) => onChange({ ...value, taxableShippingFee })}/>
      <Toggle checked={value.taxableReturnFee} label="رسوم المرتجع خاضعة" description="تطبيق الضريبة على رسوم المرتجع." onChange={(taxableReturnFee) => onChange({ ...value, taxableReturnFee })}/>
      <Toggle checked={value.taxableExtraAttemptFee} label="المحاولة الإضافية خاضعة" description="تطبيق الضريبة على رسوم المحاولات الإضافية." onChange={(taxableExtraAttemptFee) => onChange({ ...value, taxableExtraAttemptFee })}/>
      <Toggle checked={value.taxableCollectionFee} label="رسوم التحصيل خاضعة" description="تطبيق الضريبة على Collection Fee." onChange={(taxableCollectionFee) => onChange({ ...value, taxableCollectionFee })}/>
    </div>
    <aside className="settings-note">كل شحنة تحتفظ بنسخة Pricing Snapshot، لذلك تغيير هذه السياسة لا يعيد حساب شحنات أو تسويات قديمة.</aside>
  </>;
}

function ProofSettings({ value, onChange }: { value: ProofPolicySettings; onChange: (value: ProofPolicySettings) => void }) {
  return <>
    <SectionHeading title="سياسة إثبات التسليم" description="إثبات التسليم الرسمي يعتمد الصورة واسم المستلم ولقطة GPS."/>
    <div className="settings-card-grid">
      <Toggle checked={value.photoRequired} label="الصورة إلزامية" description="يجب رفع صورة جديدة عند تأكيد التسليم." onChange={(photoRequired) => onChange({ ...value, photoRequired })}/>
      <Toggle checked={value.photoFromCameraOnly} label="التصوير بالكاميرا فقط" description="منع اختيار صورة قديمة من المعرض في تطبيق المندوب." onChange={(photoFromCameraOnly) => onChange({ ...value, photoFromCameraOnly })}/>
      <Toggle checked={value.recipientNameRequired} label="اسم المستلم إلزامي" description="تسجيل اسم الشخص الذي استلم فعليًا." onChange={(recipientNameRequired) => onChange({ ...value, recipientNameRequired })}/>
      <Toggle checked={value.gpsRequired} label="الموقع إلزامي" description="تسجيل لقطة موقع عند التسليم أو فشل التواصل." onChange={(gpsRequired) => onChange({ ...value, gpsRequired })}/>
    </div>
    <div className="settings-number-grid">
      <NumberField label="الحد الأدنى للصور" value={value.minimumPhotoCount} min={0} max={5} suffix="صورة" onChange={(minimumPhotoCount) => onChange({ ...value, minimumPhotoCount })}/>
      <NumberField label="الدقة المفضلة" value={value.preferredAccuracyMeters} min={1} suffix="متر" onChange={(preferredAccuracyMeters) => onChange({ ...value, preferredAccuracyMeters })}/>
      <NumberField label="أقصى دقة مقبولة" value={value.maximumAccuracyMeters} min={value.preferredAccuracyMeters} suffix="متر" onChange={(maximumAccuracyMeters) => onChange({ ...value, maximumAccuracyMeters })}/>
      <NumberField label="نطاق الوصول للعنوان" value={value.deliveryGeofenceMeters} min={20} suffix="متر" onChange={(deliveryGeofenceMeters) => onChange({ ...value, deliveryGeofenceMeters })}/>
    </div>
    <aside className="settings-note">الموقع يؤكد أن المندوب وصل قرب العنوان، لكنه لا يثبت وحده أن العميل لم يرد. الحالات خارج النطاق أو ذات الدقة الضعيفة تتحول لمراجعة الشركة.</aside>
  </>;
}

function PrintingSettingsPanel({ value, onChange }: { value: PrintingSettings; onChange: (value: PrintingSettings) => void }) {
  return <>
    <SectionHeading title="إعدادات الطباعة والبوليصة" description="تحدد المعاينة الافتراضية فقط؛ المستخدم يظل قادرًا على تغيير المقاس والنسخ قبل الطباعة."/>
    <div className="settings-number-grid">
      <label className="setting-field"><span>المقاس الافتراضي</span><select value={value.defaultLabelFormat} onChange={(event) => onChange({ ...value, defaultLabelFormat: event.target.value as PrintingSettings['defaultLabelFormat'] })}><option value="thermal">حراري 10 × 15 سم</option><option value="a4">A4 — أربع بوالص</option></select></label>
      <NumberField label="عدد النسخ الافتراضي" value={value.defaultCopies} min={1} max={5} suffix="نسخة" onChange={(defaultCopies) => onChange({ ...value, defaultCopies })}/>
    </div>
    <div className="settings-card-grid">
      <Toggle checked={value.showCod} label="إظهار COD" description="إظهار المبلغ المطلوب تحصيله على البوليصة." onChange={(showCod) => onChange({ ...value, showCod })}/>
      <Toggle checked={value.showContents} label="إظهار محتويات الشحنة" description="يعرض وصف الأصناف عندما تسمح سياسة الشركة بذلك." onChange={(showContents) => onChange({ ...value, showContents })}/>
    </div>
  </>;
}

