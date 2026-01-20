# Phase 5: App Pages

> **Status:** Pending | **Priority:** Medium | **Est. Time:** 8-10 hours

## Overview

Update core application pages (Dashboard, Inbox, Settings) to Version C.

## Files to Modify

### Dashboard & Inbox
| File | Priority |
|------|----------|
| `pages/Dashboard.tsx` | Critical |
| `pages/dashboard-modules/*.tsx` | Critical |
| `pages/FocusDashboard.tsx` | High |
| `pages/focus-dashboard-modules/*.tsx` | High |
| `pages/InboxManager.tsx` | High |
| `pages/InboxViewer.tsx` | Medium |

### Settings & Features
| File | Priority |
|------|----------|
| `pages/Settings.tsx` | High |
| `pages/MyDomains.tsx` | High |
| `pages/my-domains-modules/*.tsx` | High |
| `pages/Forwarding.tsx` | Medium |
| `pages/forwarding-modules/*.tsx` | Medium |
| `pages/Plans.tsx` | Medium |
| `pages/Teams.tsx` | Low |
| `pages/Authenticator.tsx` | Low |

### Shared Components
| File | Priority |
|------|----------|
| `components/dashboard/*.tsx` | Critical |
| `components/settings/*.tsx` | High |
| `components/inbox-viewer/*.tsx` | Medium |

## Key Patterns

### App Shell
```tsx
<div className="min-h-screen bg-black">
  <AppHeader />
  <div className="flex">
    <Sidebar />
    <main className="flex-1 p-6">{children}</main>
  </div>
</div>
```

### Sidebar
```tsx
<aside className="w-64 border-r border-zinc-900 bg-zinc-950">
  <nav className="p-4 space-y-1">
    <a className="flex items-center gap-3 px-3 py-2 rounded-md
      text-zinc-400 hover:text-white hover:bg-zinc-900">
      <Icon className="w-5 h-5" />
      <span className="text-sm">Dashboard</span>
    </a>
  </nav>
</aside>
```

### Data Table
```tsx
<div className="border border-zinc-800 rounded-lg overflow-hidden">
  <table className="w-full">
    <thead className="bg-zinc-900">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
          Name
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-zinc-900">
      <tr className="hover:bg-zinc-900/50">
        <td className="px-4 py-3 text-sm text-zinc-300">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Card Grid (Settings)
```tsx
<div className="grid gap-6 md:grid-cols-2">
  <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-lg">
    <h3 className="text-lg font-medium text-white mb-4">General</h3>
    {/* Content */}
  </div>
</div>
```

## Email List Pattern
```tsx
<div className="divide-y divide-zinc-900">
  <div className="p-4 hover:bg-zinc-900/50 cursor-pointer group">
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {sender}
        </p>
        <p className="text-sm text-zinc-500 truncate">{subject}</p>
      </div>
      <span className="text-xs text-zinc-600">{time}</span>
    </div>
  </div>
</div>
```

## Todo List

- [ ] Update Dashboard.tsx
- [ ] Update dashboard-modules (5 files)
- [ ] Update FocusDashboard.tsx
- [ ] Update focus-dashboard-modules (2 files)
- [ ] Update InboxManager.tsx
- [ ] Update InboxViewer.tsx
- [ ] Update Settings.tsx
- [ ] Update MyDomains.tsx and modules
- [ ] Update Forwarding.tsx and modules
- [ ] Update Plans.tsx and modules
- [ ] Update Teams.tsx and modules
- [ ] Update Authenticator.tsx
- [ ] Update dashboard components
- [ ] Update settings components

## Success Criteria

- [ ] Dashboard uses zinc palette
- [ ] Email lists are clean and readable
- [ ] Settings cards are consistent
- [ ] All interactive elements work

## Next Steps

→ Phase 6: Admin Pages
