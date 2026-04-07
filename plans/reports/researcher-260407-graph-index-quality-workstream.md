# Research Report: Graph/Index Quality - email-platform

## Findings
- Baseline hiện tại (GitNexus index của `email-platform`):
  - `Route` tổng: **337**
  - Route thuộc `services/api/src/routes/`: **313**
  - Route ngoài `services/api/src/routes/`: **24**
  - Route trỏ vào test: `services/api/test/*` = **5**, `services/api/src/test/*` = **7**
  - Route trỏ vào mobile Expo pages: `services/mobile/app/*` = **11**
  - Route có `responseKeys` > 0: **0**
  - Route có `errorKeys` > 0: **0**
  - Route có `middleware` > 0: **0**
- `route_map`/`api_impact` đang trả handler sai domain cho API:
  - Ví dụ `/auth/login` trỏ vào test file thay vì API route thật.
  - Ví dụ `/inboxes` trỏ vào Expo screen file.
- `shape_check` hiện gần như vô dụng cho repo này:
  - `total=0`, `routesWithShapes=0` vì không có shape data.

## Root Causes
1. Bắt route quá rộng từ AST (`express_route`) nên dính test calls
- File target:
  - `C:/Users/manhquy/temp/GitNexus/gitnexus/src/core/ingestion/tree-sitter-queries.ts` (capture `@express_route` generic)
  - `C:/Users/manhquy/temp/GitNexus/gitnexus/src/core/ingestion/workers/parse-worker.ts` (đẩy vào `decoratorRoutes` nếu method/path hợp lệ)
- Tác động: Supertest `.get('/...')/.post('/...')` trong test bị index như Route definition.

2. Trộn Route domain giữa API và Expo filesystem routes
- File target:
  - `.../src/core/ingestion/pipeline.ts` (Phase 3.5 route registry tạo `Route` cho Expo file routes)
  - `.../src/core/ingestion/route-extractors/expo.ts`
- Tác động: `Route` node chứa cả mobile page route và API route; API tools không lọc domain.

3. Thiếu extractor cho Fastify response patterns
- File target:
  - `.../src/core/ingestion/route-extractors/response-shapes.ts`
- Hiện chỉ parse `.json(...)`; repo API dùng nhiều `reply.send(...)`, `reply.status(...).send(...)`, `return { ... }`.
- Tác động: `responseKeys/errorKeys` luôn rỗng.

4. Middleware extractor thiên về Next.js wrappers
- File target:
  - `.../src/core/ingestion/route-extractors/middleware.ts`
- Hiện parse kiểu `export const POST = withAuth(...)`, middleware.ts matcher.
- Repo API dùng Fastify `preHandler`, plugin hooks (`addHook`) nên không capture.

5. API tools chưa có filter semantic cho test/mobile handlers
- File target:
  - `.../src/mcp/local/local-backend.ts`
  - Hàm dùng chung `fetchRoutesWithConsumers()` cho `routeMap`, `shapeCheck`, `apiImpact`.
- `isTestFilePath()` đã có nhưng chưa áp vào các API tool queries.

## Implementation Phases (low-risk, incremental)
### Phase 0 - Baseline & guardrail (no behavior change)
- Việc làm:
  - Chốt dashboard query baseline trước/sau mỗi phase.
  - Chuẩn hóa workflow re-index.
- Command workflow:
```bash
cd D:/project/Clone/email-platform
npx gitnexus status
npx gitnexus analyze --force --skip-embeddings --skip-agents-md --verbose
```
- Acceptance:
  - Có snapshot baseline metrics (route pollution, shape coverage, middleware coverage).

### Phase 1 - Filter test-route pollution ở API tools (rủi ro thấp nhất)
- File target:
  - `.../src/mcp/local/local-backend.ts`
- Việc làm:
  - Bổ sung filter mặc định loại test handlers trong `fetchRoutesWithConsumers` cho `routeMap/shapeCheck/apiImpact`.
  - Cho phép opt-in `includeTests=true` (backward-compatible).
- Acceptance/KPI:
  - `/auth/login` không còn map vào test file ở `route_map/api_impact`.
  - `test-route ratio` trong output API tools: từ ~3.6% (12/337) xuống **0% mặc định**.

### Phase 2 - Tách domain API routes vs Expo screen routes
- File target:
  - `.../src/core/ingestion/pipeline.ts`
  - `.../src/core/ingestion/route-extractors/expo.ts`
  - `.../src/mcp/local/local-backend.ts`
- Việc làm:
  - Gắn metadata route type/source rõ ràng (vd: `api`, `expo-screen`, `nextjs`, `laravel`, ...).
  - API tools mặc định chỉ lấy `api` route type.
