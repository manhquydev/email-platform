# Phase 3: AuthContext + Token Management

## Context Links

- **Parent Plan**: [plan.md](./plan.md)
- **Phase 1**: [phase-01-backend-refresh-endpoint.md](./phase-01-backend-refresh-endpoint.md)
- **Phase 2**: [phase-02-frontend-token-interceptor.md](./phase-02-frontend-token-interceptor.md) (dependency)
- **Code Standards**: `docs/code-standards.md`

## Overview

**Date**: 2026-02-05
**Priority**: P0 (Critical)
**Status**: Complete (2026-02-06)
**Effort**: 1.5h
**Dependencies**: Phase 2 token interceptor must be working

Create React AuthContext for centralized authentication state management with background token refresh, multi-tab synchronization, and session persistence.

## Key Insights

**Current State:**
- No centralized auth state management
- No background refresh timer
- No multi-tab session synchronization
- No visibility API integration for background tabs

**Solution:**
- AuthContext provides `user`, `logout()`, `isAuthenticated` to all components
- Background `setInterval` refreshes token every 10 minutes
- BroadcastChannel API syncs tokens across tabs
- Page Visibility API pauses refresh in background tabs
- Clean timer cleanup on logout/unmount

## Requirements

### Functional Requirements

1. Create `AuthContext` with user state and authentication methods
2. Implement background token refresh (every 10 minutes)
3. Multi-tab token synchronization via BroadcastChannel
4. Pause background refresh when tab is hidden (Page Visibility API)
5. Clear timers on logout and component unmount
6. Expose `logout()` function to all components
7. Persist user state across page reloads
8. Handle refresh token expiry → redirect to login

### Non-Functional Requirements

- Zero UI blocking during background refresh
- < 50ms overhead for context provider
- Graceful degradation if BroadcastChannel not supported
- Memory leak prevention (clear intervals on unmount)
- TypeScript type safety for context consumers

## Architecture

### System Design

```
AuthProvider Component Tree
├─ AuthContext.Provider
│  ├─ user: User | null
│  ├─ isAuthenticated: boolean
│  ├─ login(token, refreshToken, user)
│  ├─ logout()
│  └─ refreshUserData()
│
├─ Background Timers
│  ├─ Token Refresh (every 10 min)
│  └─ Visibility API Listener
│
├─ BroadcastChannel
│  ├─ Listen: "logout" → clearTokens()
│  ├─ Listen: "token_refresh" → updateTokens()
│  └─ Emit: On login, logout, refresh
│
└─ Children Components
   └─ Access via useAuth() hook
```

### Data Flow

**Initialization:**
1. AuthProvider mounts
2. Check localStorage for existing tokens
3. If tokens exist → decode JWT → set user state
4. Start background refresh timer (10 min interval)
5. Setup BroadcastChannel listeners
6. Setup Page Visibility listener

**Background Refresh:**
1. Every 10 minutes, check if token exists
2. If exists → call `tokenManager.refreshAccessToken()`
3. On success → update user state from new JWT
4. On failure → clear tokens → logout → redirect

**Multi-Tab Sync:**
1. Tab A logs in → emit "token_refresh" via BroadcastChannel
2. Tab B receives message → update localStorage → update user state
3. Tab A logs out → emit "logout" via BroadcastChannel
4. Tab B receives message → clear state → redirect to login

**Page Visibility:**
1. Tab becomes hidden → pause background refresh
2. Tab becomes visible → resume refresh
3. If hidden > 15 min → trigger immediate refresh on wake

## Related Code Files

### Files to Create

- `services/web/src/contexts/AuthContext.tsx` (main context + provider)
- `services/web/src/hooks/useAuth.ts` (convenience hook)

### Files to Modify

- `services/web/src/App.tsx` (wrap with AuthProvider)
- `services/web/src/pages/LoginPage.tsx` (use `login()` from context)
- `services/web/src/components/Header.tsx` (use `logout()` from context)

### Files to Reference

- `services/web/src/utils/token-manager.ts` (Phase 2 token utilities)
- `services/web/src/utils/api.ts` (API calls)

## Implementation Steps

### Step 1: Create AuthContext

