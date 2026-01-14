# PROBLEM STATEMENT:  User-Controlled Email Visibility Management for Shared Inboxes

## CONTEXT

Email-platform cho phép khách tạo inbox tạm thời. Nhưng nhu cầu mới xuất hiện: 
- Khách muốn **SHARE PUBLIC** inbox với đối tác/khách hàng/nhân viên
- Tuy nhiên khách **KHÔNG MUỐN** đối tác xem một số loại email nhạy cảm
- Ví dụ: Email xác nhận đổi địa chỉ, reset password, OTP, email internal notification
- Điểm chính: **KHÁCH SỞ HỮU INBOX** phải quyết định qui tắc visibility, KHÔNG phải hệ thống tự động

Vấn đề hiện tại:
- Khi bật share, tất cả email đều visible cho public
- Không có cơ chế để chủ sở hữu kiểm soát email nào được hiện, nào bị ẩn
- Đặc biệt khi nhiều service dùng chung FROM address (ví dụ: noreply@system.com), cần phân biệt bằng SUBJECT hoặc nội dung khác

## GOAL

Xây dựng hệ thống **Advanced Message Visibility Rules** cho phép chủ sở hữu inbox: 
1. **Tạo custom rules** để kiểm soát email nào được public, nào bị ẩn
2. **Linh hoạt matching** - có thể match dựa trên FROM, TO, SUBJECT, BODY, HEADER, hoặc combination
3. **Quyền chủ sở hữu** - chỉ owner inbox mới được tạo/edit/delete rules, user công khai không thể thay đổi
4. **Transparency** - public viewer biết rule được áp dụng (show warning hoặc hide reason)
5. **Audit trail** - log tất cả visibility decisions (ai xem email gì, rule nào áp dụng)
6. **Pre-built templates** - Owner có template sẵn (Security, Banking, HR) để nhanh chóng setup

## CORE REQUIREMENTS

### Requirement 1: Rule Types & Matching Logic
Owner có 4 loại rules:
- **HIDE**:  Email matching điều kiện sẽ không hiện cho public
- **SHOW_ONLY** (whitelist): Chỉ email matching criteria mới hiện, còn lại ẩn
- **WARN**:  Email hiện nhưng có warning icon/message để user cẩn thận
- **REDACT**: Email hiện nhưng ẩn sensitive fields (subject, body, attachment names)

### Requirement 2: Flexible Condition Builder
Mỗi rule có thể có N conditions với operators:
- Field:  FROM, TO, SUBJECT, BODY, HEADER, SIZE, SPAM_SCORE, HAS_ATTACHMENT
- Operator:  EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH, REGEX, IN, GT (greater than), LT (less than)
- Match type: ALL (AND logic - tất cả conditions phải match) hoặc ANY (OR logic - ít nhất 1 match)
- Negate: NOT logic để viết "không chứa X"
- Case sensitivity: Option để case-sensitive hoặc case-insensitive matching

### Requirement 3: Owner-Controlled Access
- Chỉ chủ sở hữu inbox (authenticated user hoặc owner) mới có quyền: 
  * Xem danh sách rules
  * Tạo rule mới
  * Edit rule (change condition, priority, enable/disable)
  * Delete rule
  * Apply templates
- Public viewer hoàn toàn không thể modify rules
- Audit log phải record ai (userID/IP) tạo/modify/delete rule nào vào lúc nào

### Requirement 4: Public Viewer Experience
- Public viewer (người access /inbox-viewer) không biết rule tồn tại
- Khi email bị HIDE:  Không hiện email đó (không show "hidden by rule" message)
- Khi email bị WARN: Hiện email với warning icon + tooltip "This message may contain sensitive information"
- Khi email bị REDACT:  Hiện email nhưng subject/body/attachments được redact (replace with [REDACTED])
- Public endpoint trả về metadata: totalMessages, hiddenCount, warnedCount (để debug)

### Requirement 5: Flexible Matching for Shared Senders
Scenario: Dịch vụ SendGrid gửi email từ noreply@system.com
- Email 1: Subject "Verify your email" → HIDE (security sensitive)
- Email 2: Subject "Your order confirmation" → SHOW (business relevant)

Rules cần support:
- Rule 1: FROM = "noreply@system.com" AND SUBJECT contains ("verify", "confirm", "password") → HIDE
- Rule 2: FROM = "noreply@system.com" AND SUBJECT contains ("order", "invoice", "receipt") → SHOW_ONLY

### Requirement 6: Rule Priority & Execution Order
- Mỗi rule có priority (integer:  0-100, cao hơn = thực thi trước)
- Execution order: 
  1. HIDE rules (priority cao nhất) - nếu match → dừng, email hidden
  2. SHOW_ONLY rules - nếu không match bất kỳ rule nào → hidden
  3. WARN rules - apply nếu email không bị hide/redact
  4. REDACT rules - apply cuối cùng
- Conflict handling:  HIDE rules luôn override SHOW_ONLY (deny-by-default)

### Requirement 7: Templates & Presets
Owner có thể apply pre-built templates:
- **Security Template**:  HIDE emails từ noreply/notification services chứa verify, password, otp, security
- **Banking Template**: SHOW_ONLY emails từ bank domains (whitelist mode)
- **HR Template**: HIDE emails chứa payroll, salary, employee-internal
- **Custom**:  Owner có thể save current rules set thành template

