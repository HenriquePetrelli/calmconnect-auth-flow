import { useCallback, useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging, isFirebaseConfigured, FIREBASE_VAPID_KEY } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Push notifications (SOS, new message) reaching a user even when the app
 * isn't open in a foreground tab — Web Notifications API alone can't do
 * that. Registering is opt-in: nothing here runs until enablePush() is
 * called from a user action (a settings toggle).
 */
export const usePushNotifications = () => {
  const [permission, setPermission] = useState<PermissionState>(
    isFirebaseConfigured() && 'Notification' in window ? (Notification.permission as PermissionState) : 'unsupported'
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const enablePush = useCallback(async () => {
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

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== 'granted') return;

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = getFirebaseMessaging();
      if (!messaging) return;

      const token = await getToken(messaging, {
        vapidKey: FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      if (!token) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('fcm_tokens')
        .upsert(
          {
            user_id: user.id,
            token,
            device_info: { userAgent: navigator.userAgent },
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'token' }
        );
      if (error) throw error;

      toast({ title: 'Notificações ativadas', description: 'Você vai receber alertas mesmo com o app fechado.' });
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar as notificações push.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const disablePush = useCallback(async () => {
    setLoading(true);
    try {
      const messaging = getFirebaseMessaging();
      const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      const token = messaging && registration
        ? await getToken(messaging, { vapidKey: FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration }).catch(() => null)
        : null;

      if (token) {
        await supabase.from('fcm_tokens').update({ is_active: false }).eq('token', token);
      }
      toast({ title: 'Notificações desativadas' });
    } catch (error) {
      console.error('Error disabling push notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Foreground messages don't trigger the service worker's background
  // handler — show them as a toast instead while the tab is active.
  useEffect(() => {
    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (title) {
        toast({ title, description: body });
      }
    });

    return () => unsubscribe();
  }, [toast]);

  return {
    permission,
    loading,
    isSupported: permission !== 'unsupported',
    isEnabled: permission === 'granted',
    enablePush,
    disablePush,
  };
};
