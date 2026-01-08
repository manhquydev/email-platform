# Prompt Template: Refactoring Legacy Code

## Usage
Use when refactoring existing code to improve maintainability, performance, or readability.

---

## Template

```
# Refactor: [Component/Feature Name]

## Current State
- File(s): [path/to/files]
- Lines of code: [approximate]
- Issues: [list problems]

## Goals
1. [Primary goal - e.g., "Split into smaller modules"]
2. [Secondary goal - e.g., "Add type safety"]
3. [Tertiary goal - e.g., "Improve testability"]

## Constraints
- Maintain backward compatibility
- No behavior changes (unless fixing bugs)
- Preserve existing API contracts
- Tests must continue to pass

## Proposed Approach
[Optional: Describe your approach if you have one]

## Files Affected
- [file1.ts] - [what changes]
- [file2.ts] - [what changes]

## Out of Scope
- [Features to NOT add]
- [Changes to NOT make]

## Success Criteria
- [ ] All existing tests pass
- [ ] No new bugs introduced
- [ ] Code is more maintainable
- [ ] File size < 200 lines each
```

---

## Example Usage

```
# Refactor: SMTP Worker Email Processing

## Current State
- File(s): services/api/src/worker.ts
- Lines of code: 354
- Issues:
  - Single file handling too many concerns
  - Hard to test individual steps
  - Rate limiting logic mixed with processing
  - Notification sending inline with storage

## Goals
1. Split into smaller, focused modules
2. Improve testability of individual steps
3. Add proper TypeScript types for job data

## Constraints
- Maintain backward compatibility with existing queue
- No behavior changes
- Job data format must remain same
- BullMQ integration unchanged

## Proposed Approach
Split into:
- worker.ts - BullMQ setup and orchestration
- email-processor.service.ts - Core processing logic
- rate-limiter.service.ts - Rate limit checks
- notification-dispatcher.ts - Telegram/webhook triggers

## Files Affected
- worker.ts - Reduce to ~100 lines, delegate to services
- [NEW] services/email-processor.service.ts - Core processing
- [NEW] services/rate-limiter.service.ts - Rate limiting
- [NEW] services/notification-dispatcher.ts - Notifications

## Out of Scope
- Adding new notification channels
- Changing queue configuration
- Performance optimization

## Success Criteria
- [ ] All existing tests pass
- [ ] Each new file < 150 lines
- [ ] worker.ts < 100 lines
- [ ] Clear separation of concerns
```
