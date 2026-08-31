export type FeeMode = 'disabled' | 'fixed' | 'percentage';

export interface DeliveryPolicySettings {
  partialDeliveryEnabled: boolean;
  freeAttempts: number;
  maxAttempts: number;
  allowExtraAttempts: boolean;
  countInternalFailureAsAttempt: boolean;
  requireCompanyApprovalForDriverUpdates: boolean;
}

export interface GovernorateRate {
  id: string;
  governorate: string;
  merchantDeliveryFee: number;
  driverDeliveryCost: number;
  deliveryFee: number;
  returnFee: number;
  estimatedDays: number;
}

export interface PricingPolicySettings {
  returnFeeMode: FeeMode;
  returnFeeValue: number;
  extraAttemptFeeMode: FeeMode;
  extraAttemptFeeValue: number;
  collectionFeeMode: FeeMode;
  collectionFeeValue: number;
  collectionFeeMinimum: number;
  collectionFeeMaximum: number;
  vatEnabled: boolean;
  vatRate: number;
  pricesIncludeVat: boolean;
  taxableShippingFee: boolean;
  taxableReturnFee: boolean;
  taxableExtraAttemptFee: boolean;
  taxableCollectionFee: boolean;
  baseWeightKg: number;
  extraWeightKgFee: number;
  pickupFreeThreshold: number;
  pickupFeeUnderThreshold: number;
  driverPickupReward: number;
  governorateRates: GovernorateRate[];
}

export const defaultGovernorateRates: GovernorateRate[] = [
  { id: 'gov-cairo', governorate: 'القاهرة', merchantDeliveryFee: 45, driverDeliveryCost: 28, deliveryFee: 45, returnFee: 25, estimatedDays: 1 },
  { id: 'gov-giza', governorate: 'الجيزة', merchantDeliveryFee: 45, driverDeliveryCost: 28, deliveryFee: 45, returnFee: 25, estimatedDays: 1 },
  { id: 'gov-alex', governorate: 'الإسكندرية', merchantDeliveryFee: 60, driverDeliveryCost: 38, deliveryFee: 60, returnFee: 30, estimatedDays: 2 },
  { id: 'gov-qalyubia', governorate: 'القليوبية', merchantDeliveryFee: 50, driverDeliveryCost: 32, deliveryFee: 50, returnFee: 25, estimatedDays: 1 },
  { id: 'gov-delta', governorate: 'الدلتا', merchantDeliveryFee: 65, driverDeliveryCost: 42, deliveryFee: 65, returnFee: 35, estimatedDays: 2 },
  { id: 'gov-canal', governorate: 'مدن القناة', merchantDeliveryFee: 70, driverDeliveryCost: 46, deliveryFee: 70, returnFee: 35, estimatedDays: 2 },
  { id: 'gov-upper', governorate: 'شمال الصعيد', merchantDeliveryFee: 75, driverDeliveryCost: 50, deliveryFee: 75, returnFee: 40, estimatedDays: 2 },
  { id: 'gov-deep-upper', governorate: 'جنوب الصعيد', merchantDeliveryFee: 90, driverDeliveryCost: 62, deliveryFee: 90, returnFee: 45, estimatedDays: 3 },
  { id: 'gov-remote', governorate: 'المناطق النائية والحدودية', merchantDeliveryFee: 110, driverDeliveryCost: 78, deliveryFee: 110, returnFee: 55, estimatedDays: 4 },
];

export interface ProofPolicySettings {
  recipientNameRequired: boolean;
  photoRequired: boolean;
  minimumPhotoCount: number;
  gpsRequired: boolean;
  preferredAccuracyMeters: number;
  maximumAccuracyMeters: number;
  deliveryGeofenceMeters: number;
  photoFromCameraOnly: boolean;
  otpSupported: boolean;
  signatureSupported: boolean;
}

export interface DriverLocationPolicySettings {
  trackingDuringShiftOnly: boolean;
  idleIntervalSeconds: number;
  activeTaskIntervalSeconds: number;
  proofSnapshotMaxAgeSeconds: number;
  rawLocationRetentionDays: number;
  offlineBatchEnabled: boolean;
}

