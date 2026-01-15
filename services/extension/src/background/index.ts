import { storage } from '../shared/storage';
import { api } from '../shared/api';

// Alarm names
const ALARM_POLL_MESSAGES = 'poll_messages';

// Setup alarms on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Ephemera Extension Installed');

  // Create an alarm to poll for new messages every 1 minute
  // This is a fallback if real-time push isn't available
  chrome.alarms.create(ALARM_POLL_MESSAGES, {
    periodInMinutes: 1
  });

  // Initialize storage if needed
  const auth = await storage.getAuth();
  if (!auth) {
    await storage.clearAuth();
  }
});

// Handle Alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_POLL_MESSAGES) {
    await pollForMessages();
  }
});

async function pollForMessages() {
  const auth = await storage.getAuth();
  if (!auth.isAuthenticated || !auth.user) return;

  try {
    // Get list of inboxes from storage to know what to poll
    // Or fetch fresh list
    // For MVP, we might just log or skip complex polling logic until we have the UI ready
    console.log('Polling for new messages...');

    // Logic to check for new messages and show notification
    // ...
  } catch (error) {
    console.error('Polling failed:', error);
  }
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CREATE_INBOX') {
    // Handle background inbox creation
    api.createRandomInbox()
      .then(inbox => sendResponse({ success: true, inbox }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});
