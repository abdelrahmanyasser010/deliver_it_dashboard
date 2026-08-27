# FIX 365 Dashboard — Product & UI/UX Revision Notes
## مرجع تعديلات لوحة التحكم قبل ربط الـBackend

**الحالة:** معتمد كمصدر عمل للتعديل القادم  
**النطاق:** لوحة تحكم شركة الشحن FIX 365 — فيكس 365  
**الهدف:** تثبيت وتحسين أهم العمليات التشغيلية قبل مرحلة Backend Integration

---

# 1) القرار العام

الأساس الحالي للمنتج قوي، ولا نحتاج إعادة تصميم شاملة أو إضافة صفحات لمجرد زيادة حجم النظام.

الهدف في الجولة القادمة هو:

1. جعل أهم العمليات التشغيلية أسرع وأوضح.
2. تقليل احتمالات الخطأ البشري.
3. جعل الصفحة الرئيسية مركز قرارات، وليس مجرد أرقام.
4. تحسين قابلية استخدام الموظف للنظام طوال اليوم.
5. تثبيت المصطلحات التشغيلية قبل ربط الـBackend.
6. إصلاح الطباعة لتصبح طباعة بوالص فعلية.
7. تثبيت الـFrontend بعد هذه الجولة والانتقال إلى Backend Integration.

---

# 2) P0 — مشكلة حرجة: الطباعة

## المشكلة الحالية
زر الطباعة يفتح Print Preview لصفحة إدارة الشحنات نفسها، فتظهر عناصر الصفحة العادية بدل بوليصة شحن مخصصة.

## المطلوب
1. تحديد شحنة أو مجموعة شحنات.
2. الضغط على «طباعة البوالص».
3. فتح معاينة مخصصة للبوالص فقط.
4. اختيار حراري 100×150mm أو A4 وعدد النسخ.
5. إخفاء كل عناصر لوحة التحكم أثناء الطباعة.
6. كل بوليصة تكون صفحة مستقلة في 10×15.

## محتوى البوليصة
- شعار واسم الشركة.
- رقم التتبع.
- Barcode CODE128.
- اسم وهاتف المستلم.
- المحافظة/المدينة والعنوان.
- COD.
- عدد القطع.
- التاجر.
- نوع الخدمة عند الحاجة.
- ملاحظات التوصيل المسموح بها.

## لا يظهر
- عمولة المندوب.
- صافي مستحق التاجر.
- الملاحظات الداخلية.
- بيانات التدقيق.

```css
@page {
  size: 100mm 150mm;
  margin: 0;
}
```

لا تعرض «تم الإرسال إلى Enzo Printer» إلا إذا كان التكامل مع الطابعة مؤكدًا فعليًا. في Browser Print استخدم «تم تجهيز البوليصة للطباعة».

---

# 3) P1 — الرئيسية تتحول إلى مركز قرارات

الكارت الكبير «ابدأ من القرارات العاجلة» يتحول إلى Action Center حقيقي يعرض عناصر قابلة للنقر مثل:

- تحديثات مندوب تنتظر الاعتماد.
- طلبات استلام بدون مندوب.
- شحنات متأخرة.
- فروق توريد.
- مرتجعات تنتظر الإسناد.
- استثناءات حرجة.

مثال:

```text
قرارات تحتاج تدخلك
14 تحديث مندوب ينتظر الاعتماد
8 مرتجعات تنتظر الإسناد
3 فروق تحصيل
4 طلبات استلام بدون مندوب
```

كل KPI يوضح الفترة الزمنية بوضوح: اليوم / هذا الأسبوع / هذا الشهر / الفترة المختارة، ويكون قابلًا للنقر لفتح التفاصيل.

**Backend impact:** نحتاج Action Items + KPI queries حسب الفترة، وليس حسابًا داخل الواجهة فقط.

---

# 4) P1 — الـSidebar

على Desktop يكون الوضع الافتراضي Icon + Label، مع إمكانية Collapse إلى Icons فقط. عند التصغير يظهر Tooltip واضح وفوري.

التسميات الأساسية: الرئيسية، مركز العمليات، الشحنات، المحادثات، التقارير، المحاسبة، المناديب، التجار، المستخدمون، الإعدادات.

**معيار القبول:** الموظف الجديد يفهم جميع الأقسام بدون حفظ الأيقونات.

---

# 5) P1 — البحث في الشحنات

Placeholder المقترح:

> ابحث برقم الشحنة، المستلم، الهاتف أو التاجر

العدسة داخل الحقل ومحاذاة RTL صحيحة. عند الربط بالـBackend يدعم:

```text
?search=
&status=
&merchant_id=
&driver_id=
&governorate_id=
&page=
&per_page=
&sort=
```

مع Debounce وEmpty State واضح وزر إعادة ضبط الفلاتر.

---

# 6) P1 — فلاتر الشحنات

المحافظة، المندوب، والتاجر تظل فلاتر أساسية، لكن التاجر والمندوب يتحولان إلى Searchable Combobox يدعم البحث، All option، Keyboard navigation، Clear، Loading وEmpty state.

---

# 7) P1 — حالات الشحنات

لتقليل الزحام، إما استخدام مجموعات عليا:

- كل الحالات.
- نشطة.
- تم التسليم.
- متعثرة.
- مرتجعات.

والحالات الدقيقة داخل Filter متقدم؛ أو الإبقاء على الحالات الدقيقة مع Horizontal scroll محسوب. القرار النهائي يتحدد بعد مراجعة الكود والمساحة.

---

# 8) P1 — Drawer تفاصيل الشحنة

الحفاظ على الـDrawer لأنه مناسب للتشغيل اليومي، لكن يعاد تنظيمه إلى:

## Summary ثابت
- رقم الشحنة.
- الحالة الرسمية.
- المستلم.
- الهاتف.
- COD.
- المحافظة.
- العنوان.
- التاجر.
- المندوب.

## Timeline واضح

```text
● تم إنشاء الشحنة
● وصلت المكتب
● تم إسنادها إلى محمد علي
● خرجت للتوصيل
○ تحديث مندوب ينتظر المراجعة
```

## فصل التحديث الميداني عن الحالة الرسمية

تقرير المندوب غير المعتمد يظهر بشكل مستقل:

> تقرير مندوب — غير معتمد  
> العميل طلب التأجيل للغد  
> [مراجعة التقرير]

**قاعدة:** Driver field update != Official shipment status.

---

# 9) P1 — إزالة زر «تحديث الحالة» العام

لا نريد General Status Dropdown يسمح بنقل الشحنة لأي حالة. بدلًا منه تظهر الإجراءات المسموحة للحالة الحالية فقط.

أمثلة:

**في الطريق:** تغيير المندوب، تسجيل استثناء، مراجعة تحديث المندوب.

**تم التسليم:** عرض إثبات التسليم، عرض التحصيل.

**مرتجع:** استلام بالمخزن، إسناد الإرجاع للتاجر.

**Backend impact:** السيرفر هو مصدر الحقيقة للـAllowed Transitions ولا يعتمد على إخفاء الأزرار في الواجهة.

---

# 10) P1 — زر «محاولة تسليم»

المسار الطبيعي أن محاولة التسليم تأتي من تطبيق المندوب. إذا احتاج الموظف تسجيل محاولة نيابة عنه، يكون الاسم «تسجيل محاولة يدويًا» ويطلب:

- السبب.
- المندوب.
- النتيجة.
- الوقت.
- ملاحظة إدارية.
- صلاحية خاصة.
- Audit record.

وتُعلّم كـManual/Admin Event.

---

# 11) P1 — إجراءات Drawer حسب الحالة

كل Shipment يعرض فقط الإجراءات الممكنة حاليًا. نموذج مستقبلي:

```text
allowed_actions:
- reassign_driver
- review_driver_update
- create_exception
```

يتم تثبيت العقد النهائي أثناء تحديث الـBackend Contract.

---

# 12) P1 — توحيد المصطلحات

يتم توحيد المصطلحات في UI وTypes وAPI وDatabase وDocs:

- Merchant = التاجر / العميل التجاري.
- Recipient = المستلم النهائي.
- Driver = المندوب.
- Tenant = شركة الشحن / الحساب المؤسسي.

عندما المقصود Recipient، استبدل «العميل» بـ«المستلم».

---

# 13) P1 — عمود الدفع

بدل «كاش عند الاستلام» الطويلة المتكررة، استخدم Badge مختصر:

- COD.
- مدفوع.
- تحويل.
- آجل إذا كان موجودًا في الـDomain.

---

# 14) P1 — المبالغ

- تنسيق موحد.
- محاذاة ثابتة.
- Sorting.
- تحديد العملة.
- الـBackend لا يستخدم Float للمال، بل Minor Units.

---

# 15) P1 — Bulk Operations

مراجعة كل الإجراءات الجماعية، مثل:

- طباعة عدة بوالص.
- إسناد مندوب إذا كانت الحالات تسمح.
- Export.
- إنشاء Dispatch Batch.

إذا كانت المجموعة تحتوي حالات مختلفة، يوضح النظام ما يمكن تطبيقه:

```text
تم تحديد 30 شحنة
24 قابلة للإسناد
6 غير قابلة للإسناد
```

---

# 16) P2 — أحدث الشحنات في الرئيسية

الأعمدة الأساسية: رقم التتبع، المستلم، المحافظة، المندوب، الحالة، المبلغ، التاريخ. الضغط على الصف يفتح Shipment Drawer.

---

# 17) P2 — Visual Hierarchy

- Padding ثابت للـHeader والـSidebar والكروت.
- لا توجد أيقونات لازقة بالحواف.
- عدم ازدحام Tabs/Filters بدون فصل.
- توحيد Radius وBorder وShadow.
- الحفاظ على Dark Theme الحالي بدون Glow زائد.

