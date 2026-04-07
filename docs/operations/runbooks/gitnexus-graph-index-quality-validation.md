# GitNexus Graph/Index Quality Validation Runbook

## Mục tiêu
Chuẩn hóa kiểm tra chất lượng graph index của GitNexus cho API routes, phát hiện sớm contamination (test/mobile handlers) và thiếu metadata (`responseKeys`, `middleware`).

## Phạm vi
- Repo: `email-platform`
- API-only filter: `services/api/src/routes/`
- Query set chuẩn: `scripts/gitnexus/api-route-validation-queries.json`
- Execution script: `scripts/gitnexus/run-graph-quality-baseline.cjs`

## KPI bắt buộc
- `total_route_nodes`: tổng số Route nodes.
- `api_route_nodes`: số Route nodes thuộc API handlers chuẩn.
- `polluted_test_route_handlers`: số Route nodes trỏ vào test files.
- `polluted_mobile_route_handlers`: số Route nodes trỏ vào mobile files.
- `api_routes_with_response_keys`: số API routes có `responseKeys`.
- `api_routes_with_middleware`: số API routes có `middleware`.
- `responseKeysCoveragePct = api_routes_with_response_keys / api_route_nodes * 100`.
- `middlewareCoveragePct = api_routes_with_middleware / api_route_nodes * 100`.

## Cách chạy
```powershell
node scripts/gitnexus/run-graph-quality-baseline.cjs --repo email-platform
```

Chạy với gate cứng (fail exit code nếu vi phạm ngưỡng):
```powershell
node scripts/gitnexus/run-graph-quality-baseline.cjs --repo email-platform --strict
```

## Output
Script sẽ tạo 2 file trong `plans/reports/`:
- `gitnexus-graph-quality-baseline-YYYYMMDD-HHMMSS.json`
- `gitnexus-graph-quality-baseline-YYYYMMDD-HHMMSS.md`

## Checklist vận hành định kỳ
1. Chạy script baseline.
2. Xác nhận `api_route_nodes > 0`.
3. Kiểm tra contamination:
   - `polluted_test_route_handlers == 0`
   - `polluted_mobile_route_handlers == 0`
4. Kiểm tra coverage:
   - `responseKeysCoveragePct >= 70` (sprint hiện tại)
   - `middlewareCoveragePct >= 70` (sprint hiện tại)
5. Nếu fail, mở bảng `polluted_handlers_by_file` trong markdown output để triage nguồn nhiễu.
6. Lưu report snapshot vào `plans/reports/` (không ghi đè report cũ).

## Triage nhanh khi fail
- Contamination tăng: kiểm tra `filePath` ngoài `services/api/src/routes/` trong query `polluted_handlers_by_file`.
- `responseKeys`/`middleware` coverage thấp: kiểm tra extractor/index pipeline, re-analyze index, rồi chạy lại baseline.
- Nếu index stale: chạy `npx gitnexus analyze` trước khi đo lại.
