import { APP_LOCALE_KEY } from '../infrastructure/api/config';

export type AppLocale = 'ar' | 'en';

const messages = {
  ar: {
    network: 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.',
    timeout: 'انتهت مهلة الاتصال بالخادم. حاول مرة أخرى.',
    unauthorized: 'انتهت الجلسة. سجّل الدخول مرة أخرى.',
    forbidden: 'ليست لديك صلاحية لتنفيذ هذه العملية.',
    validation: 'راجع البيانات المدخلة ثم حاول مرة أخرى.',
    conflict: 'تم تعديل البيانات من مكان آخر. حدّث الصفحة ثم أعد المحاولة.',
    rateLimited: 'تم إرسال طلبات كثيرة. حاول بعد قليل.',
    server: 'حدث خطأ في الخادم. حاول مرة أخرى.',
    unknown: 'تعذر تنفيذ العملية.',
    offlineCache: 'تعذر الوصول للخادم؛ يتم عرض آخر بيانات محفوظة وقد تكون قديمة.',
    loading: 'جاري التحميل...',
  },
  en: {
    network: 'Could not reach the server. Check your connection and try again.',
    timeout: 'The server request timed out. Please try again.',
    unauthorized: 'Your session expired. Please sign in again.',
    forbidden: 'You do not have permission to perform this action.',
    validation: 'Please review the entered data and try again.',
    conflict: 'This data changed elsewhere. Refresh and try again.',
    rateLimited: 'Too many requests. Please try again shortly.',
    server: 'A server error occurred. Please try again.',
    unknown: 'The operation could not be completed.',
    offlineCache: 'The server is unavailable; showing the last saved data, which may be stale.',
    loading: 'Loading...',
  },
} as const;

export function getLocale(): AppLocale {
  const stored = localStorage.getItem(APP_LOCALE_KEY);
  return stored === 'en' ? 'en' : 'ar';
}

export function setLocale(locale: AppLocale) {
  localStorage.setItem(APP_LOCALE_KEY, locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export function t(key: keyof typeof messages.ar, locale = getLocale()) {
  return messages[locale][key];
}
