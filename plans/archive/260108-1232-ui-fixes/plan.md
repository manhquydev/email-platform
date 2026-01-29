# Kế Hoạch Fix UI - Ephemera Email Platform

**Ngày tạo:** 2026-01-08 | **Ưu tiên:** P1 | **Effort:** 3-4 ngày

## Tổng Quan

Dựa trên kết quả UI test tại https://app.manhquy.click/, kế hoạch này bao gồm fix cho:
- **Trang công khai:** Landing, Login, Register, Pricing
- **Trang nội bộ (sau đăng nhập):** Dashboard, Settings, InboxManager, InboxViewer

## Phân Tích Cấu Trúc Frontend

```
services/web/src/pages/
├── LandingPage.tsx      # Trang chủ
├── Login.tsx            # Đăng nhập
├── Register.tsx         # Đăng ký
├── Pricing.tsx          # Bảng giá
├── Dashboard.tsx        # Dashboard chính (797 LOC)
├── Settings.tsx         # Cài đặt
├── InboxManager.tsx     # Quản lý hộp thư (767 LOC)
├── InboxViewer.tsx      # Xem inbox công khai
├── MyDomains.tsx        # Quản lý domain
└── FocusDashboard.tsx   # Dashboard tập trung
```

---

## Phase 1: Critical Fixes (P0) - 1 ngày

### 1.1 Thêm Focus States cho tất cả elements tương tác

**File:** `services/web/src/index.css` hoặc `tailwind.config.js`

**Vấn đề:** Không có focus outline, keyboard users không thể navigate

**Fix:**
```css
/* Global focus styles */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  ring: 2px;
  ring-color: rgba(37, 37, 244, 0.5);
}
```

**Files cần update:**
- [ ] `services/web/src/index.css`
- [ ] `services/web/src/components/ui/Button.tsx`
- [ ] `services/web/src/components/ui/Input.tsx`

### 1.2 Fix Form Validation Feedback

**Files:** `Login.tsx`, `Register.tsx`

**Vấn đề:** Không hiển thị lỗi inline khi validation fail

**Fix:**
- Thêm error state và message cho mỗi field
- Hiển thị error message dưới input khi có lỗi
- Thêm aria-invalid và aria-describedby cho accessibility

```tsx
// Pattern cần áp dụng
<div className="space-y-1">
  <Input
    type="email"
    aria-invalid={errors.email ? "true" : "false"}
    aria-describedby={errors.email ? "email-error" : undefined}
    className={errors.email ? "border-red-500" : ""}
  />
  {errors.email && (
    <p id="email-error" className="text-sm text-red-500">{errors.email}</p>
  )}
</div>
```

### 1.3 Fix Text Contrast Issues

**Files:** `LandingPage.tsx`, `Login.tsx`

