import { CONFIG } from '../shared/config';
import browser from 'webextension-polyfill';

interface PushPayload {
  type: 'new_message'
  messageId: string
  inboxId: string
  from: string
  subject: string
  preview: string
  receivedAt: string
}

export async function handlePushMessage(data: PushPayload) {
   console.log('Handling push message:', data);

   try {
     const title = data.from ? `New Email from ${data.from}` : 'New Email';
     const options: NotificationOptions = {
       body: data.subject || data.preview || 'You have received a new message',
       icon: '/icons/icon128.png',
       // @ts-ignore
       data: {
         inboxId: data.inboxId,
         messageId: data.messageId
       }
     };

     // @ts-ignore
     await self.registration.showNotification(title, options);

     // Extract OTP
     const otpRegex = /\b\d{4,8}\b/;
     const content = `${data.subject} ${data.preview || ''}`;
     const match = content.match(otpRegex);

     if (match) {
       await browser.storage.session.set({
         latest_otp: {
           code: match[0],
           service: data.from,
           timestamp: Date.now()
         }
       });
     }

     // Update badge
     updateBadge('NEW');
   } catch (e) {
     console.error('Error showing notification:', e);
   }
}

export async function handleNotificationClick(event: any) {
  event.notification.close();

  const data = event.notification.data;
  if (data && data.inboxId) {
    const url = `${CONFIG.WEB_URL}/inbox/${data.inboxId}`;
    // @ts-ignore
    event.waitUntil(browser.tabs.create({ url }));
  } else {
    // @ts-ignore
    event.waitUntil(browser.tabs.create({ url: `${CONFIG.WEB_URL}/dashboard` }));
  }
}

export async function updateBadge(text?: string) {
    if (text !== undefined) {
        browser.action.setBadgeText({ text });
        if (text) {
             browser.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Red for attention
        }
    }
}
