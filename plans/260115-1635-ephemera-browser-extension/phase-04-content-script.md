# Phase 4: Content Script & Auto-fill

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Depends On:** [Phase 3: Popup UI](./phase-03-popup-ui.md)
- **Research:** [Chrome MV3](./research/researcher-01-chrome-mv3.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 - High Value |
| Status | Pending |
| Effort | 3-4 days |
| Dependencies | Phase 3 complete |

Implement content script to detect email input fields on web pages and inject auto-fill functionality. Users can fill forms with existing or new Ephemera email addresses.

## Key Insights

- Content scripts run in isolated world - cannot access page's JS variables
- Use Shadow DOM to isolate injected UI styles from host page
- Dispatch both `input` and `change` events for React/Vue/Angular compatibility
- Avoid `<all_urls>` permission - use specific matches for faster store review

## Requirements

### Functional
- Detect `input[type="email"]` and `input[name*="email"]` fields
- Inject small Ephemera icon into detected fields
- Click icon shows dropdown: existing emails + "Create New"
- Select email fills the field and triggers form events
- Works on 80%+ of common signup forms

### Non-Functional
- < 50ms field detection time
- No visual glitches on host page
- Graceful degradation if injection fails
- Respect user preference to disable auto-fill

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Page                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Email Input Field                                   │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ [                              ] [E icon]   │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                        │                             │    │
│  │                        ▼                             │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  Shadow DOM Dropdown                        │    │    │
│  │  │  ┌─────────────────────────────────────┐   │    │    │
│  │  │  │ user@ephemera.email              ✓  │   │    │    │
│  │  │  │ test@ephemera.email                 │   │    │    │
│  │  │  │ ──────────────────────────────────  │   │    │    │
│  │  │  │ + Create New Email                  │   │    │    │
│  │  │  └─────────────────────────────────────┘   │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ chrome.runtime.sendMessage
                        ▼
              ┌─────────────────┐
              │ Service Worker  │
              │ (background.ts) │
              └─────────────────┘
```

## Related Code Files

### Create
- `services/extension/src/content/index.ts` - Main content script
- `services/extension/src/content/field-detector.ts` - Email field detection
- `services/extension/src/content/ui-injector.ts` - Shadow DOM UI injection
- `services/extension/src/content/dropdown.tsx` - React dropdown component
- `services/extension/src/content/styles.css` - Isolated styles

### Modify
- `services/extension/src/manifest.json` - Add content_scripts config
- `services/extension/src/background/index.ts` - Handle messages from content

## Implementation Steps

### Step 1: Update Manifest (30m)

Update `src/manifest.json`:
```json
{
  "content_scripts": [
    {
      "matches": ["https://*/*", "http://*/*"],
      "js": ["src/content/index.ts"],
      "css": [],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["icons/*", "assets/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Step 2: Create Field Detector (1.5h)

Create `src/content/field-detector.ts`:
```typescript
interface DetectedField {
  element: HTMLInputElement
  id: string
  rect: DOMRect
}

const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name*="email" i]',
  'input[id*="email" i]',
  'input[placeholder*="email" i]',
  'input[autocomplete="email"]'
]

export function detectEmailFields(): DetectedField[] {
  const fields: DetectedField[] = []
  const seen = new Set<HTMLInputElement>()

  for (const selector of EMAIL_SELECTORS) {
    const elements = document.querySelectorAll<HTMLInputElement>(selector)
    elements.forEach((el) => {
      if (seen.has(el)) return
      if (!isVisible(el)) return
      if (el.disabled || el.readOnly) return

      seen.add(el)
      fields.push({
        element: el,
        id: el.id || el.name || `ephemera-${fields.length}`,
        rect: el.getBoundingClientRect()
      })
    })
  }

  return fields
}

function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el)
  if (style.display === 'none') return false
  if (style.visibility === 'hidden') return false
  if (parseFloat(style.opacity) === 0) return false

  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return false

  return true
}

// Observe DOM changes for dynamically added fields
export function observeNewFields(callback: (fields: DetectedField[]) => void) {
  const observer = new MutationObserver(() => {
    const fields = detectEmailFields()
    if (fields.length > 0) {
      callback(fields)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  return () => observer.disconnect()
}
```

### Step 3: Create UI Injector with Shadow DOM (2h)

Create `src/content/ui-injector.ts`:
```typescript
import { detectEmailFields, DetectedField } from './field-detector'

const ICON_SIZE = 20
const injectedFields = new WeakSet<HTMLInputElement>()

export function injectUI(fields: DetectedField[]) {
  fields.forEach((field) => {
    if (injectedFields.has(field.element)) return
    injectedFields.add(field.element)

    const wrapper = createIconWrapper(field.element)
    positionIcon(wrapper, field.element)

    wrapper.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      showDropdown(field.element, wrapper)
    })
  })
}

function createIconWrapper(input: HTMLInputElement): HTMLElement {
  // Create container with Shadow DOM for style isolation
  const container = document.createElement('div')
  container.className = 'ephemera-icon-container'
  container.style.cssText = `
    position: absolute;
    z-index: 999999;
    cursor: pointer;
    width: ${ICON_SIZE}px;
    height: ${ICON_SIZE}px;
  `

  const shadow = container.attachShadow({ mode: 'closed' })

  // Inject styles
  const style = document.createElement('style')
  style.textContent = `
    .icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0ea5e9;
      border-radius: 4px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    .icon:hover {
      opacity: 1;
    }
    .icon svg {
      width: 14px;
      height: 14px;
      fill: white;
    }
  `

  const icon = document.createElement('div')
  icon.className = 'icon'
  icon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`

  shadow.appendChild(style)
  shadow.appendChild(icon)

  document.body.appendChild(container)
  return container
}

function positionIcon(wrapper: HTMLElement, input: HTMLInputElement) {
  const updatePosition = () => {
    const rect = input.getBoundingClientRect()
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    wrapper.style.top = `${rect.top + scrollY + (rect.height - ICON_SIZE) / 2}px`
    wrapper.style.left = `${rect.right + scrollX - ICON_SIZE - 8}px`
  }

  updatePosition()

  // Update on scroll/resize
  window.addEventListener('scroll', updatePosition, { passive: true })
  window.addEventListener('resize', updatePosition, { passive: true })
}

let activeDropdown: HTMLElement | null = null

function showDropdown(input: HTMLInputElement, iconWrapper: HTMLElement) {
  // Close existing dropdown
  if (activeDropdown) {
    activeDropdown.remove()
    activeDropdown = null
  }

  // Request inboxes from background
  chrome.runtime.sendMessage({ type: 'GET_INBOXES' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('Ephemera: Failed to get inboxes')
      return
    }

    const dropdown = createDropdown(response?.inboxes || [], input)
    document.body.appendChild(dropdown)
    activeDropdown = dropdown

    // Position dropdown
    const iconRect = iconWrapper.getBoundingClientRect()
    dropdown.style.top = `${iconRect.bottom + window.scrollY + 4}px`
    dropdown.style.left = `${iconRect.right + window.scrollX - 200}px`

    // Close on outside click
    const closeHandler = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node) && e.target !== iconWrapper) {
        dropdown.remove()
        activeDropdown = null
        document.removeEventListener('click', closeHandler)
      }
    }
    setTimeout(() => document.addEventListener('click', closeHandler), 0)
  })
}