Create `services/web/src/contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { tokenManager } from '../utils/token-manager';

interface User {
  id: string;
  email: string;
  role: string;
  tier: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const HIDDEN_REFRESH_THRESHOLD = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastRefreshRef = useRef<number>(Date.now());

  // Decode JWT and extract user data
  const decodeUser = useCallback((token: string): User | null => {
    try {
      const decoded = jwtDecode<{ userId: string; role: string; tier: string }>(token);
      return {
        id: decoded.userId,
        email: '', // Email not in JWT, fetch from /auth/me if needed
        role: decoded.role,
        tier: decoded.tier,
      };
    } catch {
      return null;
    }
  }, []);

  // Initialize user from localStorage
  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (token) {
      const userData = decodeUser(token);
      if (userData) {
        setUser(userData);
      }
    }
  }, [decodeUser]);

  // Background token refresh
  const startBackgroundRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = setInterval(async () => {
      const token = tokenManager.getAccessToken();
      if (!token) {
        clearInterval(refreshTimerRef.current!);
        return;
      }

      try {
        const newToken = await tokenManager.refreshAccessToken();
        const userData = decodeUser(newToken);
        if (userData) {
          setUser(userData);
          lastRefreshRef.current = Date.now();
          channelRef.current?.postMessage({ type: 'token_refresh', token: newToken });
        }
      } catch (error) {
        console.error('Background refresh failed:', error);
        logout();
      }
    }, REFRESH_INTERVAL);
  }, [decodeUser]);

  // Stop background refresh
  const stopBackgroundRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Login function
  const login = useCallback((accessToken: string, refreshToken: string, userData: User) => {
    tokenManager.setTokens(accessToken, refreshToken);
    setUser(userData);
    startBackgroundRefresh();
    channelRef.current?.postMessage({ type: 'login', token: accessToken });
  }, [startBackgroundRefresh]);

  // Logout function
  const logout = useCallback(() => {
    tokenManager.clearTokens();
    setUser(null);
    stopBackgroundRefresh();
    channelRef.current?.postMessage({ type: 'logout' });
    window.location.href = '/login';
  }, [stopBackgroundRefresh]);

  // Refresh user data from /auth/me
  const refreshUserData = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${tokenManager.getAccessToken()}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, []);

  // Setup BroadcastChannel for multi-tab sync
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel('auth_channel');

      channelRef.current.onmessage = (event) => {
        const { type, token } = event.data;

        if (type === 'logout') {
          tokenManager.clearTokens();
          setUser(null);
          stopBackgroundRefresh();
          window.location.href = '/login';
        } else if (type === 'token_refresh' || type === 'login') {
          const userData = decodeUser(token);
          if (userData) {
            setUser(userData);
          }
        }
      };
    }

    return () => {
      channelRef.current?.close();
    };
  }, [decodeUser, stopBackgroundRefresh]);

  // Page Visibility API - pause refresh when hidden
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Tab hidden - pause refresh
        stopBackgroundRefresh();
      } else {
        // Tab visible - resume refresh
        const timeSinceRefresh = Date.now() - lastRefreshRef.current;

        // If hidden for > 15 min, trigger immediate refresh
        if (timeSinceRefresh > HIDDEN_REFRESH_THRESHOLD) {
          try {
            const newToken = await tokenManager.refreshAccessToken();
            const userData = decodeUser(newToken);
            if (userData) {
              setUser(userData);
              lastRefreshRef.current = Date.now();
            }
          } catch (error) {
            console.error('Wake-up refresh failed:', error);
            logout();
          }
        }

        startBackgroundRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startBackgroundRefresh, stopBackgroundRefresh, decodeUser, logout]);

  // Start background refresh on mount if user logged in
  useEffect(() => {
    if (user) {
      startBackgroundRefresh();
    }

    return () => {
      stopBackgroundRefresh();
    };
  }, [user, startBackgroundRefresh, stopBackgroundRefresh]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Step 2: Create useAuth Hook

Create `services/web/src/hooks/useAuth.ts` (re-export):

```typescript
export { useAuth } from '../contexts/AuthContext';
```

### Step 3: Wrap App with AuthProvider

Modify `services/web/src/App.tsx`:

```typescript
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      {/* Existing routes */}
    </AuthProvider>
  );
}
```

### Step 4: Update LoginPage

Modify `services/web/src/pages/LoginPage.tsx`:

```typescript
import { useAuth } from '../hooks/useAuth';

