# Phase 1: i18n Completion (EN/VI)

## Context
- [Parent Plan](./plan.md)
- Current coverage: 28/56 keys (50%)
- Missing: 18 keys declared in `i18n.ts` but absent from locale files

## Overview
| Field | Value |
|-------|-------|
| Priority | High |
| Status | ✅ Done |
| Effort | 30min |

## Missing Keys

```typescript
// From src/shared/i18n.ts MessageKey type
reply, forward, send, sending, messageSent, to, subject,
composeBody, searchAllMessages, noSearchResults, searchResultsCount,
pinInbox, unpinInbox, pinnedInboxes, noMessages, loadingPreview,
errorBoundary_title, errorBoundary_message
```

## Files to Modify

| File | Action |
|------|--------|
| `public/_locales/en/messages.json` | Add 18 keys |
| `public/_locales/vi/messages.json` | Add 18 keys |

## Implementation Steps

### 1. Add English translations

```json
{
  "reply": { "message": "Reply" },
  "forward": { "message": "Forward" },
  "send": { "message": "Send" },
  "sending": { "message": "Sending..." },
  "messageSent": { "message": "Message sent!" },
  "to": { "message": "To" },
  "subject": { "message": "Subject" },
  "composeBody": { "message": "Message" },
  "searchAllMessages": { "message": "Search all messages..." },
  "noSearchResults": { "message": "No results found" },
  "searchResultsCount": { "message": "results" },
  "pinInbox": { "message": "Pin Inbox" },
  "unpinInbox": { "message": "Unpin Inbox" },
  "pinnedInboxes": { "message": "Pinned Inboxes" },
  "noMessages": { "message": "No messages yet" },
  "loadingPreview": { "message": "Loading preview..." },
  "errorBoundary_title": { "message": "Something went wrong" },
  "errorBoundary_message": { "message": "An error occurred. Please try again." }
}
```

### 2. Add Vietnamese translations

```json
{
  "reply": { "message": "Trả lời" },
  "forward": { "message": "Chuyển tiếp" },
  "send": { "message": "Gửi" },
  "sending": { "message": "Đang gửi..." },
  "messageSent": { "message": "Đã gửi tin nhắn!" },
  "to": { "message": "Đến" },
  "subject": { "message": "Tiêu đề" },
  "composeBody": { "message": "Nội dung" },
  "searchAllMessages": { "message": "Tìm kiếm tất cả tin nhắn..." },
  "noSearchResults": { "message": "Không tìm thấy kết quả" },
  "searchResultsCount": { "message": "kết quả" },
  "pinInbox": { "message": "Ghim hộp thư" },
  "unpinInbox": { "message": "Bỏ ghim hộp thư" },
  "pinnedInboxes": { "message": "Hộp thư đã ghim" },
  "noMessages": { "message": "Chưa có tin nhắn" },
  "loadingPreview": { "message": "Đang tải xem trước..." },
  "errorBoundary_title": { "message": "Đã xảy ra lỗi" },
  "errorBoundary_message": { "message": "Có lỗi xảy ra. Vui lòng thử lại." }
}
```

## Todo List

- [ ] Add 18 keys to `en/messages.json`
- [ ] Add 18 keys to `vi/messages.json`
- [ ] Verify no TypeScript errors in `i18n.ts`
- [ ] Test extension in both locales

## Success Criteria

- All 56 keys present in EN and VI locales
- No missing translation warnings in console
- Extension displays correct text in both languages

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Translation quality | Use professional terms, verify with native speaker |
| Key mismatch | Validate against `i18n.ts` MessageKey type |
