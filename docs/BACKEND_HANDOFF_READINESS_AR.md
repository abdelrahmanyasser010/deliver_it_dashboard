# جاهزية تسليم الـFrontend للـBackend

## المبدأ

الواجهة تقرأ **Read Models** وتنفذ التغييرات عبر **Commands**. لا يجب أن تكتب الواجهة مباشرة في جداول قاعدة البيانات، حتى لو كان تنفيذ الـBackend يستخدم جداول داخلية.

```text
UI → DeliveryGateway → API Command/Query → Domain/Application → Database
                         ↓
                    Read Model / Event
                         ↓
                         UI
```

---

## استبدال الـMock

أنشئ:

```text
src/infrastructure/delivery/apiDeliveryGateway.ts
```

ويطبق:

```ts
interface DeliveryGateway {
  load(): Promise<DeliveryState>;
  execute(command: DeliveryCommand): Promise<GatewayCommandResponse>;
}
```

ثم عدل ملفًا واحدًا:

```text
src/infrastructure/delivery/gateway.ts
```

إلى:

```ts
export const deliveryGateway = apiDeliveryGateway;
```

### استراتيجية الاستجابة المفضلة

للأوامر الصغيرة، يعيد السيرفر Projection محدثة أو الكيانات المتأثرة:

```json
{
  "result": { "ok": true, "message": "تم تعيين المندوب" },
  "projection": { "...": "DeliveryState أو Read Model مناسبة" }
}
```

إذا كانت الـProjection كبيرة، يعيد:

```json
{
  "result": { "ok": true, "message": "تم تنفيذ العملية" },
  "refresh": true
}
```

ثم تستدعي الواجهة Query جديدة.

لا يستخدم `applyLocally` إلا في Mock Gateway.

---

## تقسيم الـBackend المقترح

### Logistics

- Shipments.
- Shipment Events.
- Delivery Attempts.
- Pickup Tasks.
- Barcode Intake Batches.
- Delivery Assignment Batches.
- Driver Updates.
- Returns.

### Fleet

- Drivers.
- Availability.
- Capacity and active load.
- Shifts.
- Vehicles.
- Cash custody summaries.

### Merchants

- Merchant profile.
- Branches.
- Pricing rules.
- Settlement configuration.
- Merchant users/integrations لاحقًا.

### Finance

- Collections.
- Remittances.
- Discrepancies.
- Settlements and lines.
- Ledger entries.
- Closed periods.

### Communication

- Chat rooms/messages.
- Internal notes.
- Assignments.
- Attachments.
- Notifications.

### Identity and Access

- Users.
- Roles.
- Permissions.
- Authentication.
- Sessions.
- Audit actor identity.

طلبات انضمام التجار والمستخدمون الحاليون يمكن نقلهم إلى Identity/Onboarding Service مستقل، ولا يجب دمج كلمات المرور مع كيان المندوب التشغيلي.

---

## Queries المقترحة

```text
GET /workspace/bootstrap
GET /shipments
GET /shipments/{id}
GET /drivers
GET /drivers/{id}
GET /merchants
GET /merchants/{id}
GET /pickup-tasks
GET /delivery-batches
GET /driver-updates
GET /exceptions
GET /barcode-batches/{id}
GET /settlements
GET /settlements/{id}
GET /ledger
GET /reports/operations
GET /reports/drivers
GET /reports/governorates
GET /chat/rooms
GET /audit-events
```

`/workspace/bootstrap` يمكن أن يعيد الـRead Models اللازمة لأول تحميل. لاحقًا يفضل Pagination وQueries مستقلة عندما يكبر حجم البيانات.

---

## Commands المقترحة

```text
POST /commands/shipments/assign-driver
POST /commands/shipments/transition
POST /commands/shipments/delivery-attempt
POST /commands/shipments/import
POST /commands/shipments/request-settlement
POST /commands/pickup-tasks/{id}/review
POST /commands/pickup-tasks/{id}/approve
POST /commands/delivery-batches/{id}/assign
POST /commands/driver-updates/{id}/approve
POST /commands/driver-updates/{id}/reject
POST /commands/barcode-batches
POST /commands/barcode-batches/{id}/scan
POST /commands/barcode-batches/{id}/undo
POST /commands/barcode-batches/{id}/close
POST /commands/exceptions/{shipmentId}/resolve
POST /commands/drivers
PATCH /commands/drivers/{id}
DELETE /commands/drivers/{id}
PATCH /commands/merchants/{id}
POST /commands/settlements
POST /commands/settlements/{id}/approve
POST /commands/settlements/{id}/pay
POST /commands/finance/reconcile-shipment
POST /commands/ledger/post
POST /commands/periods/{period}/close
POST /commands/chat/{roomId}/messages
POST /commands/chat/{roomId}/transfer
POST /commands/chat/{roomId}/toggle
POST /commands/chat/{roomId}/read
```

