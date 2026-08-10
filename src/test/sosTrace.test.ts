import { describe, it, expect, vi } from 'vitest';
import { buildTraceId, traceSosEvent, SOS_EVENTS } from '@/lib/sosTrace';

const makeClient = (userId: string | null = 'user-1') => {
  const insert = vi.fn().mockResolvedValue({ error: null });
  return {
    insert,
    client: {
      auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
      from: () => ({ insert }),
    } as any,
  };
};

describe('SOS trace', () => {
  it('derives a stable trace id shared by both participants', () => {
    expect(buildTraceId('req-1', 'ses-9')).toBe('req:req-1');
    expect(buildTraceId(null, 'ses-9')).toBe('ses:ses-9');
    expect(buildTraceId(null, null)).toBe('unknown');
  });

  it('persists a lifecycle event with actor and metadata', async () => {
    const { insert, client } = makeClient('psy-1');
    await traceSosEvent(
      {
        eventType: SOS_EVENTS.REQUEST_ACCEPTED,
        requestId: 'req-1',
        sessionId: 'ses-1',
        actorType: 'psychologist',
        metadata: { reason: 'accepted' },
      },
      client
    );

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        trace_id: 'req:req-1',
        emergency_request_id: 'req-1',
        session_id: 'ses-1',
        event_type: 'request_accepted',
        actor_user_id: 'psy-1',
        actor_type: 'psychologist',
      })
    );
  });

  it('never throws and skips writing when there is no authenticated actor', async () => {
    const { insert, client } = makeClient(null);
    await expect(
      traceSosEvent({ eventType: SOS_EVENTS.CALL_ENDED_SIGNAL_SENT, requestId: 'r' }, client)
    ).resolves.toBeUndefined();
    expect(insert).not.toHaveBeenCalled();
  });

  it('swallows database errors so the call flow is never broken', async () => {
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: 'u' } } }) },
      from: () => ({ insert: async () => ({ error: { message: 'boom' } }) }),
    } as any;
    await expect(
      traceSosEvent({ eventType: SOS_EVENTS.CALL_ENDED_BY_PARTICIPANT, requestId: 'r' }, client)
    ).resolves.toBeUndefined();
  });
});
