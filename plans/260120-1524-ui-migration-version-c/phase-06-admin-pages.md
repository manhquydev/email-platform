# Phase 6: Admin Pages

> **Status:** Pending | **Priority:** Medium | **Est. Time:** 6-8 hours

## Overview

Update admin panel pages to Version C design.

## Files to Modify

| File | Priority |
|------|----------|
| `pages/Admin.tsx` | Critical |
| `pages/admin/UsersPage.tsx` | High |
| `pages/admin/users-page-modules/*.tsx` | High |
| `pages/admin/PackagesPage.tsx` | High |
| `pages/admin/packages-modules/*.tsx` | High |
| `pages/admin/CodesPage.tsx` | Medium |
| `pages/admin/codes-page-modules/*.tsx` | Medium |
| `pages/admin/AnalyticsPage.tsx` | Medium |
| `pages/admin/analytics-page-modules/*.tsx` | Medium |
| `pages/admin/AdminSettingsPage.tsx` | Medium |
| `pages/admin/admin-settings-modules/*.tsx` | Medium |
| `pages/admin/AdminNotificationPage.tsx` | Low |
| `pages/admin/AdminRulesPage.tsx` | Low |
| `pages/admin/TelegramManagementPage.tsx` | Low |

## Admin-Specific Patterns

### Admin Header
```tsx
<div className="border-b border-zinc-900 bg-zinc-950">
  <div className="max-w-7xl mx-auto px-6 py-4">
    <h1 className="text-2xl font-bold text-white">Users</h1>
    <p className="text-sm text-zinc-500 mt-1">Manage platform users</p>
  </div>
</div>
```

### Stats Cards
```tsx
<div className="grid grid-cols-4 gap-4">
  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
    <p className="text-sm text-zinc-500">Total Users</p>
    <p className="text-2xl font-bold text-white mt-1">12,345</p>
    <p className="text-xs text-emerald-400 mt-2">+12% this month</p>
  </div>
</div>
```

### Data Table with Actions
```tsx
<table className="w-full">
  <thead className="bg-zinc-900">
    <tr>
      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
        User
      </th>
      <th className="px-4 py-3 text-right">Actions</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-zinc-900">
    <tr className="hover:bg-zinc-900/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800" />
          <div>
            <p className="text-sm text-white">John Doe</p>
            <p className="text-xs text-zinc-500">john@example.com</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button className="p-2 hover:bg-zinc-800 rounded">
          <MoreIcon className="w-4 h-4 text-zinc-400" />
        </button>
      </td>
    </tr>
  </tbody>
</table>
```

### Modal Pattern
```tsx
<div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
  <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg">
    <div className="p-6 border-b border-zinc-900">
      <h2 className="text-lg font-medium text-white">Edit User</h2>
    </div>
    <div className="p-6">
      {/* Form content */}
    </div>
    <div className="p-6 border-t border-zinc-900 flex justify-end gap-3">
      <button className="px-4 py-2 text-zinc-400 hover:text-white">
        Cancel
      </button>
      <button className="px-4 py-2 bg-white text-black rounded-md">
        Save
      </button>
    </div>
  </div>
</div>
```

### Badge Variants
```tsx
// Status badges
<span className="px-2 py-0.5 text-xs font-medium rounded
  bg-emerald-500/10 text-emerald-400">Active</span>
<span className="px-2 py-0.5 text-xs font-medium rounded
  bg-red-500/10 text-red-400">Banned</span>
<span className="px-2 py-0.5 text-xs font-medium rounded
  bg-zinc-800 text-zinc-400">Pending</span>
```

## Todo List

- [ ] Update Admin.tsx (main router)
- [ ] Update UsersPage.tsx and modules
- [ ] Update PackagesPage.tsx and modules
- [ ] Update CodesPage.tsx and modules
- [ ] Update AnalyticsPage.tsx and modules
- [ ] Update AdminSettingsPage.tsx and modules
- [ ] Update AdminNotificationPage.tsx
- [ ] Update AdminRulesPage.tsx
- [ ] Update TelegramManagementPage.tsx
- [ ] Update all admin modals
- [ ] Test CRUD operations

## Success Criteria

- [ ] Admin pages use consistent styling
- [ ] Tables are readable and functional
- [ ] Modals follow Version C pattern
- [ ] All admin features work correctly

## Next Steps

→ Phase 7: Cleanup & Polish
