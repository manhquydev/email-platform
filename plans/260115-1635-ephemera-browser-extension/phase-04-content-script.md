# Phase 4: Content Script & Auto-fill

**Status**: Pending
**Goal**: Integrate with web pages to auto-fill email fields.

## Tasks
- [x] Basic script detection (scaffold)
- [ ] **Field Detection Algorithm**
  - [ ] Identify `input[type="email"]`
  - [ ] Identify `input[name*="email"]`
- [ ] **UI Injection**
  - [ ] Inject a small "E" icon into the input field (Shadow DOM to avoid style conflicts?)
  - [ ] Position absolute within the input wrapper?
- [ ] **Interaction Flow**
  - [ ] Click icon -> Open mini-dropdown (In-page UI)
  - [ ] Dropdown options:
    - "Use [Existing Email]"
    - "Generate New Email"
- [ ] **Message Passing**
  - [ ] `content` -> `background`: "Create Inbox"
  - [ ] `background` -> `content`: "Here is the email"
  - [ ] `content`: Fill input value & trigger `change` event (for React forms)

## Technical Challenges
- **Style Isolation**: Extensions often break site styles or vice versa. Use Shadow DOM.
- **Event Handling**: React/Vue/Angular forms might not detect `input.value = x`. Need to dispatch `input` and `change` events manually.

## Deliverables
- Icon appears in email fields
- Clicking icon allows filling an email
- Auto-fill works on 80% of common signup forms
