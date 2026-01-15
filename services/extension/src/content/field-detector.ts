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
  if (parseFloat(style.opacity) === '0') return false

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
