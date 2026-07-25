# Deliver It Dashboard

لوحة تحكم React + TypeScript + Vite لشركة شحن متعددة الشركات، تعمل حاليًا عبر Mock Gateway موحد وقابلة للاستبدال لاحقًا بـAPI Gateway.

## التشغيل المحلي

```bash
npm ci
npm run dev
```

## فحوص الجودة

```bash
npm run lint
npm run test:run
npm run build
```

## أهم المسارات

- `/operations`: اعتماد تحديثات المناديب وإدارة دورة المرتجعات.
- `/shipments`: الشحنات، تقسيمات البوليصة، العناصر وإثبات التسليم.
- `/settings`: إعدادات التوصيل والرسوم والضرائب والإثبات وموقع المندوب.
- `/reports`: مؤشرات التسليم الجزئي والتشغيل.

## الوثائق

- `docs/FRONTEND_FREEZE_AR.md`
- `docs/BACKEND_HANDOFF_READINESS_AR.md`
- `docs/POLICY_WORKFLOWS_UPDATE_AR.md`

## نقطة استبدال الـBackend

```text
src/infrastructure/delivery/gateway.ts
```

استبدل `mockDeliveryGateway` بـ`apiDeliveryGateway` مع الحفاظ على العقد الموجود في:

```text
src/application/delivery/contracts.ts
```
