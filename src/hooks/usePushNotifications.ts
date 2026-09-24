import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging, isFirebaseConfigured, FIREBASE_VAPID_KEY } from '@/lib/firebase';
import { deactivateStoredPushToken, getStoredPushToken, saveActivePushToken } from '@/lib/pushToken';
import { useToast } from '@/hooks/use-toast';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

const isNative = () => Capacitor.isNativePlatform();

const initialPermission = (): PermissionState => {
  // Inside the Android/iOS app the WebView can't do web push at all; the
  // native plugin is the only path, and its permission is read async.
  if (isNative()) return 'default';
  return isFirebaseConfigured() && 'Notification' in window ? (Notification.permission as PermissionState) : 'unsupported';
};

/** Registers with FCM through the native plugin and resolves with the token. */
const registerNative = () =>
  new Promise<string>((resolve, reject) => {
    const handles: Promise<{ remove: () => Promise<void> }>[] = [];
    const cleanup = () => handles.forEach((h) => h.then((x) => x.remove()).catch(() => {}));
    handles.push(
      PushNotifications.addListener('registration', (token) => {
        cleanup();
        resolve(token.value);
      })
    );
    handles.push(
      PushNotifications.addListener('registrationError', (err) => {
        cleanup();
        reject(new Error(err.error));
      })
    );
    PushNotifications.register().catch((err) => {
      cleanup();
      reject(err);
    });
  });

/**
 * Push notifications (SOS, new message) reaching a user even when the app
 * isn't open. On the web it goes through the Firebase JS SDK + service
 * worker; inside the native app through @capacitor/push-notifications. Opt-in:
 * nothing registers until enablePush() is called from a user action.
 */
export const usePushNotifications = () => {
  const [permission, setPermission] = useState<PermissionState>(initialPermission);
  const [hasToken, setHasToken] = useState(() => Boolean(getStoredPushToken()));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isNative()) return;
    PushNotifications.checkPermissions()
      .then((status) => setPermission(status.receive === 'prompt' || status.receive === 'prompt-with-rationale' ? 'default' : status.receive))
      .catch(() => setPermission('unsupported'));
  }, []);

  const enablePush = useCallback(async () => {
    setLoading(true);
    try {
      let token: string | null = null;

      if (isNative()) {
        const status = await PushNotifications.requestPermissions();
        const granted = status.receive === 'granted';
        setPermission(granted ? 'granted' : 'denied');
        if (!granted) return;
        token = await registerNative();
        await saveActivePushToken(token, { platform: Capacitor.getPlatform() });
      } else {
        if (!isFirebaseConfigured()) {
          toast({
            title: 'Notificações push indisponíveis',
            description: 'Esse recurso ainda não foi configurado no app.',
            variant: 'destructive',
          });
          return;
        }
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
          setPermission('unsupported');
          return;
        }
        const result = await Notification.requestPermission();
        setPermission(result as PermissionState);
        if (result !== 'granted') return;

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const messaging = getFirebaseMessaging();
        if (!messaging) return;
        token = await getToken(messaging, { vapidKey: FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration });
        if (!token) return;
        await saveActivePushToken(token, { platform: 'web', userAgent: navigator.userAgent });
      }

      setHasToken(true);
      toast({ title: 'Notificações ativadas', description: 'Você vai receber alertas mesmo com o app fechado.' });
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      toast({
        title: 'Não foi possível ativar as notificações',
        description: 'Tente de novo em instantes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const disablePush = useCallback(async () => {
    setLoading(true);
    try {
      await deactivateStoredPushToken();
      if (isNative()) await PushNotifications.unregister().catch(() => {});
      setHasToken(false);
      toast({ title: 'Notificações desativadas' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Foreground messages don't show a system notification — surface them as
  // a toast while the app is open.
  useEffect(() => {
    if (isNative()) {
      const handle = PushNotifications.addListener('pushNotificationReceived', (notification) => {
        if (notification.title) toast({ title: notification.title, description: notification.body });
      });
      // Tapping an SOS push opens the psychologist dashboard, where the queue is.
      const tapHandle = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        if (action.notification.data?.type === 'sos') window.location.assign('/psychologist-dashboard');
      });
      return () => {
        handle.then((h) => h.remove()).catch(() => {});
        tapHandle.then((h) => h.remove()).catch(() => {});
      };
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (title) toast({ title, description: body });
    });
    return () => unsubscribe();
  }, [toast]);

  return {
    permission,
    loading,
    isSupported: permission !== 'unsupported',
    isEnabled: permission === 'granted' && hasToken,
    enablePush,
    disablePush,
  };
};
