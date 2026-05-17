import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Shared module-level store so every consumer of the hook stays in sync
// instantly, without relying on postgres realtime round-trips.
type State = { isOnline: boolean; initialized: boolean; userId: string | null };
let state: State = { isOnline: false, initialized: false, userId: null };
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => state;
const setState = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let bootstrapped = false;
const bootstrap = async () => {
  if (bootstrapped) return;
  bootstrapped = true;

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) {
    setState({ initialized: true, userId: null, isOnline: false });
    return;
  }

  const { data } = await supabase
    .from('psychologist_presence')
    .select('psychologist_id')
    .eq('psychologist_id', userId)
    .maybeSingle();

  setState({ initialized: true, userId, isOnline: !!data });

  supabase
    .channel(`psychologist_presence_shared_${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'psychologist_presence' },
      (payload) => {
        const newRow: any = payload.new;
        const oldRow: any = payload.old;
        if (payload.eventType === 'DELETE') {
          if (oldRow?.psychologist_id === userId) setState({ isOnline: false });
        } else if (newRow?.psychologist_id === userId) {
          setState({ isOnline: true });
        }
      }
    )
    .subscribe();
};

export const usePsychologistPresence = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    bootstrap();
  }, []);

  const setOnlineStatus = useCallback(async (nextStatus: boolean) => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      if (nextStatus) {
        const { error } = await supabase
          .from('psychologist_presence')
          .upsert({
            psychologist_id: userId,
            last_online: new Date().toISOString(),
            emergency_accepted_count: 0,
            emergency_rejected_count: 0,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('psychologist_presence')
          .delete()
          .eq('psychologist_id', userId);
        if (error) throw error;
      }

      // Update shared store immediately so every consumer re-renders.
      setState({ isOnline: nextStatus, userId });
    } catch (err: any) {
      console.error('Error updating presence:', err);
      toast({
        title: 'Erro',
        description: `Não foi possível atualizar seu status: ${err.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const toggle = useCallback(
    () => setOnlineStatus(!snapshot.isOnline),
    [snapshot.isOnline, setOnlineStatus]
  );

  return {
    isOnline: snapshot.isOnline,
    initialized: snapshot.initialized,
    loading,
    setOnlineStatus,
    toggle,
  };
};
