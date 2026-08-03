/**
 * Shared, pure logic that decides whether a realtime `webrtc_sessions` update
 * represents a REAL call termination (someone pressed "encerrar chamada") or
 * just noise: app/tab closed, navigation, remount, reconnection or a stale
 * "completed" row left over from a previous call.
 */

export type CallUserType = 'patient' | 'psychologist';

export interface TerminationSessionLike {
  status?: string | null;
  ended_by?: string | null;
  ended_by_type?: string | null;
  ended_at?: string | null;
}

/** Parses `ended_at` into epoch ms (0 when absent/invalid). */
export function parseEndedAt(endedAt?: string | null): number {
  if (!endedAt) return 0;
  const ms = new Date(endedAt).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * A termination is only "real" when the session was explicitly completed by a
 * participant AND that happened after the current viewer joined this call.
 */
export function isRealTermination(
  session: TerminationSessionLike | null | undefined,
  joinedAtMs: number
): boolean {
  if (!session) return false;
  if (session.status !== 'completed') return false;
  if (!session.ended_by || !session.ended_by_type) return false;
  return parseEndedAt(session.ended_at) >= joinedAtMs;
}

/** True when the row is a leftover from a previous call and should be reopened. */
export function isStaleCompletedSession(
  session: TerminationSessionLike | null | undefined,
  joinedAtMs: number
): boolean {
  if (!session) return false;
  if (session.status !== 'completed') return false;
  return !isRealTermination(session, joinedAtMs);
}

export function getTerminationMessage(endedByType?: string | null): string {
  const endedByName = endedByType === 'psychologist' ? 'O psicólogo' : 'O paciente';
  return `${endedByName} encerrou a chamada de vídeo.`;
}

/**
 * Persists an EXPLICIT termination (participant pressed "encerrar chamada").
 * This is the only path allowed to mark the emergency request / webrtc session
 * as `completed`. App/tab closures must never call it.
 */
export interface PersistTerminationParams {
  requestId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  endedByType: CallUserType;
  reason?: string;
  endedAt?: string;
}

export async function persistExplicitTermination(
  client: any,
  {
    requestId,
    sessionId,
    userId,
    endedByType,
    reason = 'encerrada_pelo_usuario',
    endedAt = new Date().toISOString(),
  }: PersistTerminationParams
): Promise<{ duration: number }> {
  let duration = 0;

  if (requestId) {
    const { data: emergencyData } = await client
      .from('emergency_requests')
      .select('started_at')
      .eq('id', requestId)
      .maybeSingle();

    duration = emergencyData?.started_at
      ? Math.max(
          0,
          Math.floor(
            (new Date(endedAt).getTime() - new Date(emergencyData.started_at).getTime()) / 1000
          )
        )
      : 0;

    const { error } = await client
      .from('emergency_requests')
      .update({
        ended_at: endedAt,
        status: 'completed',
        duration,
        ended_by: userId ?? null,
        ended_by_type: endedByType,
        end_reason: reason,
      })
      .eq('id', requestId);

    if (error) throw error;
  }

  if (sessionId) {
    await client
      .from('webrtc_sessions')
      .update({
        status: 'completed',
        ended_at: endedAt,
        ended_by: userId ?? null,
        ended_by_type: endedByType,
        end_reason: reason,
      })
      .eq('id', sessionId);
  }

  return { duration };
}