---

# 18) P2 — Dropdowns / Combobox

أي قائمة قد تصل لعشرات أو مئات العناصر تستخدم Searchable Combobox، خصوصًا التجار والمناديب والفروع والمناطق. تدعم Search، Keyboard، Clear، Loading، Empty، وRemote Search/Pagination لاحقًا عند الحاجة.

---

# 19) P2 — Loading / Error / Empty

كل Data View لها Loading، Empty، Error، Retry، وPermission denied state عند الحاجة.

---

# 20) Backend Impact Register

## Dashboard
- Action items.
- Urgency counts.
- KPIs by period.
- Drill-down filters.

## Shipments List
- Server-side pagination.
- Search.
- Sorting.
- Status / merchant / driver / governorate filters.
- Bulk commands.

## Shipment Details
الـResponse يحتاج:
- official_status.
- timeline.
- driver_updates.
- pending_driver_update.
- delivery_proof.
- financial_summary.
- allowed_actions.
- version / concurrency token.

## Driver Updates

```text
driver submits field report
→ pending review
→ company approves/rejects
→ official shipment status changes only after approval
```

## Manual Delivery Attempt
إذا دعمت: Permission خاص + Mandatory reason + Actor + Timestamp + Audit + Idempotency.

## Printing
Client-side: Backend يعيد Print DTO كامل.  
Server-generated PDF مستقبلًا: Endpoint لإنشاء/استرجاع ملف البوالص.

## Bulk Actions
- Validation لكل Shipment.
- سياسة Atomic أو Partial failure واضحة.
- Idempotency.
- Audit.
- Result per shipment.

---

# 21) قواعد لا يتم تغييرها

1. الشركة هي صاحبة الحالة الرسمية للشحنة.
2. المندوب يرسل Field Report ولا يغير الحالة الرسمية مباشرة.
3. التاجر يرى الحالة المعتمدة من الشركة.
4. لا يوجد تعامل تشغيلي مباشر بين المندوب والتاجر.
5. التسليم الجزئي معتمد.
6. رسوم الشحن الأساسية لا تتكرر عند التسليم الجزئي.
7. الجزء المرتجع يعود للشركة أولًا قبل إعادته للتاجر.
8. المستلم النهائي ليس User Account حاليًا.
9. Proof of Delivery الحالي: صورة + بيانات المستلم + GPS حسب الإعدادات.
10. OTP خيار مستقبلي وليس شرطًا حاليًا.

---

# 22) ترتيب التنفيذ عند استلام فولدر الداشبورد

## A — Audit سريع
- Build.
- Lint.
- Tests.
- Routes.
- Shared UI Components.
- Theme.
- Print architecture.
- Shipment Drawer.
- Shipments filters.
- Home data model.

## B — P0/P1
1. إصلاح الطباعة.
2. تحسين Shipment Drawer.
3. إزالة General Status Action.
4. Actions حسب الحالة.
5. Actionable Home.
6. Sidebar.
7. Search.
8. Combobox Filters.
9. Vocabulary.
10. Bulk Operations.

## C — Polish
- Spacing.
- Empty/Error/Loading.
- Accessibility.
- Responsive.
- Keyboard.
- Tooltips.

## D — Verification

```bash
npm install
npm run lint
npm test
npm run build
```

ثم اختبار: البحث والفلاتر، Drawer، مراجعة تحديث المندوب، Bulk select، طباعة مفردة ومجمعة، 10×15، A4، RTL، وSidebar collapsed/expanded.

---

# 23) Definition of Done — Frontend Freeze

لا تعتبر الجولة مكتملة إلا إذا:

- لا يتم طباعة صفحة Shipments بدل البوليصة.
- Shipment Drawer يوضح الفرق بين Official Status وDriver Update.
- لا يوجد General unrestricted status changer.
- Search/Filters واضحة.
- Sidebar مفهوم لموظف جديد.
- Home تعرض قرارات تحتاج تدخلًا.
- Merchant/Recipient terminology موحدة.
- Bulk actions آمنة حسب الحالة.
- Lint ينجح.
- Build ينجح.
- Tests تنجح إذا كانت بيئة الاختبارات مكتملة.
- لا توجد Console errors في السيناريوهات الأساسية.

---

# 24) الخطوة التالية بعد Frontend Freeze

بعد تطبيق هذه التعديلات على فولدر الداشبورد:

1. استخراج الفرق الجديد في متطلبات البيانات.
2. مقارنة الفرق مع Backend Contract v1.3.
3. تحديث OpenAPI.
4. تحديث UI_ACTION_TO_API_MAPPING.
5. تحديث DTOs.
6. تحديث Allowed Actions/State Transitions.
7. تحديد Endpoints الجديدة.
8. بعدها تعديل Backend الفعلي أو إصدار Prompt تنفيذي دقيق له.

**لا يبدأ تعديل Backend بناءً على افتراضات قبل تثبيت هذه الجولة من الـFrontend.**

---

# 25) P1 — التقارير يجب أن تدعم Drill-down حقيقي

## المشكلة الحالية

صفحة التقارير تعرض جداول ورسومات جيدة، لكن عند الضغط على زر العين في:

- أداء المناديب.
- تقرير المحافظات.
- بعض مؤشرات التشغيل.

تظهر رسالة نجاح فقط بدون فتح Drawer أو صفحة أو قائمة شحنات مفلترة فعلية.

## المطلوب

كل عنصر "عرض التفاصيل" يجب أن يفتح Drill-down فعليًا.

### تفاصيل المندوب

يفتح Drawer أو Details View يحتوي على:

- اسم المندوب وكوده.
- المنطقة / النطاق.
- عدد الشحنات المكلف بها.
- تم التسليم.
- المرتجعات.
- المتأخر.
- نسبة النجاح.
- إجمالي COD المحصل.
- متوسط زمن التسليم.
- عدد المحاولات.
- فروق التوريد إن وجدت.
- قائمة الشحنات الداخلة في التقرير بنفس الفلاتر الزمنية الحالية.
- زر فتح ملف المندوب.
- زر فتح قائمة الشحنات المفلترة لهذا المندوب.

### تفاصيل المحافظة

يفتح Drawer أو Report Details View يحتوي على:

- اسم المحافظة.
- إجمالي الشحنات.
- تم التسليم.
- في الطريق.
- المرتجعات.
- المتأخر.
- نسبة النجاح.
- متوسط زمن التوصيل.
- SLA breaches.
- أفضل / أضعف المناطق داخل المحافظة إن كانت البيانات متاحة.
- المناديب العاملون في المحافظة.
- التجار الأعلى حجمًا داخل المحافظة.
- قائمة الشحنات بنفس فترة التقرير الحالية.

## قاعدة مهمة

الـDrill-down يجب أن يحافظ على نفس:

- الفترة الزمنية.
- الفلاتر.
- نطاق الـTenant.
- صلاحيات المستخدم.

ولا يعيد المستخدم لتقرير عام بدون سياق.

---

# 26) P1 — زر "فتح الشحنة" داخل تنبيهات SLA غير واضح

## المشكلة الحالية

داخل تبويب "التأخير وSLA" يوجد عنصر "فتح الشحنة"، لكنه منخفض الوضوح بصريًا ويبدو كسطر نص أكثر من Action واضح.

## المطلوب

تحويله إلى CTA واضح:

> فتح تفاصيل الشحنة

مع:

- أيقونة واضحة.
- Hover state.
- Focus state.
- فتح نفس Shipment Drawer المعتمد في صفحة الشحنات.
- جعل الصف نفسه Clickable عند الحاجة.

## داخل الـDrawer

يجب إظهار:

- سبب دخول الشحنة في SLA alert.
- مقدار التأخير.
- المرحلة الحالية.
- المندوب الحالي.
- آخر تحديث.
- الإجراء المقترح.
- Timeline.

مثال:

```text
SHP-2003
تأخير: 9 ساعات

المرحلة: في الطريق
SLA المستهدف: 12 ساعة
الوقت الحالي: 21 ساعة
المندوب: محمد علي
آخر تحديث: العميل لم يرد منذ ساعتين
```

## قاعدة

لا ننشئ شاشة تفاصيل شحنة مختلفة داخل Reports؛ نعيد استخدام Shipment Drawer الأساسي.

---

# 27) P1 — إعادة تصميم "إرسال إشعارات التأخير"

## المشكلة الحالية

الزر الحالي:

> إرسال إشعارات التأخير

ينفذ Action جماعي، لكن المستخدم لا يعرف:

- من استلم التنبيه؟
- هل هو تاجر أم مندوب أم موظف؟
- ما القناة؟
- ما نص الرسالة؟
- هل الإرسال نجح؟
- هل تم إرسال نفس التنبيه سابقًا؟

## المطلوب

قبل الإرسال تفتح Preview/Confirmation Modal.

### ملخص

```text
سيتم إرسال 3 تنبيهات

2 إلى مناديب
1 إلى تاجر
0 إلى مستلمين نهائيين
```

### لكل عنصر

- الشحنة.
- سبب التأخير.
- المستلم.
- نوع المستلم.
- القناة.
- Preview للنص.
- آخر إشعار تم إرساله.
- هل يسمح بإعادة الإرسال؟

### Actions

- إرسال الكل.
- استبعاد عنصر.
- فتح الشحنة.
- إلغاء.

## بعد الإرسال

يظهر Result summary، مثال:

```text
تم إرسال 3/3 تنبيهات بنجاح
2 Push
1 In-app
```

ولو فشل عنصر:

```text
2 نجح
1 فشل — المندوب لا يملك جهاز Push مسجل
```

---

