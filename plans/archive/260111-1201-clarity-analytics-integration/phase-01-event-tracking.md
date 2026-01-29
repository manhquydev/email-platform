# Phase 1: Enhanced Event Tracking

**Effort:** 2h | **Priority:** P1 | **Dependencies:** None

## Objective

Track key user actions and identify logged-in users in Clarity for session filtering and analysis.

## Implementation Steps

### Step 1: Create Clarity Hook (30 min)

**File:** `services/web/src/hooks/useClarity.ts` (NEW)

```typescript
// Wrapper for type-safe Clarity calls
declare global {
  interface Window {
    clarity?: (method: string, ...args: string[]) => void;
  }
}

export function useClarity() {
  const track = (eventName: string) => {
    window.clarity?.("event", eventName);
  };

  const identify = (userId: string, sessionId?: string, friendlyName?: string) => {
    window.clarity?.("identify", userId, sessionId || "", "", friendlyName || "");
  };

  const setTag = (key: string, value: string) => {
    window.clarity?.("set", key, value);
  };

  return { track, identify, setTag };
}
```

### Step 2: Identify on Login (30 min)

**File:** `services/web/src/context/AuthContext.tsx`

After successful login, call:
```typescript
import { useClarity } from "../hooks/useClarity";

// Inside login success handler:
const { identify, setTag } = useClarity();
identify(user.id, undefined, user.email);
setTag("user_role", user.role); // "admin" | "user"
setTag("plan", user.plan || "free");
```

### Step 3: Track Key Events (45 min)

Add `track()` calls at these locations:

| Event Name | Location | Trigger |
|------------|----------|---------|
| `login` | AuthContext | Login success |
| `logout` | AuthContext | Logout action |
| `inbox_created` | InboxCreationForm | After API success |
| `domain_created` | DomainAddModal | After verification |
| `message_viewed` | MessageViewer | On message open |
| `attachment_downloaded` | AttachmentList | On download click |
| `rule_created` | RuleEditor | After save |
| `api_key_generated` | APIKeysPage | After generation |

### Step 4: Add Privacy Masking (15 min)

**File:** Components with sensitive inputs

Add `data-clarity-mask="true"` attribute to:
- Password inputs
- API key displays
- Email content viewer (optional - full message body)

```tsx
<input type="password" data-clarity-mask="true" />
```

## Todo List

- [ ] Create `useClarity.ts` hook with type definitions
- [ ] Add identify call in AuthContext login flow
- [ ] Add setTag for user_role after auth
- [ ] Track login/logout events
- [ ] Track inbox_created in InboxCreationForm
- [ ] Track domain_created in DomainAddModal
- [ ] Track message_viewed in MessageViewer
- [ ] Track attachment_downloaded in AttachmentList
- [ ] Add data-clarity-mask to sensitive inputs
- [ ] Test events appear in Clarity dashboard

## Success Criteria

- [ ] Clarity dashboard shows custom events in session recordings
- [ ] Sessions can be filtered by `user_role:admin` tag
- [ ] User identifier links multiple sessions together
- [ ] No PII visible in masked fields during replay

## Code Snippets

**AuthContext.tsx addition:**
```typescript
// After setUser(userData) in login handler:
if (import.meta.env.VITE_CLARITY_PROJECT_ID) {
  window.clarity?.("identify", userData.id, "", "", userData.email);
  window.clarity?.("set", "user_role", userData.role);
}
window.clarity?.("event", "login");
```

**Logout handler:**
```typescript
window.clarity?.("event", "logout");
```
