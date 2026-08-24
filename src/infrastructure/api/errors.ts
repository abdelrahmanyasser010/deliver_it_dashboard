import { getLocale, t } from '../../i18n';

export type ApiErrorKind = 'network' | 'timeout' | 'auth' | 'permission' | 'validation' | 'conflict' | 'rate_limit' | 'server' | 'unknown';

const codeMessages: Record<string, { ar: string; en: string }> = {
  INVALID_CREDENTIALS: { ar: 'بيانات الدخول غير صحيحة.', en: 'Invalid sign-in credentials.' },
  TENANT_MEMBERSHIP_REQUIRED: { ar: 'لا توجد عضوية فعالة لك في هذه الشركة.', en: 'You do not have an active membership in this company.' },
  RESOURCE_VERSION_CONFLICT: { ar: 'تم تعديل البيانات من مستخدم آخر. حدّث البيانات وأعد المحاولة.', en: 'The resource changed elsewhere. Refresh and try again.' },
  SHIPMENT_VERSION_CONFLICT: { ar: 'تم تحديث الشحنة من مستخدم آخر. افتح أحدث نسخة ثم أعد المحاولة.', en: 'The shipment changed elsewhere. Reload it and try again.' },
  INVALID_SHIPMENT_TRANSITION: { ar: 'لا يمكن تنفيذ انتقال حالة الشحنة من وضعها الحالي.', en: 'This shipment status transition is not allowed.' },
  DRIVER_NOT_AVAILABLE: { ar: 'المندوب غير متاح حاليًا.', en: 'The driver is not currently available.' },
  DRIVER_ARCHIVE_BLOCKED: { ar: 'لا يمكن أرشفة المندوب قبل إنهاء المهام المفتوحة وتسوية عهدة COD.', en: 'The driver cannot be archived until open work is finished and COD liability is settled.' },
  DRIVER_USER_MISSING: { ar: 'لا يوجد حساب دخول مرتبط بهذا المندوب.', en: 'This driver does not have a linked sign-in account.' },
  DRIVER_IDENTIFIER_MISSING: { ar: 'لا يوجد بريد أو رقم هاتف صالح لإرسال إعادة تعيين الدخول.', en: 'No email or phone is available for access reset.' },
  NOT_FOUND: { ar: 'العنصر المطلوب غير موجود أو لم يعد متاحًا.', en: 'The requested resource was not found or is no longer available.' },
  FILE_NOT_COMPLETED: { ar: 'رفع الملف لم يكتمل بعد.', en: 'The file upload has not completed yet.' },
  IDEMPOTENCY_KEY_REQUIRED: { ar: 'تعذر تأمين العملية ضد التكرار. أعد المحاولة.', en: 'The operation could not be protected against duplication. Try again.' },
  IDEMPOTENCY_CONFLICT: { ar: 'تم استخدام مفتاح العملية سابقًا ببيانات مختلفة.', en: 'This operation key was already used with different data.' },
  PERIOD_HAS_UNPOSTED_ENTRIES: { ar: 'لا يمكن إغلاق الفترة قبل ترحيل القيود المعلقة.', en: 'The period cannot be closed while ledger entries are pending.' },
  SETTLEMENT_ALREADY_PAID: { ar: 'تم تسجيل دفع هذه التسوية بالفعل.', en: 'This settlement has already been paid.' },
  VALIDATION_ERROR: { ar: 'بعض البيانات المدخلة غير صحيحة.', en: 'Some submitted values are invalid.' },
};

export class ApiClientError extends Error {
  readonly status: number | null;
  readonly code: string;
  readonly kind: ApiErrorKind;
  readonly requestId?: string;
  readonly details?: unknown;
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number | null,
    code: string,
    kind: ApiErrorKind,
    requestId?: string,
    details?: unknown,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.kind = kind;
    this.requestId = requestId;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function classifyStatus(status: number): ApiErrorKind {
  if (status === 401) return 'auth';
  if (status === 403) return 'permission';
  if (status === 409) return 'conflict';
  if (status === 422 || status === 400) return 'validation';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function friendlyApiMessage(error: unknown) {
  const locale = getLocale();
  if (!(error instanceof ApiClientError)) return t('unknown', locale);
  const mapped = codeMessages[error.code]?.[locale];
  if (mapped) return mapped;
  return t({
    network: 'network', timeout: 'timeout', auth: 'unauthorized', permission: 'forbidden', validation: 'validation', conflict: 'conflict', rate_limit: 'rateLimited', server: 'server', unknown: 'unknown',
  }[error.kind] as Parameters<typeof t>[0], locale);
}

export function isNetworkLikeError(error: unknown) {
  return error instanceof ApiClientError && (error.kind === 'network' || error.kind === 'timeout' || error.kind === 'server');
}
