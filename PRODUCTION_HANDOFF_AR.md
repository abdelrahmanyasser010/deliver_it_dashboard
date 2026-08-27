# FIX 365 Dashboard — Production Handoff

## 1) حالة النسخة

هذه النسخة **Production Candidate** مربوطة بعقد API v1.3. لا يوجد Mock data في مسار التشغيل الفعلي، ولا نجاحات وهمية لأوامر غير موجودة في الباك.

## 2) إعداد البيئة

أنشئ `.env.production` على منصة البناء ولا ترفعه إلى Git:

```env
VITE_API_BASE_URL=https://api.your-domain.com
VITE_API_TIMEOUT_MS=25000
VITE_API_MAX_RETRIES=2
VITE_APP_VERSION=1.3.0
```

`VITE_API_BASE_URL` مطلوب في Production؛ الكود يفشل بوضوح إذا كان غير مضبوط بدل الرجوع إلى localhost أو Mock.

## 3) متطلبات الـBackend/Proxy

- HTTPS فقط في Production.
- يجب أن يصل الـHost الصحيح للباك لأن الـTenant يُحل من الـHost.
- اسمح CORS لأصل الداش بورد فقط، مع Authorization وContent-Type وIdempotency-Key وIf-Match وX-Request-Id وX-Device-Id وX-App-Version وAccept-Language.
- لا تخزن Bearer token في logs أو analytics.
- اضبط CSP/HSTS وReferrer-Policy وX-Content-Type-Options على الـreverse proxy/hosting.

## 4) Session وRBAC

- تسجيل الدخول: `POST /api/v1/auth/login`.
- التحقق عند بداية التطبيق: `GET /api/v1/me`.
- تسجيل الخروج: `POST /api/v1/auth/logout`.
- حسابات `driver` و`merchant_*` مخصصة للموبايل وممنوعة من Dashboard shell.
- ظهور الصفحات والأزرار مبني على Roles/Permissions؛ الباك يظل صاحب القرار النهائي.
- 401 يمسح session/cache الخاص بالمستخدم فقط، ويحافظ على اللغة وتفضيلات الواجهة.

## 5) Network/Error handling

- Request ID لكل طلب.
- Idempotency-Key لأوامر الكتابة.
- Retry محدود؛ لا يتم تحويل 401/403/409/422 إلى fallback.
- 409 يعامل كتعارض نسخة ويطلب Refresh.
- 422 يعرض رسالة validation مناسبة.
- 429 يحترم Retry-After.
- Stale cache تستخدم فقط مع network/timeout/5xx عندما تسمح الشاشة بذلك، ومفتاحها scoped بـtenant+user.

## 6) Pagination والبحث

القوائم الكبيرة تستخدم `page/per_page` و`meta.current_page/last_page/total`. البحث في الشحنات والمناديب والتجار Server-side حتى لا يقتصر على الصفحات المحمّلة.

## 7) Workflows الحساسة

- تغيير الحالة الرسمي لا يتم من زر عام في ملف الشحنة؛ يستخدم مركز العمليات/اعتماد تحديثات المندوب حسب العقد.
- تعديل Merchant/Driver يرسل `If-Match` من `version`.
- Accounting/Settlements actions مخفية عند عدم وجود Permission، والـAuditor read-only.
- CSV import وReport/Label export تعتمد على async jobs/status APIs.
- الملفات تمر عبر upload intent ثم completion حسب عقد الباك.

## 8) اللغات

الـShell، Login، session/network/error messages تدعم AR/EN واتجاه RTL/LTR. صفحات الأعمال الأصلية تحتوي نصوصًا عربية كثيرة ولم تُترجم كلها للإنجليزية في هذه الجولة؛ لا تعتبر النسخة Full-English قبل إكمال i18n لهذه النصوص.

## 9) فحوص يجب تنفيذها قبل Go-Live

```bash
npm ci
npm run test:run
npm run lint
npm run build
```

ثم على Staging حقيقي اختبر على الأقل:

1. Login/Logout/session expiry لكل Role.
2. Cross-tenant isolation وbranch scoping.
3. Shipments list/search/filter/pagination/detail/assign/labels/import.
4. Pickup → Intake → Dispatch → Driver update approval.
5. Exceptions resolution/version conflicts.
6. Accounting/remittance/ledger/period/settlement permissions.
7. Chat attachments/read status/notifications.
8. Settings version conflicts.
9. Offline/server outage stale cache indicator وعدم عرض cache لمستخدم آخر.
10. 401/403/409/422/429/5xx UX.

## 10) قيد بيئة التسليم الحالية

تعذر تنفيذ `npm ci` في بيئة البناء الحالية لأن الـnpm registry المتاح أعاد 404 للحزمة `zod-validation-error@4.0.2`. لذلك لم يتم الادعاء بتشغيل Vite/Vitest/ESLint فعليًا هنا. تم بدل ذلك تنفيذ parser/import/API-contract/static checks، ويجب أن تكون أوامر القسم السابق Gate إلزاميًا في CI قبل Production.

