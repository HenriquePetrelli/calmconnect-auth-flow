import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { onMessage } from 'firebase/messaging';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseMessaging, isFirebaseConfigured } from '@/lib/firebase';
import { getStoredPushToken, saveActivePushToken } from '@/lib/pushToken';
import { getWebPushToken, registerNative } from '@/hooks/usePushNotifications';
import { pushTarget } from '@/lib/pushTarget';

/**
 * Push com o app aberto ou tocado, para o app inteiro (montado uma vez).
 *
 * - Toque no aviso (app Android/iPhone) abre a tela do aviso. Antes isso só
 *   funcionava com o Perfil aberto (o ouvinte morava no botão de ativar push)
 *   e só para SOS e hábitos.
 * - Com o app aberto, o aviso aparece como um toast com "Abrir" (menos quando
 *   a pessoa já está na tela dele, ex.: na própria conversa).
 * - Ao abrir o app, renova o token do aparelho: o Firebase troca o token de
 *   tempos em tempos e, sem renovar, o push parava de chegar sem aviso.
 */
const PushBridge = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const pathRef = useRef(location.pathname + location.search);
  pathRef.current = location.pathname + location.search;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Aviso chegando com o app aberto / toque no aviso.
  useEffect(() => {
    const showForeground = (title: string | undefined, body: string | undefined, target: string | null) => {
      if (!title) return;
      if (target && pathRef.current === target) return;
      toast(title, {
        description: body,
        action: target ? { label: 'Abrir', onClick: () => navigateRef.current(target) } : undefined,
      });
    };

    if (Capacitor.isNativePlatform()) {
      const received = PushNotifications.addListener('pushNotificationReceived', (notification) => {
        showForeground(notification.title, notification.body, pushTarget(notification.data));
      });
      const tapped = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const target = pushTarget(action.notification.data);
        if (target) navigateRef.current(target);
      });
      return () => {
        received.then((h) => h.remove()).catch(() => undefined);
        tapped.then((h) => h.remove()).catch(() => undefined);
      };
    }

    if (!isFirebaseConfigured() || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const messaging = getFirebaseMessaging();
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      showForeground(payload.notification?.title, payload.notification?.body, pushTarget(payload.data));
    });
    return () => unsubscribe();
  }, []);

  // Toque no aviso do navegador com o app já aberto: o service worker pede
  // para trocar de tela aqui mesmo (sem abrir outra aba).
  useEffect(() => {
    if (Capacitor.isNativePlatform() || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onSwMessage = (event: MessageEvent) => {
      const message = event.data as { type?: string; url?: unknown } | null;
      if (message?.type !== 'soliv-push-open') return;
      const target = pushTarget({ url: message.url });
      if (target) navigateRef.current(target);
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }, []);

  // Renova o token deste aparelho (só se a pessoa já ativou o push aqui).
  useEffect(() => {
    if (!user?.id || !getStoredPushToken()) return;
    let cancelled = false;
    (async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const status = await PushNotifications.checkPermissions();
          if (status.receive !== 'granted') return;
          const token = await registerNative();
          if (!cancelled) await saveActivePushToken(token, { platform: Capacitor.getPlatform() });
          return;
        }
        if (!isFirebaseConfigured() || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        if (!('serviceWorker' in navigator)) return;
        const token = await getWebPushToken();
        // Grava sempre: reativa o token e garante que é desta conta.
        if (token && !cancelled) await saveActivePushToken(token, { platform: 'web', userAgent: navigator.userAgent });
      } catch (err) {
        console.warn('[push] não foi possível renovar o token', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return null;
};

export default PushBridge;
