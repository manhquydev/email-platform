export function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomIndex(max: number): number {
  if (max <= 0) return 0;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % max;
}

export function randomPick<T>(items: T[]): T {
  return items[randomIndex(items.length)];
}

export function setInputValue(input: HTMLInputElement, value: string, options?: { blur?: boolean }): void {
  if (document.activeElement !== input) {
    try {
      input.focus({ preventScroll: true });
    } catch {
      // noop
    }
  }

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  if (options?.blur) input.blur();
}

export function findFirstInput(selectors: string[]): HTMLInputElement | null {
  for (const selector of selectors) {
    const visible = Array.from(document.querySelectorAll<HTMLInputElement>(selector))
      .find((el) => !el.disabled && !el.readOnly && isVisible(el));
    if (visible) return visible;
  }
  return null;
}

export async function waitForInput(selectors: string[], timeoutMs = 12000): Promise<HTMLInputElement | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const input = findFirstInput(selectors);
    if (input) return input;
    await sleep(250);
  }
  return null;
}

function getClickableLabel(element: HTMLElement): string {
  if (element instanceof HTMLInputElement) {
    return normalizeText(element.value || element.getAttribute('aria-label') || '');
  }
  return normalizeText(element.textContent || element.getAttribute('aria-label') || '');
}

function listVisibleClickables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(
    'button, input[type="submit"], input[type="button"], [role="button"], a[href], a[role="button"], [role="menuitem"]',
  )).filter((el) => {
    if (!isVisible(el)) return false;
    if ((el instanceof HTMLButtonElement || el instanceof HTMLInputElement) && el.disabled) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    return true;
  });
}

export function findButtonByLabels(labels: string[], mode: 'includes' | 'exact-first' = 'exact-first'): HTMLElement | null {
  const normalizedLabels = labels.map((label) => normalizeText(label)).filter(Boolean);
  const clickables = listVisibleClickables();

  if (mode === 'exact-first') {
    for (const el of clickables) {
      const text = getClickableLabel(el);
      if (text && normalizedLabels.some((label) => text === label)) return el;
    }
  }

  for (const el of clickables) {
    const text = getClickableLabel(el);
    if (text && normalizedLabels.some((label) => text.includes(label))) return el;
  }
  return null;
}

export async function waitForButtonByLabels(
  labels: string[],
  timeoutMs = 10000,
  mode: 'includes' | 'exact-first' = 'exact-first',
): Promise<HTMLElement | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const button = findButtonByLabels(labels, mode);
    if (button) return button;
    await sleep(250);
  }
  return null;
}

export function clickElement(target: HTMLElement): void {
  try {
    target.scrollIntoView({ block: 'center', inline: 'center' });
  } catch {
    // noop
  }
  try {
    target.focus({ preventScroll: true });
  } catch {
    // noop
  }
  target.click();
}

export function pageContainsText(text: string): boolean {
  return normalizeText(document.body?.innerText || '').includes(normalizeText(text));
}
