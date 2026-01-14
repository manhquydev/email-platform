# Email Visibility Rule Engine Research Report

## 1. Rule Evaluation Patterns
*   **Recommendation: First-Match-Wins (Priority-Based)**
    *   **Why:** Predictable behavior and performance. Most "Visibility" systems (Firewalls, ACLs) use this.
    *   **Action:** Sort rules by a `priority` integer. Stop evaluation as soon as a match is found.
    *   **Alternative:** Cumulative (Score-based) is better for spam detection but adds complexity for visibility/access control.

## 2. Condition Matching Strategies
*   **Normalized Predicates:** Standardize fields (FROM, TO, SUBJECT, BODY) to lowercase/trimmed strings before matching.
*   **Match Types:** Support `EXACT`, `CONTAINS`, `STARTS_WITH`, and `REGEX`.
*   **Structure:** Use a JSONB column in PostgreSQL (via Prisma) to store complex conditions:
    ```typescript
    type Condition = { field: 'FROM' | 'SUBJECT' | 'BODY'; operator: 'REGEX' | 'CONTAINS'; value: string };
    ```

## 3. Regex Safety (ReDoS Prevention)
*   **Critical Risk:** Maliciously crafted regex can block the Node.js event loop.
*   **Mitigation:**
    1.  **Validation:** Use `safe-regex` or `r2` to check regex complexity at creation time.
    2.  **Execution:** Use `vm2` or a worker thread with a hard timeout (e.g., 50ms) for regex execution.
    3.  **Library:** Prefer `google/re2` (via `node-re2`) which guarantees linear time matching.

## 4. Caching Strategies
*   **L1 (In-Memory):** Use `lru-cache` for the most frequent rules (e.g., global blocklists).
*   **L2 (Distributed):** Use Redis for rule sets.
*   **Invalidation:** Use a "Write-Through" strategy. When a rule is updated in Prisma, publish a message to Redis Pub/Sub to clear local L1 caches across instances.
*   **Key Design:** Cache by `recipient_id` or `domain_id` to prevent massive lookups.

## 5. Audit Logging Best Practices
*   **Granularity:** Log every *decision*, not just the rule.
*   **Metadata:** Store `rule_id`, `input_summary` (truncated/hashed), `timestamp`, and `processing_time`.
*   **Storage:** Use a dedicated `VisibilityAudit` table in PostgreSQL. For high volume, stream logs to an external sink (Elasticsearch/Loki).
*   **Queryability:** Ensure logs are indexed by `recipient` and `rule_id` for quick troubleshooting.

## Actionable Recommendations for Stack
1.  **Prisma:** Add `priority: Int` and `conditions: Json` to the `Rule` model.
2.  **Fastify:** Create a `rules` decorator/plugin to wrap evaluation.
3.  **Security:** Install `re2` for safe regex execution.
4.  **Logging:** Use `pino` for structured logs and `prisma.visibilityAudit.create()` for persistence.

## Unresolved Questions
1. Should visibility rules apply to historical emails or only new arrivals?
2. Is there a requirement for "User-defined" vs "System-defined" rule precedence?
3. How to handle large bodies in regex matching without memory spikes?
