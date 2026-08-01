import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveEmergencyCall {
  requestId: string;
  sessionId: string;
  role: 'patient' | 'psychologist';
  startedAt: string | null;
}

const ONGOING_STATUSES = ['accepted', 'in_progress'];

/**
 * Detects an emergency call that was accepted/started and never properly
 * finished (e.g. the user closed the app or lost connection), so we can
 * offer a "return to call" shortcut on Home / Dashboard.
 */
export const useActiveEmergencyCall = () => {
  const [activeCall, setActiveCall] = useState<ActiveEmergencyCall | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) {
      setActiveCall(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('emergency_requests')
      .select('id, patient_id, accepted_by, status, video_room_id, room_url, started_at, ended_at')
      .in('status', ONGOING_STATUSES)
      .is('ended_at', null)
      .or(`patient_id.eq.${userId},accepted_by.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking active emergency call:', error);
      setLoading(false);
      return;
    }

    const row: any = data?.[0];
    const sessionId = row?.video_room_id || row?.room_url;

    if (row && sessionId) {
      setActiveCall({
        requestId: row.id,
        sessionId,
        role: row.patient_id === userId ? 'patient' : 'psychologist',
        startedAt: row.started_at ?? null,
      });
    } else {
      setActiveCall(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    check();

    const channel = supabase
      .channel(`active_emergency_call_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_requests' },
        () => check()
      )
      .subscribe();

    const interval = window.setInterval(check, 20000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [check]);

  return { activeCall, loading, refresh: check };
};
