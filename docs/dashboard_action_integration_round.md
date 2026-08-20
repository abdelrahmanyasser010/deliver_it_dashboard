# EduBridge Dashboard Live Integration Status

## Closed In Frontend

The dashboard now uses live backend APIs for all dashboard contracts currently available to dashboard tokens:

- Authentication, dashboard identity, summary, device sessions, and notifications.
- Academic structure, sections, subjects, teachers, students, and parents.
- Behavior notes list and actions.
- Medical excuses, parent summons, leave permits, teacher substitutions when a live `teaching_session_id` exists.
- Schedules list and conflict check.
- Calendar events list/create/update/delete.
- Assessments list plus approve/publish/lock actions.
- Dashboard grade entry editing through `PUT /dashboard/assessments/{assessment}/grades`.
- Dashboard grade-sheet export through `POST /dashboard/assessments/{assessment}/exports` and `GET /dashboard/reports/exports/{export}`.
- Finance summary, invoices, payments, discounts, refunds, and finance create/cancel/archive/refund actions.
- Transport dashboard summary/routes/passengers/events, route create/update/archive, route assignment create/update/archive, delay alert, and driver-contact log.
- School settings, integrations test, audit logs.
- RBAC roles, permissions, matrix, admin-account create/role/status actions.
- Broadcast list/create/send/schedule/cancel/deliveries.
- Configurator canvas load/save through dashboard canvas configs.

## Newly Closed Backend Gaps

The following previously missing backend items were verified in the backend routes and wired in the frontend:

- Transport write management:
  - `POST /api/v1/dashboard/transport/routes`
  - `PATCH /api/v1/dashboard/transport/routes/{route}`
  - `DELETE /api/v1/dashboard/transport/routes/{route}`
  - `POST /api/v1/dashboard/transport/routes/{route}/assignments`
  - `PATCH /api/v1/dashboard/transport/routes/{route}/assignments/{assignment}`
  - `DELETE /api/v1/dashboard/transport/routes/{route}/assignments/{assignment}`
- Grade edit/export:
  - `PUT /api/v1/dashboard/assessments/{assessment}/grades`
  - `POST /api/v1/dashboard/assessments/{assessment}/exports`
  - `GET /api/v1/dashboard/reports/exports/{export}`
- Finance refunds:
  - `POST /api/v1/dashboard/finance/payments/{payment}/refunds`
  - `GET /api/v1/dashboard/finance/refunds`

## Runtime Fallback Rules

- Local fallback remains only when there is no dashboard token.
- Local/demo rows without numeric backend ids do not call APIs.
- The frontend does not call undocumented endpoints.
- Login uses `email`, `password`, `device_id`, and `device_name` only.
- `device_id` is created once with `crypto.randomUUID()` and stored locally.
- Browser fingerprinting is not used.

## Current Backend Gap Result

No blocking backend gaps remain for the dashboard integration round.

The backend status file is:

`D:\android tog\edubridge_backend\docs\api\dashboard\FRONTEND_REMAINING_BACKEND_GAPS.md`

## Verification

`npm run build` completed successfully after wiring this round.
