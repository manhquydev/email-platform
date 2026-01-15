export interface DetectedField {
  element: HTMLInputElement;
  id: string;
  rect: DOMRect;
}

const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name*="email" i]',
  'input[id*="email" i]',
  'input[placeholder*="email" i]',
  'input[autocomplete="email"]',
  'input[aria-label*="email" i]',
  'input[aria-labelledby*="email" i]',
  'input[name="user_email"]',
  'input[name="identifier"]',
  'input[data-testid*="email" i]',
  'input[data-qa*="email" i]',
];

// Keywords that suggest an email field in labels or nearby text
const EMAIL_KEYWORDS = ['email', 'e-mail', 'mail address', 'electronic mail'];

export function detectEmailFields(root: ParentNode = document): DetectedField[] {
  const fields: DetectedField[] = [];
  const seen = new Set<HTMLInputElement>();

  // 1. Selector-based detection
  for (const selector of EMAIL_SELECTORS) {
    const elements = root.querySelectorAll<HTMLInputElement>(selector);
    elements.forEach((el) => {
      if (seen.has(el)) return;
      if (!isValidEmailInput(el)) return;

      seen.add(el);
      fields.push(mapToDetectedField(el));
    });
  }

  // 2. Label-based detection (if not already found)
  if (root === document) {
    const allInputs = document.querySelectorAll('input');
    allInputs.forEach((input) => {
      if (seen.has(input)) return;
      if (!isValidEmailInput(input)) return;

      if (hasEmailLabel(input)) {
        seen.add(input);
        fields.push(mapToDetectedField(input));
      }
    });
  }

  return fields;
}

function isValidEmailInput(el: HTMLInputElement): boolean {
  if (!isVisible(el)) return false;
  if (el.disabled || el.readOnly) return false;

  const type = el.getAttribute('type')?.toLowerCase();
  // We want to include 'text' inputs that might be emails, but exclude others
  if (type && ['hidden', 'search', 'submit', 'password', 'checkbox', 'radio', 'file'].includes(type)) {
    return false;
  }

  return true;
}

function mapToDetectedField(el: HTMLInputElement): DetectedField {
  return {
    element: el,
    id: el.id || el.name || `ephemera-${Math.random().toString(36).substring(2, 9)}`,
    rect: el.getBoundingClientRect(),
  };
}

function hasEmailLabel(input: HTMLInputElement): boolean {
  // Check associated <label> elements
  const labels = input.labels;
  if (labels && labels.length > 0) {
    for (let i = 0; i < labels.length; i++) {
      if (containsEmailKeyword(labels[i].textContent)) return true;
    }
  }

  // Check aria-label
  const ariaLabel = input.getAttribute('aria-label');
  if (containsEmailKeyword(ariaLabel)) return true;

  // Check placeholder
  const placeholder = input.getAttribute('placeholder');
  if (containsEmailKeyword(placeholder)) return true;

  return false;
}

function containsEmailKeyword(text: string | null): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return EMAIL_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity) === 0) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  return true;
}

// Optimized MutationObserver for dynamically added fields
export function observeNewFields(callback: (fields: DetectedField[]) => void) {
  const observer = new MutationObserver((mutations) => {
    let addedNodes: Node[] = [];

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            addedNodes.push(node);
          }
        });
      }
    }

    if (addedNodes.length > 0) {
      const allNewFields: DetectedField[] = [];
      addedNodes.forEach((node) => {
        const fields = detectEmailFields(node as ParentNode);
        allNewFields.push(...fields);
      });

      if (allNewFields.length > 0) {
        callback(allNewFields);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}
