# Research Report: Mobile Authentication & Security Patterns

## Executive Summary
For the mobile email client (Expo SDK 54), we recommend a custom authentication flow using `expo-secure-store` for credential persistence and `expo-local-authentication` for biometric access. This approach offers maximum control over the session lifecycle and seamless integration with the existing backend.

## 1. Secure Token Storage
**Recommendation:** Use `expo-secure-store` (AES-256 equivalent encryption).
*   **Android:** Uses Android Keystore system.
*   **iOS:** Uses Keychain Services.
*   **Do NOT use:** `AsyncStorage` (unencrypted, easily accessible).

```typescript
import * as SecureStore from 'expo-secure-store';

async function saveAuthSession(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync('access_token', accessToken);
  await SecureStore.setItemAsync('refresh_token', refreshToken);
}

async function getRefreshToken() {
  return await SecureStore.getItemAsync('refresh_token');
}
```

## 2. Biometric Authentication
**Recommendation:** Use `expo-local-authentication` to wrap secure token access or app unlock.

### Implementation Pattern
1.  **Check Hardware:** `hasHardwareAsync()` & `isEnrolledAsync()`.
2.  **Prompt:** Use `authenticateAsync` with fallback options.
3.  **Android Specifics:** Set `securityClass` to `STRONG` for high security.

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

async function biometricLogin() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Verify identity to access inbox',
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: false,
    cancelLabel: 'Cancel',
  });

  return result.success;
}
```

## 3. JWT & Session Management
**Strategy:** Short-lived Access Token (15m) + Long-lived Refresh Token (7d).

### Refresh Pattern (Axios Interceptor)
1.  **Request:** API call fails with `401 Unauthorized`.
2.  **Interceptor:** Catches error, pauses request queue.
3.  **Refresh:** Uses stored Refresh Token to fetch new Access Token.
4.  **Retry:** Updates header and retries original request.
5.  **Failure:** If refresh fails, clear SecureStore and redirect to Login.

### Code Pattern
```typescript
// Ideally use a library like 'axios-auth-refresh' or custom interceptor
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      // Call backend refresh endpoint...
      const { accessToken } = await refreshAuth(refreshToken);
      await SecureStore.setItemAsync('access_token', accessToken);
      originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
      return axios(originalRequest);
    }
    return Promise.reject(error);
  }
);
```

## 4. API Key & Environment Security
*   **Storage:** NEVER commit `.env` files.
*   **Usage:** Use `expo-constants` (manifest) or `react-native-dotenv` for injection at build time.
*   **Obfuscation:** For high security on Android, consider ProGuard rules in `android/app/proguard-rules.pro` to obfuscate variable names in production builds.

## 5. Security Checklist 2025
- [ ] **SSL Pinning:** Prevent MITM attacks (consider `react-native-ssl-pinning` if highly sensitive).
- [ ] **Root/Jailbreak Detection:** Block access on compromised devices (e.g., `expo-device` context).
- [ ] **Background Privacy:** Blur app screen when in background (AppState listener).
- [ ] **Secure Keyboard:** Disable keyboard cache for password fields.

## 6. Library Comparison for Email Client
| Feature | Clerk | Firebase | Supabase | Custom (Recommended) |
| :--- | :--- | :--- | :--- | :--- |
| **Control** | Medium | Low | Medium | **High** |
| **Cost** | $ (MAU) | Free Tier | Free Tier | **Free (Self-hosted)** |
| **Data Owners** | Clerk | Google | Supabase | **You** |
| **Complexity** | Low | Low | Medium | **High** |

**Conclusion:** For a custom email platform, the **Custom** approach using `SecureStore` + `Axios Interceptors` provides the necessary control over data privacy and backend integration.

## Unresolved Questions
*   Does the backend currently support a dedicated `/refresh-token` endpoint?
*   Are there specific compliance requirements (HIPAA, GDPR) requiring data-at-rest encryption beyond OS defaults?

## Sources
- [Expo SecureStore Docs](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo LocalAuthentication Docs](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [React Native Security Guide](https://reactnative.dev/docs/security)
- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)