# 28) P1 — تعريف واضح لدور التنبيهات

يجب التفريق بين:

## A. In-app notifications

تظهر داخل مركز إشعارات اللوحة/التطبيق.

أمثلة:

- تحديث مندوب ينتظر الاعتماد.
- Shipment SLA breached.
- فرق توريد.
- تسوية جاهزة للمراجعة.
- مرتجع ينتظر الإسناد.

## B. Push notifications

إلى تطبيق المندوب أو التاجر عند الحاجة.

أمثلة للمندوب:

- مهمة جديدة.
- طلب توضيح على تقرير.
- تغيير جدول المهمة.
- مرتجع جديد.

أمثلة للتاجر:

- تم استلام الشحنة.
- تم اعتماد حالة التسليم.
- شحنة مرتجعة في طريقها إليك.
- تسوية تم دفعها.

## C. Operational alerts

داخل Dashboard لموظفي الشركة فقط.

أمثلة:

- تأخير SLA يحتاج تدخل موظف.
- فرق تحصيل.
- Proof ناقص.
- Shipment بدون مندوب.

## قاعدة بيانات التنبيه

كل Notification Event يجب أن يحدد:

- event_type.
- audience.
- channels.
- related_entity.
- related_entity_id.
- severity.
- deduplication_key.
- sent_at.
- read_at.
- delivery_status.

---

# 29) P1 — مركز إشعارات حقيقي

أيقونة الجرس في الـTopbar يجب أن تفتح Notification Center واضح.

المطلوب:

- قائمة آخر الإشعارات.
- غير مقروء / مقروء.
- فلترة حسب النوع.
- فلترة حسب الشدة.
- فتح الكيان المرتبط.
- Mark as read.
- Mark all as read.
- Pagination أو infinite scroll.
- عدد غير المقروء الحقيقي.

مثال:

```text
تحديث مندوب ينتظر الاعتماد
SHP-2020 · منذ 4 دقائق
[فتح التحديث]
```

---

# 30) P1 — رفع الصور والملفات

النظام يحتاج File/Attachment Module موحد، وليس فقط رسائل نصية.

## الاستخدامات

- الشات.
- Proof of Delivery.
- الاستثناءات.
- المرتجعات.
- مستندات التجار.
- CSV/Excel imports.
- التقارير وPDF exports.

## الشات

إضافة:

- إرفاق صورة.
- إرفاق ملف.
- Drag & Drop.
- Preview قبل الإرسال.
- عرض الصور داخل المحادثة.
- فتح/تحميل المستندات.
- Reply to message.
- ربط الرسالة بشحنة.

الأنواع الأساسية:

- jpg / jpeg / png / webp.
- pdf.
- doc / docx.
- xls / xlsx.
- csv.

## قاعدة

لا يتم تخزين Binary داخل قاعدة البيانات.

يستخدم Object Storage، وقاعدة البيانات تحتفظ بالـmetadata فقط.

---

# 31) Backend Impact — Reports, Notifications & Files

بعد تثبيت الـFrontend يجب تحديث Backend Contract.

## Reports drill-down

```text
GET /api/v1/reports/drivers/{driver_id}
GET /api/v1/reports/drivers/{driver_id}/shipments
GET /api/v1/reports/governorates/{governorate_id}
GET /api/v1/reports/governorates/{governorate_id}/shipments
```

أو Query API موحدة إذا كان تصميم الـBackend النهائي يفضل ذلك.

## Notifications

```text
GET    /api/v1/notifications
GET    /api/v1/notifications/unread-count
PATCH  /api/v1/notifications/{id}/read
POST   /api/v1/notifications/mark-all-read

POST   /api/v1/notification-batches/preview
POST   /api/v1/notification-batches/send
GET    /api/v1/notification-batches/{id}
```

## Files

```text
POST   /api/v1/files/upload-intents
POST   /api/v1/files/{id}/complete
GET    /api/v1/files/{id}
GET    /api/v1/files/{id}/download
DELETE /api/v1/files/{id}
```

## قاعدة مشتركة

زر "فتح الشحنة" من أي مكان في النظام يجب أن يستخدم نفس Shipment Details contract ونفس Shipment Drawer.

---

# 32) P0 — قائمة مراجعة تقفيل الفترة لا تكون Checkboxes يدوية

## المشكلة الحالية

عناصر "قائمة مراجعة التقفيل" تبدو قابلة للضغط، والضغط عليها يغير حالتها/يعتبرها منجزة.

هذا غير مقبول محاسبيًا.

عناصر الإقفال ليست Todo List يدوية، بل شروط مشتقة من البيانات الحقيقية.

## المطلوب

الضغط على كل عنصر يفتح شاشة/Drawer التفاصيل التي تمنع إكماله، ولا يعلّم العنصر كمكتمل يدويًا.

الحالة تتحول إلى مكتمل تلقائيًا فقط بعد تحقق الشرط من الـBackend.

### أمثلة

#### "اعتماد كل تحديثات المناديب"

الأصح:
> لا توجد تحديثات تشغيلية معلقة تؤثر ماليًا على الفترة

الضغط يفتح التحديثات المعلقة ذات الأثر المالي فقط.

#### "مطابقة توريدات الكاش مع المحافظ"

الأصح:
> مطابقة تحصيلات COD مع توريدات المناديب وقنوات التحصيل

الضغط يفتح شاشة reconciliation ويعرض:
- المتوقع.
- المورد.
- الفرق.
- القناة.
- المندوب.
- الشحنات المرتبطة.

#### "اعتماد تسويات التجار"

لا يجب أن يعني أن كل التسويات تم دفعها.

الأصح:
> تثبيت مستحقات التجار للفترة ومعالجة الفروقات

الإقفال المحاسبي يعتمد على إثبات الالتزام، وليس شرطًا دفع كل مستحق فعليًا قبل الإقفال.

#### "مراجعة المرتجعات ورسومها"

الضغط يفتح المرتجعات المؤثرة ماليًا في الفترة ورسومها/الإعفاءات/التعديلات.

#### "تثبيت قيود الأستاذ العام"

الحالة تكتمل فقط عندما:
- لا توجد قيود غير متوازنة.
- لا توجد قيود مطلوبة غير منشأة.
- تم ترحيل القيود المطلوبة للفترة.
- لا توجد أخطاء حرجة معلقة.

## معيار القبول

لا يمكن للمستخدم تحويل عنصر Checklist إلى مكتمل بمجرد الضغط عليه.

---

# 33) P0 — تقفيل الشهر يجب أن يكون Accounting Period Close حقيقي

## المشكلة

زر "تقفيل الشهر" صحيح من حيث الفكرة، لكن يجب ألا يكون Action بسيطًا.

## المطلوب

يفتح Confirmation/Review Modal يعرض:

- الفترة التي سيتم إغلاقها.
- حالة كل شرط من شروط الإغلاق.
- عدد القيود المعلقة.
- فروق الكاش غير المحسومة.
- المستحقات المثبتة.
- المرتجعات غير المكتملة ماليًا.
- أي استثناءات حرجة.

لا يسمح بالإغلاق إذا يوجد Blocker.

## عند الإغلاق

- يتم Lock للفترة المحاسبية.
- لا يسمح بتعديل قيودها مباشرة.
- أي تصحيح لاحق يكون Adjustment/Reversal في فترة مفتوحة.
- يسجل:
  - closed_by.
  - closed_at.
  - period.
  - snapshot/checksum عند الحاجة.
- إعادة فتح الفترة تحتاج Permission عالية جدًا + سبب + Audit.

## تسمية أفضل

بدل "تقفيل الشهر" فقط:
> إغلاق الفترة المحاسبية

مع عرض اسم الفترة مثل:
> يونيو 2026

---

# 34) P0 — فصل توريدات المناديب عن تسويات التجار

## المشكلة الحالية

صفحة "التسويات والمحافظ" تعرض في نفس الجدول:

- تسوية تاجر.
- توريد مندوب.

وهما تدفقان ماليان عكسيان:

### Driver Remittance
فلوس داخلة للشركة.

### Merchant Settlement/Payout
فلوس خارجة من الشركة للتاجر.

وجودهما في نفس قائمة الاعتماد وبنفس زر "اعتماد المحدد" يزيد خطر اعتماد عمليات مختلفة بقواعد مختلفة.

## المطلوب

تقسيم الشاشة إلى Tabs واضحة:

1. تسويات التجار.
2. توريدات المناديب.
3. فروق التحصيل / المطابقة.
4. سجل المدفوعات أو الحركات، إذا لزم.

يمكن الاحتفاظ بـ"كل الحركات" كعرض رقابي فقط، لكن Bulk Approval لا يجمع أنواعًا مالية مختلفة.

---

# 35) P0 — تسوية التاجر تحتاج Breakdown قبل الاعتماد

لا يجوز اعتماد تسوية تاجر من صف يعرض الإجمالي فقط.

## عند فتح التسوية

يعرض:

- التاجر.
- الفترة.
- الشحنات الداخلة في التسوية.
- COD المحصل والمؤهل.
- رسوم الشحن.
- رسوم المرتجعات.
- رسوم المحاولات الإضافية.
- Collection Fee.
- VAT إن كانت مفعلة.
- تعديلات يدوية مع السبب.
- خصومات/إضافات.
- صافي المستحق.
- أي شحنات مستبعدة وسبب الاستبعاد.
- Ledger preview.

## الإجراءات

- مراجعة.
- اعتماد.
- رفض/إرجاع للمراجعة.
- دفع.
- إرفاق إثبات الدفع.
- عرض القيد المالي.

## قاعدة

`approved` لا تعني `paid`.

الحالات المقترحة:

```text
draft
pending_review
approved
payment_processing
paid
failed
cancelled
```

