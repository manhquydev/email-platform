# UI/UX Audit - Ephemeral Detail `/e/:token`

## Scope
- `services/web/src/pages/EphemeralInbox.tsx`
- `services/web/src/pages/ephemeral-inbox-modules/ephemeral-message-list.tsx`
- `services/web/src/index.css` (`.email-content` rules)

## 1) UX Issues (Severity)

### High
1. Fixed-height container (`h-[600px] lg:h-[700px]`) gây thiếu linh hoạt theo viewport thực tế; trên màn thấp dễ cắt nội dung/scroll khó đoán.
2. Luồng mobile list/detail đang dựa vào overlay full-screen, tăng rủi ro chồng lớp + khó kiểm soát state/history.
3. `ephemeral-message-list.tsx` đang monolithic (nhiều concern trong 1 file), làm chậm iteration UI và tăng regression risk.
4. Email content render trực tiếp cùng layout app (không tách sandbox/isolated context), nội dung HTML phức tạp vẫn có thể tạo edge-case đọc kém.

### Medium
1. Header top bar + inbox card + list header cộng dồn chiều cao lớn trên mobile, làm giảm vùng đọc chính.
2. Mật độ thông tin message row chưa tối ưu: preview dài bị truncate cứng, khó quét nhanh với mail dài tiếng Việt.
3. Panel desktop chưa có read-width constraint rõ ràng cho đoạn văn dài (fatigue khi đọc).
4. Attachments ở ephemeral detail chỉ hiển thị chip text, thiếu affordance tải/xem.
5. Action hierarchy chưa rõ: `Tạo mới`, `+1h`, `Share` cùng visual weight ở vùng đầu.

### Low
1. Nhiều icon-button thiếu label semantics rõ (a11y + discoverability).
2. Spacing/token giữa mobile và desktop chưa nhất quán tuyệt đối.
3. Time/refresh info hiển thị raw, chưa ưu tiên readability (relative + secondary tone).

## 2) Desktop Upgrade Proposal

1. **Layout hierarchy**
- Chuyển sang 2-pane ổn định: list pane cố định + detail pane fluid.
- Detail pane dùng read-container max width ~760-820px để tăng tốc độ đọc.

2. **Information architecture**
- Header detail sticky (subject + sender + time + actions).
- Body tách rõ: content block, attachments block, meta block.

3. **Typography/readability**
- Subject: 24/30, semibold.
- Metadata: 12-13, muted.
- Body: 16/26, readable line-height.
- Long tables/code: giữ horizontal scroll cục bộ, không đẩy layout.

4. **Visual rhythm**
- Scale spacing: 12/16/24/32 consistent.
- Border+surface contrast nhẹ cho glass theme, giảm nhiễu glow trong vùng đọc.

## 3) Mobile Upgrade Proposal

1. **Navigation/state model**
- Mobile nên là state-switch rõ: `list` hoặc `detail`, tránh cảm giác overlay đè nhiều lớp.
- Back action luôn ở vùng dễ chạm, top sticky.

2. **Header compaction**
- Thu gọn app header + inbox controls thành compact zone.
- Đẩy hành động phụ (share) vào menu overflow trên mobile.

3. **Detail readability**
- Subject + sender block ngắn gọn, body ưu tiên vertical flow.
- HTML/Text toggle giữ sticky trong detail nếu có cả 2 mode.

4. **Touch & interaction**
- Touch target tối thiểu 44px.
- Attachment row full-width tappable, icon + filename + size + chevron/download.

5. **Safe area**
- Áp dụng safe-area padding top/bottom ổn định cho detail màn hình nhỏ/notch.

## 4) Implement-Ready Guidelines (Component/Class Level)

1. `EphemeralMessageList` refactor thành modules:
- `ephemeral-message-list-pane.tsx`
- `ephemeral-message-detail-pane.tsx`
- `ephemeral-message-detail-mobile.tsx`
- `ephemeral-message-row.tsx`

2. Class-level recommendations:
- Main shell: `h-[calc(100dvh-var(--top-bars-height))]` thay fixed `600/700`.
- Desktop detail read container: `mx-auto w-full max-w-[780px] px-6 lg:px-8`.
- Sticky toolbars: `sticky top-0 z-20 backdrop-blur bg-[var(--nebula-surface)]/85 border-b border-white/10`.
- Message row hit area: `min-h-12 px-4 py-3` + rõ selected state.
- Attachment item: `w-full flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-white/10`.

3. Behavior guidelines:
- Mobile: khi mở detail, list unmount/hide hoàn toàn.
- Scroll ownership rõ: container ngoài không scroll khi detail mở.
- Email HTML chỉ scroll cục bộ trong content region.

4. Accessibility quick checklist:
- Icon button có `aria-label`.
- Focus ring rõ trên dark surface.
- Contrast text secondary >= AA.

## 5) Effort Estimate

### Quick wins (0.5-1.0 ngày)
- Tinh chỉnh spacing, typography, visual hierarchy, touch targets.
- Chuẩn hóa button priority và labels.
- Cải thiện attachments affordance.

### Medium (1.5-3 ngày)
- Tách list/detail mobile state rõ ràng.
- Sticky header/detail actions.
- Read-container + content rhythm desktop.

### Larger refactor (3-5 ngày)
- Modular hóa full message-detail UI (file split + shared primitives).
- Chuẩn hóa design tokens cho ephemeral flow riêng.
- Route/state architecture cho mobile detail (history + deep-link behavior).

## Suggested Execution Order
1. Quick wins visual + readability.
2. Mobile state model/list-detail cleanup.
3. Desktop read-layout optimization.
4. Modularization + regression pass.

## Unresolved Questions
1. Có yêu cầu hỗ trợ download attachment trong ephemeral detail ngay phase này không?
2. Mobile detail muốn giữ full-screen hay chuyển hẳn sang bottom-sheet pattern?
3. Có cần đồng bộ visual pattern này sang Inbox Viewer chính để tránh UX divergence không?
