import { detectEmailFields, observeNewFields } from '../content/field-detector'
import { injectUI } from '../content/ui-injector'
import { initOpenAiAuthAutomation } from '../content/openai-auth-automation'
import { initFireworksFlow3Automation } from '../content/fireworks-flow3-automation'
import browser from 'webextension-polyfill'

const OPENAI_FLOW_HOSTS = new Set(['auth.openai.com', 'chatgpt.com'])
const FIREWORKS_FLOW_HOSTS = new Set(['app.fireworks.ai'])

function setupFlow1HotkeyFallback() {
  if (!OPENAI_FLOW_HOSTS.has(window.location.hostname)) return

  let lastTriggerAt = 0
  document.addEventListener('keydown', (event) => {
    const isCombo = event.ctrlKey && event.shiftKey && (event.key === '8' || event.code === 'Digit8')
    if (!isCombo || event.repeat) return

    const now = Date.now()
    if (now - lastTriggerAt < 700) return
    lastTriggerAt = now
    event.preventDefault()

    browser.runtime.sendMessage({
      type: 'AUTOMATION_TOGGLE_FLOW1_LOOP',
      source: 'content-hotkey-fallback',
      at: now,
    }).catch(() => {})
  }, true)
}

function setupFlow3HotkeyFallback() {
  if (!FIREWORKS_FLOW_HOSTS.has(window.location.hostname)) return

  let lastTriggerAt = 0
  document.addEventListener('keydown', (event) => {
    const isCombo = event.ctrlKey && event.shiftKey && (event.key === '9' || event.code === 'Digit9')
    if (!isCombo || event.repeat) return

    const now = Date.now()
    if (now - lastTriggerAt < 700) return
    lastTriggerAt = now
    event.preventDefault()

    browser.runtime.sendMessage({
      type: 'AUTOMATION_TOGGLE_FIREWORKS_FLOW3_LOOP',
      source: 'content-hotkey-fallback',
      at: now,
    }).catch(() => {})
  }, true)
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  main() {
    console.log('Ephemera: Content script loaded');
    initOpenAiAuthAutomation();
    initFireworksFlow3Automation();
    setupFlow1HotkeyFallback();
    setupFlow3HotkeyFallback();

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
