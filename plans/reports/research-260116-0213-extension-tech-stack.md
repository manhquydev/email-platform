# Research Report: Cross-Browser Extension Tech Stack (2026)

## Executive Summary
This report evaluates modern technical stacks for building cross-browser extensions (Chrome, Firefox, Safari) using React and Vite. While the current project uses **CRXJS**, the 2026 landscape highlights **WXT** as the industry leader for maintainability and cross-browser support, with **Plasmo** remaining a solid choice for "Next.js-like" abstraction.

## Current Project Context
- **Path**: `D:\project\Clone\email-platform\services\extension`
- **Current Stack**: React 18 + Vite 5 + `@crxjs/vite-plugin` (v2.0.0-beta.23).
- **Status**: Functional for Chrome (MV3); lacks native polyfill for cross-browser namespace consistency.

## Tech Stack Comparison

| Feature | CRXJS | Plasmo | WXT (Top Pick 2026) |
| :--- | :--- | :--- | :--- |
| **Philosophy** | Build tool (Vite plugin) | Opinionated Framework | Framework-agnostic Builder |
| **Bundler** | Vite (Native) | Parcel (Default) | Vite (Native) |
| **HMR** | Best-in-class for scripts | React-only focus | Industry-leading stability |
| **Cross-Browser** | Limited (Chrome focus) | Good (MV2/MV3) | Excellent (Native support) |
| **Dev Speed** | High (Zero-config) | Very High (Abstractions) | High (Auto-imports/Types) |
| **Maintainability** | Moderate (Manual boilerplate) | High (Standardized) | Very High (Modular/Clean) |

## Detailed Analysis

### 1. CRXJS (`@crxjs/vite-plugin`)
- **Pros**: Minimalist, uses `manifest.json` as source of truth. Exceptional HMR for content scripts.
- **Cons**: Still in beta for Vite 5+; cross-browser support for Firefox/Safari requires manual polyfill integration and build-script hacking.
- **2026 Outlook**: Remains a favorite for Chrome-first developers who want full control over the build pipeline.

### 2. Plasmo Framework
- **Pros**: "Next.js for extensions." Includes built-in storage, messaging, and UI injection (CSUI). Handles manifest generation.
- **Cons**: Historically tied to Parcel (slower than Vite). Some community concerns regarding maintenance frequency in late 2025.
- **2026 Outlook**: Best for teams wanting an all-in-one "battery-included" experience.

### 3. WXT (Web Extension Toolbox)
- **Pros**: The modern standard in 2026. Native Vite support. Auto-imports, file-based entry points, and effortless cross-browser builds (Chrome, Firefox, Safari, Edge).
- **Cons**: Migration overhead from existing CRXJS setups.
- **2026 Outlook**: Highly recommended for the current project's expansion into multi-browser support.

### 4. Web Extension Polyfill (`mozilla/webextension-polyfill`)
- **Essential in 2026**: Despite MV3's progress, `chrome.*` (callbacks) vs `browser.*` (promises) inconsistencies persist.
- **Strategy**: Use the polyfill to target the `browser` namespace globally. WXT and Plasmo often abstract this away; CRXJS requires manual setup.

## Safari-Specific Integration
- **Constraint**: Safari extensions (especially on iOS) must be embedded in a native Swift application.
- **Workflow**: `npm run build` -> Copy artifacts to Xcode `Resources` -> Build via Xcode.
- **Recommendation**: Use a builder (like WXT) that automates the generation of the `SafariWebExtensionHandler` boilerplate.

## Strategic Recommendation
1. **Immediate**: Add `webextension-polyfill` to the current CRXJS setup to improve Firefox compatibility.
2. **Growth**: Plan a migration to **WXT** if Safari/iOS support becomes a high priority. WXT provides the cleanest abstraction for the native app wrapping required by Apple.

## Sources
- [CRXJS Documentation & GitHub](https://github.com/crxjs/chrome-extension-tools)
- [WXT - Next-gen Web Extension Framework](https://wxt.dev/)
- [Plasmo - The Browser Extension Framework](https://www.plasmo.com/)
- [Mozilla WebExtension Polyfill](https://github.com/mozilla/webextension-polyfill)
- [Building Safari Extensions with React/Vite (Medium)](https://medium.com/@username/building-safari-extensions-react-vite)

## Unresolved Questions
1. Does the current Ephemera API (`api.manhquy.click`) have specific CORS requirements that vary between Chrome and Firefox/Safari content scripts?
2. Is iOS Safari support a 2026 requirement, or just desktop Safari? (iOS adds significant native-code complexity).
