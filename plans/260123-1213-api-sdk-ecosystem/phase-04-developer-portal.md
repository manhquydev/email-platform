# Phase 4: Developer Portal

```yaml
status: pending
priority: MEDIUM
duration: 3-4 weeks
dependencies: [phase-01-foundation, phase-02-core-sdks, phase-03-extended-sdks]
```

## Overview

Xây dựng Developer Portal với documentation, interactive playground, và tutorials cho tất cả SDKs.

## Context Links

- [Main Plan](./plan.md)
- [Phase 3: Extended SDKs](./phase-03-extended-sdks.md)

---

## 1. Documentation Site

### 1.1 Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Docusaurus 3.x | React-based, versioning, search |
| Hosting | Vercel/Cloudflare Pages | Fast, free tier |
| Search | Algolia DocSearch | Industry standard |
| API Docs | Redoc/Swagger UI | OpenAPI rendering |

### 1.2 Site Structure

```
docs-site/
├── docs/
│   ├── getting-started/
│   │   ├── introduction.md
│   │   ├── authentication.md
│   │   └── quickstart.md
│   ├── api-reference/
│   │   ├── overview.md
│   │   ├── inboxes.md
│   │   ├── messages.md
│   │   ├── domains.md
│   │   └── webhooks.md
│   ├── sdks/
│   │   ├── javascript.md
│   │   ├── python.md
│   │   ├── go.md
│   │   ├── php.md
│   │   ├── java.md
│   │   ├── dotnet.md
│   │   └── cli.md
│   ├── guides/
│   │   ├── test-automation.md
│   │   ├── webhook-integration.md
│   │   └── rate-limiting.md
│   └── examples/
│       ├── playwright.md
│       ├── cypress.md
│       ├── selenium.md
│       └── pytest.md
├── src/
│   ├── components/
│   │   ├── ApiPlayground/
│   │   ├── CodeTabs/
│   │   └── SdkInstall/
│   └── pages/
│       └── api-explorer.tsx
├── static/
│   └── openapi.yaml
├── docusaurus.config.js
└── package.json
```

### 1.3 Key Pages

**Homepage:**
```jsx
// src/pages/index.tsx
export default function Home() {
  return (
    <Layout>
      <Hero
        title="Ephemera API"
        subtitle="Temporary email platform for developers"
        cta={{ text: "Get Started", link: "/docs/getting-started" }}
      />
      <Features>
        <Feature icon="📧" title="Disposable Inboxes" />
        <Feature icon="🔑" title="OTP Extraction" />
        <Feature icon="🧪" title="Test Automation" />
      </Features>
      <SdkShowcase languages={['js', 'python', 'go', 'php', 'java', 'csharp']} />
    </Layout>
  );
}
```

**SDK Installation Component:**
```jsx
// src/components/SdkInstall.tsx
const installCommands = {
  javascript: 'npm install @ephemera/sdk',
  python: 'pip install ephemera',
  go: 'go get github.com/ephemera/sdk-go',
  php: 'composer require ephemera/sdk',
  java: '<dependency>...</dependency>',
  csharp: 'dotnet add package Ephemera.Sdk',
};

export function SdkInstall({ language }) {
  return (
    <CodeBlock language="bash">
      {installCommands[language]}
    </CodeBlock>
  );
}
```

---

## 2. Interactive API Playground

### 2.1 Implementation

```tsx
// src/components/ApiPlayground/index.tsx
import { useState } from 'react';
import SwaggerUI from 'swagger-ui-react';

export function ApiPlayground() {
  const [apiKey, setApiKey] = useState('');

  return (
    <div className="api-playground">
      <div className="api-key-input">
        <input
          type="password"
          placeholder="Enter your API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
      <SwaggerUI
        url="/openapi.yaml"
        requestInterceptor={(req) => {
          if (apiKey) {
            req.headers['Authorization'] = `Bearer ${apiKey}`;
          }
          return req;
        }}
      />
    </div>
  );
}
```

### 2.2 Features

- [ ] Live API testing with user's API key
- [ ] Request/response examples
- [ ] Code generation for each endpoint
- [ ] Error response visualization

---

## 3. Code Examples

### 3.1 Multi-Language Tabs

```mdx
<!-- docs/getting-started/quickstart.md -->
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## Quick Start

<Tabs>
<TabItem value="js" label="JavaScript">

```javascript
import { EphemeraClient } from '@ephemera/sdk';

const client = new EphemeraClient('your-api-key');

// Create inbox and wait for email
const inbox = await client.createInbox();
console.log(`Inbox: ${inbox.address}`);

const message = await client.waitForEmail(inbox.id, {
  subject: 'Verification',
  timeout: 60000
});

const code = client.extractCode(message);
console.log(`OTP: ${code}`);
```

</TabItem>
<TabItem value="python" label="Python">

```python
from ephemera import EphemeraClient

client = EphemeraClient("your-api-key")

# Create inbox and wait for email
inbox = client.create_inbox()
print(f"Inbox: {inbox.address}")

message = client.wait_for_email(inbox.id, subject="Verification")
code = client.extract_code(message)
print(f"OTP: {code}")
```

</TabItem>
<TabItem value="go" label="Go">

```go
package main

