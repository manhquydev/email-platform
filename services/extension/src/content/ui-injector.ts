import { DetectedField } from './field-detector'
import { CONFIG } from '../shared/config'

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

// Global listener for inbox updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'INBOXES_UPDATED' && activeDropdown && activeInput) {
    // Refresh the active dropdown if it's open
    const iconWrapper = activeInput.parentElement?.querySelector('.ephemera-icon-container') as HTMLElement;
    if (iconWrapper) {
      showDropdown(activeInput, iconWrapper);
    }
  }
});

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
let activeInput: HTMLInputElement | null = null

function showDropdown(input: HTMLInputElement, iconWrapper: HTMLElement) {
  // Close existing dropdown
  if (activeDropdown) {
    activeDropdown.remove()
    activeDropdown = null
  }

  activeInput = input;

  // Request inboxes from background
  chrome.storage.local.get(['inboxes', 'auth'], (result) => {
      const auth = result.auth;
      if (!auth || !auth.isAuthenticated) {
          const dropdown = createLoginRequiredDropdown()
          document.body.appendChild(dropdown)
          activeDropdown = dropdown
          positionDropdown(dropdown, iconWrapper)
          setupCloseHandler(dropdown, iconWrapper)
          return;
      }

      const inboxes = result.inboxes || [];
      const dropdown = createDropdown(inboxes, input)
      document.body.appendChild(dropdown)
      activeDropdown = dropdown
      positionDropdown(dropdown, iconWrapper)
      setupCloseHandler(dropdown, iconWrapper)
  });
}

function positionDropdown(dropdown: HTMLElement, iconWrapper: HTMLElement) {
    const iconRect = iconWrapper.getBoundingClientRect()
    dropdown.style.top = `${iconRect.bottom + window.scrollY + 4}px`
    dropdown.style.left = `${iconRect.right + window.scrollX - 240}px`
}

function setupCloseHandler(dropdown: HTMLElement, iconWrapper: HTMLElement) {
    const closeHandler = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node) && e.target !== iconWrapper) {
        dropdown.remove()
        activeDropdown = null
        activeInput = null
        document.removeEventListener('click', closeHandler)
      }
    }
    setTimeout(() => document.addEventListener('click', closeHandler), 0)
}

function createLoginRequiredDropdown(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'ephemera-dropdown-container'
    container.style.cssText = `
      position: absolute;
      z-index: 9999999;
      width: 240px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      font-family: system-ui, -apple-system, sans-serif;
      animation: ephemera-fade-in 0.2s ease-out;
      padding: 20px;
      text-align: center;
    `

    const shadow = container.attachShadow({ mode: 'closed' })
    const style = document.createElement('style')
    style.textContent = `
      .title { font-weight: 700; color: #1e293b; margin-bottom: 8px; font-size: 15px; }
      .desc { color: #64748b; font-size: 13px; margin-bottom: 16px; line-height: 1.5; }
      .btn {
          display: block;
          width: 100%;
          padding: 10px;
          background: #0ea5e9;
          color: white;
          border-radius: 8px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition: background 0.2s;
          cursor: pointer;
          border: none;
      }
      .btn:hover { background: #0284c7; }
    `

    const content = document.createElement('div')
    content.innerHTML = `
      <div class="title">Sign in Required</div>
      <div class="desc">Please sign in to your Ephemera account to use temporary emails.</div>
      <button class="btn">Sign In / Sign Up</button>
    `

    content.querySelector('.btn')?.addEventListener('click', () => {
        window.open(`${CONFIG.WEB_URL}/login`, '_blank')
    })

    shadow.appendChild(style)
    shadow.appendChild(content)
    return container
}

interface Inbox {
  id: string
  localPart: string
  address?: string
  domain: { name: string } | string
}

