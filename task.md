# Task: Review Email-Platform's Next Phase & Create Feature Specifications

## Context
Email-platform has completed per-inbox Telegram notifications (Phase 06). 
Next phase priorities are:
1. Outbound mail support (currently disabled)
2. DKIM signing for emails
3. Bounce/complaint webhook handling
4. Log shipping to Loki/ELK

## Requirements
1. **Analyze current codebase:**
   - Check `/services/api/src` for email handling architecture
   - Review Prisma schema for bounce/complaint tracking tables
   - Identify outbound mail entry points

2. **Create detailed specifications for outbound mail:**
   - Define webhook payload structure for bounces/complaints
   - Plan DKIM signing integration points
   - Document retry logic for failed sends

3. **Deliverables:**
   - Phase 07 implementation plan (outbound mail)
   - Database migration plan for new tables
   - API route designs for webhook receivers
   - Security considerations for DKIM keys

## Output Format
Use structured markdown with:
- Feature overview
- Technical architecture diagram (ASCII)
- Database schema changes
- API endpoint specifications
- Implementation steps with estimated effort

# Task: Expand Test Coverage for Email-Platform Critical Paths

## Current Status
- System tests exist:  `src/test/system. test.ts`
- Recent features (per-inbox Telegram) need integration tests
- Public inbox API needs CAPTCHA validation tests

## Requirements
1. **Test Coverage Gaps:**
   - Integration tests for inbox Telegram link CRUD
   - End-to-end Telegram notification delivery
   - Public inbox creation with CAPTCHA validation
   - Message filtering with multiple query parameters
   - Attachment download with authorization checks

2. **Test Structure:**
   - Create `src/test/inbox-telegram. test.ts` - Telegram integration
   - Create `src/test/public-inbox.test.ts` - Public inbox CAPTCHA
   - Create `src/test/message-filtering.test. ts` - Search/pagination
   - Add load tests for SMTP ingest rate limiting

3. **Success Criteria:**
   - All new routes have ≥80% code coverage
   - Tests run in <10 seconds
   - Mocking:  Telegram API, CAPTCHA service, email delivery
   - Database: Use test container with migrations

## Output
- Test files with comprehensive test cases
- Coverage report
- Test execution documentation

# Task: Create Effective AI Prompts for Email-Platform Development

## Goal
Learn from claudekit/claudekit-engineer's prompt strategies and create optimized prompts for email-platform development.

## Study ClaudeKit Techniques
1. **Workflow Analysis:**
   - Review `.claude/workflows/primary-workflow.md`
   - Extract orchestration patterns from `orchestration-protocol.md`
   - Study privacy-block hook handling pattern

2. **Apply to Email-Platform:**
   Create `.agent/` directory with:
   - `system-prompt.md` - Role definition for AI agents
   - `workflow-api-development.md` - For backend features
   - `workflow-frontend-features.md` - For React components
   - `code-standards.md` - TypeScript, error handling, testing standards
   - `architecture-context.md` - Current system design, integration points

3. **Prompt Templates:**
   - Template for new API feature implementation
   - Template for debugging production issues
   - Template for refactoring legacy code
   - Template for performance optimization

4. **Success Metrics:**
   - Each prompt produces complete, testable code
   - Follows email-platform's tech stack conventions
   - Includes error handling & logging
   - Self-sufficient (don't need follow-up clarifications)

## Output
- `.agent/` directory structure
- 5-10 reusable prompts with examples
- Prompt effectiveness guidelines
- Documentation for team collaboration

# Task: Enhance Observability Stack for Email-Platform

## Current Setup
- Prometheus + Grafana (monitoring)
- Pino structured logs (Fastify)
- Health endpoints:  /health, /ready
- Metrics endpoint: /metrics (Prometheus format)

## TODO Analysis
- Log shipping dashboards incomplete
- No distributed tracing
- Alert thresholds not defined

## Requirements
1. **Implement Log Shipping:**
   - Configure Loki integration for Pino logs
   - Create log parsing rules for email flow
   - Set up log retention policies

2. **Add Distributed Tracing:**
   - Implement OpenTelemetry in API & worker
   - Trace email from SMTP ingest → storage → notification
   - Monitor Telegram webhook latency

3. **Grafana Dashboards:**
   - Email delivery timeline dashboard
   - Per-inbox message count & storage usage
   - Telegram notification delivery rate
   - Rate limiting saturation levels
   - Database query performance

4. **Alerting Rules:**
   - 5xx error rate > 1%
   - Email ingest failure rate > 5%
   - SMTP connection timeouts
   - Telegram webhook failures

## Deliverables
- Loki configuration
- OpenTelemetry setup code
- 4+ production-ready dashboards
- Alert rules (JSON/Prometheus format)
- Incident runbook (e.g., "High 5xx errors")

# Task: Security Audit & Production Hardening for Email-Platform

## Focus Areas
1. **Authentication & Authorization:**
   - JWT token rotation policy
   - API key scoping (inbox-level vs domain-level)
   - Rate limiting per API key
   - Session management for web UI

2. **Email Security:**
   - DKIM signing implementation readiness
   - SPF/DMARC validation for inbound
   - Bounce handling to prevent enumeration attacks
   - Attachment scanning preparation (ClamAV integration point)

3. **Data Protection:**
   - Soft-delete compliance (audit trail)
   - Attachment storage encryption at rest
   - Database backup encryption
   - Secret management (env variables → Secret store upgrade path)

4. **API Security:**
   - CORS configuration hardening
   - Content Security Policy headers
   - Rate limiting:  SMTP, HTTP API, public endpoints
   - CAPTCHA integration (already partially done)

5. **Infrastructure:**
   - Docker security:  non-root user, image scanning
   - Reverse proxy hardening (Caddy TLS config)
   - Database: least privilege roles, connection pooling limits
   - Redis:  ACL, password rotation

## Deliverables
- Security checklist (80+ items)
- Code patches for critical fixes
- Configuration templates (hardened versions)
- Security testing scenarios
- Compliance matrix (GDPR/CCPA considerations)