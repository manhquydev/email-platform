# Implementation Plan - Dropdown Enhancements + Priority 3 UI Fixes

**Date:** 2026-01-08 16:07
**Scope:** 2 parallel tracks - Dropdown improvements + UI polish

---

## Track 1: Dropdown Component Enhancements

### Current State Analysis

**File:** `services/web/src/components/ui/Dropdown.tsx`

**Existing Features:**
- ✅ Click-to-toggle
- ✅ Click-outside-to-close
- ✅ Alignment options (left/right/center)
- ✅ Variant support (default/danger)
- ✅ Disabled state
- ✅ Smooth animations

**Missing Features:**
- ❌ Keyboard navigation (Arrow keys, Enter, Esc)
- ❌ Focus management
- ❌ Sub-menu support (nested dropdowns)
- ❌ Keyboard shortcuts display
- ❌ Divider/separator support
- ❌ Item icons support (currently manual)

---

### Enhancement 1: Keyboard Navigation

**Priority:** High
**Impact:** Accessibility + Power users

**Features to add:**
1. **Esc** - Close dropdown
2. **Arrow Down** - Navigate to next item
3. **Arrow Up** - Navigate to previous item
4. **Enter/Space** - Select focused item
5. **Tab** - Close dropdown + move focus out
6. **Home** - Jump to first item
7. **End** - Jump to last item

**Implementation:**
```tsx
// Add to Dropdown component
const [focusedIndex, setFocusedIndex] = useState(-1);

useEffect(() => {
  if (!isOpen) {
    setFocusedIndex(-1);
    return;
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % itemCount);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + itemCount) % itemCount);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        // Trigger focused item click
        break;
      case 'Home':
        setFocusedIndex(0);
        break;
      case 'End':
        setFocusedIndex(itemCount - 1);
        break;
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isOpen, focusedIndex, itemCount]);
```

**Changes needed:**
- Add `focusedIndex` state to Dropdown
- Pass `focusedIndex` to DropdownMenu via context
- DropdownItem receives `isFocused` prop
- Add visual focus indicator (ring-2 ring-primary)
- Auto-scroll focused item into view

---

### Enhancement 2: Divider Support

**Priority:** Medium
**Impact:** Better visual grouping

**New component:**
```tsx
export function DropdownDivider() {
  return (
    <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
  );
}
```

**Usage:**
```tsx
<DropdownMenu>
  <DropdownItem>Settings</DropdownItem>
  <DropdownItem>Profile</DropdownItem>
  <DropdownDivider />
  <DropdownItem variant="danger">Logout</DropdownItem>
</DropdownMenu>
```

---

### Enhancement 3: Icon Prop Support

**Priority:** Low
**Impact:** Cleaner API

**Current (manual):**
```tsx
<DropdownItem onClick={...}>
  <span className="material-symbols-outlined">settings</span>
  <span>Settings</span>
</DropdownItem>
```

**Proposed:**
```tsx
<DropdownItem onClick={...} icon="settings">
  Settings
</DropdownItem>
```

**Implementation:**
```tsx
interface DropdownItemProps {
  icon?: string;  // Material icon name
  children: ReactNode;
  // ... existing props
}

export function DropdownItem({ icon, children, ... }: DropdownItemProps) {
  return (
    <button ...>
      {icon && (
        <span className="material-symbols-outlined text-[20px]">
          {icon}
        </span>
      )}
      {typeof children === 'string' ? <span>{children}</span> : children}
    </button>
  );
}
```

---

### Enhancement 4: Shortcut Display

**Priority:** Low
**Impact:** Discoverability

**New prop:**
```tsx
interface DropdownItemProps {
  shortcut?: string;  // "⌘K", "Ctrl+S", etc.
}
```

**Render:**
```tsx
<button ...>
  {icon && <span ...>{icon}</span>}
  <span className="flex-1">{children}</span>
  {shortcut && (
    <span className="text-xs text-slate-400 dark:text-gray-500">
      {shortcut}
    </span>
  )}
</button>
```

---

## Track 2: Priority 3 UI Fixes

### Issue 7: Settings Icon Inconsistency

**Problem:** Globe icon uses `<Link>` instead of consistent pattern

