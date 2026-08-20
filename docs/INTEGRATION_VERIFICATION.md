# EduBridge Dashboard — Integration Verification

## Result

The dashboard source has been wired to the current EduBridge Laravel dashboard APIs through one centralized client. Live authenticated mode no longer falls back to demo records when an API-backed value is unavailable.

## Connected runtime

- Local base URL: `http://alpha.edubridge.test:8000/api/v1`
- Environment variable: `NEXT_PUBLIC_API_BASE_URL`
- Timeout variable: `NEXT_PUBLIC_API_TIMEOUT_MS`
- Login: `POST /dashboard/auth/login`
- Session identity: `GET /auth/me`
- Tenant: resolved from the API host/subdomain.
- Login does not send `school_code` or `app_type`.
- `device_id` is a stable installation UUID generated once in the browser; it is not a hardware identifier or browser fingerprint.
- Bearer authentication is injected by `lib/dashboardApi.ts`.
- HTTP 401 clears the local session and returns the UI to Login.
- HTTP/validation/network errors are normalized centrally.

## Connected dashboard areas

- Authentication, session restore, logout, device sessions
- Dashboard overview and global search
- Academic structure and create actions used by the current UI
- Students, parents, teachers and relationships used by the current UI
- Medical excuses, behavior workflow, leave permits, summons creation and teacher substitution creation
- Schedule reads and conflict check
- Calendar events
- Assessments, grade editing and export requests
- Finance summary, invoices, payments, discounts and refunds
- Transport summary, routes, passengers, events, delay alerts and driver-contact logs
- Notifications and broadcasts used by the current dashboard UI
- School settings and integration settings
- Audit logs, RBAC matrix and dashboard admin accounts
- Configurator canvas persistence

## Permissions

The fake frontend role switcher was removed. The UI now loads the current role and permissions from `/auth/me`. Navigation and route access are filtered using server-provided permissions. The backend remains the final authorization authority.

## Live-data policy

When authenticated against the API, the dashboard does not substitute demo data for a failed or missing API response. Unsupported data is shown as unavailable/empty instead of as a fabricated school metric.

Known backend data gaps affecting the existing UI:

1. The current dashboard student resource does not provide cumulative academic score, cumulative attendance percentage or a computed risk score.
2. The dashboard has aggregate attendance in `/admin/dashboard/summary`, but does not expose a dashboard per-student attendance list for today's detailed table.
3. A historical dashboard list endpoint for parent summons is not registered; summons creation is connected.
4. A historical dashboard list endpoint for teacher substitutions is not registered; substitution creation is connected when a real teaching session is available.

## Local host setup

Add the following line to the Windows hosts file:

```text
127.0.0.1 alpha.edubridge.test
```

Run Laravel on port 8000. The included `.env.local` points the dashboard to:

```text
http://alpha.edubridge.test:8000/api/v1
```

For deployment, change `NEXT_PUBLIC_API_BASE_URL` to the production tenant API host.

## Static verification performed in this workspace

- Reviewed the current Laravel `routes/api.php` used as the backend integration reference.
- Compared the dashboard API-client paths to the corresponding dashboard/auth/academic/people/operations routes.
- Re-ran TypeScript/TSX syntax transpilation with TypeScript 5.8.3 across 29 source `.ts/.tsx` files (excluding declaration files): **0 syntax errors**.
- Searched the active UI for the removed fake academic-term switcher and fake admin phone state: no active leftovers.

## Build limitation in this workspace

A full `tsc --noEmit` / Next.js production build could not be completed here because the uploaded dashboard did not include a complete installable `node_modules`, and the sandbox did not have all npm packages/type-definition tarballs available offline (`@types/node`, `@types/react`, `@types/react-dom`).

This is not recorded as a successful production build. On the development machine run:

```bash
npm ci
npm run build
npm run dev
```

Any resulting type/build error should be fixed before deployment.

## Files added/changed

Added:

- `.env.example`
- `.env.local`
- `components/DashboardAuthGate.tsx`
- `docs/API_INTEGRATION_STATUS.md`
- `docs/INTEGRATION_VERIFICATION.md`

Main changed files:

- `lib/dashboardApi.ts`
- `context/DashboardContext.tsx`
- `app/login/page.tsx`
- `app/layout.tsx`
- dashboard pages for overview, students, teachers, attendance, grades, schedule, operations/messages, finance, transport, analytics and settings
- `components/Header.tsx`
- `components/Sidebar.tsx`
- `components/OperationsModal.tsx`
- `components/StudentProfileModal.tsx`
- `README.md`

## Verdict

`DASHBOARD_API_INTEGRATION_CONNECTED_WITH_BUILD_PENDING`

The frontend integration layer and existing dashboard screens are connected to the current backend contract. A final dependency install + Next production build + browser E2E run against the user's live local MySQL tenant environment remains required before calling the artifact production-verified.
