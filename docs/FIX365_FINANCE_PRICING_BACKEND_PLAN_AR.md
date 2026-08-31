# خطة التسعير والربحية والمصاريف في FIX 365

هذا المستند يشرح التعديل المطلوب في الباك إند حتى تعمل شاشة الإعدادات والمحاسبة والتقارير بنفس منطق شركة الشحن الفعلي.

## ١. الفكرة

كل محافظة يجب أن يكون لها سعران:

- سعر التاجر: المبلغ الذي تحاسب به الشركة التاجر على الشحنة.
- تكلفة المندوب: المبلغ المستحق للمندوب مقابل توصيل نفس الشحنة.

الفرق بينهما هو ربح الشحن قبل المصاريف التشغيلية.

## ٢. جداول مقترحة

### `governorate_rates`

- `id`
- `tenant_id`
- `governorate`
- `merchant_delivery_fee_minor`
- `driver_delivery_cost_minor`
- `return_fee_minor`
- `estimated_days`
- `is_active`
- `effective_from`
- `created_at`
- `updated_at`

### `merchant_specific_rates`

اتفاقات خاصة لتاجر محدد داخل محافظة محددة، وتسبق السعر العام للمحافظة عند الحساب.

- `id`
- `tenant_id`
- `merchant_id`
- `governorate`
- `merchant_delivery_fee_minor`
- `driver_delivery_cost_minor`
- `return_fee_minor`
- `effective_from`
- `active`
- `created_at`
- `updated_at`

### `weight_tiers`

شرائح الوزن الزائد. تطبق بعد السعر الأساسي للمحافظة أو السعر الخاص للتاجر.

- `id`
- `tenant_id`
- `from_kg`
- `to_kg`
- `merchant_extra_fee_minor`
- `driver_extra_cost_minor`
- `created_at`
- `updated_at`

### `shipment_pricing_snapshots`

يحفظ نسخة السعر وقت إنشاء الشحنة حتى لا تتغير التسويات القديمة عند تعديل أسعار المحافظات.

- `id`
- `shipment_id`
- `merchant_delivery_fee_minor`
- `driver_delivery_cost_minor`
- `gross_shipping_profit_minor`
- `return_fee_minor`
- `pricing_version`
- `created_at`

### `operational_expenses`

- `id`
- `tenant_id`
- `expense_date`
- `category`: `rent | utilities | salaries | fuel | maintenance | packaging | marketing | software | other`
- `description`
- `amount_minor`
- `payment_method`: `cash | bank | wallet`
- `status`: `pending | approved`
- `created_by_user_id`
- `created_at`
- `updated_at`

### `driver_financial_adjustments`

- `id`
- `tenant_id`
- `driver_id`
- `adjustment_date`
- `type`: `bonus | deduction | reimbursement | advance`
- `amount_minor`
- `description`
- `status`: `pending | approved`
- `created_by_user_id`
- `created_at`
- `updated_at`

## ٣. API المطلوبة

تم توثيقها في `contracts/openapi.yaml`:

- `GET /api/v1/finance/operational-expenses`
- `POST /api/v1/finance/operational-expenses`
- `POST /api/v1/finance/operational-expenses/{expense}/review`
- `GET /api/v1/finance/driver-adjustments`
- `POST /api/v1/finance/driver-adjustments`
- `POST /api/v1/finance/driver-adjustments/{adjustment}/review`
- `GET/PUT` إعدادات التسعير يجب أن تدعم `governorate_rates`.
- `GET/PUT` إعدادات التسعير يجب أن تدعم أيضا `merchant_specific_rates` و`weight_tiers`.

## ٤. قواعد الحساب

عند إنشاء شحنة:

1. يبحث الباك إند عن المحافظة في `governorate_rates`.
2. إذا وجد اتفاق خاص في `merchant_specific_rates` لنفس التاجر والمحافظة، يستخدمه بدل السعر العام.
3. إذا كان الوزن أكبر من الوزن الأساسي، يضيف شريحة الوزن المناسبة من `weight_tiers`.
4. يحفظ `merchant_delivery_fee_minor` كسعر الشحن للتاجر.
5. يحفظ `driver_delivery_cost_minor` كتكلفة المندوب.
6. يحفظ `gross_shipping_profit_minor = merchant_delivery_fee_minor - driver_delivery_cost_minor`.

عند تسليم الشحنة:

- مستحق التاجر = التحصيل من العميل ناقص سعر الشحن والخصومات والمرتجع إن وجد.
- تكلفة المندوب تظهر في تقارير الربحية وحساب المندوب.
- ربح الشركة من الشحن = سعر التاجر ناقص تكلفة المندوب.

عند تسجيل مصروف تشغيلي:

- يبدأ غالبا بحالة `pending`.
- لا يخصم من صافي التشغيل إلا بعد الاعتماد.
- عند `approved` يتم ترحيل القيد.
- عند `rejected` أو `cancelled` يتم إلغاء أثره المالي.

عند تسجيل حركة مندوب:

- `bonus`, `reimbursement`, `advance` تعامل كتكلفة أو مبلغ مدفوع للمندوب.
- `deduction` تقلل مستحقات المندوب.
- كل حركة تظهر في كشف حساب المندوب وتدخل في التقارير حسب تاريخها.
- يجب أن تمر بنفس دورة المراجعة: `pending -> approved | rejected | cancelled`.

## ٥. انعكاسه في اللوحة

- الإعدادات: تاب أسعار المحافظات يحدد سعر التاجر وتكلفة المندوب وربح الشحنة.
- التقارير: تاب المبيعات والربحية يعرض إيراد الشحن، تكلفة المناديب، ربح الشحن، المصاريف، وصافي التشغيل.
- المحاسبة: تاب المصاريف والمدفوعات يسجل المصاريف وحركات المناديب.
- كشوف الحساب: يمكن فلترة حساب تاجر أو مندوب بفترة وتحديد هل المديونية محسوبة على المسلّم فقط أو كل العمليات.
