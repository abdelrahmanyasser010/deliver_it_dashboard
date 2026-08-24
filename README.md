# Deliver It Dashboard

Production-oriented React/Vite dashboard connected to the Deliver It Laravel API.

## Local setup

```bash
cp .env.example .env.local
npm ci
npm run build
npm run test:run
```

Set `VITE_API_BASE_URL` to the API origin. Production must use HTTPS and a real tenant/API origin.

## Production verification

```bash
python3 scripts/verify_dashboard_production.py
npm ci
npm run build
npm run lint
npm run test:run
```

The contract snapshot used for integration is `contracts/openapi.yaml`.
No mock gateway or demo data source is used by the runtime application.