---

# 36) P0 — توريد المندوب يحتاج Reconciliation مستقل

## تفاصيل توريد المندوب

يجب إظهار:

- المندوب.
- الوردية/الفترة.
- COD المتوقع.
- المبلغ المورد فعليًا.
- Cash.
- Wallet/Card/Online إن وجدت.
- الفرق.
- سبب الفرق.
- الشحنات التي كونت العهدة.
- إيصال/صورة إثبات التوريد.
- المستلم داخل الشركة.
- تاريخ الاستلام.

## الحالات

```text
expected
submitted
received
reconciled
variance_review
approved
posted
```

أي فرق يجب ألا يختفي بمجرد اعتماد العملية.

---

# 37) P0 — "اعتماد المحدد" المالي يحتاج قواعد أقوى

## المطلوب

- لا يسمح باختيار صفوف من أنواع مختلفة في نفس الاعتماد.
- لا يسمح باختيار Paid/Posted records.
- لا يسمح باعتماد عنصر بدون Details مكتملة.
- المبالغ الكبيرة يمكن أن تحتاج Dual Approval حسب Threshold في Settings.
- يظهر Confirmation summary قبل التنفيذ.

مثال:

```text
سيتم اعتماد 3 تسويات تجار
الإجمالي: 84,250 ج.م

[عرض التفاصيل]
[تأكيد الاعتماد]
```

## Backend

- Idempotency-Key.
- Optimistic concurrency/version.
- Permission.
- Audit.
- لا اعتماد بناءً على client totals.

---

# 38) P1 — بطاقات التسويات الحالية تحتاج إعادة تعريف

## المشكلة

بطاقة "جاهز للتصدير CSV" ليست KPI.

و"عدد العمليات" وحدها قليلة القيمة.

## KPIs المقترحة

في تسويات التجار:
- بانتظار المراجعة.
- جاهز للدفع.
- مدفوع اليوم/الفترة.
- إجمالي مستحقات التجار.

في توريدات المناديب:
- متوقع توريده.
- تم توريده.
- فروق تحتاج مراجعة.
- مناديب لم يوردوا.

زر CSV يكون Action في Toolbar وليس KPI card.

كل مبلغ يجب أن يوضح الفترة الزمنية.

---

# 39) P1 — الأستاذ العام: تمييز Journal Entry عن Journal Line

## المشكلة المحتملة

الجدول الحالي يسمى "قيود الأستاذ العام" ويعرض حسابًا واحدًا مع مدين/دائن في كل صف.

محاسبيًا القيد Journal Entry يجب أن يحتوي على سطرين أو أكثر ومجموع المدين = مجموع الدائن.

## المطلوب

إذا الصف الحالي يمثل Journal Entry:
- لا تعرض "الحساب" كسطر وحيد.
- اعرض المصدر/الوصف والإجمالي.
- عند الفتح يظهر كل Journal Lines.

إذا الصف يمثل Journal Line:
- يجب تغيير تسمية الجدول لتوضح أنه "سطور القيود".

## Drawer القيد

يعرض:

- Journal Entry ID.
- التاريخ.
- المصدر.
- source entity.
- الوصف.
- Lines:
  - account.
  - debit.
  - credit.
- Total debit.
- Total credit.
- created_by.
- reviewed_by.
- posted_by.
- posted_at.
- attachments/supporting evidence.
- reversal link إن وجد.

## قاعدة

لا يمكن ترحيل قيد غير متوازن.

القيد المرحل لا يعدل؛ التصحيح يكون Reversal/Adjustment.

---

# 40) P1 — زر الإجراء في جدول الأستاذ لا ينفذ ترحيلًا مباشرًا

أيقونة الإجراء في صف القيد يجب أن تفتح التفاصيل أولًا.

الترحيل المالي يكون Action واضح باسم:
> ترحيل القيد

ويظهر فقط عند استيفاء الشروط والصلاحية.

للقيود المعلقة يمكن دعم Bulk Post بعد مراجعة ملخص واضح.

---

# 41) P1 — "فرق الكاش" يجب أن يفتح Reconciliation Queue

## المشكلة

عرض "فرق الكاش — يحتاج مراجعة" كتنبيه فقط غير كافٍ.

## المطلوب

الضغط يفتح قائمة الفروقات:

- المندوب.
- الفترة/الوردية.
- Expected COD.
- Actual remittance.
- Difference.
- linked shipments.
- payment channel.
- proof.
- reason/status.
- assigned reviewer.

## الإجراءات

- تأكيد فرق.
- تسجيل تصحيح موثق.
- طلب توضيح.
- ربط إيصال.
- إنشاء Adjustment عند الاعتماد.

---

# 42) P1 — Actual vs Target لا يجب أن يختلط بقواعد الإقفال

## الملاحظة

"ميزانية الشهر: فعلي مقابل مستهدف" مفيدة إداريًا، لكن ليست شرط إقفال محاسبي.

تبقى كManagement Insight ولا تدخل في Validation الخاصة بإغلاق الفترة.

## تحسين المعنى

لا يكفي:
> أعلى من المستهدف / أقل من المستهدف

يجب عرض:
- Actual.
- Target.
- Variance amount.
- Variance %.
- Favorable / Unfavorable حسب طبيعة المؤشر.

مثال:
زيادة إيراد الشحن قد تكون Favorable.
زيادة رسوم/تكلفة المرتجعات قد تكون Unfavorable حتى لو الرقم المالي أعلى.

---

# 43) P1 — توحيد المصطلحات المالية

إزالة الخلط بين:
- Brand payout.
- Brand.
- Merchant.

استخدام:
- Merchant / التاجر.
- Merchant Settlement / تسوية التاجر.
- Driver Remittance / توريد المندوب.
- Recipient / المستلم.

كذلك يجب توضيح معنى:
"قيمة أوردرات البراندات"

إذا المقصود:
- إجمالي قيمة COD → يسمى "إجمالي COD للشحنات".
- إجمالي قيمة الشحنات → يسمى "إجمالي قيمة الشحنات".
- إيرادات الشركة → يسمى "إيرادات الشحن".

لا تستخدم اسمًا غامضًا لكارت مالي.

---

# 44) P1 — الأدلة والمرفقات في العمليات المالية

إضافة Attachment support إلى:

- توريد المندوب.
- إثبات التحويل البنكي للتاجر.
- Instapay receipt.
- Cash deposit proof.
- Manual adjustment.
- Reconciliation evidence.

لا تخزن الملفات في DB؛ تستخدم File Module الموحدة/Object Storage.

---

# 45) P1 — صلاحيات ومبدأ فصل المهام Segregation of Duties

العمليات المالية الحساسة لا تعتمد فقط على Role واحد عام.

على الأقل يجب الفصل بين:

- من ينشئ التسوية.
- من يراجعها.
- من يعتمدها.
- من يسجل الدفع.

وعند المبالغ الكبيرة يمكن منع نفس المستخدم من Create + Approve + Pay.

كل ذلك Configurable حسب الشركة.

---

# 46) Backend Impact — Accounting & Settlements

## Accounting periods

```text
GET  /api/v1/accounting/periods
GET  /api/v1/accounting/periods/{id}
POST /api/v1/accounting/periods/{id}/close-preview
POST /api/v1/accounting/periods/{id}/close
POST /api/v1/accounting/periods/{id}/reopen
```

## Close checklist

الحالة مشتقة من البيانات ولا يوجد endpoint لتعليم checkbox يدويًا.

## Journal

```text
GET  /api/v1/accounting/journal-entries
GET  /api/v1/accounting/journal-entries/{id}
POST /api/v1/accounting/journal-entries/{id}/post
POST /api/v1/accounting/journal-entries/{id}/reverse
```

## Driver remittances

```text
GET  /api/v1/driver-remittances
GET  /api/v1/driver-remittances/{id}
POST /api/v1/driver-remittances/{id}/reconcile
POST /api/v1/driver-remittances/{id}/approve
```

## Merchant settlements

```text
GET  /api/v1/merchant-settlements
GET  /api/v1/merchant-settlements/{id}
POST /api/v1/merchant-settlements/{id}/review
POST /api/v1/merchant-settlements/{id}/approve
POST /api/v1/merchant-settlements/{id}/pay
```

المسارات نهائية فقط بعد مقارنة Backend Contract الحالي وعدم تكرار Endpoints موجودة.

---

# 47) P1 — Driver 360° View إلزامي

## المشكلة الحالية

صفحة المناديب تدير الحسابات كـCRUD فقط تقريبًا:
- تعديل.
- تغيير كلمة السر.
- حظر.
- حذف.

لكن لا توجد شاشة تشغيل شاملة للمندوب.

## المطلوب

إضافة زر واضح:
> فتح المندوب

أو جعل اسم المندوب / الكود قابلًا للضغط.

يفتح Drawer أو Page تحتوي على:

- بيانات المندوب الأساسية.
- حالة الحساب.
- حالة التشغيل الحالية.
- حالة الوردية.
- Online / Offline.
- آخر ظهور.
- آخر GPS.
- الفرع الأساسي.
- المناطق المكلف بها.
- المركبة إن وجدت.
- المهام الحالية.
- طلبات الاستلام الحالية.
- شحنات التوصيل الحالية.
- عدد المهام المتبقية.
- نسبة النجاح.
- المتأخر.
- المرتجعات.
- COD في العهدة.
- التوريدات السابقة.
- فروق التحصيل.
- المستندات.
- الأجهزة والجلسات.
- سجل الإجراءات Audit.

---

# 48) P1 — فصل Account Status عن Operational Status

## Account Status

- active
- suspended
- archived

## Operational Status

