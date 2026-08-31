/** Thin wrapper over the Web Notifications API — no push service, no
 * external credentials. Only fires while the app is open in a background
 * or unfocused tab; there is no way to notify the user once the tab is
 * closed (that would require a real push service). */

export const canUseBrowserNotifications = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

/** Requests permission once, only if the user hasn't been asked (or denied) yet. */
export const ensureNotificationPermission = async (): Promise<NotificationPermission | null> => {
  if (!canUseBrowserNotifications()) return null;
  if (Notification.permission !== 'default') return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
};

/** True when the tab is hidden or the window lacks focus — i.e. the user
 * likely wouldn't otherwise notice a new message arriving. */
export const isTabInBackground = (): boolean =>
  typeof document !== 'undefined' && (document.hidden || !document.hasFocus());

interface NotifyOptions {
  title: string;
  body: string;
  onClick?: () => void;
}

export const notifyNewMessage = ({ title, body, onClick }: NotifyOptions): void => {
  if (!canUseBrowserNotifications() || Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: '/favicon.svg',
    tag: 'soliv-chat-message',
  });

  notification.onclick = () => {
    window.focus();
    onClick?.();
    notification.close();
  };
};