export interface PrintingSettings {
  defaultLabelFormat: 'thermal' | 'a4';
  defaultCopies: number;
  a4LabelsPerPage: 4;
  showCod: boolean;
  showContents: boolean;
  barcodeFormat: 'code128';
}

export interface WhatsAppNotificationSettings {
  enabled: boolean;
  companyName: string;
  defaultTemplate: string;
}

export const defaultWhatsAppTemplate =
  'أهلًا {اسم_العميل}، تم استلام شحنتك رقم {رقم_الشحنة} من {اسم_التاجر} لدى شركة {اسم_شركة_الشحن}. سيتم التوصيل إلى {المحافظة} {مدة_التسليم}. المبلغ المطلوب عند الاستلام: {المبلغ}. تتبع شحنتك: {رابط_التتبع}';

export interface NotificationSettings {
  inAppEnabled: boolean;
  pushDriverEnabled: boolean;
  pushMerchantEnabled: boolean;
  slaDelayEnabled: boolean;
  notifyMerchantOnApprovedStatus: boolean;
  notifyDriverOnClarification: boolean;
  whatsApp: WhatsAppNotificationSettings;
}

export interface TenantOperationalSettings {
  delivery: DeliveryPolicySettings;
  pricing: PricingPolicySettings;
  proof: ProofPolicySettings;
  location: DriverLocationPolicySettings;
  printing: PrintingSettings;
  notifications: NotificationSettings;
  updatedAt: string;
  updatedBy: string;
}

export const defaultTenantOperationalSettings: TenantOperationalSettings = {
  delivery: {
    partialDeliveryEnabled: true,
    freeAttempts: 3,
    maxAttempts: 5,
    allowExtraAttempts: true,
    countInternalFailureAsAttempt: false,
    requireCompanyApprovalForDriverUpdates: true,
  },
  pricing: {
    returnFeeMode: 'disabled',
    returnFeeValue: 0,
    extraAttemptFeeMode: 'disabled',
    extraAttemptFeeValue: 0,
    collectionFeeMode: 'disabled',
    collectionFeeValue: 0,
    collectionFeeMinimum: 0,
    collectionFeeMaximum: 0,
    vatEnabled: false,
    vatRate: 0,
    pricesIncludeVat: false,
    taxableShippingFee: true,
    taxableReturnFee: true,
    taxableExtraAttemptFee: true,
    taxableCollectionFee: true,
    baseWeightKg: 3,
    extraWeightKgFee: 10,
    pickupFreeThreshold: 5,
    pickupFeeUnderThreshold: 30,
    driverPickupReward: 20,
    governorateRates: defaultGovernorateRates,
  },
  proof: {
    recipientNameRequired: true,
    photoRequired: true,
    minimumPhotoCount: 1,
    gpsRequired: true,
    preferredAccuracyMeters: 50,
    maximumAccuracyMeters: 150,
    deliveryGeofenceMeters: 150,
    photoFromCameraOnly: true,
    otpSupported: false,
    signatureSupported: false,
  },
  location: {
    trackingDuringShiftOnly: true,
    idleIntervalSeconds: 180,
    activeTaskIntervalSeconds: 30,
    proofSnapshotMaxAgeSeconds: 60,
    rawLocationRetentionDays: 90,
    offlineBatchEnabled: true,
  },
  printing: {
    defaultLabelFormat: 'thermal',
    defaultCopies: 1,
    a4LabelsPerPage: 4,
    showCod: true,
    showContents: false,
    barcodeFormat: 'code128',
  },
  notifications: {
    inAppEnabled: true,
    pushDriverEnabled: true,
    pushMerchantEnabled: true,
    slaDelayEnabled: true,
    notifyMerchantOnApprovedStatus: true,
    notifyDriverOnClarification: true,
    whatsApp: {
      enabled: true,
      companyName: 'FIX 365 — فيكس 365 للشحن',
      defaultTemplate: defaultWhatsAppTemplate,
    },
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'إعدادات النظام الافتراضية',
};
