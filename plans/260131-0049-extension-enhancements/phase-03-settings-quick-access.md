# Phase 3: Settings Quick Access

## Context Links
- [App.tsx](../../services/extension/src/entrypoints/popup/App.tsx)
- [Settings.tsx](../../services/extension/src/components/popup/Settings.tsx)
- [storage.ts](../../services/extension/src/shared/storage.ts)

## Overview
- **Priority:** Low
- **Status:** Pending
- **Effort:** 1h

Preload settings on app mount for instant Settings page access.

## Key Insights
- Settings.tsx calls `loadSettings()` on mount - causes brief loading state
- App.tsx already calls `storage.getSettings()` for theme on mount
- Settings are small (~100 bytes) - safe to keep in memory
- React context could share settings across components

## Requirements

### Functional
- Settings available instantly when navigating to Settings page
- Theme still applied on mount (already works)
- Settings updates reflected immediately

### Non-Functional
- No perceivable delay when opening Settings
- Memory overhead < 1KB

## Architecture

Current:
```
[App mounts] --> [getSettings for theme]
[Settings mounts] --> [getSettings again] --> [render]
```

Enhanced:
```
[App mounts] --> [getSettings] --> [store in context]
                      |
[Settings mounts] --> [read from context] --> [instant render]
```

## Related Code Files

### Modify
- `services/extension/src/entrypoints/popup/App.tsx`
- `services/extension/src/components/popup/Settings.tsx`

### Create
- `services/extension/src/context/SettingsContext.tsx` (optional, can use prop drilling)

## Implementation Steps

### Option A: Simple Prop Drilling (Recommended - KISS)

#### Step 1: Lift settings state to App.tsx
```typescript
// In App.tsx, add state
const [settings, setSettings] = useState<StorageData['settings'] | null>(null);

// Update initTheme to also store settings
const initTheme = async () => {
  const loadedSettings = await storage.getSettings();
  setSettings(loadedSettings);
  applyTheme(loadedSettings.theme);
  // ... rest of listener setup
};

// Update storage listener to also update state
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    const newValue = changes.settings.newValue as StorageData['settings'];
    if (newValue) {
      setSettings(newValue);
      applyTheme(newValue.theme);
    }
  }
});
```

#### Step 2: Pass settings to Settings component
```typescript
// In renderContent, settings case:
case 'settings':
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Settings
        onBack={() => setCurrentView({ type: 'home' })}
        onLogout={handleLogout}
        initialSettings={settings}  // Pass preloaded settings
      />
    </Suspense>
  );
```

#### Step 3: Update Settings.tsx to use initial prop
```typescript
interface SettingsProps {
  onBack: () => void;
  onLogout: () => void;
  initialSettings?: StorageData['settings'] | null;
}

export default function Settings({ onBack, onLogout, initialSettings }: SettingsProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [autoCopy, setAutoCopy] = useState(initialSettings?.autoCopy ?? true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    initialSettings?.theme || 'system'
  );

  useEffect(() => {
    loadUser();
    checkNotificationStatus();
    // Only load settings if not provided
    if (!initialSettings) {
      loadSettings();
    }
  }, []);

  // Remove or make conditional the loadSettings call
  const loadSettings = async () => {
    if (initialSettings) return; // Skip if already have settings
    const settings = await storage.getSettings();
    setAutoCopy(settings.autoCopy);
    setTheme(settings.theme || 'system');
  };
  // ...
}
```

### Option B: React Context (More Scalable)

If settings needed in many components, create context:

```typescript
// context/SettingsContext.tsx
const SettingsContext = createContext<{
  settings: StorageData['settings'] | null;
  updateSettings: (updates: Partial<StorageData['settings']>) => Promise<void>;
}>({ settings: null, updateSettings: async () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState<StorageData['settings'] | null>(null);

  useEffect(() => {
    storage.getSettings().then(setSettings);
    // Listen for changes...
  }, []);

  const updateSettings = async (updates) => {
    await storage.updateSettings(updates);
    setSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
```

**Recommendation:** Use Option A (prop drilling) - simpler, only Settings needs it.

## Todo List
- [ ] Add settings state to App.tsx
- [ ] Update initTheme to store settings in state
- [ ] Update storage listener to sync settings state
- [ ] Pass initialSettings prop to Settings component
- [ ] Update Settings.tsx interface to accept initialSettings
- [ ] Use initialSettings for default state values
- [ ] Skip loadSettings if initialSettings provided
- [ ] Test Settings page loads instantly

## Success Criteria
- [ ] Settings page renders without loading spinner
- [ ] Theme toggle works immediately
- [ ] Auto-copy toggle works immediately
- [ ] Settings persist after toggling

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stale settings | Low | Low | Storage listener syncs |
| Props mismatch | Low | Low | TypeScript catches |

## Security Considerations
- Settings contain no sensitive data
- Already stored in browser.storage.local
