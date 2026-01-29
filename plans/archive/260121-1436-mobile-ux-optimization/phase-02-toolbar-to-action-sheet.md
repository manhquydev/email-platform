# Phase 02: Toolbar to Action Sheet

> **Priority:** P0 | **Status:** pending | **Effort:** 1 day

---

## Context

- [Current Toolbar](../../services/web/src/components/inbox-manager/mobile-layout-modules/mobile-inboxes-tab.tsx)
- [Existing BottomSheet](../../services/web/src/components/mobile/BottomSheet.tsx)
- [Design Guidelines](../../docs/design-guidelines.md)

## Overview

Collapse toolbar vào action sheet để giảm cognitive load trên mobile. Toolbar hiện tại có quá nhiều elements (select all, copy, delete, filter, sort, create) chiếm không gian quý giá.

## Key Insights

- Mobile users cần quick actions, không cần thấy tất cả options cùng lúc
- Existing `BottomSheet` component có thể reuse
- Action sheet pattern quen thuộc với iOS/Android users

## Requirements

### Functional
- Menu icon mở action sheet với all toolbar actions
- Quick filter chips (optional, chỉ hiện phổ biến nhất)
- Multi-select mode trigger via long press
- Batch actions hiện trong action sheet khi có selection

### Non-functional
- Action sheet animation <= 200ms
- Touch targets >= 48px trong sheet
- Backdrop dismiss

## Architecture

### Before
```
┌──────────────────────────────────────────────┐
│ ☑️ Select All │ Copy(3) Delete(3) │ Filter ▾ │ Sort ▾ │ + Create │
└──────────────────────────────────────────────┘
```

### After
```
┌───────────────────────────────────┐
│ ⋮ │ Active ▾ │ (selection chips)  │
└───────────────────────────────────┘
           │
           ▼ (tap menu icon)
┌───────────────────────────────────┐
│         Actions                   │
├───────────────────────────────────┤
│ ☑️  Select All                    │
│ 📋  Copy Selected                 │
│ 🗑️  Delete Selected               │
├───────────────────────────────────┤
│ 🔽  Sort by: Newest               │
│ 🔍  Filter: All                   │
└───────────────────────────────────┘
```

## Related Code Files

### Create
```
services/web/src/components/mobile/
├── CompactToolbar.tsx           # Simplified toolbar with menu trigger
├── InboxActionsSheet.tsx        # Action sheet content
└── FilterChips.tsx              # Quick filter chips (optional)
```

### Modify
```
services/web/src/components/inbox-manager/mobile-layout-modules/mobile-inboxes-tab.tsx
```

## Implementation Steps

### Step 1: Create CompactToolbar
```tsx
// services/web/src/components/mobile/CompactToolbar.tsx
interface CompactToolbarProps {
  selectedCount: number;
  filterLabel: string;
  onMenuOpen: () => void;
  onFilterChange: (filter: FilterOption) => void;
}

export function CompactToolbar({
  selectedCount,
  filterLabel,
  onMenuOpen,
  onFilterChange
}: CompactToolbarProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-v3-bg-elevated border-b border-v3-border-default">
      {/* Left: Menu + Selection count */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="p-2 -m-2 min-h-touch min-w-touch flex items-center justify-center"
          aria-label="Open actions menu"
        >
          <MoreVerticalIcon className="w-5 h-5 text-v3-text-secondary" />
        </button>

        {selectedCount > 0 && (
          <span className="text-sm text-v3-accent-primary font-medium">
            {selectedCount} selected
          </span>
        )}
      </div>

      {/* Right: Quick filter */}
      <select
        value={filterLabel}
        onChange={(e) => onFilterChange(e.target.value as FilterOption)}
        className="text-sm bg-transparent text-v3-text-secondary border-none focus:outline-none"
      >
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="expiring">Expiring</option>
      </select>
    </div>
  );
}
```

