# Research Report: Offline-First Architecture for Mobile Email

**Date:** 2026-01-20
**Context:** Mobile Email Client (React Native / Expo)
**Focus:** Offline caching, synchronization, and optimistic UI.

## 1. Executive Summary
The recommended architecture is **"Local-First"**. The application should treat the local database as the single source of truth for the UI. Network requests serve as a synchronization mechanism to update the local state, rather than driving the UI directly.

**Core Stack Recommendations:**
- **State/Sync:** TanStack Query v5 (React Query)
- **Local DB:** `expo-sqlite` (for structured email data)
- **KV Storage:** `react-native-mmkv` (for fast user preferences/auth)
- **Network:** `@react-native-community/netinfo`

## 2. Architecture Patterns

### 2.1 The "Local Replica" Pattern
Instead of fetching data to display, the app syncs data to a local SQLite database and the UI subscribes to this database.
1. **Read:** UI reads from SQLite (fast, works offline).
2. **Write:** User action -> Optimistic UI update -> Update SQLite -> Queue Network Request.
3. **Sync:** Background process fetches diffs from server -> Updates SQLite -> UI re-renders.

**Why SQLite?**
AsyncStorage has a 6MB limit on Android and poor performance for large lists (inboxes). SQLite handles thousands of rows efficiently and supports complex queries (filtering/sorting emails) without loading everything into memory.

### 2.2 TanStack Query v5 Persistence
TanStack Query provides built-in support for offline storage via `PersistQueryClientProvider`.

*   **Persister:** Create a custom persister for `expo-sqlite` or use `@tanstack/query-async-storage-persister` mapped to a file-system based storage if dealing with JSON blobs. *However, for an email app, granular SQLite control is often better than persisting entire query blobs.*
*   **Strategy:**
    *   **Queries:** Use `staleTime: Infinity` and `gcTime: Infinity` for critical data (inbox) to ensure it never disappears from cache.
    *   **Mutations:** `networkMode: 'offlineFirst'`. Failed mutations (due to no net) are automatically paused and retried when connection restores.

## 3. Data Storage Strategy

| Data Type | Storage Solution | Reasoning |
|-----------|------------------|-----------|
| **Emails/Threads** | **Expo SQLite** | Relational data, needs indexing (search, sort by date), large volume. |
| **Attachments** | **Expo FileSystem** | Binary data, store paths in SQLite. |
| **User Prefs/Auth** | **MMKV** | Extremely fast, synchronous read/write for startup config. |
| **Drafts** | **Expo SQLite** | Needs to be saved frequently and reliably. |

## 4. Synchronization & Conflict Resolution

### 4.1 Sync Logic
*   **Downstream (Server -> Client):**
    *   Use "Delta Sync" (sync tokens). Request only changes since `last_sync_timestamp`.
    *   Triggered by: App open, push notification (silent), periodic background task (`expo-background-fetch`).
*   **Upstream (Client -> Server):**
    *   TanStack Query Mutation Cache automatically queues requests.
    *   **Optimistic Updates:** Immediately update React Query cache `onMutate`. If error, rollback in `onError`.

### 4.2 Conflict Resolution Strategies
*   **Flags (Read/Star/Archive):** **Last-Write-Wins (LWW)**. Use timestamps. If server has a newer timestamp, overwrite local.
*   **Deletes:** **Destructive Wins**. If deleted locally or remotely, it's gone.
*   **Draft Content:** **Manual Merge** or **Clone**. If a draft was edited on two devices, save the conflicting version as "Draft (Conflict Copy)" to prevent data loss.

## 5. Network Connectivity Implementation

Use `@react-native-community/netinfo` to drive TanStack Query's online state.

```typescript
import NetInfo from '@react-native-community/netinfo'
import { onlineManager } from '@tanstack/react-query'

// Global listener
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected)
  })
})
```

**UX Consideration:**
*   Show a subtle "Offline" indicator.
*   Disable non-queueable actions (e.g., "Change Password").
*   Allow queueable actions (e.g., "Send Email" - moves to Outbox).

## 6. Unresolved Questions / Risks
*   **Attachment Handling:** How to handle large attachment uploads when connection is spotty? (Resumable uploads tus.io recommended).
*   **Background Sync iOS:** iOS is strict on background execution. `expo-task-manager` reliability needs testing.
*   **Initial Sync:** First load of 10,000 emails. Needs pagination and "recent first" strategy.

## 7. Sources
*   [TanStack Query Offline Docs](https://tanstack.com/query/latest/docs/framework/react/guides/window-focus-refetching)
*   [React Native Offline-First Patterns](https://medium.com/offline-first)
*   [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
