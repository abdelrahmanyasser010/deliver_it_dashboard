# Backend Delta بعد تطبيق Dashboard v7

هذه التعديلات مطلوبة عند مواءمة Backend الحقيقي مع الداشبورد المعدل.

## 1. Shipments
الـShipment Details يجب أن يعيد على الأقل:
- official_status
- timeline
- pending_driver_updates
- delivery_proof
- financial_summary
- allowed_actions
- version/concurrency token

ويجب أن يتحقق السيرفر من Allowed Transitions؛ الواجهة ليست مصدر الحقيقة.

## 2. Driver updates
الدورة المطلوبة:
`driver report -> pending company review -> approve/reject -> official status`

## 3. Drivers
نحتاج فصل:
- account_status
- operational_status
- shift_status
- service areas
- capacities
- current COD liability
- current tasks
- last location / last seen
- documents/sessions/audit

## 4. Merchants
نحتاج Merchant 360 يتضمن:
- merchant profile
- branches
- merchant users
- pricing profile
- settlement cycle
- settlements
- pickup requests
- documents

لا يوجد endpoint يضبط رصيد/تسوية التاجر كمبلغ حر من الواجهة.

## 5. Staff Users / RBAC
Staff users منفصلون عن Driver accounts وMerchant users.
الصلاحيات الحساسة تكون Actions دقيقة وليس `*.manage` فقط، خصوصاً المالية وحالات الشحن.

## 6. Accounting
- Accounting periods وClose Preview.
- Journal entries موزونة.
- Posted entries immutable؛ التصحيح Reversal/Adjustment.
- Reconciliation لعهد/Torيدات المناديب.
- Settlement lifecycle يفصل Approved عن Paid.
- Idempotency إلزامي للدفع/الترحيل/التسويات الحساسة.

## 7. Notifications
- in-app notifications
- unread count/read state
- batch preview قبل الإرسال الجماعي
- channel delivery results
- deduplication/retries/audit

## 8. Files
File/Attachment module موحد يخدم:
- chat
- POD
- exceptions
- returns
- merchant/driver documents
- financial evidence

يفضل Object Storage مع metadata في DB وروابط تنزيل مؤقتة.

## 9. Reports drill-down
كل Aggregate report يجب أن يدعم underlying rows بنفس الفلاتر والفترة والصلاحيات.

## 10. Exports
للملفات الكبيرة/الحساسة يفضل Export Jobs:
- POST export request
- status
- download
- authorization re-check
- audit
- temporary object storage

## 11. Multi-tenancy
`tenant_id` لا يثق به من Frontend؛ يحسمه Backend من السياق الموثوق ويطبقه على كل Query وPolicy.

## 12. الخطوة التالية
يجب مقارنة مشروع Backend الفعلي بهذه التغييرات وبـOpenAPI الحالي ثم تعديل:
- migrations
- models/entities
- policies
- services/use-cases
- controllers/routes
- DTOs/resources
- queues/jobs
- tests
- OpenAPI/Postman
