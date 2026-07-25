export type FeeMode = 'disabled' | 'fixed' | 'percentage';

export interface DeliveryPolicySettings {
  partialDeliveryEnabled: boolean;
  freeAttempts: number;
  maxAttempts: number;
  allowExtraAttempts: boolean;
  countInternalFailureAsAttempt: boolean;
  requireCompanyApprovalForDriverUpdates: boolean;
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
}

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

export interface TenantOperationalSettings {
  delivery: DeliveryPolicySettings;
  pricing: PricingPolicySettings;
  proof: ProofPolicySettings;
  location: DriverLocationPolicySettings;
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
  updatedAt: new Date().toISOString(),
  updatedBy: 'إعدادات النظام الافتراضية',
};
