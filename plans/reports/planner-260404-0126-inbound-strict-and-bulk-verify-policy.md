# Policy Decision - Inbound Strict Mode & Admin Bulk Verify

1. **Khuyến nghị #1 (Strict inbound): YES, fail-closed trong strict mode**: chỉ accept RCPT khi `domain=VERIFIED` và inbox đã tồn tại/active.
2. **Lý do chính**: giảm blast radius của dictionary attack, ngăn inbox sprawl vô hạn, giảm queue/storage pressure, predictable capacity khi production.
3. **Deliverability/reliability lợi ích**: reject sớm tại SMTP `550 5.1.1` thay vì nhận rồi fail ở worker => ít backpressure, ít poison job, observability rõ hơn.
4. **Tradeoff**: mất UX “send tới alias bất kỳ là auto có inbox”; onboarding cần bước pre-create inbox/alias.
5. **Cân bằng UX**: giữ chế độ `open/catch-all` như opt-in theo domain; mặc định production là `strict`.
6. **Khuyến nghị #2 (Admin bulk verify): NO bypass DNS ownership theo default**: bulk verify phải chạy cùng cơ chế DNS ownership check như single verify.
7. **Lý do chính**: bypass tạo lỗ hổng domain-ownership hijack nội bộ, sai trust model, tăng legal/compliance risk, làm audit khó defend.
8. **Tradeoff**: onboarding enterprise/domain migration chậm hơn do phụ thuộc DNS propagation, có thể tăng ticket hỗ trợ ngắn hạn.
9. **Cơ chế ngoại lệ**: nếu thật sự cần, tách thành `admin force-verify` riêng (không nằm trong bulk), bắt buộc reason + ticket ID + dual-approval + audit immutable + TTL.
10. **Migration step 1 (an toàn)**: thêm feature flags `INBOUND_RECIPIENT_MODE=open|strict` và `ADMIN_BULK_VERIFY_DNS_REQUIRED=true` + metric “would-reject” cho strict shadow mode.
11. **Migration step 2**: chạy shadow 1-2 tuần, thống kê recipient chưa pre-create theo domain, auto-suggest/backfill tạo inbox phổ biến trước khi flip.
12. **Migration step 3**: rollout strict theo canary (domain mới -> tenant mới -> toàn hệ thống), publish runbook + alert cho spike `550 unknown user`; đồng thời deprecate bulk-bypass và chỉ giữ emergency force-verify có kiểm soát.

## Unresolved questions
- Có cần cho phép allowlist domain/tenant được tạm giữ `open` lâu dài không, hay giới hạn theo thời gian (vd 30 ngày)?
- Dual-approval cho force-verify sẽ dùng RBAC hiện tại hay cần role riêng (Security Admin)?