الأسماء النهائية يمكن أن تكون REST أو RPC، لكن يجب الحفاظ على دلالة الأمر وعدم استخدام Update عام يسمح بتجاوز الـWorkflow.

---

## شكل القوائم والفلاتر

مثال:

```text
GET /shipments?page=1&pageSize=50
  &query=010...
  &status=inTransit
  &taskStatus=needsCustomerService
  &financialStatus=discrepancy
  &merchantId=MER-001
  &driverId=DRV-001
  &governorate=Cairo
  &priority=urgent
  &createdFrom=2026-07-01
  &createdTo=2026-07-20
  &sort=-lastUpdatedAt
```

الاستجابة:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 50,
  "total": 340,
  "facets": {
    "status": {},
    "governorates": {},
    "merchants": {}
  }
}
```

الـSaved Views وتخصيص الأعمدة تفضيلات مستخدم ويمكن حفظها عبر User Preferences API.

---

## التزامن ومنع التعارض

يوجد `version` داخل الشحنة. يفضل استخدام Optimistic Concurrency:

```http
If-Match: "shipment-version-12"
```

أو إرسال:

```json
{
  "shipmentId": "SHP-0001",
  "expectedVersion": 12
}
```

وعند التعارض:

```http
409 Conflict
```

```json
{
  "code": "VERSION_CONFLICT",
  "message": "تم تعديل الشحنة بواسطة مستخدم آخر",
  "currentVersion": 13
}
```

العمليات المالية وإغلاق الدفعات يجب أن تنفذ داخل Database Transactions.

---

## Envelope الأخطاء

```json
{
  "ok": false,
  "code": "INVALID_TRANSITION",
  "message": "لا يمكن نقل الشحنة من في الطريق إلى وصلت المكتب",
  "errors": [
    { "entityId": "SHP-0001", "field": "status", "message": "انتقال غير مسموح" }
  ],
  "traceId": "..."
}
```

للعمليات الجماعية يمكن أن تكون الاستجابة ناجحة جزئيًا:

```json
{
  "ok": true,
  "message": "تم تحديث 8 شحنات وتعذر تحديث شحنتين",
  "succeededIds": ["..."],
  "errors": [
    { "entityId": "SHP-0009", "message": "سعة المندوب مكتملة" }
  ]
}
```

---

## Events والتحديث الفوري

الأحداث المقترحة:

```text
ShipmentCreated
ShipmentStatusChanged
ShipmentAssignedToDriver
DeliveryAttemptRecorded
PickupTaskApproved
BarcodeBatchClosed
DriverUpdateSubmitted
DriverUpdateApproved
CollectionRecorded
RemittanceReconciled
SettlementCreated
SettlementApproved
SettlementPaid
ExceptionResolved
ChatMessageCreated
```

تصل الواجهة عبر WebSocket/SSE لتحديث الـRead Models دون Reload كامل.

---

## الأمان

- Authentication حقيقي باستخدام HttpOnly secure cookies أو آلية معتمدة.
- Authorization على السيرفر لكل Query وCommand.
- لا يعتمد السيرفر على إخفاء عنصر القائمة.
- فصل الصلاحيات المالية والتشغيلية.
- Audit Log غير قابل للتعديل للمستخدم العادي.
- تشفير البيانات الحساسة ومراجع الحسابات البنكية.
- Signed URLs للمرفقات.
- Rate limits للبحث والاستيراد والرسائل.

---

## الجداول الأولية المتوقعة

هذه أسماء تصورية وليست إلزامًا للتنفيذ:

```text
shipments
shipment_events
delivery_attempts
pickup_tasks
pickup_task_items
delivery_batches
delivery_batch_shipments
barcode_batches
barcode_batch_scans
drivers
driver_shifts
driver_updates
merchants
merchant_branches
pricing_rules
cash_collections
driver_remittances
cash_discrepancies
merchant_settlements
settlement_lines
ledger_entries
financial_periods
chat_rooms
chat_messages
audit_events
users
roles
permissions
user_preferences
```

الـDashboard والتقارير تقرأ من Read Models أو Views محسنة، وليس بالضرورة من عمليات Join مباشرة لكل طلب.

---

## خطوات الربط لاحقًا

1. بناء API Contracts من أنواع `DeliveryState` و`DeliveryCommand`.
2. تنفيذ قواعد الـWorkflow في الـBackend واستخدام اختبارات الواجهة كأمثلة قبول.
3. تنفيذ `apiDeliveryGateway`.
4. إزالة تخزين `DeliveryState` من `localStorage` والإبقاء على Preferences فقط.
5. ربط Authentication واستبدال Role Switcher بالمستخدم الحقيقي.
6. إضافة Pagination وCaching وWebSocket.
7. ربط Media/Location/Push services.
8. تشغيل Contract Tests وE2E على بيئة Staging.

بعد هذه الخطوات لا يفترض تغيير هيكل الصفحات أو تدفقات المنتج إلا إذا تغيرت قواعد العمل نفسها.
