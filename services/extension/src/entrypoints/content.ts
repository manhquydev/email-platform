import { detectEmailFields, observeNewFields } from '../content/field-detector'
import { injectUI } from '../content/ui-injector'
import { initOpenAiAuthAutomation } from '../content/openai-auth-automation'

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  main() {
    console.log('Ephemera: Content script loaded');
    initOpenAiAuthAutomation();

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
  },
});
