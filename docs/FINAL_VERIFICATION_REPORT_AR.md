# EduBridge — تقرير التعديل والفحص النهائي

**التاريخ:** 2026-08-09  
**النطاق:** Dashboard + Backend بعد تطبيق قرارات مراجعة لوحة التحكم المجمعة.

## 1) نتيجة التنفيذ

تم تطبيق الجولة النهائية على آخر نسخة Dashboard مربوطة بالـ API، وعلى آخر Snapshot من Backend المعدل للموبايل. تم التركيز على إزالة بيانات/ادعاءات الـ Demo، توحيد الصلاحيات والـ UX، وإكمال ما يلزم من Backend للعقود التي تحتاجها الواجهة.

### أهم التغييرات المنفذة في Dashboard

- إزالة Role selector من الهيدر والاعتماد على الدور/الصلاحيات من Backend.
- Sidebar قابلة للطي وفصل بصري أوضح وتحسين الخط العربي والمساحات والعناصر النشطة.
- تطبيق قواعد فلاتر موحدة وقابلة للتوسع بدل صفوف طويلة من الأزرار الديناميكية.
- منشئ الهيكل: تحسين Workspace/Focus Mode، وإبقاء حفظ الـ Canvas الحالي للترتيب البصري فقط بدل تعديل Business Data بالسحب بدون Validation مركزي.
- الفصول والمواد: دعم السعة، رقم القاعة، مربي/رائد الفصل، وعدد الحصص الأسبوعية الحقيقي.
- الطلاب: إضافة الحي السكني من Lookup حقيقي، مع إضافة حي جديد من نفس النموذج عند توفر صلاحية الإدارة.
- المعلمين: إزالة KPI الوهمي وإجازة رسمية الوهمية، وعدم ربط التغطية بحالة ملف المعلم.
- الجداول: فحص تعارضات على مستوى الفصل الدراسي، وتكليف معلم بديل من Teaching Session فعلية فقط.
- الحضور: العرض اليومي مبني على Attendance per Teaching Session، مع مفهوم «لديه غياب» بدل اعتبار الطالب غائبًا عن اليوم بسبب حصة واحدة.
- الدرجات: Assessments ديناميكية، وفصل الاعتماد عن النشر عن القفل، ومنع النشر عند وجود درجات ناقصة، واعتراضات الدرجات وتصحيح رسمي بعد القبول.
- التواصل: In-App + Push بدل SMS، وفصل Broadcasts عن Conversations، وقوالب خاصة بالمدرسة.
- النقل: إزالة ادعاءات GPS/Live/ETA لعدم وجود Driver App أو مصدر GPS حقيقي في المرحلة الحالية.
- التحليلات: Early Warning قابل للتفسير، بدون AI غامض أو تشخيص أو مؤشرات مركبة وهمية.
- الإعدادات: حذف تبويب المزامنة/صحتي/نور/SMS غير التشغيلي، وتنظيف المصطلحات التقنية.
- الصلاحيات: `لا وصول / عرض فقط / إدارة`، حفظ مجمّع، وإخفاء أزرار الكتابة عند عدم امتلاك Permission المناسبة.
- الحسابات الإدارية: الأدوار الفعلية فقط: مدير المدرسة، الإدارة الأكاديمية، شؤون الطلاب، المسؤول المالي.

### أهم التغييرات المنفذة في Backend

- Assessment lifecycle صريح: draft → pending_approval → approved → published → locked.
- منع نشر Assessment إذا كانت هناك درجات ناقصة.
- Grade appeals: قائمة Dashboard + قبول/رفض + تصحيح رسمي للدرجة مع سبب/Audit.
- Schedule global conflict check + Available substitutes لحصة فعلية.
- Message Templates خاصة بالـ tenant.
- Daily attendance rollup + at-risk view مبني على رصد الحصص.
- Early-warning endpoint قابل للتفسير.
- Academic fields: room/capacity/homeroom/weekly periods.
- Residential Areas lookup وإسناد الحي للطلاب وأولياء الأمور.
- `operations.view` لفصل القراءة عن الإدارة، وقوائم Dashboard للاستدعاءات والتكليفات البديلة.
- Permissions/Policies مرتبطة بالصلاحيات الفعلية بدل Hardcoded roles في الإجراءات التي تمت مراجعتها.

## 2) الفحوص التي نجحت

### Dashboard

- **TypeScript semantic check:** نجح — `0 errors`.
- **TypeScript transpile/syntax:** تم فحص **28 ملف TS/TSX** — `0 errors`.
- **Static Dashboard ↔ Backend route contract:** آخر فحص بعد إضافة مسارات الاستدعاءات/البدلاء: **107 API calls**، **269 backend route patterns**، **0 unmatched**.
- **Visible production-copy grep:** لا توجد نصوص ظاهرة في `app/` و`components/` من العبارات المرفوضة مثل RBAC/مصفوفة/SMS/Unifonic/صحتي/نور/KPI/GPS/بث حي/إنذار حرمان/معلم انتظار/إجازة رسمية.

