import { detectEmailFields, observeNewFields } from './field-detector'
import { injectUI } from './ui-injector'

console.log('Ephemera: Content script loaded');

// Check if extension is enabled for this site
// For now, assume enabled everywhere
async function init() {
  // Initial scan
  const fields = detectEmailFields()
  if (fields.length > 0) {
    console.log(`Ephemera: Found ${fields.length} email fields`);
    injectUI(fields)
  }

  // Watch for new fields
  observeNewFields((newFields) => {
    if (newFields.length > 0) {
        console.log(`Ephemera: Found ${newFields.length} new email fields`);
        injectUI(newFields)
    }
  })
}

// Wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
