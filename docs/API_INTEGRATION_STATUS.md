# EduBridge Dashboard — API Integration Status

## Runtime contract

- Local API: `http://alpha.edubridge.test:8000/api/v1`
- Production: set `NEXT_PUBLIC_API_BASE_URL` only; no API URL is hardcoded in page components.
- Login: `POST /dashboard/auth/login`
- Login body contains only `email`, `password`, stable browser installation `device_id`, and optional `device_name`.
- `school_code` and `app_type` are not sent in the login body.
- Role and exact permissions are loaded from `GET /auth/me`.
- Bearer token is added by the central API client.
- A 401 clears the session and sends the app back to Login.
- Request timeout defaults to 15 seconds.

## Connected modules

| Screen / capability | Source | Status |
|---|---|---|
| Login / session restore / logout | Auth APIs | Connected |
| Device sessions | Auth APIs | Connected |
| Overview | `/admin/dashboard/summary` | Connected |
| Global search | `/admin/search` | Connected |
| Academic structure | Academic APIs | Connected |
| Students / parents | People APIs | Connected |
| Teachers | People APIs | Connected |
| Medical excuses | Operations APIs | Connected |
| Behavior review | Dashboard behavior APIs + actions | Connected |
| Leave permits | Dashboard leave APIs + actions | Connected |
| Schedules / conflict check | Dashboard schedule APIs | Connected |
| Calendar | Dashboard calendar APIs | Connected |
| Assessments / grade actions / exports | Dashboard assessments APIs | Connected |
| Finance / invoices / payments / discounts / refunds | Dashboard finance APIs | Connected |
| Transport routes / passengers / events / alerts | Dashboard transport APIs | Connected |
| Broadcasts | Dashboard broadcasts APIs | Connected |
| School settings / integrations | Dashboard settings APIs | Connected |
| RBAC / admin accounts / audit logs | Dashboard admin APIs | Connected |
| Configurator canvas | Dashboard canvas config APIs | Connected |

## Deliberately not fabricated

The current backend Student resource does not expose a per-student cumulative academic score, cumulative attendance percentage, or a computed risk score. The frontend therefore shows these values as unavailable while using a live API session instead of deriving fake values from demo data.

The dashboard currently has aggregate attendance in `/admin/dashboard/summary`, but no dashboard endpoint that returns today's per-student attendance rows. The detailed attendance table is therefore not fabricated in live mode.

Historical parent-summons and teacher-substitution list endpoints are not registered in the current dashboard routes. Creation actions are connected, but historical list data is not invented.

## Local setup

Add to Windows hosts:

```text
127.0.0.1 alpha.edubridge.test
```

Run Laravel on port 8000 and the dashboard normally with Next.js. If the tenant/domain changes, update only `NEXT_PUBLIC_API_BASE_URL`.