### Backend

- **PHP source lint:** تم فحص **543 ملف PHP** داخل `app/bootstrap/config/database/routes/tests` — `0 syntax errors`.
- **Route → Controller method static check:** **249 references** — `0 errors`.
- **Permission catalog consistency:** **69 permission keys**، **50 role permission references**، **0 missing keys**.
- **Migration sanity:** لا توجد أسماء migrations مكررة في الفحص السابق، وموجودة migrations الخاصة بالقوالب/الامتدادات الأكاديمية/الأحياء السكنية.
- **OpenAPI YAML:** ملف `openapi/openapi.yaml` صالح للقراءة كـ YAML في الفحص السابق، لكنه لم يُعد توليده بالكامل بعد كل Routes الجديدة في هذه الجولة؛ لذلك لا يُعتبر العقد النهائي الوحيد لهذه الإضافات.

## 3) فحوص تعذر تشغيلها ولماذا

### Dashboard full `npm ci / next build`

لم يمكن تنفيذ Build كامل في بيئة العمل لأن تنزيل dependency من الـ npm registry فشل للملف:

`undici-types-6.21.0.tgz`

- المحاولة عبر الـ internal registry أعادت **E404**.
- المحاولة offline أعادت **ENOTCACHED**.

لذلك النتيجة الحالية: **Static TypeScript verified** وليست ادعاءً بأن `next build` تم بنجاح داخل هذه البيئة.

### Backend `php artisan test`

الـ Backend Snapshot المرفوع من المصدر نفسه لا يحتوي في جذر المشروع على:

- `artisan`
- `composer.json`
- `composer.lock`
- `phpunit.xml`
- `vendor/autoload.php`

ولذلك لا يمكن تشغيل Laravel test suite أو boot للتطبيق من هذه الحزمة داخل بيئة الفحص. لم يتم اختراع ملفات Composer أو Bootstrap بديلة حتى لا نغيّر Dependencies المشروع من التخمين.

## 4) نقاط مؤجلة عمدًا حفاظًا على سلامة البيانات

### Configurator Business Change Sets

تم تحسين الـ Canvas بصريًا، لكن **لم يتم جعل Drag & Drop يغيّر Business Data مباشرة**. تنفيذ الفكرة الكاملة التي تمت مناقشتها (`Draft → Validate → Select changes → Commit`) يحتاج Change-Set transaction API متكامل واختبارات Runtime. لذلك النسخة الحالية تحفظ التخطيط البصري وتوجه CRUD الحقيقي للشاشات المخصصة بدل تنفيذ تغييرات بيانات غير آمنة.

### Driver live tracking

لا يوجد Driver App أو GPS provider فعلي، لذلك لا توجد خريطة Live/ETA/GPS claims في النسخة الحالية. تعاد فقط عند وجود مصدر Tracking حقيقي.

### Upcoming exams for parents

Assessment الحالية لا تملك عقدًا مؤكدًا لموعد امتحان (`exam_date/starts_at`)؛ لذلك لا يتم الادعاء بوجود Upcoming Exams لولي الأمر. هذه تحتاج Exam Schedule/Assessment Plan حقيقيًا إذا تقرر إضافتها.

## 5) مستوى الجاهزية

هذه الحزمة هي **Reviewed + Static-Verified Release Candidate** للتعديلات المتفق عليها.

قبل وصفها بأنها `Production-Verified` نهائيًا يجب على بيئة المشروع الكاملة القيام بـ:

1. استعادة ملفات Laravel root الأصلية (`composer.json`, `artisan`, ...)، ثم `composer install` و`php artisan test`.
2. تشغيل Migrations على قاعدة Staging نظيفة ثم Smoke/E2E على Tenant حقيقي.
3. تشغيل `npm ci` و`npm run build` من Registry يمكنه تنزيل dependencies.
4. اختبار Browser E2E لمسارات: Login/RBAC, Academic, Schedule/Substitution, Attendance, Grades/Appeals, Broadcasts/Templates, Analytics, Admin Accounts.
5. تحديث/توليد OpenAPI النهائي ليشمل كل Routes الجديدة في هذه الجولة.

## 6) ملفات السجل المرجعية

- `docs/DASHBOARD_REVIEW_DECISIONS_AR.md` داخل كل حزمة يحتوي قرارات المراجعة المجمعة كاملة.
- تقرير التحقق هذا مضاف كذلك إلى حزم التسليم.
