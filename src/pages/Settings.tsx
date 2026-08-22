import { useState } from 'react';
import { Banknote, Bell, Camera, MapPinned, Printer, RotateCcw, Save, Settings2, ShieldCheck, Truck } from 'lucide-react';
import { ErrorState, PageSkeleton } from '../components/AsyncState';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { defaultTenantOperationalSettings, type DeliveryPolicySettings, type DriverLocationPolicySettings, type FeeMode, type NotificationSettings, type PricingPolicySettings, type PrintingSettings, type ProofPolicySettings } from '../domain/settings/entities';
import { formatDateTime } from '../utils/helpers';
import './Settings.css';

type SettingsTab = 'delivery' | 'pricing' | 'proof' | 'location' | 'printing' | 'notifications';
const tabs: Array<{ id: SettingsTab; label: string; description: string; icon: typeof Truck }> = [
  { id: 'delivery', label: 'التوصيل والمحاولات', description: 'التسليم الجزئي واعتماد تحديثات المناديب.', icon: Truck },
  { id: 'pricing', label: 'الرسوم والضرائب', description: 'المرتجع والمحاولات والتحصيل والضريبة.', icon: Banknote },
  { id: 'proof', label: 'إثبات التسليم', description: 'الصورة واسم المستلم والموقع.', icon: Camera },
  { id: 'location', label: 'موقع المندوب', description: 'معدل التتبع والاحتفاظ بالنقاط.', icon: MapPinned },
  { id: 'printing', label: 'الطباعة والبوليصة', description: 'المقاس والنسخ والبيانات الظاهرة.', icon: Printer },
  { id: 'notifications', label: 'الإشعارات', description: 'إشعارات الشركة والمندوب والتاجر.', icon: Bell },
];

export function SettingsPage() {
  const { state, isLoading, error, refetch, execute, resetDemo } = useDeliveryData();
  const { showToast } = useWorkspace();
  const [activeTab, setActiveTab] = useState<SettingsTab>('delivery');
  const [delivery, setDelivery] = useState<DeliveryPolicySettings>(() => structuredClone(state?.settings.delivery ?? defaultTenantOperationalSettings.delivery));
  const [pricing, setPricing] = useState<PricingPolicySettings>(() => structuredClone(state?.settings.pricing ?? defaultTenantOperationalSettings.pricing));
  const [proof, setProof] = useState<ProofPolicySettings>(() => structuredClone(state?.settings.proof ?? defaultTenantOperationalSettings.proof));
  const [location, setLocation] = useState<DriverLocationPolicySettings>(() => structuredClone(state?.settings.location ?? defaultTenantOperationalSettings.location));
  const [printing, setPrinting] = useState<PrintingSettings>(() => structuredClone(state?.settings.printing ?? defaultTenantOperationalSettings.printing));
  const [notifications, setNotifications] = useState<NotificationSettings>(() => structuredClone(state?.settings.notifications ?? defaultTenantOperationalSettings.notifications));
  const [saving, setSaving] = useState(false);


  if (isLoading) return <PageSkeleton rows={5} />;
  if (error || !state) return <ErrorState message={error ?? 'تعذر تحميل إعدادات الشركة.'} onRetry={refetch} />;

  const save = async () => {
    setSaving(true);
    const command = activeTab === 'delivery'
      ? { type: 'settings/updateDelivery' as const, policy: delivery }
      : activeTab === 'pricing'
        ? { type: 'settings/updatePricing' as const, policy: pricing }
        : activeTab === 'proof'
          ? { type: 'settings/updateProof' as const, policy: proof }
          : activeTab === 'location'
            ? { type: 'settings/updateLocation' as const, policy: location }
            : activeTab === 'printing'
              ? { type: 'settings/updatePrinting' as const, policy: printing }
              : { type: 'settings/updateNotifications' as const, policy: notifications };
    const result = await execute(command);
    showToast(result.message, result.ok ? 'success' : 'danger');
    setSaving(false);
  };

  const reset = async () => {
    await resetDemo();
    setDelivery(structuredClone(defaultTenantOperationalSettings.delivery));
    setPricing(structuredClone(defaultTenantOperationalSettings.pricing));
    setProof(structuredClone(defaultTenantOperationalSettings.proof));
    setLocation(structuredClone(defaultTenantOperationalSettings.location));
    setPrinting(structuredClone(defaultTenantOperationalSettings.printing));
    setNotifications(structuredClone(defaultTenantOperationalSettings.notifications));
    showToast('تمت استعادة الإعدادات والبيانات التجريبية الافتراضية.', 'info');
  };

  return <div className="settings-page">
    <header className="settings-hero glass-card">
      <div>
        <p className="page-kicker">سياسات شركة الشحن</p>
        <h2>إعدادات التشغيل والرسوم</h2>
      </div>
      <div className="settings-hero-actions">
        <button className="btn-primary" disabled={saving} onClick={() => void save()}><Save size={15}/>{saving ? 'جارٍ الحفظ…' : 'حفظ القسم'}</button>
        <button className="outline-btn" onClick={() => void reset()}><RotateCcw size={15}/> استعادة التجربة</button>
      </div>
    </header>

    <section className="settings-layout">
      <nav className="settings-tabs glass-card" aria-label="أقسام الإعدادات">
        {tabs.map(({ id, label, description, icon: Icon }) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}><Icon size={18}/><span><strong>{label}</strong><small>{description}</small></span></button>)}
      </nav>

      <div className="settings-content glass-card">
        {activeTab === 'delivery' && <DeliverySettings value={delivery} onChange={setDelivery}/>} 
        {activeTab === 'pricing' && <PricingSettings value={pricing} onChange={setPricing}/>} 
        {activeTab === 'proof' && <ProofSettings value={proof} onChange={setProof}/>} 
        {activeTab === 'location' && <LocationSettings value={location} onChange={setLocation}/>} 
        {activeTab === 'printing' && <PrintingSettingsPanel value={printing} onChange={setPrinting}/>}
        {activeTab === 'notifications' && <NotificationSettingsPanel value={notifications} onChange={setNotifications}/>}
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