**Location:** Settings.tsx (removed in refactor, but check SettingsTabs)

**Status:** ✅ Already fixed by Settings refactor
- Settings page không còn globe icon link
- Tất cả icons trong SettingsTabs đều dùng `material-symbols-outlined`

---

### Issue 8: "GÓI MIỄN PHÍ" Badge - Small Text

**Problem:** Text quá nhỏ (text-xs) với contrast borderline

**Location:** `NavigationSidebar.tsx:142-147`

**Current:**
```tsx
<span className="text-xs text-slate-500 dark:text-gray-500 truncate w-full uppercase">
  Gói {user?.tier === 'FREE' ? 'MIỄN PHÍ' : ...}
</span>
```

**Fix:**
```tsx
<span className="text-xs font-semibold text-slate-600 dark:text-gray-400 truncate w-full uppercase tracking-wide">
  Gói {user?.tier === 'FREE' ? 'MIỄN PHÍ' : ...}
</span>
```

**Changes:**
- `text-gray-500` → `text-gray-400` (better contrast)
- `text-slate-500` → `text-slate-600` (better light mode contrast)
- Add `font-semibold` (bolder text)
- Add `tracking-wide` (better readability for uppercase)

---

### Issue 9: Inbox Manager - Tab Border Radius

**Problem:** Selected/unselected tabs có different border-radius

**Location:** InboxManager.tsx - Tab navigation

**Need to find:** TabNavigation component usage

**Expected fix:**
- Standardize `rounded-lg` hoặc `rounded-xl` cho tất cả tab states
- Ensure consistency between active/inactive tabs

---

## Implementation Order

### Phase 1: Quick Wins (30 mins)
1. ✅ Fix "GÓI MIỄN PHÍ" badge contrast
2. ✅ Fix tab border radius in InboxManager
3. ✅ Verify icon consistency (already fixed)

### Phase 2: Dropdown Keyboard Nav (1-2 hours)
1. Add keyboard event handlers
2. Implement focus management
3. Add visual focus indicators
4. Test keyboard navigation flow

### Phase 3: Dropdown Polish (30 mins)
1. Add DropdownDivider component
2. Add icon prop support
3. Add shortcut display (optional)

---

## Files to Modify

### Track 1: Dropdown
- `services/web/src/components/ui/Dropdown.tsx` - Add keyboard nav + enhancements

### Track 2: Priority 3
- `services/web/src/components/NavigationSidebar.tsx` - Fix badge contrast
- `services/web/src/pages/InboxManager.tsx` - Fix tab border radius
- `services/web/src/components/TabNavigation.tsx` - If exists

---

## Testing Checklist

### Dropdown Enhancements
- [ ] Esc closes dropdown
- [ ] Arrow keys navigate items
- [ ] Enter/Space activates focused item
- [ ] Tab closes dropdown
- [ ] Home/End jump to first/last
- [ ] Visual focus indicator visible
- [ ] Keyboard nav works in dark mode
- [ ] Click still works alongside keyboard

### Priority 3 Fixes
- [ ] Badge text readable in both themes
- [ ] Badge contrast meets WCAG AA
- [ ] Tab border radius consistent
- [ ] Active/inactive tabs styled uniformly
- [ ] No visual regressions

---

## Expected Impact

### Dropdown Enhancements
- ✅ Better accessibility (keyboard users)
- ✅ Improved power user experience
- ✅ Cleaner API with icon prop
- ✅ Professional polish with shortcuts

### Priority 3 Fixes
- ✅ Better visual consistency
- ✅ Improved readability (badge)
- ✅ Professional finish
- ✅ WCAG compliance

---

## Risk Assessment

**Low risk:**
- All changes are additive (Dropdown) or minor tweaks (Priority 3)
- No breaking changes to existing API
- Keyboard nav is opt-in (doesn't break mouse users)

**Testing priority:**
- Keyboard navigation (new functionality)
- Focus management (accessibility critical)
- Badge contrast (visual regression check)

---

## Next Steps

1. Implement Priority 3 fixes first (quick wins)
2. Implement Dropdown keyboard navigation
3. Add Dropdown polish features
4. Test thoroughly
5. Commit + push

Ready to proceed?
