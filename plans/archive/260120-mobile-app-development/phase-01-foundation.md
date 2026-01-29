# Phase 7.1: Mobile App Foundation

**Duration:** 2 weeks
**Status:** Planned
**Prerequisites:** Phase 6 Complete ✅

---

## Overview

Set up React Native + Expo project with authentication, navigation, and secure storage foundation.

---

## Week 1: Project Setup & Navigation

### Day 1-2: Project Initialization

```bash
# Create Expo project
npx create-expo-app@latest ephemera-mobile --template expo-template-blank-typescript

# Directory structure
services/mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/
│   │   ├── inboxes.tsx
│   │   ├── settings.tsx
│   │   └── _layout.tsx
│   ├── inbox/[id].tsx
│   ├── message/[id].tsx
│   └── _layout.tsx
├── src/
│   ├── api/
│   ├── components/
│   ├── hooks/
│   ├── store/
│   ├── types/              # Copied from web
│   └── utils/
├── app.json
├── package.json
└── tsconfig.json
```

### Tasks
- [ ] Initialize Expo project with TypeScript
- [ ] Configure `app.json` (name, slug, icons, splash)
- [ ] Set up ESLint + Prettier
- [ ] Copy `types.ts` from `services/web/src/`
- [ ] Configure path aliases (`@/` → `src/`)

### Day 3-4: Navigation Structure

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function RootLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SplashScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="(auth)" />
      )}
    </Stack>
  );
}
```

### Tasks
- [ ] Install Expo Router
- [ ] Create auth group `(auth)/` with login, register
- [ ] Create tabs group `(tabs)/` with inboxes, settings
- [ ] Create dynamic routes: `inbox/[id]`, `message/[id]`
- [ ] Configure deep linking

### Day 5: Dependencies Installation

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-secure-store": "~13.0.0",
    "expo-local-authentication": "~14.0.0",
    "expo-notifications": "~0.28.0",
    "@tanstack/react-query": "^5.50.0",
    "zustand": "^4.5.0",
    "react-native-render-html": "^6.3.0",
    "react-native-safe-area-context": "4.10.1",
    "react-native-screens": "~3.31.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.0",
    "typescript": "~5.3.0"
  }
}
```

### Tasks
- [ ] Install core dependencies
- [ ] Install dev dependencies
- [ ] Verify Expo Go compatibility
- [ ] Test on iOS Simulator + Android Emulator

---

## Week 2: Authentication & API Client

### Day 6-7: API Client

```typescript
// src/api/client.ts
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.ephemera.app';

class ApiClient {
  private token: string | null = null;

  async init() {
    this.token = await SecureStore.getItemAsync('auth_token');
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.message || 'Request failed', response.status);
    }

    return response.json();
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      SecureStore.setItemAsync('auth_token', token);
    } else {
      SecureStore.deleteItemAsync('auth_token');
    }
  }
}

export const api = new ApiClient();
```

### Tasks
- [ ] Create `ApiClient` class with token management
- [ ] Implement `SecureStore` for token persistence
- [ ] Add request/response interceptors
- [ ] Create API error handling
- [ ] Add retry logic for network failures

### Day 8-9: Auth Store & Hooks

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { api } from '@/api/client';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { token, user } = await api.request<{ token: string; user: User }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    api.setToken(token);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    api.setToken(null);
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      await api.init();
      const { user } = await api.request<{ user: User }>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));
```

### Tasks
- [ ] Create Zustand auth store
- [ ] Implement `login`, `logout`, `checkAuth` actions
- [ ] Add `register` action
- [ ] Create `useAuth` hook wrapper
- [ ] Handle token expiration

### Day 10: Login & Register Screens

```typescript
// app/(auth)/login.tsx
import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    try {
      await login(email, password);
      router.replace('/(tabs)/inboxes');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng nhập</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Tasks
- [ ] Create Login screen with email/password
- [ ] Create Register screen
- [ ] Add form validation
- [ ] Implement error display
- [ ] Add loading states

### Day 11: Biometric Authentication

```typescript
// src/utils/biometrics.ts
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export const BiometricAuth = {
  async isAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  },

  async authenticate(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Mở khóa Ephemera',
      fallbackLabel: 'Sử dụng mật khẩu',
    });
    return result.success;
  },

  async enableBiometric(token: string): Promise<void> {
    await SecureStore.setItemAsync('biometric_token', token, {
      requireAuthentication: true,
    });
  },

  async getBiometricToken(): Promise<string | null> {
    return SecureStore.getItemAsync('biometric_token', {
      requireAuthentication: true,
    });
  },
};
```

### Tasks
- [ ] Check biometric hardware availability
- [ ] Implement Face ID / Touch ID prompt
- [ ] Store token with biometric protection
- [ ] Add biometric unlock on app resume
- [ ] Settings toggle for biometric

### Day 12-14: Testing & Polish

### Tasks
- [ ] Test on iOS device (TestFlight)
- [ ] Test on Android device (APK)
- [ ] Fix platform-specific issues
- [ ] Add splash screen
- [ ] Add app icons
- [ ] Create loading states
- [ ] Handle network errors gracefully

---

## Deliverables

| Deliverable | Status |
|-------------|--------|
| Expo project initialized | ⬜ |
| Navigation structure complete | ⬜ |
| API client with token management | ⬜ |
| Login/Register screens | ⬜ |
| Biometric authentication | ⬜ |
| Auth state persistence | ⬜ |
| iOS + Android tested | ⬜ |

---

## Success Criteria

- [ ] User can login with email/password
- [ ] User can register new account
- [ ] Token persists across app restarts
- [ ] Biometric unlock works (if enabled)
- [ ] Navigation guards protect authenticated routes
- [ ] Error states display correctly
- [ ] App runs on iOS 15+ and Android 10+

---

## Files to Create

```
services/mobile/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── inboxes.tsx
│   │   └── settings.tsx
│   ├── _layout.tsx
│   └── index.tsx
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   └── auth.ts
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── LoadingSpinner.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── store/
│   │   └── authStore.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── biometrics.ts
│       └── secureStorage.ts
├── app.json
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Environment Variables

```env
# .env.example
EXPO_PUBLIC_API_URL=https://api.ephemera.app
```

---

## Next Phase

After Foundation phase, proceed to **Phase 7.1.2: Core Features** (3 weeks):
- Inbox list screen
- Message list with pagination
- Message detail view
- Attachment handling