**Vấn đề:** Blue headline text (#2525f4) trên dark background không đạt WCAG AA

**Fix:**
- Đổi headline color sang white hoặc lighter blue (#60a5fa)
- Update CSS variables nếu cần

```tsx
// Trước
<h1 className="text-primary">...</h1>

// Sau
<h1 className="text-white">...</h1>
// hoặc
<h1 className="text-blue-300">...</h1>
```

---

## Phase 2: High Priority (P1) - 1 ngày

### 2.1 Thêm Loading Indicators cho Forms

**Files:** `Login.tsx`, `Register.tsx`, `Settings.tsx`

**Vấn đề:** Không có feedback khi submit form

**Fix:** Thêm spinner và disable button khi loading

```tsx
<Button
  type="submit"
  disabled={isLoading}
  className="relative"
>
  {isLoading ? (
    <>
      <Spinner className="absolute left-4" />
      <span className="opacity-0">Đăng nhập</span>
    </>
  ) : (
    "Đăng nhập"
  )}
</Button>
```

**Files cần update:**
- [ ] `services/web/src/pages/Login.tsx`
- [ ] `services/web/src/pages/Register.tsx`
- [ ] `services/web/src/components/settings/*.tsx`

### 2.2 Fix Touch Targets trên Mobile

**Vấn đề:** Một số buttons/links nhỏ hơn 48x48px

**Fix:** Đảm bảo minimum height/width 44-48px

```css
/* Mobile touch target minimum */
@media (max-width: 768px) {
  button, a, input[type="checkbox"], input[type="radio"] {
    min-height: 44px;
    min-width: 44px;
  }
}
```

### 2.3 Rename "Link email" → "Magic Link"

**File:** `services/web/src/pages/Login.tsx`

**Vấn đề:** Label "Link email" không rõ nghĩa

**Fix:**
```tsx
// Trước
<button>Link email</button>

// Sau
<button>Magic Link</button>
// hoặc
<button>Đăng nhập không mật khẩu</button>
```

### 2.4 Thống nhất Accent Colors

**Vấn đề:** Purple accent (#9090cb) không nhất quán với blue brand

**Files cần check:**
- [ ] `services/web/src/pages/Login.tsx` - tab inactive color
- [ ] `tailwind.config.js` - color palette
- [ ] CSS variables

**Fix:** Đổi purple → blue-400/blue-300

---

## Phase 3: Internal Pages (P1) - 1.5 ngày

### 3.1 Dashboard.tsx Improvements

**Current issues:**
- File lớn (797 LOC) - đã được modularize
- Cần verify focus states trên các components con

**Tasks:**
- [ ] Verify keyboard navigation trong EmailStream
- [ ] Verify focus states trong Sidebar
- [ ] Check loading states cho data fetching
- [ ] Verify mobile responsive layout

**Components liên quan:**
- `components/EmailStream.tsx`
- `components/Sidebar.tsx`
- `components/InboxSelector.tsx`
- `components/ComposeModal.tsx`

### 3.2 Settings.tsx Improvements

**Tabs cần check:**
- General, Security, Subscription, Developer, Notifications, Filters, Labels, Domains

**Tasks:**
- [ ] Verify focus states cho tab navigation
- [ ] Check form validation trong mỗi tab
- [ ] Add loading states cho API calls
- [ ] Verify mobile layout cho settings panels

### 3.3 InboxManager.tsx Improvements

**Current issues:**
- File lớn (767 LOC)
- Multiple modals (Create, Transfer, Delete)

**Tasks:**
- [ ] Verify keyboard shortcuts hoạt động
- [ ] Check focus trap trong modals
- [ ] Add loading skeleton cho inbox list
- [ ] Verify batch actions feedback

### 3.4 Modal Accessibility

**Tất cả modals cần:**
- [ ] Focus trap (focus không thoát ra ngoài modal)
- [ ] ESC key để đóng
- [ ] Focus return về element đã mở modal
- [ ] aria-modal="true"
- [ ] role="dialog"

**Files:**
- `components/ConfirmationModal.tsx`
- `components/CreateInboxModal.tsx`
- `components/TransferInboxModal.tsx`
- `components/ComposeModal.tsx`

---

## Phase 4: Quick Wins - 0.5 ngày

### 4.1 Button Hover States
```tsx
// Ensure all buttons have hover transitions
className="... hover:bg-blue-600 transition-colors duration-200"
```

### 4.2 Input Focus Rings
```tsx
// Consistent focus ring style
className="... focus:ring-2 focus:ring-primary/50 focus:border-primary"
```

### 4.3 Error Toast Styling
- Verify toast notifications có đủ contrast
- Add aria-live="polite" cho screen readers

### 4.4 Skip to Content Link
```tsx
// Add ở đầu App.tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded"
>
  Skip to main content
</a>
```

---

## Checklist Tổng Hợp

### Accessibility (WCAG 2.1 AA)
- [ ] Focus visible trên tất cả interactive elements
- [ ] Contrast ratio ≥ 4.5:1 cho text
- [ ] Touch targets ≥ 44x44px trên mobile
- [ ] Form errors có aria-invalid và aria-describedby
- [ ] Modals có focus trap
- [ ] Skip to content link

### UX/Feedback
- [ ] Loading spinners cho form submit
- [ ] Inline validation messages
- [ ] Success/error toast notifications
- [ ] Skeleton loading cho data
- [ ] Disabled states rõ ràng

### Visual Consistency
- [ ] Thống nhất color palette (xóa purple accent)
- [ ] Consistent hover/active states
- [ ] Proper spacing (8px grid)
- [ ] Consistent border radius

### Mobile
- [ ] Touch targets đủ lớn
- [ ] Responsive layouts verified
- [ ] Mobile menu hoạt động tốt
- [ ] No horizontal scroll

---

## Files Cần Modify

| Priority | File | Changes |
|----------|------|---------|
| P0 | `src/index.css` | Global focus styles |
| P0 | `src/pages/Login.tsx` | Form validation, contrast |
| P0 | `src/pages/Register.tsx` | Form validation |
| P1 | `src/components/ui/Button.tsx` | Loading state, focus |
| P1 | `src/components/ui/Input.tsx` | Error state, focus |
| P1 | `src/pages/LandingPage.tsx` | Headline contrast |
| P1 | `src/pages/Dashboard.tsx` | Verify focus states |
| P1 | `src/pages/Settings.tsx` | Tab navigation focus |
| P1 | `src/pages/InboxManager.tsx` | Modal accessibility |
| P2 | `src/components/*Modal.tsx` | Focus trap |
| P2 | `src/layouts/AppShell.tsx` | Skip to content |

---

## Testing Plan

1. **Keyboard Navigation Test**
   - Tab through tất cả pages
   - Verify focus order hợp lý
   - ESC closes modals

2. **Screen Reader Test**
   - NVDA/VoiceOver
   - Verify form errors được announce
   - Modal states được announce

3. **Mobile Test**
   - Chrome DevTools device mode
   - Real device testing
   - Touch target verification

4. **Contrast Test**
   - axe DevTools extension
   - WebAIM Contrast Checker

---

## Unresolved Questions

1. Purple accent có phải intentional cho branding không?
2. Password requirements cần hiển thị trước khi user nhập?
3. Target WCAG level (AA hay AAA)?
4. Có existing design system/tokens cần follow không?
