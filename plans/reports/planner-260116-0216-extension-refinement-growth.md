# Planner Report: Extension Refinement and Growth

## Overview
I have developed a comprehensive implementation plan for the Ephemera browser extension, focusing on refining its existing modular architecture and preparing it for multi-browser growth.

## Key Recommendations
- **Framework Migration:** Move from the current `@crxjs/vite-plugin` setup to **WXT (Web Extension Toolbox)**. This provides native multi-browser support (Chrome, Firefox, Safari) and better abstractions for the Side Panel API.
- **Side Panel Integration:** Introduce the Side Panel as a persistent UI for inbox management, allowing users to keep their ephemeral inboxes visible while browsing.
- **Robust UI Injection:** Refactor the content script to use a `MutationObserver`-based approach for non-blocking icon injection in dynamic SPAs.
- **Security:** Hardened CSP and strict API client patterns to ensure compliance with 2026 Chrome Web Store standards.

## Implementation Phases
1. **Phase 1: Stabilization & Foundation:** Migration to WXT and Side Panel implementation.
2. **Phase 2: Feature Growth:** Contextual actions and injector optimization.
3. **Phase 3: Multi-browser & Scaling:** Deployment to Firefox/Safari (including iOS).

## Plan Details
- **Plan File:** `D:\project\Clone\email-platform\plans\260116-0213-extension-refinement-and-growth\plan.md`
- **Status:** Pending Review
- **Priority:** P2
- **Estimated Effort:** 80h

## Unresolved Questions
1. Should we support older Chrome versions, or strictly MV3 (Chrome 120+)?
2. Does the backend support the increased polling frequency if users keep the Side Panel open for hours?
3. Is a paid subscription tier planned, and should the extension handle license verification?