- Acceptance/KPI:
  - `/inboxes` không còn trả handler Expo ở API tools.
  - `non-api handler ratio` trong API tools: từ ~3.3% (11/337) xuống **0% mặc định**.

### Phase 3 - Nâng extractor response shape cho Fastify
- File target:
  - `.../src/core/ingestion/route-extractors/response-shapes.ts`
  - (nếu cần wiring) `.../src/core/ingestion/pipeline.ts`
- Việc làm:
  - Parse thêm patterns:
    - `reply.send({ ... })`
    - `reply.status(code).send({ ... })`
    - `return { ... }` trong handler.
  - Heuristic phân loại success/error theo status code hoặc key semantics (`error`, `message`, `code`).
- Acceptance/KPI:
  - `Route có responseKeys hoặc errorKeys` tăng từ **0** lên tối thiểu **40% API routes** (mốc đầu).
  - `shape_check.routesWithShapes` > 0 và có giá trị dùng được.

### Phase 4 - Middleware extraction cho Fastify
- File target:
  - `.../src/core/ingestion/route-extractors/middleware.ts`
  - `.../src/core/ingestion/pipeline.ts`
- Việc làm:
  - Parse route options (`preHandler`, `onRequest`, `preValidation`) từ `app.route({...})`, `fastify.get(path, opts, handler)`.
  - Parse hook-level (`addHook`) với scope plugin/file để enrich middleware chain.
- Acceptance/KPI:
  - `Route có middleware` tăng từ **0** lên tối thiểu **20% API routes** (mốc đầu).
  - `api_impact` hiển thị middleware hữu dụng ở top routes có auth/rate-limit.

### Phase 5 - Tăng độ tin cậy shape_check attribution
- File target:
  - `.../src/mcp/local/local-backend.ts`
  - (có thể cần enrich reason) `.../src/core/ingestion/pipeline.ts`
- Việc làm:
  - Thu hẹp accessed-keys theo callsite/function scope thay vì file-global regex khi 1 file fetch nhiều routes.
  - Giữ cờ confidence (`high/low`) nhưng giảm false mismatch.
- Acceptance/KPI:
  - Tỷ lệ mismatch confidence thấp giảm rõ rệt (đặt target: giảm >=50% trên sample 20 route có consumer).

## Risks
- Parser heuristic tăng complexity, dễ false positive mới nếu không có fixture tests đầy đủ.
- Bổ sung route-type/filter có thể làm lệch behavior user đang dựa vào mixed routes.
- `return {}` extraction có thể bắt nhầm object không phải HTTP response nếu thiếu context handler.
- Re-index full nhiều lần tốn thời gian; cần quy trình baseline cố định để so sánh đúng.

## Validation Checklist
- Re-index sau mỗi phase:
```bash
cd D:/project/Clone/email-platform
npx gitnexus analyze --force --skip-embeddings --skip-agents-md --verbose
```
- Query kiểm định KPI (Cypher):
```cypher
MATCH (r:Route) RETURN count(r) AS total;
MATCH (r:Route) WHERE r.filePath CONTAINS 'services/api/src/routes/' RETURN count(r) AS api_routes;
MATCH (r:Route) WHERE r.filePath CONTAINS 'services/api/test/' OR r.filePath CONTAINS 'services/api/src/test/' RETURN count(r) AS test_routes;
MATCH (r:Route) WHERE r.filePath CONTAINS 'services/mobile/app/' RETURN count(r) AS mobile_routes;
MATCH (r:Route) WHERE r.responseKeys IS NOT NULL AND size(r.responseKeys) > 0 RETURN count(r) AS routes_with_response_keys;
MATCH (r:Route) WHERE r.errorKeys IS NOT NULL AND size(r.errorKeys) > 0 RETURN count(r) AS routes_with_error_keys;
MATCH (r:Route) WHERE r.middleware IS NOT NULL AND size(r.middleware) > 0 RETURN count(r) AS routes_with_middleware;
```
- Tool-level sanity:
  - `route_map` cho `/auth/login`, `/inboxes`, `/v1/health`.
  - `shape_check` toàn repo + route cụ thể.
  - `api_impact` với route auth/inboxes để kiểm tra handler + middleware + shape.

## Unresolved Questions
- Có cần giữ Expo screen routes dưới label `Route` cho use-case non-API, hay tách node label riêng (vd `ScreenRoute`)?
- Có chấp nhận breaking nhẹ ở `route_map` default behavior (lọc test/mobile) hay cần flag preserve legacy?
- Fastify middleware scope mong muốn: chỉ route-level (`preHandler`) hay bao gồm plugin/global hooks (`addHook`) với mức confidence?
- KPI target cuối cùng cho `shape_check` muốn theo coverage (%) hay theo utility (số mismatch actionable đã xác minh)?
