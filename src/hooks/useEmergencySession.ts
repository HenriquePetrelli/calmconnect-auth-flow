import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { acquireCallLock } from '@/lib/callLock';
import { findOngoingCallForUser, sessionIdOf } from '@/lib/emergencyCallGuard';
import { endEmergencySession } from '@/lib/endEmergencySession';
import { sosLog } from '@/lib/sosLogger';
import { trackSosEvent, SOS_EVENTS } from '@/lib/sosTrace';
import type { EndCallInfo } from '@/components/EmergencyVideoCall';

interface UseEmergencySessionParams {
  sessionId?: string | null;
  requestIdFromUrl?: string | null;
  userType: 'patient' | 'psychologist';
}

/**
 * EMERGENCY SESSION MANAGER (request lifecycle layer).
 *
 * Owns everything that is NOT WebRTC and NOT UI:
 *  - resolving the emergency request behind a room (URL is never the source of truth)
 *  - the single-active-call lock (duplicated tabs / parallel rooms)
 *  - the `accepted -> in_progress` transition on the first join
 *  - the single termination entry point
 *
 * The view components only consume the returned state.
 */
export const useEmergencySession = ({
  sessionId,
  requestIdFromUrl,
  userType,
}: UseEmergencySessionParams) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requestId, setRequestId] = useState<string | undefined>(requestIdFromUrl ?? undefined);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  const homeRoute = userType === 'psychologist' ? '/psychologist-dashboard' : '/home';

  // 1. Resolve the emergency request from the room when the URL only has the session.
  useEffect(() => {
    if (requestIdFromUrl) {
      setRequestId(requestIdFromUrl);
      return;
    }
    if (!sessionId) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('webrtc_sessions')
        .select('emergency_request_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (!cancelled && data?.emergency_request_id) {
        sosLog('SESSION', 'emergency request resolved from session', {
          sessionId,
          requestId: data.emergency_request_id,
        });
        setRequestId(data.emergency_request_id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestIdFromUrl, sessionId]);

  // 2. Single active call guard.
  useEffect(() => {
    if (!sessionId) return;
    let release: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId || cancelled) return;

      const lockResult = acquireCallLock(userId, sessionId);
      if (lockResult.ok === false) {
        const duplicateTab = lockResult.reason === 'duplicate-tab';
        toast({
          title: duplicateTab ? 'Chamada já aberta' : 'Chamada em andamento',
          description: duplicateTab
            ? 'Esta chamada já está aberta em outra aba ou janela.'
            : 'Você já está em outra chamada. Finalize-a antes de entrar nesta.',
          variant: 'destructive',
        });
        navigate(homeRoute);
        return;
      }
      release = lockResult.release;

      const ongoing = await findOngoingCallForUser(userId);
      const ongoingSession = sessionIdOf(ongoing);
      if (!cancelled && ongoing && ongoingSession && ongoingSession !== sessionId) {
        toast({
          title: 'Chamada em andamento',
          description: 'Você já possui uma chamada de emergência ativa. Retornando para ela.',
        });
        navigate(`/emergency-call/${ongoingSession}?userType=${userType}&requestId=${ongoing.id}`, {
          replace: true,
        });
      }
    })();

    return () => {
      cancelled = true;
      release?.();
    };
  }, [sessionId, userType, navigate, toast, homeRoute]);

  // 3. First join promotes the request to `in_progress` (and starts the timer).
  useEffect(() => {
    if (!requestId || !sessionId || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const { data: current } = await supabase
          .from('emergency_requests')
          .select('started_at, status, ended_at')
          .eq('id', requestId)
          .maybeSingle();

        if (current?.ended_at || current?.status === 'completed') {
          toast({
            title: 'Chamada encerrada',
            description: 'Esta chamada de emergência já foi finalizada.',
          });
          navigate(homeRoute);
          return;
        }

        const isFirstJoin = !current?.started_at;

        const { error } = await supabase
          .from('emergency_requests')
          .update({
            ...(isFirstJoin ? { started_at: new Date().toISOString() } : {}),
            status: 'in_progress',
          })
          .eq('id', requestId)
          // Guard: never resurrect a cancelled/expired/completed request
          .in('status', ['accepted', 'in_progress']);


        if (error) throw error;

        trackSosEvent({
          eventType: isFirstJoin ? SOS_EVENTS.CALL_STARTED : SOS_EVENTS.ROOM_JOINED,
          requestId,
          sessionId,
          actorType: userType,
          message: isFirstJoin ? 'Chamada iniciada' : 'Participante entrou na sala',
          metadata: { isFirstJoin },
        });

        if (userType === 'patient' && isFirstJoin) {
          await supabase.functions.invoke('mark-sos-used', { body: { request_id: requestId } });
        }
      } catch (error) {
        console.error('[SOS] error starting emergency session:', error);
      } finally {
        setReady(true);
      }
    })();
  }, [requestId, sessionId, userType, navigate, toast, homeRoute]);

  // 4. Single termination entry point.
  const endSession = useCallback(
    async (info?: EndCallInfo) => {
      const { data: auth } = await supabase.auth.getUser();
      await endEmergencySession({
        requestId,
        sessionId,
        userId: auth.user?.id ?? null,
        endedBy: info?.endedByType ?? userType,
        reason: info?.reason,
        crisisResolved: info?.crisisResolved ?? null,
        notes: info?.notes ?? null,
      });
      navigate(homeRoute);
    },
    [requestId, sessionId, userType, navigate, homeRoute]
  );

  return { requestId, ready, endSession };
};
