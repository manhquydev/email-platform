# Phase 3: Popup UI

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Depends On:** [Phase 2: Authentication](./phase-02-authentication.md)
- **Design Reference:** `services/web/src/components/` - UI patterns

## Overview

| Field | Value |
|-------|-------|
| Priority | P0 - Critical Path |
| Status | Pending |
| Effort | 4-5 days |
| Dependencies | Phase 2 complete |

Build complete popup UI with inbox list, message preview, quick actions, and settings. Match web app design system.

## Key Insights

- Popup max dimensions: 800x600px (Chrome limit), target 360x500px
- Use Lucide React icons (consistent with web app)
- TailwindCSS shared config for consistent theming
- Lazy load message content to reduce initial load time

## Requirements

### Functional
- View list of inboxes with unread counts
- 1-click create new inbox with random address
- Copy email address to clipboard
- View messages in selected inbox
- Mark messages as read
- Delete inbox
- Settings: logout, notifications toggle, open dashboard

### Non-Functional
- < 200ms popup open time
- Smooth animations (Framer Motion optional)
- Responsive within popup constraints
- Accessible (keyboard navigation, focus states)

## Architecture

```
Popup Views:
┌────────────────────────────────────┐
│  Header (Logo + Settings)          │
├────────────────────────────────────┤
│  Quick Actions                     │
│  [+ Create Inbox] [Refresh]        │
├────────────────────────────────────┤
│  Inbox List                        │
│  ┌──────────────────────────────┐  │
│  │ user123@ephemera.email    (3)│  │
│  │ test456@ephemera.email    (0)│  │
│  └──────────────────────────────┘  │
├────────────────────────────────────┤
│  Selected Inbox Messages           │
│  ┌──────────────────────────────┐  │
│  │ From: noreply@site.com       │  │
│  │ Subject: Verify your email   │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

## Related Code Files

### Create
- `services/extension/src/popup/App.tsx` - Main app
- `services/extension/src/popup/views/home-view.tsx`
- `services/extension/src/popup/views/inbox-view.tsx`
- `services/extension/src/popup/views/settings-view.tsx`
- `services/extension/src/components/inbox-list.tsx`
- `services/extension/src/components/inbox-item.tsx`
- `services/extension/src/components/message-list.tsx`
- `services/extension/src/components/message-item.tsx`
- `services/extension/src/components/header.tsx`
- `services/extension/src/components/button.tsx`
- `services/extension/src/components/loading.tsx`
- `services/extension/src/components/empty-state.tsx`
- `services/extension/src/stores/message-store.ts`

### Reference
- `services/web/src/components/InboxViewer.tsx`
- `services/web/src/components/EmailList.tsx`

## Implementation Steps

### Step 1: Create Base Components (2h)

Create reusable UI components:

`src/components/button.tsx`:
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, children, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    ghost: 'hover:bg-slate-800 text-slate-300'
  }
  const sizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }
  return (
    <button
      className={`rounded-lg font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <span className="animate-spin">⟳</span> : children}
    </button>
  )
}
```

### Step 2: Create Header Component (1h)

`src/components/header.tsx`:
```tsx
import { Settings, RefreshCw } from 'lucide-react'

interface HeaderProps {
  onSettingsClick: () => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export function Header({ onSettingsClick, onRefresh, isRefreshing }: HeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-700">
      <h1 className="text-lg font-bold text-white">Ephemera</h1>
      <div className="flex items-center gap-2">
        <button onClick={onRefresh} className="p-2 hover:bg-slate-800 rounded-lg">
          <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={onSettingsClick} className="p-2 hover:bg-slate-800 rounded-lg">
          <Settings className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  )
}
```

### Step 3: Create Inbox List Component (2h)

`src/components/inbox-list.tsx`:
```tsx
import { Copy, Trash2, ChevronRight } from 'lucide-react'

interface Inbox {
  id: string
  localPart: string
  domain: { name: string }
  _count?: { messages: number }
}

interface InboxListProps {
  inboxes: Inbox[]
  selectedId?: string
  onSelect: (id: string) => void
  onCopy: (email: string) => void
  onDelete: (id: string) => void
}