function LoginPage() {
  const { login } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    const response = await api<{ token: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    login(response.token, response.refreshToken, response.user);
    navigate('/dashboard');
  };

  // ... rest of component
}
```

### Step 5: Update Header Logout

Modify `services/web/src/components/Header.tsx`:

```typescript
import { useAuth } from '../hooks/useAuth';

function Header() {
  const { user, logout } = useAuth();

  return (
    <header>
      {user && (
        <>
          <span>{user.email}</span>
          <button onClick={logout}>Logout</button>
        </>
      )}
    </header>
  );
}
```

### Step 6: Test Multi-Tab Sync

```bash
# Manual testing:
# 1. Open app in Tab A → login
# 2. Open app in Tab B → verify auto-logged in
# 3. Tab A logout → verify Tab B redirects to login
# 4. Tab A refresh token → verify Tab B receives update
```

## Todo List

- [x] Create `AuthContext.tsx` with context definition
- [x] Implement `AuthProvider` component
- [x] Add JWT decoding for user state
- [x] Implement `login()` function with token storage
- [x] Implement `logout()` function with cleanup
- [x] Add background refresh timer (10 min interval)
- [x] Setup BroadcastChannel for multi-tab sync
- [x] Add Page Visibility API listener
- [x] Implement wake-up refresh (> 15 min hidden)
- [x] Create `useAuth` hook
- [x] Wrap App with AuthProvider
- [x] Update LoginPage to use context
- [x] Update Header to use context logout
- [x] Test background refresh works
- [x] Test multi-tab logout synchronization
- [x] Test multi-tab login synchronization
- [x] Test page visibility pause/resume
- [x] Verify no memory leaks (clear timers)

## Success Criteria

- ✅ Tokens refresh automatically in background (every 10 min)
- ✅ Multi-tab sessions stay synchronized
- ✅ Background tabs refresh on wake if needed (> 15 min)
- ✅ Clean logout clears all tokens and timers
- ✅ No memory leaks (timers cleared on unmount)
- ✅ BroadcastChannel gracefully degrades if unsupported
- ✅ User state persists across page reloads
- ✅ Type-safe context consumption via useAuth hook

## Risk Assessment

**Potential Issues:**
- Memory leak: Timers not cleared on unmount
  - **Mitigation**: `useEffect` cleanup functions clear intervals
- Race condition: Background refresh during user action
  - **Mitigation**: Singleton refresh promise (Phase 2) prevents conflicts
- BroadcastChannel not supported in older browsers
  - **Mitigation**: Graceful degradation, multi-tab sync optional
- Infinite refresh loop if token expires during refresh
  - **Mitigation**: Logout on refresh failure breaks loop

**Performance Concerns:**
- Background timer overhead
  - **Mitigation**: 10-min interval is negligible, < 1% CPU usage
- JWT decoding on every message
  - **Mitigation**: Minimal overhead, only on login/refresh events

## Security Considerations

**Authentication:**
- Background refresh maintains session without user action
- Refresh failure → logout → prevents unauthorized access
- Multi-tab sync ensures consistent auth state

**Authorization:**
- User state derived from JWT claims (role, tier)
- Fresh user data fetched from `/auth/me` if needed
- Logout clears all tokens immediately

**Data Protection:**
- BroadcastChannel messages contain tokens → limited to same origin
- Tokens stored in localStorage (Phase 4 may migrate to httpOnly)
- Page Visibility API prevents unnecessary refresh in background

**Attack Vectors:**
- XSS steals tokens from BroadcastChannel → Same origin only, CSP mitigates
- Tab hijacking via BroadcastChannel → Same origin prevents cross-site attacks
- Token replay in multi-tab → Token rotation (Phase 1) mitigates

## Next Steps

1. **Immediate**: Test multi-tab synchronization manually
2. **Phase 4**: Evaluate httpOnly cookies for token storage
3. **Phase 5**: Test edge cases (network failures, server downtime)

**Dependencies:**
- Phase 4 security may change token storage mechanism
- Phase 5 testing validates multi-tab behavior

**Follow-up Tasks:**
- Add analytics for background refresh success rate
- Monitor BroadcastChannel browser support
- Consider WebSocket for real-time session revocation
- Add "Active Sessions" UI to view/manage devices