- off_shift
- available
- busy
- pickup_task
- delivery_task
- offline

لا تستخدم كلمة "نشط" لوصف الاثنين.

مثال KPI:

> 4 على وردية الآن  
> من أصل 5 حسابات مفعلة

أو:

> 4 متاحون الآن

---

# 49) P1 — توضيح KPIs صفحة المناديب

## "تسليمات اليوم"

تغيير الاسم حسب المعنى الفعلي:

إذا الناجح:
> تم التسليم اليوم

إذا كل المحاولات:
> محاولات التوصيل اليوم

مع Tooltip أو Drill-down يوضح:
- تم التسليم.
- فشل.
- مؤجل.
- مرتجع.

## "كاش معلق"

استبداله بـ:
> عهدة COD الحالية

أو:
> مبالغ لدى المناديب

والضغط على المبلغ يفتح تفاصيل العهدة والتوريد.

---

# 50) P1 — إضافة مندوب: الفورم الحالي ناقص

## البيانات الأساسية

- الاسم الكامل.
- الهاتف.
- كود المندوب.
- البريد اختياري.
- صورة شخصية اختيارية.

## التشغيل

- الفرع الأساسي.
- مناطق العمل.
- أنواع المهام المسموحة:
  - pickup.
  - delivery.
  - returns.
  - all.
- الحد الأقصى للمجموعة.
- الحد الأقصى للمهام المفتوحة.
- نوع المركبة.
- المركبة المرتبطة إن وجدت.

## الحساب

يفضل:
- الهاتف كـLogin identifier.
- أو Username يولده النظام.

بعد الإنشاء:
- إرسال دعوة / OTP لتفعيل الحساب.

---

# 51) P1 — النطاق لا يكون Free Text

المحافظة/المنطقة يجب أن تكون IDs من Location Master Data.

مثال:

```text
المحافظة
القاهرة

المناطق
✓ مدينة نصر
✓ مصر الجديدة
✓ التجمع
```

لا تستخدم Text Field حرًا.

---

# 52) P1 — السعة التشغيلية

استبدال "الحد الأقصى للشحنات" بتعريف أوضح:

- الحد الأقصى للمجموعة.
- الحد الأقصى للمهام المفتوحة.

ويكون Default قابلًا للضبط من Settings.

---

# 53) P0 — إعادة تعيين الدخول بدل تغيير كلمة السر يدويًا

## المشكلة الحالية

الـAdmin يكتب كلمة سر جديدة للمندوب مباشرة.

هذا غير مناسب Production.

## المطلوب

Action:
> إعادة تعيين الدخول

يدعم:

- Reset link / OTP.
- أو Temporary Password لمرة واحدة.
- Force password change عند الدخول التالي.
- Logout from all devices اختياريًا.

خيارات:

```text
☑ تسجيل الخروج من جميع الأجهزة
☑ إلزامه بتغيير كلمة السر عند الدخول التالي
```

الـAdmin لا يعرف كلمة المرور القديمة.

---

# 54) P0 — إيقاف/حظر المندوب يحتاج Workflow

قبل الحظر يعرض النظام:

- عدد المهام النشطة.
- عدد الشحنات معه.
- عهدة COD الحالية.
- حالة الوردية.
- آخر اتصال.

ويطلب:

## ماذا نفعل بالمهام الحالية؟

- السماح بإكمال المهام الحالية ومنع الجديدة.
- سحب المهام وإعادة الإسناد.
- إيقاف فوري.

## سبب الحظر إلزامي

- نوع السبب.
- ملاحظة.

يسجل Audit.

---

# 55) P0 — لا Hard Delete لمندوب له تاريخ

إذا نفذ المندوب أي نشاط:
- Shipment.
- POD.
- Driver report.
- Remittance.
- GPS.
- Settlement-related event.
- Audit.

لا يتم حذفه نهائيًا.

يستخدم:
> أرشفة المندوب

Hard Delete فقط لحساب تم إنشاؤه بالخطأ ولم ينفذ أي عملية، وبصلاحية عالية.

---

# 56) P1 — Actions لا تكون Icons فقط

بدل مجموعة أيقونات صغيرة:

```text
[ فتح ]
[ ⋮ ]
```

والـMenu:

- تعديل البيانات.
- إعادة تعيين الدخول.
- إيقاف المندوب.
- أرشفة.

الأكشن الأساسي هو:
> فتح

---

# 57) P1 — Vehicle Management

ملف المندوب يستوعب:

- نوع المركبة.
- رقم اللوحة.
- المركبة المخصصة.
- السعة.
- حالة المركبة.

الربط اختياري حسب الشركة.

---

# 58) P1 — مستندات المندوب

استخدام File Module الموحدة لرفع:

- صورة البطاقة.
- رخصة القيادة.
- رخصة المركبة.
- عقد/مستندات.
- صورة شخصية.

لكل مستند:

- document_type.
- issued_at.
- expires_at.
- file_id.
- status.

مع تنبيه قبل انتهاء الصلاحية.

---

# 59) P1 — Search & Filters للمناديب

البحث يشمل:

- الاسم.
- الهاتف.
- الكود.
- المنطقة.

الفلاتر:

- Account status.
- Operational status.
- Shift status.
- Region.
- Has COD balance.
- Vehicle type عند الحاجة.

---

# 60) P1 — Drill-down من أرقام المندوب

الضغط على:

- عهدة COD.
- تم اليوم.
- المرتجعات.
- المهام الحالية.

يفتح التفاصيل الفعلية.

مثال:
> عهدة محمد علي

تعرض الشحنات التي كوّنت المبلغ وحالة كل تحصيل وتوريد.

---

# 61) Backend Impact — Drivers

## Driver resource

يجب أن يتضمن أو يدعم:

- account_status.
- operational_status.
- shift_status.
- branch_id.
- service_area_ids.
- task_types.
- max_batch_shipments.
- max_open_tasks.
- vehicle_id.
- current_cod_liability.
- last_seen_at.
- last_location.
- current_shift.
- current_tasks_count.

## Driver endpoints المتوقعة

```text
GET    /api/v1/drivers
POST   /api/v1/drivers
GET    /api/v1/drivers/{id}
PATCH  /api/v1/drivers/{id}

POST   /api/v1/drivers/{id}/reset-access
POST   /api/v1/drivers/{id}/suspend-preview
POST   /api/v1/drivers/{id}/suspend
POST   /api/v1/drivers/{id}/reactivate
POST   /api/v1/drivers/{id}/archive

GET    /api/v1/drivers/{id}/tasks
GET    /api/v1/drivers/{id}/performance
GET    /api/v1/drivers/{id}/cod-liability
GET    /api/v1/drivers/{id}/remittances
GET    /api/v1/drivers/{id}/locations
GET    /api/v1/drivers/{id}/documents
GET    /api/v1/drivers/{id}/sessions
GET    /api/v1/drivers/{id}/audit-log
```

المسارات النهائية تعتمد على مقارنة Backend Contract الحالي لتجنب التكرار.

---

# 62) P0 — صفحة التجار الحالية لا تمثل Merchant 360°

## المشكلة الحالية

الصفحة تعرض أساسًا:
- الاسم.
- الهاتف.
- عدد الشحنات.
- قيمة الأوردرات.
- تسوية معلقة.
- تاريخ الانضمام.
- أكشنات تعديل/شحنات/تسوية/تواصل.

هذا لا يكفي لتاجر داخل نظام شحن حقيقي.

## المطلوب

إضافة Merchant 360° View كـDrawer أو صفحة تفاصيل تحتوي Tabs:

1. الملخص.
2. الشحنات.
3. طلبات الاستلام.
4. الفروع والعناوين.
5. التسعير والعقد.
6. المستحقات والتسويات.
7. المرتجعات.
8. المستخدمون وصلاحيات بوابة التاجر.
9. المستندات.
10. المحادثات.
11. سجل التدقيق.

ويكون "فتح التاجر" هو الأكشن الأساسي.

---

# 63) P0 — منع إدخال مبلغ التسوية يدويًا

## المشكلة الحالية

Modal "تسوية الحساب" يسمح بإدخال مبلغ تسوية يدويًا مباشرة.

هذا غير متوافق مع المنظومة المالية.

## المطلوب

لا يُسمح بإنشاء Merchant Settlement من رقم حر.

التسوية تُبنى من Eligible Shipments وحركات Ledger فعلية:

- COD المحصل.
- رسوم الشحن.
- رسوم المرتجع.
- رسوم المحاولات الإضافية.
- Collection Fee.
- VAT إن كانت مفعلة.
- Adjustments موثقة.
- Refunds/credits إن وجدت.

ثم يحسب Backend:

```text
gross_cod
- shipping_fees
- return_fees
- extra_attempt_fees
- collection_fee
- tax
+/- approved_adjustments
= net_payable
```

أي Manual Adjustment يكون عملية مستقلة:
- مبلغ.
- نوع Debit/Credit.
- سبب إلزامي.
- مرفق اختياري/إلزامي حسب القيمة.
- صلاحية خاصة.
- Audit.

## قاعدة

Frontend لا يرسل `settlement_total` كمصدر حقيقة.

---

# 64) P1 — بيانات التاجر الأساسية ناقصة

Modal التعديل الحالي يحتوي الاسم والهاتف فقط.

## المطلوب

### بيانات الكيان التجاري
- الاسم التجاري.
- الاسم القانوني إن وجد.
- كود التاجر.
- الهاتف الرئيسي.
- البريد.
- رقم ضريبي / سجل تجاري حسب سياسة الشركة.
- Account status.
- تاريخ الانضمام.
- Account manager داخل شركة الشحن.