function DeliverySettings({ value, onChange }: { value: DeliveryPolicySettings; onChange: (value: DeliveryPolicySettings) => void }) {
  return <>
    <SectionHeading title="سياسة التوصيل والمحاولات" description="التاجر لا يغيّر الحالة التشغيلية، وتحديث المندوب لا يصبح رسميًا إلا بعد قواعد الشركة واعتمادها."/>
    <div className="settings-card-grid">
      <Toggle checked={value.partialDeliveryEnabled} label="السماح بالتسليم الجزئي" description="المندوب يحدد الكميات المسلمة والمتبقية، والنظام يقسم البوليصة بعد اعتماد الشركة." onChange={(partialDeliveryEnabled) => onChange({ ...value, partialDeliveryEnabled })}/>
      <Toggle checked={value.requireCompanyApprovalForDriverUpdates} label="اعتماد الشركة إلزامي" description="لا يظهر تحديث المندوب للتاجر قبل اعتماد موظف الشركة أو قواعد الاعتماد التلقائي." onChange={(requireCompanyApprovalForDriverUpdates) => onChange({ ...value, requireCompanyApprovalForDriverUpdates })}/>
      <Toggle checked={value.allowExtraAttempts} label="السماح بمحاولات إضافية" description="بعد انتهاء المجاني يمكن إنشاء محاولة محسوبة حسب سياسة الرسوم." onChange={(allowExtraAttempts) => onChange({ ...value, allowExtraAttempts })}/>
      <Toggle checked={value.countInternalFailureAsAttempt} label="احتساب أخطاء الشركة كمحاولة" description="يفضل إيقافها حتى لا يتحمل التاجر خطأ داخليًا في التشغيل." onChange={(countInternalFailureAsAttempt) => onChange({ ...value, countInternalFailureAsAttempt })}/>
    </div>
    <div className="settings-number-grid">
      <NumberField label="عدد المحاولات المجانية" value={value.freeAttempts} min={0} max={10} suffix="محاولة" onChange={(freeAttempts) => onChange({ ...value, freeAttempts })}/>
      <NumberField label="الحد الأقصى للمحاولات" value={value.maxAttempts} min={value.freeAttempts} max={15} suffix="محاولة" onChange={(maxAttempts) => onChange({ ...value, maxAttempts })}/>
    </div>
    <aside className="settings-note">رسوم الشحن الأساسية تظل على البوليصة الأصلية مرة واحدة حتى عند التسليم الجزئي. البوليصات الفرعية تحمل فقط قيمة المنتجات أو دورة المرتجع.</aside>
  </>;
}

function FeeEditor({ title, mode, value, onMode, onValue }: { title: string; mode: FeeMode; value: number; onMode: (mode: FeeMode) => void; onValue: (value: number) => void }) {
  return <div className="fee-editor"><strong>{title}</strong><div className="fee-editor-row"><select value={mode} onChange={(event) => onMode(event.target.value as FeeMode)}><option value="disabled">بدون رسوم</option><option value="fixed">مبلغ ثابت</option><option value="percentage">نسبة مئوية</option></select><div><input type="number" min="0" value={value} disabled={mode === 'disabled'} onChange={(event) => onValue(Number(event.target.value))}/><span>{mode === 'percentage' ? '٪' : 'ج.م'}</span></div></div></div>;
}

