# API Backend Audit (Interim)
Date: 2026-04-08
Scope: `services/api/src` (route registration, handlers, middleware, validators, service layer)
Status: Interim summary (not 100% exhaustive endpoint-by-endpoint verification)

## 1) Mismatch quan trọng giữa route/code/docs

1. Auth statement trong README đang sai thực tế
- README: "All except `/health` require Authorization"
- Code có nhiều endpoint public ngoài `/health`: `/ready`, `/metrics`, `/public/inboxes`, `/api/public/inbox/*`, `/contact/sales`, `/webhooks/events`, `/webhooks/verify-signature`, `/telegram/webhook`, etc.

2. Public inbox routes bị lệch naming/docs
- README nêu `POST /public/inboxes`
- Code có cả `POST /public/inboxes` (file `public.ts`) và bộ endpoint khác dưới prefix `/api/public/inbox/*` (file `public-inbox.ts` + register prefix `/api`).

3. README "core messages" thiếu nhiều route đã có trong code
- Code có thêm: reply/forward/summarize/otp/phishing/category/move/archive/trash/flags/export, fuzzy search, etc.

4. OpenAPI không phản ánh thực tế codebase
- OpenAPI paths hiện chỉ cover một phần (`auth`, `inboxes`, `messages`, `webhooks`), trong khi route thực tế lớn hơn nhiều.

5. Route module tồn tại nhưng không được register (unreachable)
- Xác nhận rõ: `emailValidationRoutes` trong `routes/domains.ts` không được `app.register(...)`.
- Nhóm admin có file route riêng nhưng không nằm trong `routes/admin/index.ts`: `compliance`, `health`, `monitoring`, `migration`, `tenants`.

## 2) Điểm yếu bảo mật/logic nổi bật

1. Validation error dễ thành 500 do dùng `.parse()` trực tiếp
- Nhiều route dùng Zod `.parse()` (không `safeParse`/không catch) => input lỗi có thể thành 500 qua global error handler mặc định.
- Ảnh hưởng: response semantics sai (phải 400), log noise, khó quan sát lỗi thật.

2. `/webhooks/verify-signature` có crash vector do `timingSafeEqual`
- So sánh `Buffer` không check length trước => có thể throw khi signature malformed.
- Kết quả hiện tại: request xấu có thể làm endpoint trả 500 thay vì 400.

3. Authorization pattern không nhất quán
- Có chỗ dùng `app.requireAdmin`, có chỗ dùng `app.authenticate` + manual role check trong handler.
- Rủi ro: drift policy, dễ miss authz khi thêm route mới.

4. Feature/route unfinished nhưng nằm trong code chính
- `routes/upload.ts`: comment "assume static serving for now" + URL construction phụ thuộc env frontend var.
- `routes/organizations.ts`: luồng transfer ownership ghi rõ chưa implement.
- `services/outbound-delivery.ts`: TODO chưa cập nhật FAILED/BOUNCED state.

5. Build reliability issue (Windows)
- `services/api/package.json` script build dùng Unix-style env assignment: `NODE_OPTIONS=... tsc`.
- Trên Windows chạy lỗi ngay (`'NODE_OPTIONS' is not recognized...`).

## 3) Test coverage hiện trạng (nhóm endpoint chính)

Có test tương đối tốt:
- Auth: `auth.test.ts`, `auth-refresh.integration.test.ts`, `webauthn.test.ts`, `magic-link.test.ts`.
- Domains: `domain-endpoints.test.ts`, `domains.test.ts`, `admin-domains-bulk-verify.test.ts`.
- Inboxes/messages ownership/security: `inbox_ownership.test.ts`, `messages.security.test.ts`, `security/bola-fixes.test.ts`, `mail_flow.test.ts`.
- Public inbox read APIs: `public-inbox.test.ts`.

Thiếu/gap đáng chú ý:
- `abuse` routes chưa thấy test trực tiếp rõ ràng cho full CRUD/admin flow.
- Nhóm route unreachable (compliance/monitoring/migration/tenants, email validation routes) không có kiểm chứng runtime registration.
- Chưa có test contract kiểu snapshot route map để detect lệch docs/register.

## 4) Ưu tiên remediation (P0/P1/P2)

### P0 (làm ngay)
1. Chuẩn hóa validation error: thay `.parse()` -> `safeParse()` (hoặc wrapper chuẩn), trả 400 nhất quán.
2. Fix `/webhooks/verify-signature`: check length trước `timingSafeEqual`, trả 400 khi malformed.
3. Chốt policy auth/docs: cập nhật README + OpenAPI cho đúng public/protected surface hiện tại.

### P1 (ngắn hạn)
1. Dọn route registration:
- Quyết định giữ hay loại bỏ các module chưa register (`admin/compliance|health|monitoring|migration|tenants`, `emailValidationRoutes`).
- Nếu giữ: register + test + docs; nếu bỏ: xóa/đưa vào `_wip` rõ ràng.
2. Chuẩn hóa admin authz pattern: central preHandler thay vì manual role check rải rác.
3. Thêm test cho `abuse` routes và test runtime route inventory.

### P2 (trung hạn)
1. Route contract governance:
- Tạo CI check diff giữa route runtime map vs OpenAPI vs README.
2. Chuẩn response envelope (success/data/error/meta) cho các module chính.
3. Fix cross-platform scripts (`cross-env`) để build/test nhất quán môi trường.

## Unresolved questions
- Team muốn các route admin chưa register là intentionally staged hay là quên tích hợp?
- `emailValidationRoutes` có kế hoạch public/GA không, hay nên merge vào `domainRoutes` hoặc remove?
- Public surface mong muốn chính thức là `/public/*` hay `/api/public/*` (hay cả hai)?
- Chuẩn response schema mục tiêu toàn API là gì (envelope hay per-route tự do)?