### إعدادات التشغيل
- الفرع الافتراضي.
- Pickup branches/addresses.
- مناطق الخدمة.
- أوقات الاستلام المفضلة.
- ملاحظات تشغيلية داخلية.

### الإعدادات المالية
- Settlement cycle.
- Payout method.
- Bank/Wallet details بشكل آمن.
- Pricing profile.
- VAT/Tax treatment حسب الإعدادات.
- Credit limit إن كان النظام سيدعمه.

---

# 65) P1 — التاجر قد يملك عدة فروع وعدة مستخدمين

لا تربط Merchant برقم هاتف واحد فقط.

## Merchant Branches

لكل فرع:
- branch_id.
- name.
- contact_name.
- phone.
- governorate_id.
- area_id.
- address.
- latitude/longitude.
- pickup instructions.
- active.

## Merchant Users

قد يكون للتاجر:
- Owner.
- Operations user.
- Accountant.
- Viewer.

يجب أن تكون بوابة التاجر مرتبطة بـMerchant Users وليس رقم هاتف الجدول فقط.

---

# 66) P1 — كود التاجر الحالي BRN-* مربك

الظاهر في الصفحة أكواد مثل:

```text
BRN-001
```

BRN يوحي بـBranch وليس Merchant.

إذا الكيان هو التاجر استخدم naming واضح مثل:

```text
MRC-001
```

أو الاسم المعتمد في الـDomain.

أما الفروع فتستخدم:
```text
MBR-001
```
أو معرف داخلي مناسب.

الأهم عدم الخلط بين Merchant وBranch.

---

# 67) P1 — KPI "قيمة الأوردرات" غامض

لا نستخدم "قيمة الأوردرات" بدون تعريف.

يجب تحديد هل المقصود:
- إجمالي COD.
- إجمالي قيمة المنتجات.
- إجمالي إيراد الشحن من التاجر.
- GMV.

## الأفضل في صفحة التجار

KPIs مثل:
- التجار النشطون.
- شحنات التجار خلال الفترة.
- COD المحصل للتجار.
- مستحقات جاهزة للتسوية.
- تسويات تحت المراجعة.
- طلبات انضمام تنتظر القرار.

كل KPI بفترة زمنية واضحة وقابل للـDrill-down.

---

# 68) P1 — "طلبات التجار مراجعة" تحتاج تعريفًا دقيقًا

إذا المقصود طلبات انضمام التجار:
> طلبات انضمام تنتظر المراجعة

وتكون Clickable وتفتح صفحة Applications مفلترة.

إذا المقصود نوع آخر من الطلبات، يجب تسميته باسمه الحقيقي.

لا تستخدم Label مبهم.

---

# 69) P1 — نافذة "شحنات التاجر" الحالية ضعيفة

عرض 5 أرقام شحنات ثم زر "فتح صفحة الشحنات" ليس Merchant Analytics حقيقيًا.

## المطلوب

داخل Merchant 360:

- إجمالي الشحنات.
- حسب الحالة.
- آخر الشحنات.
- المتأخر.
- المرتجع.
- delivered rate.
- COD.
- date filter.

ثم:
> عرض كل الشحنات

يفتح `/shipments` بنفس merchant_id والفترة الحالية.

وأي Shipment row يفتح Shipment Drawer الموحد.

---

# 70) P1 — التواصل مع التاجر يجب أن يكون متوافقًا مع مركز الشات

## المشكلة الحالية

Modal منفصل يعرض الهاتف وزر WhatsApp/نسخ الرقم.

هذا يجعل التواصل منفصلًا عن Chat module.

## المطلوب

الأكشن الأساسي:
> فتح المحادثة

ويفتح/ينشئ Conversation مع التاجر في مركز الشات.

يمكن توفير Secondary actions:
- نسخ الهاتف.
- اتصال.
- فتح WhatsApp إذا الشركة تعتمد قناة خارجية.

لكن WhatsApp ليس بديلًا للتواصل الموثق داخل النظام.

إذا استُخدم External Channel:
- لا ندعي أن الرسالة محفوظة داخل النظام إلا إذا عندنا Integration حقيقي.
- يمكن تسجيل `external_contact_started` Audit event فقط.

---

# 71) P1 — Merchant Account Status وOnboarding

يجب أن يكون للتاجر حالات واضحة، مثل:

```text
pending_onboarding
active
suspended
archived
```

وقد نحتاج:
```text
restricted
```
إذا كان هناك سبب مالي/تشغيلي.

## إيقاف التاجر

قبل الإيقاف يجب عرض:
- شحنات نشطة.
- طلبات استلام معلقة.
- مستحقات.
- تسويات قيد التنفيذ.
- مرتجعات غير مكتملة.

ويحدد النظام ما الذي سيُمنع:
- إنشاء شحنات جديدة.
- طلب استلام جديد.
- دخول البوابة.
- السحب/التسوية إذا كانت هناك حالة قانونية/مالية.

لا نحذف تاريخ التاجر.

---

# 72) P1 — التسعير جزء أساسي من ملف التاجر

Merchant 360 يجب أن يعرض Pricing Profile:

- أسعار حسب المحافظة/المنطقة.
- وزن/شرائح وزن إن كانت معتمدة.
- رسوم المرتجع.
- رسوم المحاولة الإضافية.
- Collection Fee.
- VAT.
- Special contract overrides.
- Effective from / to.

## قاعدة

الشحنة تحفظ Pricing Snapshot وقت الإنشاء/التأكيد حتى لا تتغير ماليتها لو تم تعديل تسعير التاجر لاحقًا.

---

# 73) P1 — Settlement Cycle وإعدادات الدفع

لكل تاجر يمكن أن يوجد:

- daily.
- weekly.
- biweekly.
- monthly.
- manual/contractual.

ويحدد:
- payout_method.
- bank account/wallet.
- minimum payout threshold عند الحاجة.
- settlement hold days إن وجدت.
- account verification status.

البيانات البنكية الحساسة لا تعرض كاملة لكل الأدوار.

---

# 74) P1 — مستندات التاجر

استخدام File Module الموحدة لـ:
- العقد.
- السجل التجاري.
- البطاقة الضريبية.
- إثبات الحساب البنكي.
- مستندات أخرى حسب الشركة.

لكل مستند:
- type.
- status.
- expiry إن وجد.
- verified_by.
- verified_at.

---

# 75) P1 — Search & Filters للتجار

البحث:
- اسم التاجر.
- الكود.
- الهاتف.
- البريد.

الفلاتر:
- الحالة.
- Account manager.
- Settlement cycle.
- Pricing profile.
- Has pending settlement.
- Has active shipments.
- Join date.
- Branch/governorate عند الحاجة.

---

# 76) P1 — Actions صفحة التجار

بدل 4 أيقونات غير مسماة:

```text
[ فتح ]
[ ⋮ ]
```

Menu:
- تعديل البيانات.
- فتح الشحنات.
- فتح المحادثة.
- عرض التسويات.
- إدارة الفروع.
- إدارة المستخدمين.
- إيقاف/إعادة تفعيل.
- أرشفة.

أي Action مالي كبير لا ينفذ من الـMenu مباشرة؛ يفتح التفاصيل المطلوبة.

---

# 77) P1 — Merchant dashboard drill-down

الضغط على:
- عدد الشحنات.
- المستحق.
- التسوية المعلقة.
- المرتجعات.

يجب أن يفتح التفاصيل الفعلية بنفس التاجر والفترة.

---

# 78) Backend Impact — Merchants

## Merchant resource

يدعم:
- code.
- trade_name.
- legal_name.
- status.
- primary_phone.
- email.
- tax_id / registration_no حسب الحاجة.
- settlement_cycle.
- payout_method.
- pricing_profile_id.
- account_manager_id.
- joined_at.

## Endpoints متوقعة

```text
GET    /api/v1/merchants
GET    /api/v1/merchants/{id}
PATCH  /api/v1/merchants/{id}

GET    /api/v1/merchants/{id}/summary
GET    /api/v1/merchants/{id}/shipments
GET    /api/v1/merchants/{id}/pickup-requests
GET    /api/v1/merchants/{id}/settlements
GET    /api/v1/merchants/{id}/returns

GET    /api/v1/merchants/{id}/branches
POST   /api/v1/merchants/{id}/branches
PATCH  /api/v1/merchant-branches/{branch_id}

GET    /api/v1/merchants/{id}/users
POST   /api/v1/merchants/{id}/users

GET    /api/v1/merchants/{id}/pricing
GET    /api/v1/merchants/{id}/documents

POST   /api/v1/merchants/{id}/suspend-preview
POST   /api/v1/merchants/{id}/suspend
POST   /api/v1/merchants/{id}/reactivate
POST   /api/v1/merchants/{id}/archive
```

## Settlement

لا يوجد endpoint من نوع:
`set merchant balance manually`.

Merchant Settlement يتم من Settlement Engine المبني على Ledger/Eligible Shipments.

المسارات النهائية تُدمج مع Backend Contract القائم بدون تكرار.

---

# 79) P0 — صفحة المستخدمين يجب أن تدير Staff Accounts فقط

## المشكلة الحالية

صفحة "المستخدمون والصلاحيات" تعرض في نفس القائمة:

- مدير النظام.
- مدير العمليات.
- محاسب.
- مندوب.
- تاجر.

هذا يخلط بين ثلاثة مفاهيم مختلفة:

1. موظفو شركة الشحن Internal Staff.
2. حساب المندوب المرتبط بكيان Driver.
3. مستخدمو التاجر المرتبطون بكيان Merchant.

## القرار

صفحة `/users` يجب أن تكون لإدارة مستخدمي شركة الشحن الداخليين فقط.

مثل:

- Super Admin / Owner.
- System Admin.
- Operations Manager.
- Dispatcher.
- Warehouse.
- Accountant.
- Customer Support.
- Auditor / Read-only عند الحاجة.

### المندوب

يُدار من Driver 360°، وحساب الدخول يكون linked auth account وليس Staff User ظاهر هنا كموظف.

### التاجر

يُدار من Merchant 360° / Merchant Users، وليس من Staff Users.

هذا يمنع:
- صلاحيات خاطئة.
- خلط حالات الحساب.
- إسناد Role داخلي لمندوب أو تاجر بالخطأ.
- تعقيد الـRBAC.

---

# 80) P0 — حالات المستخدم الحالية غير صحيحة لموظفي الشركة

## المشكلة

القائمة الحالية تحتوي:

- نشط.
- بانتظار المراجعة.
- موقوف.
- مرفوض.

"بانتظار المراجعة" و"مرفوض" مناسبتان أكثر لـMerchant Application / onboarding، وليس Staff Account.

## Staff Account Status المقترح

```text
invited
active
suspended
locked
archived
```

اختياري:
```text
pending_activation
```

### المعاني

- invited: تمت الدعوة ولم يكمل التفعيل.
- active: حساب عامل.
- suspended: موقوف إداريًا.
- locked: مقفول أمنيًا بسبب محاولات/سياسة أمان.
- archived: مستخدم سابق محفوظ للتاريخ.

لا Hard Delete لمستخدم له Audit history.

---

# 81) P0 — إضافة المستخدم لا تكون Email/Phone/Role فقط

## المطلوب

إضافة Staff User عن طريق Invitation flow.

### الحقول

- الاسم.
- البريد.
- الهاتف اختياري/إلزامي حسب السياسة.
- Role أو Roles.
- Scope:
  - كل الشركة.
  - فرع.
  - مخزن.
  - منطقة تشغيل.
- Job title اختياري.
- لغة المستخدم.
- Require MFA حسب الدور.

### بعد الإنشاء

- إرسال دعوة.
- المستخدم يحدد كلمة المرور بنفسه.
- تفعيل MFA إذا كان مطلوبًا.
- لا يقوم Admin بإنشاء Password ثابت للمستخدم.

---

# 82) P0 — الصلاحيات الحالية ليست مجرد Permission Chips

## المشكلة

عرض raw permission keys مثل:

```text
drivers.manage
shipments.updateStatus
shipments.read
settlements.manage
```

مفيد للمطور لكنه ضعيف لصاحب الشركة وموظف الإدارة.

## المطلوب

صفحة Roles & Permissions حقيقية.

### Tabs

1. المستخدمون.
2. الأدوار.
3. مراجعة الصلاحيات / Access Review.

### Role card

يعرض:

- اسم الدور.
- وصف وظيفي.
- عدد المستخدمين.
- مستوى الحساسية.
- هل System Role أم Custom Role.

ثم Permission Matrix مفهومة:

| الوحدة | عرض | إنشاء | تعديل | اعتماد | مالي | تصدير | إدارة |
|---|---|---|---|---|---|---|---|

الوحدات مثل:

- الشحنات.
- مركز العمليات.
- المناديب.
- التجار.
- المحاسبة.
- التسويات.
- التقارير.
- المستخدمون.
- الإعدادات.
- Audit Log.

Raw keys يمكن عرضها في Advanced/Developer details فقط.

---

# 83) P0 — منع صلاحية "shipments.updateStatus" العامة

متوافقًا مع قرار الـDomain:

لا نعطي أي Role صلاحية عامة لتغيير Status لأي قيمة.

بدلًا منها تكون Permissions مرتبطة بأفعال/Transitions:

```text
shipments.assign_driver
shipments.confirm_intake
driver_updates.review
driver_updates.approve
driver_updates.reject
returns.receive
returns.assign_back_to_merchant
exceptions.create
```

والـBackend يتحقق من Allowed Transition حسب الحالة الحالية.

---

# 84) P0 — فصل الصلاحيات المالية الحساسة

لا نستخدم Permission عامة مثل:

```text
settlements.manage
```

للعمليات الحساسة.

تفصل إلى:

```text
settlements.read
settlements.prepare
settlements.review
settlements.approve
settlements.pay

remittances.read
remittances.reconcile
remittances.approve

journal.read
journal.create
journal.post
journal.reverse

accounting.period_close
accounting.period_reopen
```

هذا يسمح بـSegregation of Duties.

---

# 85) P1 — User 360° / Access Details

كل Staff User يحتاج صفحة/Drawer تفاصيل.

يعرض:

- الاسم.
- البريد.
- الهاتف.
- الحالة.
- الدور/الأدوار.
- Scope.
- آخر تسجيل دخول.
- آخر نشاط.
- الجلسات النشطة.
- الأجهزة.
- MFA status.
- Password changed at.
- Failed login attempts.
- Permissions effective.
- Audit events.

Actions:

- تعديل الملف.
- تغيير Role.
- تغيير Scope.
- إرسال Reset Access.
- إنهاء كل الجلسات.
- تعليق الحساب.
- إعادة التفعيل.
- أرشفة.

---

# 86) P1 — تعديل الدور يحتاج Impact Preview

تغيير Role من "محاسب" إلى "مدير النظام" لا يجب أن يكون مجرد Select + Save.

قبل حفظ تغيير كبير:

> سيتم منح المستخدم صلاحيات مالية وإدارية إضافية.

يعرض أهم Permissions الجديدة/المفقودة.

للأدوار الحساسة قد نطلب:
- MFA.
- سبب التغيير.
- Approval إضافي عند الحاجة.

ويسجل Audit كامل.

---

# 87) P1 — Scope-based Access

الـRole وحده لا يكفي في شركة متعددة الفروع/المخازن.

مثال:

مدير مخزن القاهرة لا يجب أن يرى أو يدير مخزن الإسكندرية إذا لم تكن صلاحياته عالمية.

يدعم الحساب:

```text
scope_type:
tenant
branch
warehouse
region
```

مع IDs مرتبطة.

الـBackend يطبق Scope في Query authorization، وليس Frontend فقط.

---

# 88) P1 — Access Review

وجود KPI "طلبات مراجعة" فكرة جيدة، لكن يجب تعريفها.

## المطلوب

تبويب Access Review يعرض:

- مستخدمون بصلاحيات عالية.
- مستخدمون لم يسجلوا دخولًا منذ مدة.
- حسابات موظفين موقوفين/غادروا الشركة.
- أدوار حساسة تحتاج مراجعة دورية.
- حسابات بدون MFA عندما يكون مطلوبًا.
- تغييرات Role حديثة.
- Sessions مشبوهة.

ويتيح:
- Approve access.
- Reduce access.
- Suspend.
- Require MFA.
- End sessions.

---

# 89) P1 — KPI "أحداث حرجة" يجب أن يفتح Security/Audit Events

لا يكون رقمًا فقط.

أمثلة:

- محاولات دخول فاشلة كثيرة.
- Role escalation.
- تعطيل MFA.
- Reopen accounting period.
- تغيير صلاحية مالية حساسة.
- Login من جهاز/مكان جديد إذا طبقناها.

الضغط يفتح Audit/Security events مفلترة.

---

# 90) P1 — Actions الصف لا تكون أيقونات غامضة فقط

بدل أيقونتين صغيرتين:

```text
[ فتح ]
[ ⋮ ]
```

Menu:

- تعديل بيانات المستخدم.
- إدارة الدور والنطاق.
- إعادة تعيين الوصول.
- إنهاء الجلسات.
- تعليق.
- أرشفة.

---

# 91) P1 — لا تغيير Password يدوي للمستخدم

نفس قاعدة المناديب:

Admin لا يكتب كلمة سر جديدة.

يستخدم:
> Reset access / Send reset link

مع خيارات:
- invalidate sessions.
- force password change.
- require MFA.

---

# 92) P1 — MFA للأدوار الحساسة

إلزام MFA على الأقل للأدوار:

- System Admin.
- Management/Owner.
- Accounting roles ذات approve/pay/post.
- Users management.
- Period close/reopen.

ويظهر في جدول المستخدمين Badge:

- MFA مفعل.
- MFA مطلوب.
- MFA غير مفعل.

---

# 93) P1 — Last Seen وSession Status

"آخر ظهور" جيد، لكن يجب التفريق:

- last_login_at.
- last_activity_at.
- active_sessions_count.

المستخدم الذي "لم يسجل الدخول" يظهر كـInvited/Pending activation وليس مجرد آخر ظهور فارغ.

---

# 94) P1 — حماية Super Admin

لا يسمح للمستخدم أن:

- يسحب آخر Super Admin من النظام.
- يوقف نفسه إذا كان سيترك Tenant بدون Admin.
- يخفض صلاحيات آخر Owner/Admin بدون Transfer واضح.
- يحذف/يؤرشف حسابه بنفسه من هذا السياق.

---

# 95) Backend Impact — Identity & RBAC

## Staff Users

```text
GET    /api/v1/staff-users
POST   /api/v1/staff-users/invitations
GET    /api/v1/staff-users/{id}
PATCH  /api/v1/staff-users/{id}

POST   /api/v1/staff-users/{id}/reset-access
POST   /api/v1/staff-users/{id}/suspend
POST   /api/v1/staff-users/{id}/reactivate
POST   /api/v1/staff-users/{id}/archive

GET    /api/v1/staff-users/{id}/sessions
DELETE /api/v1/staff-users/{id}/sessions
GET    /api/v1/staff-users/{id}/audit-log
```

## Roles

```text
GET    /api/v1/roles
GET    /api/v1/roles/{id}
POST   /api/v1/roles
PATCH  /api/v1/roles/{id}
GET    /api/v1/permissions
```

