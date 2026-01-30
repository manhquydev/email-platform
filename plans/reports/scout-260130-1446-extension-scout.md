# Extension Scout Report

## Overview
The browser extension is built using the **WXT framework**, leveraging **React** for UI, **Zustand** for state management, and **Tailwind CSS** for styling. It implements a complete email management workflow including inbox creation, message viewing, and intelligent autofill capabilities.

## Architecture & Tech Stack
- **Framework**: WXT (Web Extension Tools)
- **UI Library**: React 18
- **State Management**: Zustand
- **Styling**: Tailwind CSS + clsx
- **Build Tool**: Vite (via WXT)
- **Testing**:
  - **Unit**: Vitest + React Testing Library
  - **E2E**: Playwright

## Key Components

### 1. Popup UI (src/components/popup)
- **InboxList**: Manages multiple email inboxes.
- **MessageList**: Displays emails within an inbox.
- **Login**: Authentication flow.
- **Settings**: User preferences.

### 2. Content Scripts (src/content)
- **Field Detector**: field-detector.ts - Likely identifies email input fields on web pages.
- **UI Injector**: ui-injector.ts - Injects extension UI elements (icons/buttons) into the page.
- **Autofill**: Dedicated E2E tests suggest robust autofill functionality.

### 3. Background Services (src/background)
- **Push Handler**: push-handler.ts - Manages push notifications for incoming emails.

### 4. Shared Logic (src/shared)
- **API**: Centralized API client (api.ts).
- **Storage**: Local/Sync storage wrappers (storage.ts).
- **Push Subscription**: Management of push capability (push-subscription.ts).
- **Analytics**: Usage tracking (analytics.ts).

## Features
- **Inbox Management**: Create/Delete inboxes, Domain selection.
- **Email Interaction**: View messages, likely auto-refresh via push.
- **Smart Integration**: Detects email fields on websites to autofill temporary addresses.
- **Onboarding**: Includes an OnboardingTour component.
- **Utilities**: QR Code generation (QRCodeModal), Search.

## Missing / Incomplete
- **Explicit TODOs**: No TODO, FIXME, or XXX markers were found in the codebase.
- **Observation**: The codebase appears well-structured and feature-complete for a core MVP.
- **Potential Gaps**:
  - Advanced email composition/replying (only read features observed).
  - Deeply nested settings or account management beyond basic login/logout.

## Questions
- Is the field-detector using heuristics or specific selectors?
- How are push notifications authenticated and routed?