function PricingSettings({ value, onChange }: { value: PricingPolicySettings; onChange: (value: PricingPolicySettings) => void }) {
  return <>
    <SectionHeading title="سياسة الرسوم والضرائب" description="القيم الافتراضية بلا رسوم إضافية وبلا ضريبة، ويمكن للشركة تفعيلها من هنا لاحقًا."/>
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

function LocationSettings({ value, onChange }: { value: DriverLocationPolicySettings; onChange: (value: DriverLocationPolicySettings) => void }) {
  return <>
    <SectionHeading title="سياسة تتبع موقع المندوب" description="توازن بين دقة التشغيل والبطارية والخصوصية، ويوقف التتبع بعد انتهاء الوردية."/>
    <div className="settings-card-grid">
      <Toggle checked={value.trackingDuringShiftOnly} label="التتبع أثناء الوردية فقط" description="يتوقف تلقائيًا عند إنهاء الوردية." onChange={(trackingDuringShiftOnly) => onChange({ ...value, trackingDuringShiftOnly })}/>
      <Toggle checked={value.offlineBatchEnabled} label="رفع النقاط بعد عودة الإنترنت" description="يحفظ التطبيق النقاط محليًا ويرسلها Batch دون تكرار." onChange={(offlineBatchEnabled) => onChange({ ...value, offlineBatchEnabled })}/>
    </div>
    <div className="settings-number-grid">
      <NumberField label="بدون مهمة نشطة" value={value.idleIntervalSeconds} min={30} suffix="ثانية" onChange={(idleIntervalSeconds) => onChange({ ...value, idleIntervalSeconds })}/>
      <NumberField label="أثناء مهمة نشطة" value={value.activeTaskIntervalSeconds} min={15} suffix="ثانية" onChange={(activeTaskIntervalSeconds) => onChange({ ...value, activeTaskIntervalSeconds })}/>
      <NumberField label="أقصى عمر للقطة الإثبات" value={value.proofSnapshotMaxAgeSeconds} min={10} suffix="ثانية" onChange={(proofSnapshotMaxAgeSeconds) => onChange({ ...value, proofSnapshotMaxAgeSeconds })}/>
      <NumberField label="الاحتفاظ بالنقاط الخام" value={value.rawLocationRetentionDays} min={1} suffix="يوم" onChange={(rawLocationRetentionDays) => onChange({ ...value, rawLocationRetentionDays })}/>
    </div>
    <aside className="settings-note">التاجر يرى حالة الشحنة والوقت المتوقع فقط؛ لا يملك صلاحية رؤية مسار المندوب الكامل أو المواقع التاريخية.</aside>
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
    <aside className="settings-note">باركود البوليصة الحالي CODE128. الطباعة الحرارية وA4 تستخدمان مكوّن البوليصة نفسه ولا تطبعان واجهة لوحة التحكم.</aside>
  </>;
}

function NotificationSettingsPanel({ value, onChange }: { value: NotificationSettings; onChange: (value: NotificationSettings) => void }) {
  return <>
    <SectionHeading title="سياسة الإشعارات" description="تفرق بين تنبيهات موظفي الشركة وإشعارات تطبيق المندوب والتاجر. الحالة الرسمية لا تتغير بسبب إشعار أو رسالة شات."/>
    <div className="settings-card-grid">
      <Toggle checked={value.inAppEnabled} label="إشعارات داخل النظام" description="مركز إشعارات موظفي الشركة والتطبيقات." onChange={(inAppEnabled) => onChange({ ...value, inAppEnabled })}/>
      <Toggle checked={value.pushDriverEnabled} label="Push للمندوب" description="المهام الجديدة وطلبات التوضيح والتغييرات التشغيلية." onChange={(pushDriverEnabled) => onChange({ ...value, pushDriverEnabled })}/>
      <Toggle checked={value.pushMerchantEnabled} label="Push للتاجر" description="الحالات الرسمية المعتمدة والتسويات والمرتجعات." onChange={(pushMerchantEnabled) => onChange({ ...value, pushMerchantEnabled })}/>
      <Toggle checked={value.slaDelayEnabled} label="تنبيهات التأخير وSLA" description="تظهر للموظف قبل إرسال أي تنبيه خارجي مجمع." onChange={(slaDelayEnabled) => onChange({ ...value, slaDelayEnabled })}/>
      <Toggle checked={value.notifyMerchantOnApprovedStatus} label="إخطار التاجر بعد الاعتماد" description="لا يرسل تحديث المندوب نفسه؛ يرسل فقط بعد إصدار الشركة للحالة الرسمية." onChange={(notifyMerchantOnApprovedStatus) => onChange({ ...value, notifyMerchantOnApprovedStatus })}/>
      <Toggle checked={value.notifyDriverOnClarification} label="إخطار المندوب بطلب التوضيح" description="يرسل للمندوب عندما تعيد الشركة تقريرًا للمراجعة." onChange={(notifyDriverOnClarification) => onChange({ ...value, notifyDriverOnClarification })}/>
    </div>
  </>;
}
