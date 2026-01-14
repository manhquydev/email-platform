## Code Review Summary

### Scope
- **Files reviewed**:
  - `services/api/src/services/visibility-engine.ts`
  - `services/api/src/routes/visibility-rules.ts`
  - `services/api/src/routes/public-inbox.ts`
  - `services/web/src/components/VisibilityRulesPanel.tsx`
  - `services/api/prisma/schema.prisma`
- **Lines of code analyzed**: ~1300
- **Review focus**: Security (ReDoS), Performance (Audit/Pagination), and Logic Correctness.

### Overall Assessment
The implementation provides a solid foundation for the visibility rules engine with a clear architecture. However, there is a **Critical Security Vulnerability** regarding regex execution that can lead to Denial of Service (DoS), and a **High Priority Performance** issue with audit logging.

### Critical Issues
1.  **ReDoS Vulnerability in `services/api/src/services/visibility-engine.ts`**:
    - **Problem**: The `safeRegexTest` function attempts to measure execution time (`Date.now() - start`), but standard JavaScript `RegExp` execution is blocking on the main thread. If a user provides a catastrophic backtracking regex (e.g., `(a+)+`), the Node.js event loop will freeze *during* `regex.test(text)`, and the timeout check will never be reached until the regex completes (or never).
    - **Risk**: A single malicious rule can hang the entire API service.
    - **Fix**: Use `node:vm` with `timeout` option to enforce execution limits.

### High Priority Findings
1.  **Performance: N+1 Audit Writes**:
    - **File**: `services/api/src/routes/public-inbox.ts`
    - **Problem**: In the `/messages` list endpoint, `logVisibilityAudit` is awaited inside the loop for every message. For a page of 20 messages, this triggers 20 individual `INSERT` queries.
    - **Impact**: Significant latency increase for public inbox viewing.
    - **Fix**: Batch audit logs and insert them using `prisma.messageVisibilityAudit.createMany()` after the loop.

2.  **Pagination Logic Flaw**:
    - **File**: `services/api/src/routes/public-inbox.ts`
    - **Problem**: The code fetches `limit * 3` messages and filters them in memory. If strict rules hide all 60 fetched messages, the API returns an empty list, implying "no more messages," even if older visible messages exist in the DB.
    - **Impact**: Inconsistent UI behavior; users may miss emails.
    - **Fix**: Implement recursive fetching (up to a max depth) or return a cursor/flag indicating more items might exist.

### Medium Priority Improvements
1.  **Type Safety**: `rule.conditions as unknown as VisibilityCondition[]` is used repeatedly. Define a Zod schema for the JSON field or use Prisma generated types more effectively to avoid casting.
2.  **Redaction Scope**: `redactMessage` currently redacts `subject` and `body`. It does not redact `headers`. If a rule matches on a sensitive header, that header might still be returned in the `message` object.

### Recommended Actions
1.  **Fix ReDoS**: Replace `safeRegexTest` with `node:vm` execution.
    ```typescript
    import vm from 'node:vm';
    function safeRegexTest(pattern: string, text: string, timeoutMs = 100): boolean {
      try {
         const context = vm.createContext({ result: false, text, pattern });
         vm.runInContext('result = new RegExp(pattern, "i").test(text);', context, { timeout: timeoutMs });
         return context.result;
      } catch (e) { return false; }
    }
    ```
2.  **Batch Audit Logs**: Collect audit entries in an array during the loop and execute `prisma.messageVisibilityAudit.createMany({ data: entries })` once at the end.
3.  **Sanitize Headers**: Update `redactMessage` to explicitly clear or redact `headers` property.

### Metrics
- **Security Status**: ⚠️ Vulnerable (ReDoS)
- **Performance**: ⚠️ Needs Optimization (Audit Logging)
- **Code Quality**: Good structure, consistent patterns.

## Unresolved Questions
- Is there a requirement to filter messages at the database level in the future? (Current in-memory filtering limits scalability).
