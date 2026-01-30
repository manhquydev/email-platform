# Phase 4: Compose New Email Feature

## Context
- [Parent Plan](./plan.md)
- ComposeModal currently supports: `mode: 'reply' | 'forward'`
- Need to add: `mode: 'new'` for composing from scratch

## Overview
| Field | Value |
|-------|-------|
| Priority | Medium |
| Status | ⬜ Pending |
| Effort | 1h |
| Depends on | Phase 1 (i18n keys) |

## Requirements

### Functional
- "Compose" button in App.tsx header
- ComposeModal supports `mode: 'new'`
- User enters: To, Subject, Body
- Sends via backend API

### Non-Functional
- Reuse existing ComposeModal component
- Minimal API changes

## Architecture

```
┌─────────────────────────────────────┐
│ App.tsx                             │
│  └─ Compose button (header)         │
│      └─ Opens ComposeModal          │
│          mode: 'new'                │
│          originalMessage: null      │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ ComposeModal.tsx                    │
│  └─ mode: 'new' | 'reply' | 'forward'│
│      └─ Shows To + Subject fields   │
│          └─ Calls api.sendMessage() │
└─────────────────────────────────────┘
```

## Files to Modify

| File | Action |
|------|--------|
| `src/components/shared/ComposeModal.tsx` | Add 'new' mode support |
| `src/entrypoints/popup/App.tsx` | Add Compose button |
| `src/shared/api.ts` | Add sendMessage if not exists |
| `src/shared/types.ts` | Update ComposeData type if needed |

## Implementation Steps

### 1. Update ComposeModal.tsx

```tsx
// Update props type
interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'new' | 'reply' | 'forward';
  originalMessage: Message | null;  // null for 'new' mode
  fromEmail?: string;  // Required for 'new' mode
  onSend: (data: ComposeData) => Promise<void>;
  sending: boolean;
  error?: string | null;
}

// In component:
const [subject, setSubject] = useState('');

// Allow opening without originalMessage for 'new' mode
if (!isOpen) return null;
if (mode !== 'new' && !originalMessage) return null;

// Subject field for 'new' mode
{mode === 'new' && (
  <div>
    <label className="...">{t('subject')}</label>
    <input
      type="text"
      value={subject}
      onChange={(e) => setSubject(e.target.value)}
      required
      placeholder="Email subject"
      className="..."
    />
  </div>
)}

// Update handleSubmit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await onSend({
    to: mode === 'new' || mode === 'forward' ? to : undefined,
    subject: mode === 'new' ? subject : undefined,
    content
  });
};
```

### 2. Add Compose button to App.tsx header

```tsx
import { PenSquare } from 'lucide-react';

// State for compose modal
const [showCompose, setShowCompose] = useState(false);
const [composeSending, setComposeSending] = useState(false);
const [composeError, setComposeError] = useState<string | null>(null);

// Handler
const handleSendNewMessage = async (data: ComposeData) => {
  setComposeSending(true);
  setComposeError(null);
  try {
    await api.sendMessage(data);
    setShowCompose(false);
  } catch (err) {
    setComposeError(err instanceof Error ? err.message : 'Failed to send');
  } finally {
    setComposeSending(false);
  }
};

// In header buttons:
<button
  onClick={() => setShowCompose(true)}
  className="p-2 text-slate-500 hover:text-primary-600 ..."
  title="Compose"
>
  <PenSquare className="w-4 h-4" />
</button>

// Modal (after header):
<ComposeModal
  isOpen={showCompose}
  onClose={() => setShowCompose(false)}
  mode="new"
  originalMessage={null}
  fromEmail={auth?.user?.email}
  onSend={handleSendNewMessage}
  sending={composeSending}
  error={composeError}
/>
```

### 3. Add api.sendMessage (if not exists)

```typescript
// src/shared/api.ts
async sendMessage(data: { to: string; subject: string; content: string; fromInboxId?: string }): Promise<{ success: boolean }> {
  return this.request('/outbound/message', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
```

## Backend Consideration

**Check if `/outbound/message` endpoint exists:**
- If yes: Use existing endpoint
- If no: Phase 4 may require backend work or be deferred

## Todo List

- [ ] Update ComposeModal mode type to include 'new'
- [ ] Add Subject field for 'new' mode
- [ ] Update handleSubmit to include subject
- [ ] Add Compose button to App.tsx header
- [ ] Add compose modal state and handlers
- [ ] Verify/add api.sendMessage endpoint
- [ ] Test full compose flow

## Success Criteria

- Compose button visible in header
- Click opens ComposeModal with To/Subject/Body fields
- Sending creates new outbound email
- Success closes modal, error shows message

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Backend endpoint missing | Check API docs, may need backend phase |
| From address selection | Use first inbox or add dropdown |
| SMTP configuration | Depends on backend outbound service |

## Security Considerations

- Validate recipient email format
- Rate limit outbound messages (backend)
- SPF/DKIM handled by backend