export function InboxList({ inboxes, selectedId, onSelect, onCopy, onDelete }: InboxListProps) {
  if (inboxes.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>No inboxes yet</p>
        <p className="text-sm mt-1">Create one to get started</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-800">
      {inboxes.map((inbox) => {
        const email = `${inbox.localPart}@${inbox.domain.name}`
        const isSelected = inbox.id === selectedId
        return (
          <div
            key={inbox.id}
            className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-800/50 ${isSelected ? 'bg-slate-800' : ''}`}
            onClick={() => onSelect(inbox.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{email}</p>
              <p className="text-xs text-slate-500">
                {inbox._count?.messages || 0} messages
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(email) }}
              className="p-1.5 hover:bg-slate-700 rounded"
            >
              <Copy className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(inbox.id) }}
              className="p-1.5 hover:bg-red-900/50 rounded"
            >
              <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
            </button>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </div>
        )
      })}
    </div>
  )
}
```

### Step 4: Create Message Store (1h)

`src/stores/message-store.ts`:
```typescript
import { create } from 'zustand'
import { api } from '../utils/api'
import { useAuthStore } from './auth-store'

interface Message {
  id: string
  fromAddress: string | null
  subject: string | null
  receivedAt: string
  isRead: boolean
  textBody?: string
}

interface MessageState {
  messages: Message[]
  selectedInboxId: string | null
  isLoading: boolean

  setSelectedInbox: (id: string | null) => void
  fetchMessages: (inboxId: string) => Promise<void>
  markAsRead: (messageId: string) => Promise<void>
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  selectedInboxId: null,
  isLoading: false,

  setSelectedInbox: (id) => {
    set({ selectedInboxId: id, messages: [] })
    if (id) get().fetchMessages(id)
  },

  fetchMessages: async (inboxId) => {
    const token = useAuthStore.getState().token
    if (!token) return

    set({ isLoading: true })
    try {
      const { data } = await api<{ data: Message[] }>(
        `/inboxes/${inboxId}/messages?limit=20`,
        { token }
      )
      set({ messages: data, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  markAsRead: async (messageId) => {
    const token = useAuthStore.getState().token
    if (!token) return

    await api(`/messages/${messageId}/read`, {
      method: 'PATCH',
      token,
      body: { isRead: true }
    })

    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, isRead: true } : m
      )
    }))
  }
}))
```

### Step 5: Create Message List Component (2h)

`src/components/message-list.tsx`:
```tsx
import { formatDistanceToNow } from 'date-fns'

interface Message {
  id: string
  fromAddress: string | null
  subject: string | null
  receivedAt: string
  isRead: boolean
}

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  onSelect: (id: string) => void
}

export function MessageList({ messages, isLoading, onSelect }: MessageListProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>No messages yet</p>
        <p className="text-sm mt-1">Emails will appear here</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-800 max-h-[200px] overflow-y-auto">
      {messages.map((msg) => (
        <div
          key={msg.id}
          onClick={() => onSelect(msg.id)}
          className={`p-3 cursor-pointer hover:bg-slate-800/50 ${!msg.isRead ? 'bg-slate-800/30' : ''}`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-sm truncate ${!msg.isRead ? 'font-semibold text-white' : 'text-slate-300'}`}>
              {msg.fromAddress || 'Unknown sender'}
            </p>
            <span className="text-xs text-slate-500">
              {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-slate-400 truncate mt-0.5">
            {msg.subject || '(no subject)'}
          </p>
        </div>
      ))}
    </div>
  )
}
```

### Step 6: Create Settings View (1h)

`src/popup/views/settings-view.tsx`:
```tsx
import { useAuth } from '../../hooks/use-auth'
import { Button } from '../../components/button'
import { ExternalLink, LogOut, Bell, Moon } from 'lucide-react'

interface SettingsViewProps {
  onBack: () => void
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const { user, logout } = useAuth()

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: 'https://app.manhquy.click' })
  }

  return (
    <div className="p-4 space-y-4">
      <button onClick={onBack} className="text-sm text-slate-400 hover:text-white">
        ← Back
      </button>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-slate-400">{user?.email}</p>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleOpenDashboard}
          className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg"
        >
          <ExternalLink className="w-5 h-5 text-slate-400" />
          <span>Open Dashboard</span>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-red-900/50 rounded-lg text-red-400"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
```

### Step 7: Assemble Main App (2h)

Update `src/popup/App.tsx` to combine all views with navigation state.

## Todo List

- [ ] Install lucide-react and date-fns
- [ ] Create Button component
- [ ] Create Header component
- [ ] Create InboxList component
- [ ] Create MessageList component
- [ ] Create message store
- [ ] Create SettingsView
- [ ] Assemble main App with navigation
- [ ] Add copy to clipboard feedback (toast)
- [ ] Test all UI interactions
- [ ] Polish animations and transitions

## Success Criteria

- [ ] Popup opens in < 200ms
- [ ] Can see list of inboxes
- [ ] Can create new inbox with 1 click
- [ ] Can copy email address
- [ ] Can view messages in selected inbox
- [ ] Can navigate to settings and back
- [ ] Can logout from settings
- [ ] Empty states display correctly

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Popup size constraints | Low | Medium | Test on different screen sizes |
| Performance with many messages | Medium | Low | Virtualize list, limit initial fetch |
| Icon library size | Low | Low | Tree-shaking, only import used icons |

## Next Steps

→ [Phase 4: Content Script & Auto-fill](./phase-04-content-script.md)
