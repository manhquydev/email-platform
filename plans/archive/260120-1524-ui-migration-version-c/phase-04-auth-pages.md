# Phase 4: Auth Pages

> **Status:** Pending | **Priority:** High | **Est. Time:** 3-4 hours

## Overview

Update authentication pages to Version C minimal design.

## Files to Modify

| File | Priority | Modules |
|------|----------|---------|
| `pages/Login.tsx` | Critical | login-modules/login-components |
| `pages/Register.tsx` | Critical | register-modules/register-components |
| `pages/VerifyEmail.tsx` | High | - |
| `pages/MagicLinkVerify.tsx` | Medium | - |
| `components/LoginForm.tsx` | High | - |
| `components/Auth/PasskeyLogin.tsx` | Medium | - |
| `components/Auth/MagicLinkRequestForm.tsx` | Medium | - |

## Key Design Patterns

### Auth Container
```tsx
<div className="min-h-screen bg-black flex items-center justify-center px-6">
  <div className="w-full max-w-md">
    {/* Form content */}
  </div>
</div>
```

### Auth Card (No glass effect)
```tsx
<div className="p-8 bg-zinc-950 border border-zinc-800 rounded-lg">
  <h1 className="text-2xl font-bold text-white mb-2">Sign in</h1>
  <p className="text-zinc-500 mb-8">Welcome back</p>
  {/* Form */}
</div>
```

### Input Fields
```tsx
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-zinc-400 mb-2">
      Email
    </label>
    <input
      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg
        text-white placeholder:text-zinc-600
        focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors"
    />
  </div>
</div>
```

### Submit Button
```tsx
<button className="w-full py-3 bg-white text-black rounded-md font-medium
  hover:bg-zinc-200 transition-colors">
  Sign in
</button>
```

### Secondary Action
```tsx
<p className="text-center text-sm text-zinc-500 mt-6">
  Don't have an account?{' '}
  <a href="/register" className="text-white hover:text-zinc-300">
    Sign up
  </a>
</p>
```

## Changes Summary

| Element | FROM | TO |
|---------|------|-----|
| Background | Gradient/Glass | bg-black |
| Card | Glassmorphism | bg-zinc-950 border |
| Inputs | Various styles | bg-zinc-900 border-zinc-800 |
| Primary btn | Gradient | bg-white text-black |
| Links | Colored | text-white |

## Todo List

- [ ] Update Login.tsx
- [ ] Update login-components.tsx
- [ ] Update Register.tsx
- [ ] Update register-components.tsx
- [ ] Update VerifyEmail.tsx
- [ ] Update MagicLinkVerify.tsx
- [ ] Update LoginForm.tsx
- [ ] Update PasskeyLogin.tsx
- [ ] Update MagicLinkRequestForm.tsx
- [ ] Test all auth flows

## Success Criteria

- [ ] Clean, minimal auth pages
- [ ] No glass effects
- [ ] Consistent input styling
- [ ] All auth flows work correctly

## Next Steps

→ Phase 5: App Pages