interface Inbox {
  id: string
  localPart: string
  domain: { name: string }
}

function createDropdown(inboxes: Inbox[], input: HTMLInputElement): HTMLElement {
  const container = document.createElement('div')
  container.style.cssText = `
    position: absolute;
    z-index: 9999999;
    width: 200px;
    max-height: 300px;
    overflow-y: auto;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    font-family: system-ui, sans-serif;
  `

  const shadow = container.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = `
    .item {
      padding: 10px 12px;
      color: #e2e8f0;
      font-size: 13px;
      cursor: pointer;
      border-bottom: 1px solid #334155;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item:hover {
      background: #334155;
    }
    .item:last-child {
      border-bottom: none;
    }
    .create {
      color: #0ea5e9;
      font-weight: 500;
    }
  `

  const list = document.createElement('div')

  // Existing inboxes
  inboxes.slice(0, 5).forEach((inbox) => {
    const email = `${inbox.localPart}@${inbox.domain.name}`
    const item = document.createElement('div')
    item.className = 'item'
    item.textContent = email
    item.addEventListener('click', () => fillField(input, email))
    list.appendChild(item)
  })

  // Create new option
  const createItem = document.createElement('div')
  createItem.className = 'item create'
  createItem.textContent = '+ Create New Email'
  createItem.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CREATE_INBOX' }, (response) => {
      if (response?.email) {
        fillField(input, response.email)
      }
    })
  })
  list.appendChild(createItem)

  shadow.appendChild(style)
  shadow.appendChild(list)

  return container
}

