import { describe, it, expect, beforeEach, vi } from 'vitest';
import { endEmergencySession, resetEndEmergencySessionGuards } from '@/lib/endEmergencySession';
import { END_REASONS } from '@/lib/emergencyEndReasons';

const makeClient = (request: any = { started_at: new Date().toISOString(), status: 'in_progress', ended_at: null }) => {
  const updates: Record<string, any[]> = { emergency_requests: [], webrtc_sessions: [], sos_trace_events: [] };
  const client: any = {
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: request }) }) }),
      update: (values: any) => {
        const record = () => {
          updates[table].push(values);
          return { data: [{ id: 'row-1' }], error: null };
        };
        // Mirrors the real chain: .eq(...) [.is(...).select(...)]
        const eqResult: any = Promise.resolve(null).then(record);
        eqResult.is = () => ({ select: async () => record() });
        return { eq: () => eqResult };
      },

      insert: async (values: any) => {
        updates[table].push(values);
        return { error: null };
      },
    }),
  };
  return { client, updates };
};

describe('endEmergencySession — fluxo único de encerramento', () => {
  beforeEach(() => resetEndEmergencySessionGuards());

  it('sinaliza o peer, persiste e libera hardware na ordem correta', async () => {
    const { client, updates } = makeClient();
    const order: string[] = [];
    const sendCallEndedSignal = vi.fn(() => {
      order.push('signal');
      return true;
    });

    const result = await endEmergencySession({
      requestId: 'req-1',
      sessionId: 'ses-1',
      userId: 'user-1',
      endedBy: 'psychologist',
      crisisResolved: true,
      client,
      sendCallEndedSignal,
      stopMedia: () => void order.push('media'),
      closeWebRTC: () => void order.push('webrtc'),
      onFinished: () => order.push('finished'),
    });

    expect(result.ok).toBe(true);
    expect(sendCallEndedSignal).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['signal', 'media', 'webrtc', 'finished']);
    expect(updates.emergency_requests[0]).toMatchObject({
      status: 'completed',
      ended_by_type: 'psychologist',
      crisis_resolved: true,
    });
    expect(updates.webrtc_sessions[0]).toMatchObject({ status: 'completed' });
  });

  it('é idempotente: um segundo encerramento não reescreve nem duplica', async () => {
    const { client, updates } = makeClient();
    const onFinished = vi.fn();

    await endEmergencySession({ requestId: 'req-2', sessionId: 'ses-2', endedBy: 'patient', client, onFinished });
    const second = await endEmergencySession({
      requestId: 'req-2',
      sessionId: 'ses-2',
      endedBy: 'patient',
      client,
      onFinished,
    });

    expect(second.alreadyEnded).toBe(true);
    expect(updates.emergency_requests).toHaveLength(1);
    expect(onFinished).toHaveBeenCalledTimes(2); // a UI sempre segue adiante
  });

  it('não trava a UI quando a persistência falha', async () => {
    const failing: any = {
      auth: { getUser: async () => ({ data: { user: null } }) },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        update: () => ({ eq: async () => ({ error: new Error('offline') }) }),
        insert: async () => ({ error: null }),
      }),
    };
    const onFinished = vi.fn();

    const result = await endEmergencySession({
      requestId: 'req-3',
      sessionId: 'ses-3',
      endedBy: 'system',
      reason: END_REASONS.TIME_LIMIT,
      client: failing,
      onFinished,
    });

    expect(result.ok).toBe(true);
    expect(onFinished).toHaveBeenCalled();
  });
});