System roles يمكن أن تكون immutable جزئيًا.

## Access

تغيير Role/Scope يجب أن يسجل:

- actor.
- before.
- after.
- reason إن لزم.
- timestamp.
- tenant.

## مهم

Driver auth accounts وMerchant users لا يتم خلطهم مع Staff Users في endpoint/list واحد إلا في Identity layer داخلية غير معروضة كإدارة موحدة في الـUI.

المسارات النهائية تراجع مع Backend Contract القائم لمنع التكرار.

---

# 96) P0 — إصلاح شامل لكل صادرات Excel / CSV في النظام

## المشكلة الحالية

ملفات CSV التي يتم تصديرها من لوحة التحكم تفتح في Microsoft Excel كعمود واحد بدل أعمدة منفصلة.

المثال الظاهر في تصدير قيود الأستاذ العام:

```text
القيد,التاريخ,الحساب,الوصف,مدين,دائن,الحالة
```

يظهر كاملًا داخل الخلية A1، وكذلك كل Record يظهر داخل خلية واحدة.

## السبب المرجح

التصدير الحالي يعتمد CSV بفاصل comma `,` بينما Microsoft Excel على بعض إعدادات Windows/Regional Settings العربية يتوقع List Separator مختلفًا، غالبًا semicolon `;`.

بما أن النص العربي ظاهر سليم في الصورة، فالمشكلة الأساسية الحالية هي Parsing/Delimiter وليست تلف Encoding فقط، مع ضرورة تأمين UTF-8 أيضًا لكل الصادرات.

## القرار

لا نعالج كل صفحة بتصدير مخصص.

يتم إنشاء **Export Service / Export Utility موحدة** يستخدمها النظام كله.

كل Export Action في:
- الشحنات.
- التقارير.
- المحاسبة.
- الأستاذ العام.
- التسويات.
- توريدات المناديب.
- التجار.
- المناديب.
- المستخدمون.
- Audit Log.
- أي Export مستقبلي.

يستخدم نفس القواعد ونفس اختبارات الجودة.

---

# 97) P0 — Excel للمستخدم النهائي يكون XLSX حقيقيًا

إذا الزر في الـUI اسمه:

> تصدير Excel

فيجب أن ينتج ملف:

```text
.xlsx
```

حقيقي، وليس CSV باسم أو تجربة Excel.

## XLSX المطلوب

- أعمدة منفصلة صحيحة.
- Unicode/Arabic سليم.
- اتجاه الورقة RTL للملفات العربية.
- Header row واضحة.
- Freeze top row.
- Auto filter.
- عرض أعمدة مناسب.
- تنسيق الأرقام كأرقام وليس Text.
- تنسيق المبالغ كعملة/رقم.
- تنسيق التواريخ كتواريخ.
- أرقام الهواتف وأكواد التتبع تبقى Text حتى لا تضيع الأصفار الأولى أو تتحول Scientific notation.
- أسماء Sheets واضحة.
- عدم دمج خلايا البيانات.
- عدم وضع JSON أو comma-separated text داخل خلية واحدة.

## مثال لقيود الأستاذ

الأعمدة:

```text
رقم القيد
التاريخ
الحساب
الوصف
مدين
دائن
الحالة
```

كل قيمة في Cell منفصلة فعلًا.

---

# 98) P1 — CSV يظل خيارًا منفصلًا للتكاملات

إذا احتجنا CSV للتكامل أو الاستيراد/التحليل:

الزر يسمى صراحة:

> تصدير CSV

ولا يسمى Excel.

## CSV Rules

- UTF-8.
- UTF-8 BOM لتحسين توافق Excel مع العربية.
- Escape صحيح للقيم التي تحتوي على:
  - comma.
  - semicolon.
  - quote.
  - newline.
- Quote escaping حسب RFC-compatible CSV behavior.
- line endings متوافقة.
- عدم الاعتماد على regional separator بشكل عشوائي.

## دعم Excel المحلي

يمكن اعتماد أحد مسارين بعد فحص المشروع:

### المسار المفضل
تصدير XLSX للمستخدم البشري، وبذلك نتجنب اعتماد Excel على List Separator.

### CSV عند الحاجة
إما:
- استخدام separator مناسب واضح.
- أو دعم خيار delimiter.
- أو استخدام `sep=;` فقط إذا ثبت أنه مطلوب في السيناريو المستهدف.

لكن لا نبني تجربة المستخدم الأساسية على CSV الذي يختلف تفسيره حسب Regional Settings.

---

# 99) P0 — مراجعة كل Export موجود حاليًا

عند استلام فولدر الداشبورد يجب البحث على مستوى المشروع عن:

```text
CSV
csv
Excel
xlsx
export
download
Blob
URL.createObjectURL
text/csv
application/vnd
```

ثم إنشاء Inventory بكل Export Action.

لكل Export نسجل:

- الصفحة.
- اسم الزر.
- نوع الملف الحالي.
- اسم الملف.
- encoding.
- delimiter.
- الأعمدة.
- مصدر البيانات.
- هل يحترم الفلاتر الحالية؟
- هل يحترم الصلاحيات؟
- هل يصدر البيانات كلها أم الصفحة الحالية فقط؟
- هل المبالغ والتواريخ أنواع صحيحة؟
- هل RTL/Arabic سليم؟

---

# 100) P1 — قواعد أسماء الملفات

أسماء الملفات تكون واضحة ولا تعتمد على أسماء عربية مشوهة أو غير متسقة.

أمثلة:

```text
general-ledger-2026-06.xlsx
merchant-settlements-2026-06.xlsx
driver-remittances-2026-06.xlsx
shipments-2026-08-17.xlsx
drivers-performance-2026-08.xlsx
```

ويمكن إضافة اسم الشركة/الفرع عند الحاجة.

---

# 101) P1 — التصدير يجب أن يحترم الفلاتر الحالية

مثال:

إذا تقرير المناديب مضبوط على:
- آخر 7 أيام.
- محافظة القاهرة.
- مندوب معين.

فـExport يجب أن يصدر **نفس النتيجة الحالية**، وليس كل بيانات النظام.

قبل التصدير يمكن أن يظهر:

```text
سيتم تصدير 428 سجلًا
الفترة: 10–17 أغسطس 2026
المحافظة: القاهرة
```

للملفات الكبيرة، Backend Job/Export Queue أفضل من تجميد المتصفح.

---

# 102) P1 — حماية البيانات في الصادرات

كل Export يخضع لنفس:
- Tenant isolation.
- RBAC.
- Scope.
- Field-level security.

أمثلة:
- موظف العمليات لا يحصل على بيانات بنكية للتاجر.
- Support لا يحصل على قيود مالية حساسة إذا ليست لديه صلاحية.
- Driver export لا يحتوي Password hashes أو Tokens أو بيانات أمنية.
- المستخدم لا يستطيع تغيير query في Frontend والحصول على بيانات Tenant آخر.

---

# 103) P1 — Audit لكل Export حساس

التصديرات الحساسة يجب تسجيلها في Audit Log:

- exported_by.
- export_type.
- filters.
- row_count.
- created_at.
- file_id/job_id عند وجود ملف مولد.
- tenant_id.

خصوصًا:
- الأستاذ العام.
- التسويات.
- التحصيلات.
- بيانات التجار.
- بيانات المستخدمين.

---

# 104) P0 — اختبارات قبول إلزامية للتصدير

قبل Frontend Freeze / Production يجب اختبار كل Export رئيسي على Microsoft Excel فعلًا.

## Test Matrix

- Windows + Excel.
- Arabic data.
- English data.
- قيم تحتوي commas.
- قيم تحتوي quotes.
- multiline notes.
- أرقام هواتف تبدأ بـ0.
- Tracking IDs مثل SHP-0001.
- مبالغ كبيرة.
- أرقام عشرية.
- تواريخ.
- Empty values.

## النجاح المطلوب

- لا يوجد ملف يفتح في Column A فقط.
- العربية لا تظهر garbled.
- لا تضيع الأصفار الأولى.
- لا تتحول الأكواد إلى Scientific notation.
- المبالغ قابلة للجمع في Excel كأرقام.
- التاريخ قابل للفرز كـDate.
- كل Header في Column منفصلة.
- التصدير مطابق للفلاتر الحالية.

---

# 105) Backend Impact — Export Module موحد

بعد تثبيت الـFrontend، يفضل أن يدعم الـBackend Export Jobs للملفات الكبيرة والحساسة.

شكل مبدئي:

```text
POST /api/v1/exports
GET  /api/v1/exports/{id}
GET  /api/v1/exports/{id}/download
```

Request مثال:

```json
{
  "resource": "general_ledger",
  "format": "xlsx",
  "filters": {
    "period": "2026-06",
    "status": "posted"
  }
}
```

الـBackend:
- يعيد تطبيق Authorization.
- لا يثق في Columns/tenant_id من العميل.
- يولد الملف.
- يخزنه مؤقتًا في Object Storage.
- يوفر Signed download URL أو Download endpoint.
- يسجل Audit.
- يحذف الملف بعد Retention period محددة.

للبيانات الصغيرة يمكن أن يبقى Client-side export إذا كان آمنًا، لكن يجب استخدام نفس Column definitions/format rules.

---

# 106) Definition of Done — Export Quality

لا تعتبر ميزة Export مكتملة إلا بعد:

- جرد كل أزرار التصدير.
- توحيد Export utility/service.
- Excel buttons تنتج XLSX حقيقي.
- CSV buttons تنتج CSV صحيح ومعلن بوضوح.
- UTF-8/Arabic verified.
- Excel opening verified.
- Filters verified.
- Permissions verified.
- Sensitive exports audited.
- Large exports لا تجمد المتصفح.


