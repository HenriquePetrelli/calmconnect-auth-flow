import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  patient_id: string;
  appointment_id?: string | null;
  link?: string | null;
  title: string;
  message: string;
  status: 'unread' | 'read';
  created_at: string;
}

/** Quantos avisos a tela mostra por vez ("Ver mais antigas" busca o resto). */
export const NOTIFICATIONS_PAGE_SIZE = 30;

interface NotificationsState {
  userId: string | null;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
}

/**
 * Avisos do sino, uma fonte só para o app inteiro.
 *
 * Antes cada lugar (menu, barra, tela de avisos) tinha a sua cópia, cada uma
 * com uma conexão em tempo real. Ao marcar como lida na tela, o contador do
 * menu não baixava: o tempo real só entrega o id da linha alterada (sem o
 * status antigo) e a outra cópia não sabia o que descontar. Agora há uma
 * cópia, o contador vem do servidor (contagem das não lidas, não da lista
 * carregada) e a lista é buscada em páginas.
 */
const initialState = (userId: string | null): NotificationsState => ({
  userId,
  notifications: [],
  unreadCount: 0,
  loading: true,
  hasMore: false,
  loadingMore: false,
});

let state: NotificationsState = initialState(null);
const listeners = new Set<() => void>();
let subscribers = 0;
let channel: ReturnType<typeof supabase.channel> | null = null;
let countTimer: ReturnType<typeof setTimeout> | null = null;
let syncSeq = 0;

const setState = (patch: Partial<NotificationsState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const normalize = (row: Record<string, unknown>): Notification => ({
  ...(row as unknown as Notification),
  status: row.status === 'read' ? 'read' : 'unread',
});

const sortDesc = (list: Notification[]) =>
  [...list].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));

/** Não lidas contadas no servidor (vale também para o que não está na tela). */
const refreshUnreadCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', userId)
    .eq('status', 'unread');
  if (!error && state.userId === userId && typeof count === 'number') setState({ unreadCount: count });
};

const scheduleCount = (userId: string) => {
  if (countTimer) clearTimeout(countTimer);
  countTimer = setTimeout(() => {
    countTimer = null;
    void refreshUnreadCount(userId);
  }, 250);
};

/** Busca a primeira página de novo (entrar, voltar para o app, reconectar). */
const sync = async (userId: string) => {
  const seq = ++syncSeq;
  const loaded = Math.max(NOTIFICATIONS_PAGE_SIZE, state.userId === userId ? state.notifications.length : 0);
  const [{ data, error }] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false })
      .limit(loaded + 1),
    refreshUnreadCount(userId),
  ]);
  if (seq !== syncSeq || state.userId !== userId) return;
  if (error) {
    console.error('Error fetching notifications:', error);
    setState({ loading: false });
    return;
  }
  const rows = (data ?? []).map((row) => normalize(row as Record<string, unknown>));
  setState({ notifications: rows.slice(0, loaded), hasMore: rows.length > loaded, loading: false });
};

