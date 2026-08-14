import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PendingFeedback {
  sessionId: string;
  requestId: string;
  endedAt: string | null;
}

/** Only calls finished in the last 7 days block the app. */
const WINDOW_DAYS = 7;

/**
 * Pending SOS feedback gate.
 *
 * After an emergency call ends, both patient and psychologist MUST rate it.
 * If the app was closed before rating, the pending evaluation is detected on
 * the next app open and blocks usage until it is submitted.
 */
export const usePendingCallFeedback = () => {
  const { user, userType } = useAuth();
  const [pending, setPending] = useState<PendingFeedback | null>(null);

  const check = useCallback(async () => {
    if (!user || (userType !== 'patient' && userType !== 'psychologist')) {
      setPending(null);
      return;
    }

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const query = supabase
      .from('emergency_requests')
      .select('id, video_room_id, ended_at, started_at')
      .not('ended_at', 'is', null)
      .not('video_room_id', 'is', null)
      .not('started_at', 'is', null)
      .gte('ended_at', since)
      .order('ended_at', { ascending: false })
      .limit(10);

    const { data, error } =
      userType === 'patient'
        ? await query.eq('patient_id', user.id)
        : await query.eq('accepted_by', user.id);

    if (error || !data?.length) {
      setPending(null);
      return;
    }

    const sessionIds = data.map((r) => r.video_room_id as string);
    const { data: feedbacks } = await supabase
      .from('session_feedback')
      .select('session_id')
      .eq('user_id', user.id)
      .in('session_id', sessionIds);

    const rated = new Set((feedbacks ?? []).map((f) => f.session_id));
    const next = data.find((r) => !rated.has(r.video_room_id as string));

    setPending(
      next
        ? { sessionId: next.video_room_id as string, requestId: next.id, endedAt: next.ended_at }
        : null
    );
  }, [user, userType]);

  useEffect(() => {
    check();
  }, [check]);

  return { pending, recheck: check, clear: () => setPending(null) };
};
