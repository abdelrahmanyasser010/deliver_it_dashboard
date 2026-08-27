import { useState } from 'react';
import { Banknote, Camera, MapPin, Plus, Printer, RotateCcw, Save, Scale, Settings2, Trash2 } from 'lucide-react';
import { ErrorState, PageSkeleton } from '../components/AsyncState';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  defaultGovernorateRates,
  defaultTenantOperationalSettings,
  type FeeMode,
  type GovernorateRate,
  type PricingPolicySettings,
  type PrintingSettings,
  type ProofPolicySettings,
} from '../domain/settings/entities';
import './Settings.css';

type SettingsTab = 'rates' | 'weight_pickup' | 'pricing' | 'proof' | 'printing';

interface TabConfig {
  id: SettingsTab;
  label: string;
  description: string;
  icon: typeof Banknote;
}

const tabs: TabConfig[] = [
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
  const [pricing, setPricing] = useState<PricingPolicySettings>(
    () => structuredClone(state?.settings.pricing ?? defaultTenantOperationalSettings.pricing)
  );
  const [proof, setProof] = useState<ProofPolicySettings>(
    () => structuredClone(state?.settings.proof ?? defaultTenantOperationalSettings.proof)
  );
  const [printing, setPrinting] = useState<PrintingSettings>(
    () => structuredClone(state?.settings.printing ?? defaultTenantOperationalSettings.printing)
  );
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

  return (
    <div className="settings-page">
      <div className="settings-layout">
        {/* Right Side (in RTL) - Navigation Tabs */}
        <aside className="settings-tabs-sidebar" aria-label="أقسام الإعدادات">
          <div className="settings-tabs-header">
            <Settings2 size={20} className="settings-header-icon" />
            <div>
              <strong>سياسات الشركة</strong>
              <span>إدارة قواعد التسعير والتشغيل</span>
            </div>
          </div>
          <div className="settings-tabs-list">
            {tabs.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`settings-nav-btn ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <div className="nav-btn-icon">
                  <Icon size={18} />
                </div>
                <div className="nav-btn-content">
                  <span className="nav-btn-title">{label}</span>
                  <span className="nav-btn-desc">{description}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Left Side (in RTL) - Content Area */}
        <main className="settings-content-wrapper">
          <div className="settings-panel-card">
            {/* Top Toolbar with Save button inside the active panel */}
            <div className="panel-top-toolbar">
              <div className="panel-title-wrap">
                <h2>{tabs.find((t) => t.id === activeTab)?.label}</h2>
                <p>{tabs.find((t) => t.id === activeTab)?.description}</p>
              </div>
              <button
                type="button"
                className="btn-primary settings-save-btn"
                disabled={saving}
                onClick={() => void save()}
              >
                <Save size={16} />
                <span>{saving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}</span>
              </button>
            </div>

            <div className="panel-body">
              {activeTab === 'rates' && <GovernorateRatesSettings value={pricing} onChange={setPricing} />}
              {activeTab === 'weight_pickup' && <WeightAndPickupSettings value={pricing} onChange={setPricing} />}
              {activeTab === 'pricing' && <PricingSettings value={pricing} onChange={setPricing} />}
              {activeTab === 'proof' && <ProofSettings value={proof} onChange={setProof} />}
              {activeTab === 'printing' && <PrintingSettingsPanel value={printing} onChange={setPrinting} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (value: boolean) => void;
}) {
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

function NumberField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="setting-field-card">
      <span className="field-label">{label}</span>
      <div className="field-input-box">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && <em className="field-suffix">{suffix}</em>}
      </div>
    </label>
  );
}

function FeeEditor({
  title,
  mode,
  value,
  onMode,
  onValue,
}: {
  title: string;
  mode: FeeMode;
  value: number;
  onMode: (mode: FeeMode) => void;
  onValue: (value: number) => void;
}) {
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
          <input
            type="number"
            min="0"
            value={value}
            disabled={mode === 'disabled'}
            onChange={(event) => onValue(Number(event.target.value))}
          />
          <span>{mode === 'percentage' ? '٪' : 'ج.م'}</span>
        </div>
      </div>
    </div>
  );
}

function GovernorateRatesSettings({
  value,
  onChange,
}: {
  value: PricingPolicySettings;
  onChange: (value: PricingPolicySettings) => void;
}) {
  const rates = value.governorateRates?.length ? value.governorateRates : defaultGovernorateRates;

  const updateRate = (id: string, field: keyof GovernorateRate, val: string | number) => {
    const next = rates.map((r) => (r.id === id ? { ...r, [field]: val } : r));
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

  return (
    <div className="rates-settings-section">
      <div className="rates-actions-bar">
        <p className="rates-notice">
          الأسعار العامة المعتمدة لشركة الشحن؛ تطبق افتراضيًا على الشحنات ما لم يُخصص للتاجر عقد أسعار خاص.
        </p>
        <div className="rates-btn-group">
          <button type="button" className="outline-btn" onClick={resetToDefaults} title="استعادة الأسعار الافتراضية">
            <RotateCcw size={14} /> استعادة الافتراضي
          </button>
          <button type="button" className="btn-primary" onClick={addRate}>
            <Plus size={14} /> إضافة نطاق جديد
          </button>
        </div>
      </div>

      <div className="table-responsive-box">
        <table className="data-table rates-table">
          <thead>
            <tr>
              <th>المحافظة / النطاق الجغرافي</th>
              <th style={{ width: '140px' }}>سعر الشحن (ج.م)</th>
              <th style={{ width: '140px' }}>رسوم المرتجع (ج.م)</th>
              <th style={{ width: '140px' }}>المدة المتوقعة (أيام)</th>
              <th style={{ width: '70px', textAlign: 'center' }}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => (
              <tr key={rate.id}>
                <td>
                  <input
                    className="rates-input"
                    value={rate.governorate}
                    onChange={(e) => updateRate(rate.id, 'governorate', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="rates-input"
                    type="number"
                    min="0"
                    value={rate.deliveryFee}
                    onChange={(e) => updateRate(rate.id, 'deliveryFee', Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    className="rates-input"
                    type="number"
                    min="0"
                    value={rate.returnFee}
                    onChange={(e) => updateRate(rate.id, 'returnFee', Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    className="rates-input"
                    type="number"
                    min="1"
                    max="14"
                    value={rate.estimatedDays}
                    onChange={(e) => updateRate(rate.id, 'estimatedDays', Number(e.target.value))}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn-icon sm danger-link"
                    onClick={() => removeRate(rate.id)}
                    title="حذف هذا النطاق"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="settings-alert-box">
        ℹ️ أي تعديل في هذه القائمة يطبّق على الشحنات المستقبلية، ولا يغيّر أسعار الشحنات أو التسويات المحسوبة مسبقًا.
      </div>
    </div>
  );
}

function WeightAndPickupSettings({
  value,
  onChange,
}: {
  value: PricingPolicySettings;
  onChange: (value: PricingPolicySettings) => void;
}) {
  const baseWeight = value.baseWeightKg ?? 3;
  const extraKgFee = value.extraWeightKgFee ?? 10;
  const freeThreshold = value.pickupFreeThreshold ?? 5;
  const pickupFee = value.pickupFeeUnderThreshold ?? 30;
  const driverReward = value.driverPickupReward ?? 20;

  return (
    <div className="policy-settings-section">
      {/* 1. Weight Policy */}
      <div className="policy-block">
        <div className="policy-block-header">
          <Scale size={20} className="text-cyan" />
          <div>
            <h3>سياسة الأوزان والكيلو الزائد (Weight Policy)</h3>
            <p>تحديد سقف الوزن الأساسي وتكلفة كل كيلو زائد إضافي.</p>
          </div>
        </div>

        <div className="policy-grid-inputs">
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

        <div className="example-callout">
          💡 <strong>مثال توضيحي:</strong> شحنة وزنها 5 كجم سيتم احتساب أول {baseWeight} كجم بالسعر الأساسي للوجهة، ويضاف ({5 - baseWeight} كجم × {extraKgFee} ج.م = {(5 - baseWeight) * extraKgFee} ج.م) تكلفة وزن إضافي.
        </div>
      </div>

      {/* 2. Pickup Policy */}
      <div className="policy-block">
        <div className="policy-block-header">
          <Scale size={20} className="text-indigo" />
          <div>
            <h3>سياسة استلام الشحنات من التاجر (Pickup Policy)</h3>
            <p>شروط الاستلام المجاني للطلبات الكبيرة، ورسوم استلام الدفعات الصغيرة، وعمولة المندوب.</p>
          </div>
        </div>

        <div className="policy-grid-inputs three-cols">
          <NumberField
            label="الحد الأدنى لعدد الشحنات للبيك أب المجاني"
            value={freeThreshold}
            min={1}
            max={100}
            suffix="شحنة"
            onChange={(val) => onChange({ ...value, pickupFreeThreshold: val })}
          />
          <NumberField
            label="رسوم الاستلام للدفعات الصغيرة (أقل من الحد)"
            value={pickupFee}
            min={0}
            max={500}
            suffix="ج.م"
            onChange={(val) => onChange({ ...value, pickupFeeUnderThreshold: val })}
          />
          <NumberField
            label="أجر / مكافأة مندوب الاستلام عن المشوار"
            value={driverReward}
            min={0}
            max={500}
            suffix="ج.م"
            onChange={(val) => onChange({ ...value, driverPickupReward: val })}
          />
        </div>

        <div className="example-callout indigo-callout">
          💡 <strong>آلية الحساب الذكية:</strong> إذا سلّم التاجر <strong>{freeThreshold} شحنات فأكثر</strong> فالاستلام مجاني تماماً له؛ وإذا سلّم أقل يُخصم <strong>{pickupFee} ج.م</strong> رسوم بيك أب من حسابه. ويتقاضى المندوب <strong>{driverReward} ج.م</strong> مكافأة عن المشوار في الحالتين.
        </div>
      </div>
    </div>
  );
}

function PricingSettings({
  value,
  onChange,
}: {
  value: PricingPolicySettings;
  onChange: (value: PricingPolicySettings) => void;
}) {
  return (
    <div className="policy-settings-section">
      <div className="policy-block">
        <div className="policy-block-header">
          <Banknote size={20} className="text-cyan" />
          <div>
            <h3>سياسة الرسوم والضرائب الإضافية</h3>
            <p>القيم الافتراضية بلا رسوم إضافية وبلا ضريبة، ويمكن للشركة تفعيلها من هنا لاحقًا.</p>
          </div>
        </div>

        <div className="fee-grid-inputs">
          <FeeEditor
            title="رسوم المرتجع"
            mode={value.returnFeeMode}
            value={value.returnFeeValue}
            onMode={(returnFeeMode) => onChange({ ...value, returnFeeMode })}
            onValue={(returnFeeValue) => onChange({ ...value, returnFeeValue })}
          />
          <FeeEditor
            title="رسوم المحاولة الإضافية"
            mode={value.extraAttemptFeeMode}
            value={value.extraAttemptFeeValue}
            onMode={(extraAttemptFeeMode) => onChange({ ...value, extraAttemptFeeMode })}
            onValue={(extraAttemptFeeValue) => onChange({ ...value, extraAttemptFeeValue })}
          />
          <FeeEditor
            title="رسوم التحصيل Collection Fee"
            mode={value.collectionFeeMode}
            value={value.collectionFeeValue}
            onMode={(collectionFeeMode) => onChange({ ...value, collectionFeeMode })}
            onValue={(collectionFeeValue) => onChange({ ...value, collectionFeeValue })}
          />
        </div>

        <div className="policy-grid-inputs" style={{ marginTop: '1.25rem' }}>
          <NumberField
            label="الحد الأدنى لرسوم التحصيل"
            value={value.collectionFeeMinimum}
            suffix="ج.م"
            onChange={(collectionFeeMinimum) => onChange({ ...value, collectionFeeMinimum })}
          />
          <NumberField
            label="الحد الأقصى لرسوم التحصيل"
            value={value.collectionFeeMaximum}
            suffix="ج.م"
            onChange={(collectionFeeMaximum) => onChange({ ...value, collectionFeeMaximum })}
          />
        </div>

        <div className="toggle-grid-inputs" style={{ marginTop: '1.25rem' }}>
          <Toggle
            checked={value.vatEnabled}
            label="تفعيل ضريبة القيمة المضافة"
            description="مغلقة افتراضيًا، وتُحسب فقط على البنود المحددة أدناه."
            onChange={(vatEnabled) => onChange({ ...value, vatEnabled })}
          />
          <Toggle
            checked={value.pricesIncludeVat}
            label="الأسعار شاملة الضريبة"
            description="عند إيقافها تضاف الضريبة فوق الرسوم المسجلة."
            onChange={(pricesIncludeVat) => onChange({ ...value, pricesIncludeVat })}
          />
        </div>

        <div className="policy-grid-inputs" style={{ marginTop: '1.25rem' }}>
          <NumberField
            label="نسبة الضريبة العامة"
            value={value.vatRate}
            min={0}
            max={100}
            suffix="٪"
            onChange={(vatRate) => onChange({ ...value, vatRate })}
          />
        </div>

        <div className="toggle-grid-inputs" style={{ marginTop: '1.25rem' }}>
          <Toggle
            checked={value.taxableShippingFee}
            label="رسوم الشحن خاضعة"
            description="تطبيق الضريبة على رسوم الشحن الأساسية."
            onChange={(taxableShippingFee) => onChange({ ...value, taxableShippingFee })}
          />
          <Toggle
            checked={value.taxableReturnFee}
            label="رسوم المرتجع خاضعة"
            description="تطبيق الضريبة على رسوم المرتجع."
            onChange={(taxableReturnFee) => onChange({ ...value, taxableReturnFee })}
          />
          <Toggle
            checked={value.taxableExtraAttemptFee}
            label="المحاولة الإضافية خاضعة"
            description="تطبيق الضريبة على رسوم المحاولات الإضافية."
            onChange={(taxableExtraAttemptFee) => onChange({ ...value, taxableExtraAttemptFee })}
          />
          <Toggle
            checked={value.taxableCollectionFee}
            label="رسوم التحصيل خاضعة"
            description="تطبيق الضريبة على Collection Fee."
            onChange={(taxableCollectionFee) => onChange({ ...value, taxableCollectionFee })}
          />
        </div>

        <div className="settings-alert-box">
          ℹ️ كل شحنة تحتفظ بنسخة Pricing Snapshot عند الإنشاء، لذلك تغيير هذه السياسة لا يعيد حساب شحنات أو تسويات قديمة.
        </div>
      </div>
    </div>
  );
}

function ProofSettings({
  value,
  onChange,
}: {
  value: ProofPolicySettings;
  onChange: (value: ProofPolicySettings) => void;
}) {
  return (
    <div className="policy-settings-section">
      <div className="policy-block">
        <div className="policy-block-header">
          <Camera size={20} className="text-cyan" />
          <div>
            <h3>سياسة إثبات التسليم</h3>
            <p>إثبات التسليم الرسمي يعتمد الصورة واسم المستلم ولقطة GPS من تطبيق المندوب.</p>
          </div>
        </div>

        <div className="toggle-grid-inputs">
          <Toggle
            checked={value.photoRequired}
            label="الصورة إلزامية عند التسليم"
            description="يجب رفع صورة واضحة عند تأكيد تسليم الطرد."
            onChange={(photoRequired) => onChange({ ...value, photoRequired })}
          />
          <Toggle
            checked={value.photoFromCameraOnly}
            label="التصوير المباشر بالكاميرا فقط"
            description="منع اختيار صورة سابقة من المعرض لضمان المصداقية."
            onChange={(photoFromCameraOnly) => onChange({ ...value, photoFromCameraOnly })}
          />
          <Toggle
            checked={value.recipientNameRequired}
            label="اسم المستلم الفعلي إلزامي"
            description="تسجيل اسم الشخص الذي استلم الشحنة بيده."
            onChange={(recipientNameRequired) => onChange({ ...value, recipientNameRequired })}
          />
          <Toggle
            checked={value.gpsRequired}
            label="تحديد الموقع الجغرافي GPS إلزامي"
            description="تسجيل لقطة إحداثيات الموقع عند كل محاولة تسليم أو تعذر."
            onChange={(gpsRequired) => onChange({ ...value, gpsRequired })}
          />
        </div>

        <div className="policy-grid-inputs four-cols" style={{ marginTop: '1.25rem' }}>
          <NumberField
            label="الحد الأدنى للصور"
            value={value.minimumPhotoCount}
            min={0}
            max={5}
            suffix="صورة"
            onChange={(minimumPhotoCount) => onChange({ ...value, minimumPhotoCount })}
          />
          <NumberField
            label="الدقة المفضلة للـ GPS"
            value={value.preferredAccuracyMeters}
            min={1}
            suffix="متر"
            onChange={(preferredAccuracyMeters) => onChange({ ...value, preferredAccuracyMeters })}
          />
          <NumberField
            label="أقصى دقة مقبولة"
            value={value.maximumAccuracyMeters}
            min={value.preferredAccuracyMeters}
            suffix="متر"
            onChange={(maximumAccuracyMeters) => onChange({ ...value, maximumAccuracyMeters })}
          />
          <NumberField
            label="نطاق الوصول للعنوان (Geofence)"
            value={value.deliveryGeofenceMeters}
            min={20}
            suffix="متر"
            onChange={(deliveryGeofenceMeters) => onChange({ ...value, deliveryGeofenceMeters })}
          />
        </div>

        <div className="settings-alert-box">
          ℹ️ الموقع يؤكد أن المندوب وصل قرب العنوان، لكنه لا يثبت وحده تعذر التسليم. الحالات خارج النطاق تتحول تلقائيًا للمراجعة التشغيلية.
        </div>
      </div>
    </div>
  );
}

function PrintingSettingsPanel({
  value,
  onChange,
}: {
  value: PrintingSettings;
  onChange: (value: PrintingSettings) => void;
}) {
  return (
    <div className="policy-settings-section">
      <div className="policy-block">
        <div className="policy-block-header">
          <Printer size={20} className="text-cyan" />
          <div>
            <h3>إعدادات الطباعة والبوالص (Labels & Printing)</h3>
            <p>تحدد المقاس والبيانات الافتراضية؛ ويظل المستخدم قادراً على تعديلها أثناء الطباعة.</p>
          </div>
        </div>

        <div className="policy-grid-inputs">
          <label className="setting-field-card">
            <span className="field-label">المقاس الافتراضي للبوليصة</span>
            <div className="field-input-box">
              <select
                value={value.defaultLabelFormat}
                onChange={(event) =>
                  onChange({ ...value, defaultLabelFormat: event.target.value as PrintingSettings['defaultLabelFormat'] })
                }
              >
                <option value="thermal">حراري 10 × 15 سم (Thermal Roll)</option>
                <option value="a4">ورق عادي A4 — 4 بوالص في الصفحة</option>
              </select>
            </div>
          </label>
          <NumberField
            label="عدد النسخ الافتراضي"
            value={value.defaultCopies}
            min={1}
            max={5}
            suffix="نسخة"
            onChange={(defaultCopies) => onChange({ ...value, defaultCopies })}
          />
        </div>

        <div className="toggle-grid-inputs" style={{ marginTop: '1.25rem' }}>
          <Toggle
            checked={value.showCod}
            label="إظهار مبلغ التحصيل عند التسليم على البوليصة"
            description="طباعة المبلغ المطلوب تحصيله من العميل المستلم بشكل بارز."
            onChange={(showCod) => onChange({ ...value, showCod })}
          />
          <Toggle
            checked={value.showContents}
            label="إظهار وصف ومحتويات الشحنة"
            description="عرض وصف الأصناف والمنتجات داخل البوليصة."
            onChange={(showContents) => onChange({ ...value, showContents })}
          />
        </div>
      </div>
    </div>
  );
}