function createDropdown(inboxes: Inbox[], input: HTMLInputElement): HTMLElement {
  const container = document.createElement('div')
  container.className = 'ephemera-dropdown-container'
  container.style.cssText = `
    position: absolute;
    z-index: 9999999;
    width: 240px;
    max-height: 320px;
    overflow-y: auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    font-family: system-ui, -apple-system, sans-serif;
    animation: ephemera-fade-in 0.2s ease-out;
  `

  const shadow = container.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = `
    @keyframes ephemera-fade-in {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .list {
      padding: 6px;
    }
    .item {
      padding: 10px 12px;
      color: #334155;
      font-size: 13px;
      cursor: pointer;
      border-radius: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .item:hover {
      background: #f1f5f9;
      color: #0ea5e9;
    }
    .item-icon {
      flex-shrink: 0;
      color: #94a3b8;
    }
    .item:hover .item-icon {
      color: #0ea5e9;
    }
    .create {
      margin-top: 4px;
      color: #0ea5e9;
      font-weight: 600;
      background: #f0f9ff;
      border: 1px dashed #bae6fd;
    }
    .create:hover {
      background: #e0f2fe;
      border-style: solid;
    }
    .header {
        padding: 8px 12px 4px;
        font-size: 11px;
        color: #94a3b8;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .no-data {
        padding: 20px;
        text-align: center;
        color: #94a3b8;
        font-size: 13px;
    }
    .footer {
        margin-top: 4px;
        padding-top: 4px;
        border-top: 1px solid #f1f5f9;
    }
    .link-item {
        color: #64748b;
        font-weight: 500;
    }
    .link-item:hover {
        background: #f8fafc;
        color: #334155;
    }
  `

  const list = document.createElement('div')
  list.className = 'list'

  if (inboxes.length > 0) {
      const header = document.createElement('div');
      header.className = 'header';
      header.textContent = 'Your Inboxes';
      list.appendChild(header);

      // Existing inboxes
      inboxes.slice(0, 10).forEach((inbox) => {
        const email = inbox.address || `${inbox.localPart}@${typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name}`;

        const item = document.createElement('div')
        item.className = 'item'
        item.innerHTML = `
          <svg class="item-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H17.5C20 5 22 7 22 9.5Z"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          <span>${email}</span>
        `
        item.addEventListener('click', () => fillField(input, email))
        list.appendChild(item)
      })
  } else {
      const empty = document.createElement('div');
      empty.className = 'no-data';
      empty.textContent = 'No active inboxes';
      list.appendChild(empty);
  }

  // Create new option
  const createItem = document.createElement('div')
  createItem.className = 'item create'
  createItem.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
    <span>Generate New Email</span>
  `
  createItem.addEventListener('click', (e) => {
    e.stopPropagation();
    const span = createItem.querySelector('span');
    if (span) span.textContent = 'Generating...';
    createItem.style.opacity = '0.7';
    createItem.style.pointerEvents = 'none';

    chrome.runtime.sendMessage({ type: 'CREATE_INBOX' }, (response) => {
      if (response && response.success && response.inbox) {
        const inbox = response.inbox;
        const domainName = typeof inbox.domain === 'string' ? inbox.domain : (inbox.domain?.name || 'domain');
        const email = inbox.address || `${inbox.localPart}@${domainName}`;
        fillField(input, email);
      } else {
          if (span) span.textContent = 'Error: Check login';
          createItem.style.color = '#ef4444';
          createItem.style.background = '#fef2f2';
          createItem.style.pointerEvents = 'auto';
          createItem.style.opacity = '1';
      }
    })
  })
  list.appendChild(createItem)

  // Footer links
  const footer = document.createElement('div')
  footer.className = 'footer'

  const dashboardItem = document.createElement('div')
  dashboardItem.className = 'item link-item'
  dashboardItem.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
    <span>Go to Dashboard</span>
  `
  dashboardItem.addEventListener('click', () => {
    window.open(`${CONFIG.WEB_URL}/dashboard`, '_blank')
  })
  footer.appendChild(dashboardItem)
  list.appendChild(footer)

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
