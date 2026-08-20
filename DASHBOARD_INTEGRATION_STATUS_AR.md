# حالة ربط Dashboard مع Deliver It Backend v1.3

## منفذ

- Auth + `/me` + Logout حقيقي.
- Staff-only dashboard access.
- Central API client: metadata, timeout, retry, rate-limit, idempotency, error mapping.
- Per-tenant/per-user stale cache مع مسح session cache عند logout/401.
- RBAC للصفحات والأوامر.
- Server-side pagination/filter/search.
- Overview من Dashboard API بدل تجميع أول صفحات الموارد.
- Shipments / Operations / Exceptions / Barcode Intake.
- Reports / Accounting / Settlements.
- Drivers / Merchants / Merchant Applications / Users / Audit.
- Chat / Notifications / File uploads.
- Pricing/POD/Location settings.
- Version/If-Match على التعديلات الحساسة.
- إزالة Mock gateway والعمليات الوهمية من Production source.

## تحقق ساكن

راجع `STATIC_VERIFY.log` للأرقام النهائية. كما يجب تشغيل Build/Test/Lint الحقيقي في CI بعد توفر npm registry سليم.

## متبقٍ قبل وصف النسخة بأنها Production-certified

- `npm ci + test + lint + build` في بيئة Node سليمة.
- E2E على Staging مع MySQL/Redis/queue workers والـtenant domains الحقيقية.
- إكمال ترجمة نصوص صفحات الأعمال إلى الإنجليزية إذا كان Full bilingual شرط إطلاق.
