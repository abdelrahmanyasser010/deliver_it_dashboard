#!/usr/bin/env python3
from __future__ import annotations
import pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / 'src'
OPENAPI = ROOT / 'contracts' / 'openapi.yaml'
errors: list[str] = []
checks = 0

def ok(condition: bool, message: str):
    global checks
    checks += 1
    if not condition:
        errors.append(message)

# Production/runtime residue.
source_text = '\n'.join(p.read_text(encoding='utf-8', errors='ignore') for p in SRC.rglob('*') if p.suffix in {'.ts','.tsx'})
ok(not re.search(r"mockDeliveryGateway|MockLogisticsRepository|reduceDeliveryCommand", source_text), 'legacy mock runtime reference found')
ok(not re.search(r"NEXT_PUBLIC_|EduBridge", source_text), 'legacy Next/EduBridge runtime configuration found')
ok("/api/v1/drivers/${command.driverId}/archive" in source_text, 'driver archive is not wired to the archive endpoint')
ok("/api/v1/drivers/${command.driverId}/reactivate" in source_text, 'driver reactivate is not wired to the reactivate endpoint')
ok("/api/v1/drivers/${command.driverId}/suspend" in source_text, 'driver suspend is not wired to the suspend endpoint')
ok('logout_all_devices: command.invalidateSessions' in source_text, 'driver reset-access does not use logout_all_devices')
ok('complete_current_tasks' in source_text and 'withdraw_and_reassign' in source_text and 'immediate_stop' in source_text, 'driver suspension policies are not aligned with the API contract')
ok("loadBranches()" in source_text and "loadZones()" in source_text, 'driver master data is not loaded from backend branches/zones')
ok('availableAreas' not in source_text, 'hard-coded driver service areas still exist')
ok("ref={inputRef}" in source_text and "[open]" in source_text, 'global-search stable focus lifecycle guard is missing')

# Production config.
prod_env = (ROOT / '.env.production.example').read_text(encoding='utf-8')
ok('VITE_API_BASE_URL=https://' in prod_env, 'production API base URL template must be HTTPS')
config = (SRC / 'infrastructure/api/config.ts').read_text(encoding='utf-8')
ok("VITE_API_BASE_URL is required in production" in config, 'production API config is not fail-closed')

# Relative import existence.
for f in list(SRC.rglob('*.ts')) + list(SRC.rglob('*.tsx')) + list((ROOT/'tests').rglob('*.ts')) + list((ROOT/'tests').rglob('*.tsx')):
    text = f.read_text(encoding='utf-8', errors='ignore')
    for m in re.finditer(r"(?:from\s+|import\s*\()(['\"])(\.[^'\"]+)\1", text):
        rel = m.group(2); base = f.parent / rel
        candidates = [base, pathlib.Path(str(base)+'.ts'), pathlib.Path(str(base)+'.tsx'), pathlib.Path(str(base)+'.js'), pathlib.Path(str(base)+'.jsx'), base/'index.ts', base/'index.tsx']
        if not any(c.exists() for c in candidates): errors.append(f'broken relative import: {f.relative_to(ROOT)} -> {rel}')
checks += 1

# API path coverage. This intentionally verifies every literal path shape; the few
# dynamic terminal action segments are separately guarded above or below.
openapi_text = OPENAPI.read_text(encoding='utf-8')
paths = {m.group(1): True for m in re.finditer(r'^  (/api/v1/[^:]+):\s*$', openapi_text, flags=re.MULTILINE)}
patterns: list[tuple[re.Pattern[str], str]] = []
for p in paths:
    parts = p.strip('/').split('/')
    rgx = '^/' + '/'.join('[^/]+' if x.startswith('{') and x.endswith('}') else re.escape(x) for x in parts) + '$'
    patterns.append((re.compile(rgx), p))

literal_refs: set[str] = set()
for f in SRC.rglob('*'):
    if f.suffix not in {'.ts','.tsx'}: continue
    text = f.read_text(encoding='utf-8', errors='ignore')
    for m in re.finditer(r"([`'\"])(/api/v1/.*?)(?<!\\)\1", text):
        raw = m.group(2).split('?')[0]
        # Expressions that choose the final operation are validated explicitly.
        if '${endpoint}' in raw or '${suffix}' in raw or '${decision}' in raw or "${reactivate" in raw:
            continue
        concrete = re.sub(r'\$\{[^}]+\}', 'WILDCARD', raw)
        literal_refs.add(raw)
        if not any(rx.fullmatch(concrete) for rx, _ in patterns): errors.append(f'API path absent from OpenAPI: {raw}')
checks += 1

# Dynamic actions used by the dashboard must all exist in OpenAPI.
for p in [
    '/api/v1/conversations/{conversation}/close','/api/v1/conversations/{conversation}/reopen',
    '/api/v1/return-cases/{returnCase}/receive-at-hub','/api/v1/return-cases/{returnCase}/mark-out-for-merchant',
    '/api/v1/merchant-applications/{application}/approve','/api/v1/merchant-applications/{application}/reject',
    '/api/v1/staff-users/{user}/suspend','/api/v1/staff-users/{user}/reactivate',
]:
    ok(p in paths, f'dynamic dashboard endpoint missing from OpenAPI: {p}')

if errors:
    print('DASHBOARD PRODUCTION VERIFICATION FAILED')
    for e in errors: print('FAIL ', e)
    print(f'checks={checks} api_literal_refs={len(literal_refs)} errors={len(errors)}')
    sys.exit(1)
print(f'DASHBOARD PRODUCTION VERIFICATION PASSED checks={checks} api_literal_refs={len(literal_refs)}')
