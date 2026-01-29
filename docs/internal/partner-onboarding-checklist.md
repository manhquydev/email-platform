# Partner Onboarding Checklist

Use this checklist to ensure a smooth integration and launch with Ephemera Email.

## Phase 1: Preparation
- [ ] **Sign Up:** Create a Partner Account at [provider.ephemera.email](https://provider.ephemera.email).
- [ ] **API Key:** Generate your production API key.
- [ ] **Billing:** Verify billing details and selected Provider Tier (Starter/Growth/Enterprise).

## Phase 2: Integration
- [ ] **Authentication:** Verify API key works via `GET /me`.
- [ ] **Webhooks:**
  - [ ] Set up a webhook endpoint on your server.
  - [ ] Verify signature validation logic.
  - [ ] Test `tenant.created` and `domain.verified` events.
- [ ] **Billing System:**
  - [ ] Install WHMCS/Blesta module OR
  - [ ] Implement custom integration using the API.

## Phase 3: Testing
- [ ] **Flow Test:**
  1. Create a test tenant.
  2. Add a test domain.
  3. Verify the domain (DNS mock or real).
  4. Create a mailbox.
  5. Test SSO login.
- [ ] **Error Handling:** Ensure your system handles rate limits (429) and auth errors (401) gracefully.
- [ ] **Cleanup:** Delete test resources.

## Phase 4: Go Live
- [ ] **Pricing:** Set up your retail pricing for your customers.
- [ ] **Documentation:** Update your customer knowledge base with email setup instructions.
- [ ] **Launch:** Enable the product in your billing system.

## Partner Details
*Keep this for your records*

- **Provider ID:** __________________________
- **Support Contact:** ______________________
- **Technical Contact:** ____________________
- **Webhook Secret:** _______________________
