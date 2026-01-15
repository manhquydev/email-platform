import { DetectedField } from './field-detector';
import { CONFIG } from '../shared/config';

const ICON_SIZE = 24;
const injectedFields = new WeakSet<HTMLInputElement>();

export function injectUI(fields: DetectedField[]) {
  // Use requestIdleCallback to avoid blocking the main thread
  const scheduleInjection = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1));

  scheduleInjection(() => {
    fields.forEach((field) => {
      if (injectedFields.has(field.element)) return;
      injectedFields.add(field.element);

      const wrapper = createIconWrapper(field.element);
      positionIcon(wrapper, field.element);

      wrapper.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showDropdown(field.element, wrapper);
      });
    });
  });
}

// Global listener for inbox updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'INBOXES_UPDATED' && activeDropdown && activeInput) {
    // Refresh the active dropdown if it's open
    const iconWrapper = document.querySelector('.ephemera-icon-container') as HTMLElement;
    if (iconWrapper) {
      showDropdown(activeInput, iconWrapper);
    }
  }
});

function createIconWrapper(_input: HTMLInputElement): HTMLElement {
  // Create container with Shadow DOM for style isolation
  const container = document.createElement('div');
  container.className = 'ephemera-icon-container';
  container.style.cssText = `
    position: absolute;
    z-index: 2147483647;
    cursor: pointer;
    width: ${ICON_SIZE}px;
    height: ${ICON_SIZE}px;
    display: none; /* Hidden until positioned */
  `;

  const shadow = container.attachShadow({ mode: 'open' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
    }
    .icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0ea5e9;
      border-radius: 6px;
      opacity: 0.9;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);
      border: 1.5px solid rgba(255, 255, 255, 0.2);
    }
    .icon:hover {
      opacity: 1;
      transform: scale(1.05);
      background: #0284c7;
      box-shadow: 0 4px 6px rgba(14, 165, 233, 0.4);
    }
    .icon svg {
      width: 14px;
      height: 14px;
      stroke: white;
      fill: none;
    }
  `;

  const icon = document.createElement('div');
  icon.className = 'icon';
  icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>`;

  shadow.appendChild(style);
  shadow.appendChild(icon);

  document.body.appendChild(container);
  return container;
}

function positionIcon(wrapper: HTMLElement, input: HTMLInputElement) {
  const updatePosition = () => {
    if (!document.body.contains(input)) {
      wrapper.remove();
      return;
    }

    const rect = input.getBoundingClientRect();
    const style = window.getComputedStyle(input);

    if (rect.width === 0 || rect.height === 0 || style.display === 'none' || style.visibility === 'hidden') {
      wrapper.style.display = 'none';
      return;
    } else {
      wrapper.style.display = 'block';
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Position inside the right edge, accounting for padding/border
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const borderRight = parseFloat(style.borderRightWidth) || 0;

    wrapper.style.top = `${rect.top + scrollY + (rect.height - ICON_SIZE) / 2}px`;
    wrapper.style.left = `${rect.right + scrollX - ICON_SIZE - paddingRight - borderRight - 4}px`;
  };

  updatePosition();

  // Update on scroll/resize with throttle or passive
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition, { passive: true });

  // Use ResizeObserver for input changes
  const resizeObserver = new ResizeObserver(updatePosition);
  resizeObserver.observe(input);

  // Monitor visibility changes in the parent tree
  const intersectionObserver = new IntersectionObserver(updatePosition);
  intersectionObserver.observe(input);
}

let activeDropdown: HTMLElement | null = null;
let activeInput: HTMLInputElement | null = null;

function showDropdown(input: HTMLInputElement, iconWrapper: HTMLElement) {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }

  activeInput = input;

  chrome.storage.local.get(['inboxes', 'auth'], (result) => {
    const auth = result.auth;
    if (!auth || !auth.isAuthenticated) {
      const dropdown = createLoginRequiredDropdown();
      document.body.appendChild(dropdown);
      activeDropdown = dropdown;
      positionDropdown(dropdown, iconWrapper);
      setupCloseHandler(dropdown, iconWrapper);
      return;
    }

    const inboxes = result.inboxes || [];
    const dropdown = createDropdown(inboxes, input);
    document.body.appendChild(dropdown);
    activeDropdown = dropdown;
    positionDropdown(dropdown, iconWrapper);
    setupCloseHandler(dropdown, iconWrapper);
  });
}

function positionDropdown(dropdown: HTMLElement, iconWrapper: HTMLElement) {
  const iconRect = iconWrapper.getBoundingClientRect();
  const dropdownWidth = 260;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  let left = iconRect.right + scrollX - dropdownWidth;
  let top = iconRect.bottom + scrollY + 8;

  // Keep within viewport
  if (left < 10) left = 10;
  if (left + dropdownWidth > window.innerWidth + scrollX - 10) {
    left = window.innerWidth + scrollX - dropdownWidth - 10;
  }

  dropdown.style.top = `${top}px`;
  dropdown.style.left = `${left}px`;
}

