# Phase 01: Bottom Tab Navigation

> **Priority:** P0 | **Status:** pending | **Effort:** 2-3 days

---

## Context

- [Design Guidelines](../../docs/design-guidelines.md)
- [Current MobileInboxLayout](../../services/web/src/components/inbox-manager/mobile-inbox-layout.tsx)
- [Current MobileSidebar](../../services/web/src/components/dashboard/MobileSidebar.tsx)

## Overview

Thay thế dual navigation pattern (top tabs + sidebar drawer) bằng bottom tab navigation thumb-friendly, phù hợp với mobile UX best practices.

## Key Insights

- Bottom 1/3 of screen là "thumb zone" dễ reach nhất
- Top tabs + sidebar gây confusion cho users
- FAB (Floating Action Button) cho primary action hiệu quả hơn toolbar button

## Requirements

### Functional
- Bottom tab bar với 4-5 tabs cố định
- Active tab indicator rõ ràng
- Badge cho unread count
- FAB cho "Create Inbox" action
- Smooth transitions giữa tabs

### Non-functional
- Touch target >= 48px
- Transition <= 200ms
- No layout shift khi switch tabs

## Architecture

```
┌─────────────────────────────┐
│         CONTENT AREA        │
│    (Tab-specific content)   │
│                             │
│              ┌───┐          │
│              │ + │ ← FAB    │
│              └───┘          │
├─────────────────────────────┤
│  📥    📧    🔍    ⚙️    👤 │
│ Inbox  Mail Search Settings │
└─────────────────────────────┘
```

## Related Code Files

### Create
```
services/web/src/components/mobile/
├── BottomTabBar.tsx           # Main bottom navigation component
├── BottomTabItem.tsx          # Individual tab item
├── FloatingActionButton.tsx   # FAB component
└── MobileLayout.tsx           # New mobile layout wrapper
```

### Modify
```
services/web/src/components/inbox-manager/mobile-inbox-layout.tsx
services/web/src/pages/DashboardPage.tsx
services/web/src/App.tsx (routes)
```

### Deprecate (keep for rollback)
```
services/web/src/components/TabNavigation.tsx
services/web/src/components/dashboard/MobileSidebar.tsx
```

## Implementation Steps

### Step 1: Create BottomTabBar component
```tsx
// services/web/src/components/mobile/BottomTabBar.tsx
interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface BottomTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function BottomTabBar({ tabs, activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-v3-bg-elevated border-t border-v3-border-default safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {tabs.map(tab => (
          <BottomTabItem
            key={tab.id}
            {...tab}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </div>
    </nav>
  );
}
```

### Step 2: Create BottomTabItem component
```tsx
// services/web/src/components/mobile/BottomTabItem.tsx
interface BottomTabItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  isActive: boolean;
  onClick: () => void;
}

export function BottomTabItem({ label, icon, badge, isActive, onClick }: BottomTabItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-3 py-2",
        "transition-colors duration-150",
        isActive ? "text-v3-accent-primary" : "text-v3-text-muted"
      )}
    >
      <div className="relative">
        {icon}
        {badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-v3-accent-error text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );
}
```

### Step 3: Create FloatingActionButton
```tsx
// services/web/src/components/mobile/FloatingActionButton.tsx
interface FABProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
}

export function FloatingActionButton({ onClick, icon, label }: FABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed right-4 bottom-20 z-40", // above bottom tab bar
        "w-14 h-14 rounded-full",
        "bg-v3-accent-primary text-black",
        "shadow-lg shadow-v3-accent-primary/25",
        "flex items-center justify-center",
        "active:scale-95 transition-transform"
      )}
      aria-label={label || "Create"}
    >
      {icon || <PlusIcon className="w-6 h-6" />}
    </button>
  );
}
```

### Step 4: Create MobileLayout wrapper
```tsx
// services/web/src/components/mobile/MobileLayout.tsx
export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('inboxes');
  const unreadCount = useUnreadCount(); // existing hook

  const tabs = [
    { id: 'inboxes', label: 'Inbox', icon: <InboxIcon />, badge: 0 },
    { id: 'messages', label: 'Messages', icon: <MailIcon />, badge: unreadCount },
    { id: 'search', label: 'Search', icon: <SearchIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <div className="min-h-screen pb-16"> {/* padding for bottom bar */}
      {children}
      <FloatingActionButton onClick={handleCreate} />
      <BottomTabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
```

### Step 5: Update mobile-inbox-layout.tsx
- Remove top TabNavigation
- Wrap content with MobileLayout
- Pass activeTab from parent

### Step 6: Add safe-area CSS
```css
/* services/web/src/styles/mobile-safe-area.css */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top, 0);
}
```

### Step 7: Feature flag integration
```tsx
// Use existing feature flag system or create simple one
const useMobileBottomNav = () => {
  return localStorage.getItem('feature_bottom_nav') !== 'disabled';
};
```

## Todo List

- [ ] Create `BottomTabBar.tsx` component
- [ ] Create `BottomTabItem.tsx` component
- [ ] Create `FloatingActionButton.tsx` component
- [ ] Create `MobileLayout.tsx` wrapper
- [ ] Add `mobile-safe-area.css` styles
- [ ] Update `mobile-inbox-layout.tsx` to use new layout
- [ ] Add feature flag for gradual rollout
- [ ] Test on iOS Safari (safe area insets)
- [ ] Test on Android Chrome
- [ ] Accessibility audit (focus states, screen reader)

## Success Criteria

- [ ] Bottom tab bar renders correctly on all screen sizes
- [ ] Touch targets >= 48px verified
- [ ] Tab transitions smooth (< 200ms)
- [ ] FAB positioned correctly above tab bar
- [ ] Safe area insets work on iPhone X+
- [ ] No regression on existing functionality

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| iOS safe area issues | Medium | High | Test early on real devices |
| Layout shift on tab change | Low | Medium | Use fixed heights, no dynamic content in tabs |
| User confusion during transition | Low | Low | Feature flag for gradual rollout |

## Security Considerations

- No security impact - UI-only changes
- No new data flows or API calls

## Next Steps

→ Phase 02: Toolbar to Action Sheet
