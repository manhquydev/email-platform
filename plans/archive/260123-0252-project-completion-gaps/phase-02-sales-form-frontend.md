# Phase 2: Sales Form Frontend

## Overview
- **Priority:** CRITICAL
- **Status:** Pending
- **Effort:** 30min (A) / 1h (B)

Wire the existing Sales form UI with state management and API submission.

## Context Links
- [Current Sales Component](../../services/web/src/pages/Support.tsx) (lines 87-124)
- [API Utils](../../services/web/src/utils/api.ts)

## Current State Analysis

The `Sales` component at `/sales` has:
- Form with inputs: name, email, company, companySize, message
- No `name` attributes on inputs
- No state management
- No `onSubmit` handler
- Button does nothing

## Approach A: Minimal MVP

### Files to Modify
- `services/web/src/pages/Support.tsx`

### Implementation Steps

1. **Add form state to Sales component**
   ```typescript
   const [form, setForm] = useState({
     name: "",
     email: "",
     company: "",
     companySize: "1-10 nhân viên",
     message: "",
   });
   const [submitting, setSubmitting] = useState(false);
   const [submitted, setSubmitted] = useState(false);
   ```

2. **Add submit handler**
   ```typescript
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setSubmitting(true);
     try {
       await api("/contact/sales", { method: "POST", body: form });
       setSubmitted(true);
       toast.success("Đã gửi thành công! Chúng tôi sẽ liên hệ sớm.");
     } catch (err) {
       toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
     } finally {
       setSubmitting(false);
     }
   };
   ```

3. **Wire inputs with state**
   - Add `value` and `onChange` to each Input
   - Add `name` attribute to select
   - Add `onSubmit={handleSubmit}` to form
   - Disable button while submitting

4. **Add success state UI**
   - Show thank you message when `submitted` is true
   - Hide form after successful submission

### Code Changes

```tsx
// Before
<form className="space-y-4 text-left">
  <Input label="Họ và tên" placeholder="Tên của bạn" ... />

// After
<form className="space-y-4 text-left" onSubmit={handleSubmit}>
  <Input
    label="Họ và tên"
    placeholder="Tên của bạn"
    value={form.name}
    onChange={(e) => setForm(f => ({...f, name: e.target.value}))}
    required
    ...
  />
```

### Success Criteria
- [ ] Form inputs are controlled components
- [ ] Submit button shows loading state
- [ ] Success toast on successful submission
- [ ] Error toast on failure
- [ ] Form disabled during submission

---

## Approach B: Full Implementation

### Additional Features
- Honeypot hidden field
- Client-side validation with error messages
- UTM parameter capture (hidden fields)
- Animated success state

### Files to Modify
- `services/web/src/pages/Support.tsx`

### Implementation Steps

1. **All steps from Approach A**

2. **Add honeypot field**
   ```tsx
   <input
     type="text"
     name="website_url_hp"
     value={honeypot}
     onChange={(e) => setHoneypot(e.target.value)}
     className="absolute -left-[9999px]"
     tabIndex={-1}
     autoComplete="off"
   />
   ```

3. **Capture UTM params on mount**
   ```typescript
   useEffect(() => {
     const params = new URLSearchParams(window.location.search);
     setUtmSource(params.get("utm_source") || "direct");
   }, []);
   ```

4. **Enhanced validation**
   - Email format validation with regex
   - Required field indicators
   - Inline error messages

5. **Success animation**
   - Fade out form
   - Fade in thank you card with checkmark icon

### Success Criteria
- [ ] All Approach A criteria
- [ ] Honeypot field present but invisible
- [ ] UTM source captured
- [ ] Client-side validation messages
- [ ] Animated success state

---

## Risk Assessment
- **Low:** API endpoint not ready - Frontend will show error toast. Test locally first.

## Security Considerations
- No sensitive data stored in localStorage
- Form cleared on successful submit