function setupCloseHandler(dropdown: HTMLElement, iconWrapper: HTMLElement) {
  const closeHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!dropdown.contains(target) && !iconWrapper.contains(target)) {
      dropdown.remove();
      activeDropdown = null;
      activeInput = null;
      document.removeEventListener('mousedown', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', closeHandler), 0);
}

function createLoginRequiredDropdown(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ephemera-dropdown-container';
  container.style.cssText = `
    position: absolute;
    z-index: 2147483647;
    width: 260px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: ephemera-slide-up 0.2s ease-out;
    padding: 24px;
    text-align: center;
  `;

  const shadow = container.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ephemera-slide-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .title { font-weight: 700; color: #0f172a; margin-bottom: 8px; font-size: 16px; }
    .desc { color: #64748b; font-size: 14px; margin-bottom: 20px; line-height: 1.5; }
    .btn {
      display: block;
      width: 100%;
      padding: 12px;
      background: #0ea5e9;
      color: white;
      border-radius: 10px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
      box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2);
    }
    .btn:hover {
      background: #0284c7;
      transform: translateY(-1px);
      box-shadow: 0 6px 8px -1px rgba(14, 165, 233, 0.3);
    }
  `;

  const content = document.createElement('div');
  content.innerHTML = `
    <div class="title">Sign in Required</div>
    <div class="desc">Please sign in to your Ephemera account to use temporary emails.</div>
    <button class="btn">Sign In / Sign Up</button>
  `;

  content.querySelector('.btn')?.addEventListener('click', () => {
    window.open(`${CONFIG.WEB_URL}/login`, '_blank');
  });

  shadow.appendChild(style);
  shadow.appendChild(content);
  return container;
}

interface Inbox {
  id: string;
  localPart: string;
  address?: string;
  domain: { name: string } | string;
}

function createDropdown(inboxes: Inbox[], input: HTMLInputElement): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ephemera-dropdown-container';
  container.style.cssText = `
    position: absolute;
    z-index: 2147483647;
    width: 260px;
    max-height: 380px;
    overflow-y: auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: ephemera-slide-up 0.2s ease-out;
  `;

  const shadow = container.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes ephemera-slide-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .list { padding: 8px; }
    .item {
      padding: 10px 14px;
      color: #334155;
      font-size: 14px;
      cursor: pointer;
      border-radius: 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 10px;
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
      margin-top: 6px;
      color: #0ea5e9;
      font-weight: 600;
      background: #f0f9ff;
      border: 1.5px dashed #bae6fd;
    }
    .create:hover {
      background: #e0f2fe;
      border-style: solid;
    }
    .header {
      padding: 12px 14px 6px;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .no-data {
      padding: 24px;
      text-align: center;
      color: #94a3b8;
      font-size: 14px;
    }
    .footer {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid #f1f5f9;
    }
    .link-item {
      color: #64748b;
      font-weight: 500;
    }
  `;

  const list = document.createElement('div');
  list.className = 'list';

  if (inboxes.length > 0) {
    const header = document.createElement('div');
    header.className = 'header';
    header.textContent = 'Active Inboxes';
    list.appendChild(header);

    inboxes.slice(0, 8).forEach((inbox) => {
      const email = inbox.address || `${inbox.localPart}@${typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name}`;

      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <svg class="item-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H17.5C20 5 22 7 22 9.5Z"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        <span>${email}</span>
      `;
      item.addEventListener('click', () => fillField(input, email));
      list.appendChild(item);
    });
  } else {
    const empty = document.createElement('div');
    empty.className = 'no-data';
    empty.textContent = 'No active inboxes';
    list.appendChild(empty);
  }

  const createItem = document.createElement('div');
  createItem.className = 'item create';
  createItem.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
    <span>Generate New Email</span>
  `;
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
    });
  });
  list.appendChild(createItem);

  const footer = document.createElement('div');
  footer.className = 'footer';

  const dashboardItem = document.createElement('div');
  dashboardItem.className = 'item link-item';
  dashboardItem.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
    <span>Open Dashboard</span>
  `;
  dashboardItem.addEventListener('click', () => {
    window.open(`${CONFIG.WEB_URL}/dashboard`, '_blank');
  });
  footer.appendChild(dashboardItem);
  list.appendChild(footer);

  shadow.appendChild(style);
  shadow.appendChild(list);

  return container;
}

function fillField(input: HTMLInputElement, email: string) {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }

  input.value = email;
  input.focus();

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}