### Step 2: Create InboxActionsSheet
```tsx
// services/web/src/components/mobile/InboxActionsSheet.tsx
interface InboxActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  filterBy: FilterOption;
  sortBy: SortOption;
  onSelectAll: () => void;
  onCopyAll: () => void;
  onBatchDelete: () => void;
  onFilterChange: (filter: FilterOption) => void;
  onSortChange: (sort: SortOption) => void;
  onCreateInbox: () => void;
}

export function InboxActionsSheet({
  isOpen,
  onClose,
  selectedCount,
  filterBy,
  sortBy,
  onSelectAll,
  onCopyAll,
  onBatchDelete,
  onFilterChange,
  onSortChange,
  onCreateInbox
}: InboxActionsSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Actions">
      <div className="flex flex-col">
        {/* Selection actions */}
        <ActionItem
          icon={<CheckSquareIcon />}
          label="Select All"
          onClick={() => { onSelectAll(); onClose(); }}
        />

        {selectedCount > 0 && (
          <>
            <ActionItem
              icon={<CopyIcon />}
              label={`Copy ${selectedCount} emails`}
              onClick={() => { onCopyAll(); onClose(); }}
            />
            <ActionItem
              icon={<TrashIcon />}
              label={`Delete ${selectedCount} inboxes`}
              onClick={() => { onBatchDelete(); onClose(); }}
              variant="danger"
            />
          </>
        )}

        <Divider />

        {/* Sort options */}
        <ActionGroup label="Sort by">
          <RadioOption
            label="Newest"
            checked={sortBy === 'created'}
            onChange={() => onSortChange('created')}
          />
          <RadioOption
            label="Name A-Z"
            checked={sortBy === 'name'}
            onChange={() => onSortChange('name')}
          />
          <RadioOption
            label="Time Left"
            checked={sortBy === 'ttl'}
            onChange={() => onSortChange('ttl')}
          />
        </ActionGroup>

        <Divider />

        {/* Filter options */}
        <ActionGroup label="Filter">
          <RadioOption
            label="All"
            checked={filterBy === 'all'}
            onChange={() => onFilterChange('all')}
          />
          <RadioOption
            label="Active"
            checked={filterBy === 'active'}
            onChange={() => onFilterChange('active')}
          />
          <RadioOption
            label="Expiring"
            checked={filterBy === 'expiring'}
            onChange={() => onFilterChange('expiring')}
          />
        </ActionGroup>

        <Divider />

        {/* Create action */}
        <ActionItem
          icon={<PlusIcon />}
          label="Create New Inbox"
          onClick={() => { onCreateInbox(); onClose(); }}
          variant="primary"
        />
      </div>
    </BottomSheet>
  );
}

// Sub-components
function ActionItem({ icon, label, onClick, variant = 'default' }) {
  const colors = {
    default: 'text-v3-text-primary',
    danger: 'text-v3-accent-error',
    primary: 'text-v3-accent-primary',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 min-h-[48px]",
        "hover:bg-v3-bg-hover active:bg-v3-bg-surface transition-colors",
        colors[variant]
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
```

### Step 3: Update mobile-inboxes-tab.tsx
```tsx
// Replace InboxesToolbar with CompactToolbar + InboxActionsSheet
export function MobileInboxesTab({ ... }) {
  const [isActionsOpen, setActionsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* New compact toolbar */}
      <CompactToolbar
        selectedCount={selectedInboxIds.size}
        filterLabel={filterBy}
        onMenuOpen={() => setActionsOpen(true)}
        onFilterChange={onFilterChange}
      />

      {/* Inbox list (unchanged) */}
      <PullToRefresh ...>
        {/* ... */}
      </PullToRefresh>

      {/* Action sheet */}
      <InboxActionsSheet
        isOpen={isActionsOpen}
        onClose={() => setActionsOpen(false)}
        selectedCount={selectedInboxIds.size}
        filterBy={filterBy}
        sortBy={sortBy}
        onSelectAll={onSelectAll}
        onCopyAll={onCopyAll}
        onBatchDelete={onBatchDelete}
        onFilterChange={onFilterChange}
        onSortChange={onSortChange}
        onCreateInbox={onCreateInbox}
      />
    </div>
  );
}
```

## Todo List

- [ ] Create `CompactToolbar.tsx` component
- [ ] Create `InboxActionsSheet.tsx` component
- [ ] Create sub-components (ActionItem, ActionGroup, RadioOption)
- [ ] Update `mobile-inboxes-tab.tsx` to use new components
- [ ] Remove old `InboxesToolbar` function (or keep for desktop)
- [ ] Test action sheet animations
- [ ] Test touch targets in sheet
- [ ] Accessibility: focus trap in sheet

## Success Criteria

- [ ] Toolbar footprint reduced to single line
- [ ] All actions accessible via action sheet
- [ ] Sheet opens/closes smoothly
- [ ] Selection count visible when items selected
- [ ] No functionality loss from old toolbar

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Hidden actions harder to discover | Medium | Medium | Add subtle hint on first use |
| Extra tap for common actions | Low | Low | Keep quick filter in toolbar |

## Security Considerations

- No security impact - UI refactor only

## Next Steps

→ Phase 03: Virtualized Inbox List
