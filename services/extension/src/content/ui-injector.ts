import { DetectedField } from './field-detector'

const ICON_SIZE = 24
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

function createIconWrapper(_input: HTMLInputElement): HTMLElement {
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
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .icon:hover {
      opacity: 1;
    }
    .icon svg {
      width: 16px;
      height: 16px;
      stroke: white;
    }
  `

  const icon = document.createElement('div')
  icon.className = 'icon'
  icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect width="20" height="16" x="2" y="4" rx="2"/>
  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
</svg>`

  shadow.appendChild(style)
  shadow.appendChild(icon)

  document.body.appendChild(container)
  return container
}

function positionIcon(wrapper: HTMLElement, input: HTMLInputElement) {
  const updatePosition = () => {
    const rect = input.getBoundingClientRect()
    // If element is hidden/removed, hide wrapper
    if (rect.width === 0 || rect.height === 0) {
        wrapper.style.display = 'none';
        return;
    } else {
        wrapper.style.display = 'block';
    }

    const scrollX = window.scrollX
    const scrollY = window.scrollY

    // Position inside the right edge
    wrapper.style.top = `${rect.top + scrollY + (rect.height - ICON_SIZE) / 2}px`
    wrapper.style.left = `${rect.right + scrollX - ICON_SIZE - 8}px`
  }

  updatePosition()

  // Update on scroll/resize
  window.addEventListener('scroll', updatePosition, { passive: true })
  window.addEventListener('resize', updatePosition, { passive: true })

  // Use ResizeObserver for input changes
  const resizeObserver = new ResizeObserver(updatePosition);
  resizeObserver.observe(input);
}

let activeDropdown: HTMLElement | null = null

function showDropdown(input: HTMLInputElement, iconWrapper: HTMLElement) {
  // Close existing dropdown
  if (activeDropdown) {
    activeDropdown.remove()
    activeDropdown = null
  }

  // Request inboxes from background
  // We use the same message type 'GET_INBOXES' which we need to handle in background
  // OR we can just create a new inbox immediately for MVP to match previous logic
  // But let's try to get list first.
  // Since background currently only handles 'CREATE_INBOX', let's stick to simple "Create New" or reuse logic if possible.
  // Actually, let's implement the dropdown fully.

  // Note: background/index.ts currently only has CREATE_INBOX and SETUP_PUSH.
  // We need to add GET_INBOXES support there or just use storage directly if possible (content script can't access extension storage directly without permission/message)
  // Actually content scripts CAN access chrome.storage.local.

  chrome.storage.local.get(['inboxes'], (result) => {
      const inboxes = result.inboxes || [];
      const dropdown = createDropdown(inboxes, input)
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
  });
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
    width: 220px;
    max-height: 300px;
    overflow-y: auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    font-family: system-ui, sans-serif;
  `

  const shadow = container.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = `
    .item {
      padding: 10px 12px;
      color: #334155;
      font-size: 13px;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: background-color 0.1s;
    }
    .item:hover {
      background: #f8fafc;
    }
    .item:last-child {
      border-bottom: none;
    }
    .create {
      color: #0ea5e9;
      font-weight: 600;
      background: #f0f9ff;
    }
    .create:hover {
      background: #e0f2fe;
    }
    .header {
        padding: 8px 12px;
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        background: #f8fafc;
    }
  `

  const list = document.createElement('div')

  if (inboxes.length > 0) {
      const header = document.createElement('div');
      header.className = 'header';
      header.textContent = 'Your Inboxes';
      list.appendChild(header);

      // Existing inboxes
      inboxes.slice(0, 5).forEach((inbox) => {
        const email = `${inbox.localPart}@${inbox.domain.name}`
        const item = document.createElement('div')
        item.className = 'item'
        item.textContent = email
        item.addEventListener('click', () => fillField(input, email))
        list.appendChild(item)
      })
  }

  // Create new option
  const createItem = document.createElement('div')
  createItem.className = 'item create'
  createItem.innerHTML = '+ Generate New Email'
  createItem.addEventListener('click', () => {
    // Show loading state
    createItem.textContent = 'Generating...';

    chrome.runtime.sendMessage({ type: 'CREATE_INBOX' }, (response) => {
      if (response && response.success && response.inbox) {
        const inbox = response.inbox;
        const email = inbox.address || `${inbox.localPart}@${inbox.domain.name}`;
        fillField(input, email);
      } else {
          createItem.textContent = 'Error creating email';
          createItem.style.color = 'red';
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
  // Some frameworks listen to key events
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
}