import (
    "context"
    "fmt"
    "time"
    "github.com/ephemera/sdk-go/ephemera"
)

func main() {
    client := ephemera.NewClient("your-api-key")
    ctx := context.Background()

    inbox, _ := client.CreateInbox(ctx, nil)
    fmt.Printf("Inbox: %s\n", inbox.Address)

    message, _ := client.WaitForEmail(ctx, inbox.ID, &ephemera.WaitOptions{
        Subject: "Verification",
        Timeout: 60 * time.Second,
    })

    code := ephemera.ExtractCode(message)
    fmt.Printf("OTP: %s\n", code)
}
```

</TabItem>
</Tabs>
```

### 3.2 Test Framework Examples

**Playwright:**
```typescript
// docs/examples/playwright.md
import { test, expect } from '@playwright/test';
import { EphemeraClient } from '@ephemera/sdk';

const ephemera = new EphemeraClient(process.env.EPHEMERA_API_KEY!);

test('signup with email verification', async ({ page }) => {
  // Create temporary inbox
  const inbox = await ephemera.createInbox();

  // Fill signup form
  await page.goto('/signup');
  await page.fill('[name="email"]', inbox.address);
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.click('button[type="submit"]');

  // Wait for verification email
  const message = await ephemera.waitForEmail(inbox.id, {
    subject: 'Verify your email',
    timeout: 30000
  });

  // Extract and use verification code
  const code = ephemera.extractCode(message);
  await page.fill('[name="code"]', code!);
  await page.click('button:text("Verify")');

  // Assert success
  await expect(page.locator('.welcome-message')).toBeVisible();

  // Cleanup
  await ephemera.deleteInbox(inbox.id);
});
```

**Pytest:**
```python
# docs/examples/pytest.md
import pytest
from ephemera import EphemeraClient
from selenium import webdriver

@pytest.fixture
def ephemera():
    return EphemeraClient(os.environ["EPHEMERA_API_KEY"])

@pytest.fixture
def browser():
    driver = webdriver.Chrome()
    yield driver
    driver.quit()

def test_signup_with_verification(ephemera, browser):
    # Create temporary inbox
    inbox = ephemera.create_inbox()

    # Fill signup form
    browser.get("https://example.com/signup")
    browser.find_element("name", "email").send_keys(inbox.address)
    browser.find_element("name", "password").send_keys("SecurePass123!")
    browser.find_element("css selector", "button[type=submit]").click()

    # Wait for verification email
    message = ephemera.wait_for_email(inbox.id, subject="Verify")
    code = ephemera.extract_code(message)

    # Enter verification code
    browser.find_element("name", "code").send_keys(code)
    browser.find_element("xpath", "//button[text()='Verify']").click()

    # Assert success
    assert browser.find_element("class name", "welcome-message").is_displayed()

    # Cleanup
    ephemera.delete_inbox(inbox.id)
```

---

## 4. Postman Collection

### 4.1 Collection Structure

```json
{
  "info": {
    "name": "Ephemera API",
    "description": "Official Postman collection for Ephemera API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [{ "key": "token", "value": "{{api_key}}" }]
  },
  "variable": [
    { "key": "base_url", "value": "https://api.manhquy.click/v1" },
    { "key": "api_key", "value": "" }
  ],
  "item": [
    {
      "name": "Inboxes",
      "item": [
        {
          "name": "Create Inbox",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/inboxes",
            "body": {
              "mode": "raw",
              "raw": "{}"
            }
          }
        }
      ]
    }
  ]
}
```

### 4.2 Todo

- [ ] Generate from OpenAPI spec
- [ ] Add environment variables
- [ ] Include example responses
- [ ] Publish to Postman public workspace

---

## 5. Deployment

### 5.1 Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "docusaurus-2",
  "redirects": [
    { "source": "/docs", "destination": "/docs/getting-started", "permanent": true }
  ]
}
```

### 5.2 Custom Domain

- `docs.manhquy.click` → Developer Portal
- `api.manhquy.click/docs` → OpenAPI Swagger UI

---

## Todo Checklist

### Week 1: Setup & Structure
- [ ] Initialize Docusaurus project
- [ ] Configure theme and branding
- [ ] Setup Algolia DocSearch
- [ ] Create navigation structure

### Week 2: Content
- [ ] Write getting started guides
- [ ] Create API reference pages
- [ ] Write SDK documentation
- [ ] Add code examples for all languages

### Week 3: Interactive Features
- [ ] Build API playground component
- [ ] Create multi-language code tabs
- [ ] Generate Postman collection
- [ ] Add search functionality

### Week 4: Polish & Deploy
- [ ] Design review and polish
- [ ] Performance optimization (<2s load)
- [ ] SEO optimization
- [ ] Deploy to production

---

## Success Criteria

- [ ] Documentation site live at docs.manhquy.click
- [ ] Page load time <2s
- [ ] All 7 SDKs documented with examples
- [ ] Interactive API playground working
- [ ] Postman collection published
- [ ] Algolia search functional
- [ ] Mobile responsive design

---

## Maintenance

- Auto-update API docs when OpenAPI spec changes
- SDK version badges showing latest releases
- Changelog page for API updates
- Community feedback integration
