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
  { id: 'gov-cairo', governorate: 'القاهرة', deliveryFee: 45, returnFee: 25, estimatedDays: 1 },
  { id: 'gov-giza', governorate: 'الجيزة', deliveryFee: 45, returnFee: 25, estimatedDays: 1 },
  { id: 'gov-alex', governorate: 'الإسكندرية', deliveryFee: 60, returnFee: 30, estimatedDays: 2 },
  { id: 'gov-qalyubia', governorate: 'القليوبية', deliveryFee: 50, returnFee: 25, estimatedDays: 1 },
  { id: 'gov-delta', governorate: 'الدلتا (المنوفية، الغربية، الشرقية، الدقهلية، البحيرة، كفر الشيخ)', deliveryFee: 65, returnFee: 35, estimatedDays: 2 },
  { id: 'gov-canal', governorate: 'مدن القناة (السويس، الإسماعيلية، بورسعيد)', deliveryFee: 70, returnFee: 35, estimatedDays: 2 },
  { id: 'gov-upper', governorate: 'شمال الصعيد (الفيوم، بني سويف، المنيا)', deliveryFee: 75, returnFee: 40, estimatedDays: 2 },
  { id: 'gov-deep-upper', governorate: 'جنوب الصعيد (أسيوط، سوهاج، قنا، الأقصر، أسوان)', deliveryFee: 90, returnFee: 45, estimatedDays: 3 },
  { id: 'gov-remote', governorate: 'المناطق النائية والحدودية (البحر الأحمر، الوادي الجديد، مطروح، سيناء)', deliveryFee: 110, returnFee: 55, estimatedDays: 4 },
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

export interface NotificationSettings {
  inAppEnabled: boolean;
  pushDriverEnabled: boolean;
  pushMerchantEnabled: boolean;
  slaDelayEnabled: boolean;
  notifyMerchantOnApprovedStatus: boolean;
  notifyDriverOnClarification: boolean;
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
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'إعدادات النظام الافتراضية',
};
