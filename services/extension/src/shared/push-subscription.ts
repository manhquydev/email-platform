import { api } from '../shared/api'
import { storage } from '../shared/storage'

// Helper: Convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    const auth = await storage.getAuth();
    if (!auth.token) return false;

    // Get VAPID public key from server
    const { vapidPublicKey } = await api.getVapidKey();

    // Request notification permission - ONLY IF in a context that allows it (popup/options)
    // Service workers cannot request permission directly.
    // This function should be called from UI context usually.
    // However, for extension, 'notifications' permission in manifest usually grants this.

    // Get push subscription from service worker
    // We need to use navigator.serviceWorker.ready to get the active registration
    // This works in popup/options pages
    const registration = await navigator.serviceWorker.ready

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    })

    // Send subscription to server
    await api.subscribePush(subscription);

    // Store subscription status
    await storage.set('settings', { ...((await storage.get('settings')) || { theme: 'light', autoCopy: true }), notificationsEnabled: true });

    return true
  } catch (error) {
    console.error('Push subscription failed:', error)
    return false
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      // Ideally notify server to remove subscription via API
      // await api.unsubscribePush(subscription.endpoint)
    }

    // Update settings
    const settings = (await storage.get('settings')) || { theme: 'light', autoCopy: true };
    await storage.set('settings', { ...settings, notificationsEnabled: false });
  } catch (error) {
    console.error('Unsubscribe failed:', error)
  }
}

export async function isPushSubscribed(): Promise<boolean> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
}
