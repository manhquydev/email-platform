---
sidebar_position: 2
---

# Cypress Example

E2E testing with Cypress and Ephemera.

## Setup Tasks

```typescript
// cypress/support/e2e.ts
import { EphemeraClient } from '@ephemera/sdk';

const ephemera = new EphemeraClient(Cypress.env('EPHEMERA_API_KEY'));

Cypress.Commands.add('createInbox', () => {
  return cy.wrap(ephemera.createInbox());
});

Cypress.Commands.add('waitForEmail', (inboxId: string, options: any) => {
  return cy.wrap(ephemera.waitForEmail(inboxId, options));
});

Cypress.Commands.add('extractCode', (message: any) => {
  return cy.wrap(ephemera.extractCode(message));
});

Cypress.Commands.add('deleteInbox', (inboxId: string) => {
  return cy.wrap(ephemera.deleteInbox(inboxId));
});
```

## Test Example

```typescript
// cypress/e2e/signup.cy.ts
describe('Signup Flow', () => {
  it('completes email verification', () => {
    cy.createInbox().then((inbox: any) => {
      cy.visit('/signup');
      cy.get('[name="email"]').type(inbox.address);
      cy.get('[name="password"]').type('SecurePass123!');
      cy.get('button[type="submit"]').click();

      cy.waitForEmail(inbox.id, { subject: 'Verify', timeout: 30000 })
        .then((message: any) => {
          cy.extractCode(message).then((code: string) => {
            cy.get('[name="code"]').type(code);
            cy.get('button').contains('Verify').click();
            cy.get('.welcome').should('be.visible');
          });
        });

      cy.deleteInbox(inbox.id);
    });
  });
});
```

## Configuration

```javascript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      EPHEMERA_API_KEY: process.env.EPHEMERA_API_KEY,
    },
  },
});
```
