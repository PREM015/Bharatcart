// Web Push Notifications
export class PushNotificationService {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribe(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator)) return null;

    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY
    });
  }

  async sendNotification(title: string, options: NotificationOptions): Promise<void> {
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
}