## TECHNICAL CONSTRAINTS

### Database Schema Changes
- KHÔNG modify existing Message, Inbox models
- ADD:  InboxVisibilityConfig, InboxVisibilityRule, RuleCondition, RuleAction, MessageVisibilityAudit, VisibilityRuleTemplate
- Link: InboxVisibilityConfig. inboxId → Inbox.id (unique)
- Index: rules by inboxId + isEnabled + priority (performance)
- Audit logging: lưu fromAddress, subject, rule applied, timestamp, requestedBy

### API Design
- Separate endpoints cho rule CRUD (POST, PATCH, DELETE)
- Authentication required (owner verification)
- Rate limit: 1000 rules per inbox max
- Public endpoints (no auth) updated để call visibility engine

### Frontend - Rule Management Panel
- Located trong inbox settings/admin panel
- Owner-only access (check authorization)
- Visual condition builder (not text-based)
- Drag-drop để change rule priority
- Quick templates dropdown
- Test/preview feature để xem impact trước apply

### Performance Considerations
- Rules cache trong memory (invalidate on update)
- Lazy-load VisibilityEngine chỉ cho public viewers
- Batch evaluate nếu fetch multiple messages
- Index RuleCondition by ruleId + field + operator

## OWNERSHIP & AUTHORIZATION MODEL

### Rules Ownership
- InboxVisibilityRule.inboxId → chỉ owner của inbox mới có quyền edit
- Verify:  request. userId === inbox. ownerId

### Audit Trail Format
- MessageVisibilityAudit table: inboxId, messageId, action (SHOWN/HIDDEN/REDACTED), ruleId, ruleName, reason, requestedBy (IP hoặc userID), timestamp
- Public API endpoints có thể track visibility decisions (opsional log IP)

### No System Override
- Hệ thống (backend) KHÔNG tự động tạo rules
- Hệ thống KHÔNG tự động enable/disable rules
- Tất cả rule changes phải thông qua owner action

## EDGE CASES & ERROR HANDLING

Edge case 1: Rule condition không có match target field (ví dụ:  SUBJECT field null)
- → Treat as non-match (condition fails)

Edge case 2: REGEX invalid syntax
- → Fallback to false (rule not applied), log warning to audit

Edge case 3: Body > 10MB (performance risk)
- → Skip BODY field matching, log performance warning

Edge case 4: Owner tạo rule:  HIDE everything (priority 100)
- → Cho phép (owner's choice), but show warning "All emails will be hidden"

Edge case 5: Conflicting rules (HIDE priority 50 + SHOW_ONLY priority 40)
- → HIDE executes first (priority), so SHOW_ONLY won't be checked if HIDE matches

Edge case 6: Public viewer sees "hidden count" in metadata
- → OK (transparency), not a security issue

## SUCCESS CRITERIA

✅ Owner có FULL CONTROL tạo/edit/delete visibility rules
✅ Chỉ authenticated owner mới modify rules (API authorization checked)
✅ Public viewer không thể influence rules (read-only perspective)
✅ Support flexible matching:  FROM + SUBJECT combinations
✅ Support ALL/ANY logic cho multiple conditions
✅ HIDE rules execute before SHOW_ONLY (deny-by-default principle)
✅ Public /inbox-viewer respects rules (hidden emails not shown)
✅ Warning messages for WARN rules
✅ Audit log tracks all rule decisions
✅ Pre-built templates available (Security, Banking, HR)
✅ Test preview feature before applying rules
✅ Performance:  rules cached, O(log n) lookup

## OUTPUT FORMAT & DELIVERABLES

Implement theo phases: 

**Phase 1 (Core):**
- Database schema (migration + new models)
- MessageVisibilityEngine service (evaluateMessage logic)
- API CRUD endpoints para sa rules (POST, PATCH, DELETE, GET)
- Update public-inbox routes (filter messages using engine)
- Audit logging integration

**Phase 2 (UI & UX):**
- Rule management panel (owner-only, authenticated)
- Visual condition builder (field dropdown, operator, value, negate)
- Quick templates selector
- Test/preview feature
- Rule priority drag-drop reordering

**Phase 3 (Polish & Validation):**
- Audit log viewer (owner can see decisions)
- Regex validation + error messages
- Performance optimization (rule caching)
- Unit + integration tests
- Documentation

## CLARIFICATIONS & OPEN QUESTIONS

1. Khi owner delete rule, có cần soft delete hoặc hard delete?  → Hard delete OK (audit log giữ lại history)
2. Có support multi-language templates không? → English templates là enough cho MVP
3. Performance target: max rules per inbox? → 50 rules là reasonable limit
4. Có cần webhook notification khi rule applied? → Not in MVP
5. Redaction character:  [REDACTED] hay ****** hay blur? → [REDACTED] là clear nhất

## IMPLEMENTATION NOTES

- Reuse existing EmailFilter model pattern (nếu có)
- Follow email-platform code style (TypeScript, Fastify, Prisma)
- No breaking changes to existing inbox/message endpoints
- Backward compatible (inboxes không có rules = show all, như trước)
- Clear error messages (không expose internal rule names để public)