const start = (userId: string) => {
  if (channel) void supabase.removeChannel(channel);
  channel = supabase
    .channel(`notifications-${userId}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `patient_id=eq.${userId}` },
      (payload) => {
        const row = normalize(payload.new as Record<string, unknown>);
        if (!state.notifications.some((n) => n.id === row.id)) {
          setState({ notifications: sortDesc([row, ...state.notifications]) });
        }
        scheduleCount(userId);
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `patient_id=eq.${userId}` },
      (payload) => {
        const row = normalize(payload.new as Record<string, unknown>);
        setState({ notifications: state.notifications.map((n) => (n.id === row.id ? { ...n, ...row } : n)) });
        scheduleCount(userId);
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'notifications', filter: `patient_id=eq.${userId}` },
      (payload) => {
        const removedId = (payload.old as { id?: string })?.id;
        if (removedId) setState({ notifications: state.notifications.filter((n) => n.id !== removedId) });
        scheduleCount(userId);
      },
    )
    .subscribe((status) => {
      // Voltou de uma queda do tempo real: busca o que pode ter faltado.
      if (status === 'SUBSCRIBED') void sync(userId);
    });
};

const stop = () => {
  if (channel) void supabase.removeChannel(channel);
  channel = null;
  if (countTimer) clearTimeout(countTimer);
  countTimer = null;
};

const onWake = () => {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  if (state.userId) void sync(state.userId);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

/** Só para testes: volta ao estado inicial. */
export const __resetNotificationsStore = () => {
  stop();
  subscribers = 0;
  listeners.clear();
  state = initialState(null);
};

export const useNotifications = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!userId) return;
    subscribers += 1;
    if (state.userId !== userId) {
      stop();
      state = initialState(userId);
      listeners.forEach((listener) => listener());
    }
    if (!channel) {
      start(userId);
      void sync(userId);
      window.addEventListener('online', onWake);
      window.addEventListener('focus', onWake);
      document.addEventListener('visibilitychange', onWake);
    }
    return () => {
      subscribers -= 1;
      if (subscribers === 0) {
        stop();
        window.removeEventListener('online', onWake);
        window.removeEventListener('focus', onWake);
        document.removeEventListener('visibilitychange', onWake);
      }
    };
  }, [userId]);

  const view = snapshot.userId === userId ? snapshot : initialState(userId);

  const markAsRead = useCallback(async (notificationId: string) => {
    const target = state.notifications.find((n) => n.id === notificationId);
    if (!target || target.status === 'read' || !state.userId) return;
    const userId = state.userId;
    setState({
      notifications: state.notifications.map((n) => (n.id === notificationId ? { ...n, status: 'read' } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    });
    const { error } = await supabase.from('notifications').update({ status: 'read' }).eq('id', notificationId);
    if (error) console.error('Error marking notification as read:', error);
    scheduleCount(userId);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!state.userId) return;
    const userId = state.userId;
    setState({ notifications: state.notifications.map((n) => ({ ...n, status: 'read' })), unreadCount: 0 });
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('patient_id', userId)
      .eq('status', 'unread');
    if (error) {
      console.error('Error marking all notifications as read:', error);
      void sync(userId);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!state.userId) return false;
    const userId = state.userId;
    const removed = state.notifications.find((n) => n.id === notificationId);
    setState({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
      unreadCount: removed?.status === 'unread' ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    });
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
    if (error) {
      console.error('Error deleting notification:', error);
      void sync(userId);
      return false;
    }
    scheduleCount(userId);
    return true;
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    if (!state.userId) return false;
    const userId = state.userId;
    setState({ notifications: [], unreadCount: 0, hasMore: false });
    const { error } = await supabase.from('notifications').delete().eq('patient_id', userId);
    if (error) {
      console.error('Error deleting all notifications:', error);
      void sync(userId);
      return false;
    }
    return true;
  }, []);

  const loadMore = useCallback(async () => {
    if (!state.userId || state.loadingMore || !state.hasMore) return;
    const userId = state.userId;
    const last = state.notifications[state.notifications.length - 1];
    if (!last) return;
    setState({ loadingMore: true });
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('patient_id', userId)
      .lt('created_at', last.created_at)
      .order('created_at', { ascending: false })
      .limit(NOTIFICATIONS_PAGE_SIZE + 1);
    if (state.userId !== userId) return;
    if (error) {
      console.error('Error fetching older notifications:', error);
      setState({ loadingMore: false });
      return;
    }
    const rows = (data ?? []).map((row) => normalize(row as Record<string, unknown>));
    const known = new Set(state.notifications.map((n) => n.id));
    setState({
      notifications: [...state.notifications, ...rows.slice(0, NOTIFICATIONS_PAGE_SIZE).filter((n) => !known.has(n.id))],
      hasMore: rows.length > NOTIFICATIONS_PAGE_SIZE,
      loadingMore: false,
    });
  }, []);

  const refetch = useCallback(async () => {
    if (state.userId) await sync(state.userId);
  }, []);

  return {
    notifications: view.notifications,
    unreadCount: view.unreadCount,
    loading: Boolean(userId) && view.loading,
    hasMore: view.hasMore,
    loadingMore: view.loadingMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    loadMore,
    refetch,
  };
};
