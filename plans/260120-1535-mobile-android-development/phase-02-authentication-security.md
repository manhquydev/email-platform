# Phase 2: Authentication & Security

## Priority: P0 (Critical)
## Effort: 6h
## Status: pending

## Context Links
- Research: `./research-mobile-auth-security.md`
- Backend: `services/api/src/routes/auth.ts`
- Existing: `services/mobile/src/hooks/useAuth.ts`

## Overview
Hoàn thiện authentication flow với secure token storage, biometric unlock, và JWT refresh logic.

## Key Insights
- Backend hỗ trợ: Access Token (15m) + Refresh Token (7d)
- `expo-secure-store` sử dụng Android Keystore
- 2FA flow đã có trên backend

## Requirements

### Functional
- Login/Register với email + password
- Biometric unlock (fingerprint/face)
- Auto refresh token khi expired
- 2FA TOTP support

### Non-functional
- Token encrypted at rest
- No sensitive data in logs

## Architecture

```
User Action → useAuth hook → authStore (Zustand)
                    ↓
            SecureStore (tokens)
                    ↓
            API Client (axios) → Backend
                    ↓
            401 Error → Refresh Interceptor
```

## Implementation Steps

### 2.1 Enhance authStore.ts (1.5h)
```typescript
// services/mobile/src/store/authStore.ts
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Actions
- login(email, password) → save tokens to SecureStore
- logout() → clear SecureStore
- checkAuth() → load from SecureStore on app start
- refreshToken() → call /auth/refresh endpoint
```

### 2.2 Implement Token Refresh Interceptor (1.5h)
```typescript
// services/mobile/src/api/client.ts
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await authStore.getState().refreshToken();
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios(error.config);
      }
    }
    return Promise.reject(error);
  }
);
```

### 2.3 Biometric Authentication (1.5h)
```typescript
// services/mobile/src/utils/biometrics.ts
export async function biometricUnlock(): Promise<boolean> {
  const hasHardware = await LocalAuth.hasHardwareAsync();
  const isEnrolled = await LocalAuth.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) return false;

  const result = await LocalAuth.authenticateAsync({
    promptMessage: 'Xác thực để truy cập hộp thư',
    fallbackLabel: 'Nhập PIN',
    cancelLabel: 'Hủy',
  });

  return result.success;
}
```

### 2.4 Integrate Biometric in Settings (1h)
- Add toggle in Settings screen
- Store preference in SecureStore
- Check on app resume (AppState listener)

### 2.5 2FA Support (0.5h)
- Handle `requires2FA: true` response
- Navigate to 2FA verification screen
- Submit TOTP code

## Todo List
- [ ] Refactor authStore with SecureStore integration
- [ ] Implement axios refresh interceptor
- [ ] Create biometrics utility
- [ ] Add biometric toggle in Settings
- [ ] Handle 2FA flow
- [ ] Test token expiry scenarios

## Success Criteria
- [ ] Login persists after app restart
- [ ] Biometric unlock works on supported devices
- [ ] Token auto-refreshes without user action
- [ ] 2FA flow completes successfully

## Security Checklist
- [ ] Tokens stored in SecureStore only
- [ ] No tokens in AsyncStorage/logs
- [ ] Password fields have secureTextEntry
- [ ] Screen blurs on app background

## Files to Modify
- `src/store/authStore.ts`
- `src/api/client.ts`
- `src/utils/biometrics.ts`
- `src/hooks/useAuth.ts`
- `app/(tabs)/settings.tsx`
- `app/(auth)/login.tsx`
