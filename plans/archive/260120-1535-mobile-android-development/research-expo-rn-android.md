# Research Report: Expo & React Native Android Best Practices (2025-2026)

**Date:** 2026-01-20
**Project:** Ephemera (Email Client)
**Stack:** Expo SDK 54, React Native 0.81.5, React 19.1.0, expo-router 6.x

## 1. Expo SDK 54 & React Native 0.81 Findings

### Core Updates
*   **Android 16 (API 36) Ready:** SDK 54 targets the latest Android standards.
*   **Edge-to-Edge by Default:** Android 16 mandates edge-to-edge rendering. `react-native-edge-to-edge` is now integrated into RN core.
    *   *Action:* Remove standalone dependency if present; use `androidNavigationBar.enforceContrast` in `app.json` if needed.
*   **Predictive Back Gesture:** Now supported as an opt-in for Android 16+. Essential for modern Android feel.
*   **"Debug Optimized" Flavor:** New experimental mode enabling C++ optimization in debug builds (up to 30% faster debugging).

### New Architecture (Fabric & TurboModules)
*   **Enabled by Default:** RN 0.81 enables the New Architecture out-of-the-box.
*   **JSI (JavaScript Interface):** Replaces the asynchronous bridge with synchronous, direct C++ calls.
*   **Performance:**
    *   **Fabric Renderer:** Eliminates UI thread bottlenecks, crucial for complex email list scrolling.
    *   **TurboModules:** Lazy-loads native modules, significantly reducing app startup time.

## 2. Expo Router v6 Best Practices

*   **File Structure:**
    *   Use `(tabs)` group for main email views (Inbox, Search, Settings).
    *   Use `_layout.tsx` for persistent headers/tab bars.
    *   Use `index.tsx` explicitly for entry points.
*   **Navigation:**
    *   **Typed Routes:** Leverage TypeScript for compile-time route safety (`href` prop validation).
    *   **Deep Linking:** Native scheme support is automatic. Ensure `scheme` is defined in `app.json` for email magic link handling.
*   **Performance:**
    *   **Lazy Loading:** Routes are lazy-loaded by default in production.
    *   **Shared Groups:** Use `(zShared)` naming convention to control load order if necessary.

## 3. Android-Specific Optimizations for Email Apps

### List Performance (Critical for Inbox)
*   **Use `FlashList`:** Prefer Shopify's `@shopify/flash-list` over `FlatList`. It recycles views more efficiently, essential for long email threads.
*   **Hermes Engine:** Standard in SDK 54. Verify it's enabled in `app.json` (`"jsEngine": "hermes"`).
*   **Image Caching:** Use `expo-image` (replaces `react-native-fast-image`) for caching user avatars and attachment thumbnails.

### 16KB Page Size Requirement
*   **Warning:** Google Play requires 16KB memory page size support starting Nov 2025.
*   **Compliance:** RN 0.81 is compliant. Ensure strict NDK versions if adding custom C++ modules (NDK r27+).

### UI/UX
*   **Ripple Effects:** Use `Pressable` with `android_ripple` for native touch feedback.
*   **Shadows:** Avoid heavy generic shadows; use `elevation` API for Android-specific depth or `react-native-skia` for performant custom shadows.

## 4. EAS Build & Production

*   **Format:** Always build `.aab` (Android App Bundle) for production (`"buildType": "app-bundle"` in `eas.json`).
*   **Play Integrity:** SDK 54 includes `expo-app-integrity`. Integrate this early for anti-abuse/security.
*   **Signing:** Let EAS manage keystores for simplicity, or strictly backup manual keystores (losing this means losing the app ID).

## Recommendations for Ephemera

1.  **Architecture:** Stick to the **New Architecture**. The performance gains for a list-heavy email app are non-negotiable.
2.  **Navigation:** Structure `app/` with clear separation: `(auth)` for login flow, `(app)` for the main client, preventing authorized users from accidentally navigating back to login.
3.  **List Rendering:** Adopt **FlashList** immediately for the main inbox view.
4.  **State Management:** Use **Zustand** or **TanStack Query** (React Query) for email data fetching/caching to keep the UI thread free.
5.  **Testing:** Test strictly on **Android Emulators (API 35/36)** to catch edge-to-edge UI regressions early.

## Unresolved Questions / Next Steps
*   Does the email parsing logic (if local) require a custom C++ JSI module for performance?
*   Specific strategy for background fetch (checking emails) on Android (Headless JS vs. Expo Background Fetch)?

## Sources
*   [Expo SDK 54 Announcement](https://expo.dev/changelog)
*   [React Native 0.81 Release Notes](https://reactnative.dev/blog)
*   [Android 16 Support Guide](https://developer.android.com/about/versions/16)
*   [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
