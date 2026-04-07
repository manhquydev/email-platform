# GitNexus Graph Quality Track - Implementation Report

## Scope Delivered
- Added API-only query set: `scripts/gitnexus/api-route-validation-queries.json`.
- Added execution script: `scripts/gitnexus/run-graph-quality-baseline.cjs`.
- Added runbook/checklist: `docs/operations/runbooks/gitnexus-graph-index-quality-validation.md`.
- Ran baseline once and captured artifacts in `plans/reports/`.

## Sample Run
Command:
```powershell
node scripts/gitnexus/run-graph-quality-baseline.cjs --repo email-platform
```

Generated artifacts:
- `plans/reports/gitnexus-graph-quality-baseline-20260407-232903.json`
- `plans/reports/gitnexus-graph-quality-baseline-20260407-232903.md`

KPI snapshot:
- `totalRoutes`: 337
- `apiRoutes`: 313
- `pollutedTest`: 12
- `pollutedMobile`: 11
- `responseKeysCoveragePct`: 0
- `middlewareCoveragePct`: 0

## Observations
- Route graph có contamination ngoài API handlers chuẩn (`services/api/src/routes/`), chủ yếu từ test + mobile paths.
- Metadata extraction coverage cho `responseKeys` và `middleware` hiện 0% trên API route nodes.
- Query `polluted_handlers_by_file` đã chỉ ra file nguồn nhiễu để triage ngay.

## Operational Notes
- Script không sửa index/tool internals; chỉ đọc graph qua `npx gitnexus cypher`.
- Query set tách riêng để tái sử dụng cho CI hoặc scheduled check.

## Decisions Applied
1. Coverage gate tạm thời cho sprint này: `>= 70%` cho `responseKeys` và `middleware`.
2. Theo dõi contamination bắt buộc cho `test/mobile`; mở rộng sang `services/extension/*` và `services/web/*` sẽ làm ở wave sau.
3. Bổ sung `--strict` mode để script trả exit code `1` khi KPI vi phạm ngưỡng.