function fillField(input: HTMLInputElement, email: string) {
  // Close dropdown
  if (activeDropdown) {
    activeDropdown.remove()
    activeDropdown = null
  }

  // Set value
  input.value = email
  input.focus()

  // Dispatch events for framework compatibility
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))

  // Copy to clipboard
  navigator.clipboard.writeText(email).catch(() => {})
}
```

### Step 4: Create Main Content Script (1h)

Create `src/content/index.ts`:
```typescript
import { detectEmailFields, observeNewFields } from './field-detector'
import { injectUI } from './ui-injector'

// Check if extension is enabled for this site
async function isEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['disabledSites'], (result) => {
      const disabled = result.disabledSites || []
      resolve(!disabled.includes(location.hostname))
    })
  })
}

async function init() {
  if (!(await isEnabled())) {
    console.log('Ephemera: Disabled for this site')
    return
  }

  // Initial scan
  const fields = detectEmailFields()
  if (fields.length > 0) {
    injectUI(fields)
  }

  // Watch for new fields
  observeNewFields((newFields) => {
    injectUI(newFields)
  })

  console.log('Ephemera: Content script initialized')
}

// Wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
```

### Step 5: Update Background Script (1h)

Update `src/background/index.ts`:
```typescript
import { api } from '../utils/api'

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_INBOXES') {
    handleGetInboxes().then(sendResponse)
    return true // Async response
  }

  if (message.type === 'CREATE_INBOX') {
    handleCreateInbox().then(sendResponse)
    return true
  }
})

async function handleGetInboxes() {
  const { token } = await chrome.storage.local.get('token')
  if (!token) return { inboxes: [] }

  try {
    const { data } = await api<{ data: any[] }>('/inboxes?limit=10', { token })
    return { inboxes: data }
  } catch {
    return { inboxes: [] }
  }
}

async function handleCreateInbox() {
  const { token } = await chrome.storage.local.get('token')
  if (!token) return { error: 'Not authenticated' }

  try {
    // Get first available domain
    const { data: domains } = await api<{ data: any[] }>('/domains?limit=1', { token })
    if (!domains.length) return { error: 'No domain available' }

    const localPart = Math.random().toString(36).substring(2, 10)
    const { inbox } = await api<{ inbox: any }>('/inboxes', {
      method: 'POST',
      token,
      body: { domainId: domains[0].id, localPart }
    })

    const email = `${inbox.localPart}@${inbox.domain?.name || domains[0].name}`

    // Copy to clipboard
    // Note: Service worker can't access clipboard directly

    return { email, inbox }
  } catch (error) {
    return { error: 'Failed to create inbox' }
  }
}
```

## Todo List

- [ ] Update manifest with content_scripts config
- [ ] Create field detector module
- [ ] Create UI injector with Shadow DOM
- [ ] Create dropdown component
- [ ] Create main content script
- [ ] Update background script message handlers
- [ ] Test on common sites (Google, Twitter, GitHub)
- [ ] Handle edge cases (hidden fields, iframes)
- [ ] Add disabled sites list feature
- [ ] Test React/Vue/Angular form compatibility

## Success Criteria

- [ ] Icon appears in email fields on test sites
- [ ] Clicking icon shows dropdown with inboxes
- [ ] Selecting email fills the field
- [ ] "Create New" creates inbox and fills
- [ ] No style conflicts with host pages
- [ ] Works on Gmail signup, Twitter signup, GitHub signup

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Shadow DOM browser support | Low | High | Check compatibility, fallback to inline |
| CSP blocking injection | Medium | Medium | Use manifest-declared resources |
| Form framework compatibility | Medium | Medium | Test multiple event types |
| Performance on heavy pages | Low | Low | Debounce mutations, limit scans |

## Security Considerations

- Content scripts run with limited privileges
- No access to page's JavaScript context
- All API calls go through background script
- Shadow DOM prevents XSS from host page

## Next Steps

→ [Phase 5: Backend API Endpoints](./phase-05-api-endpoints.md)
