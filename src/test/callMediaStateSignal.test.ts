import { describe, it, expect } from 'vitest';
import { attachCallSignalChannel, parseCallSignal, type CallSignal } from '@/lib/callSignals';

/** Minimal in-memory pair of connected data channels. */
const makePeerPair = () => {
  const makeChannel = () => ({
    readyState: 'open',
    peer: null as any,
    onmessage: null as null | ((e: { data: unknown }) => void),
    send(data: string) {
      this.peer?.onmessage?.({ data });
    },
    close() {
      this.readyState = 'closed';
    },
  });

  // Outgoing channel on each side + the mirror the other side receives.
  const aOut = makeChannel();
  const aIn = makeChannel();
  const bOut = makeChannel();
  const bIn = makeChannel();
  aOut.peer = aIn;
  bOut.peer = bIn;

  const pcA: any = { ondatachannel: null, createDataChannel: () => aOut };
  const pcB: any = { ondatachannel: null, createDataChannel: () => bOut };

  return {
    pcA,
    pcB,
    connect() {
      pcB.ondatachannel?.({ channel: aIn });
      pcA.ondatachannel?.({ channel: bIn });
    },
  };
};

describe('MEDIA_STATE via data channel', () => {
  it('entrega câmera/microfone/avatar instantaneamente ao peer', () => {
    const pair = makePeerPair();
    const received: CallSignal[] = [];

    const patient = attachCallSignalChannel(pair.pcA, () => {});
    attachCallSignalChannel(pair.pcB, (s) => received.push(s));
    pair.connect();

    const sent = patient.sendMediaState({
      userType: 'patient',
      cameraOff: true,
      muted: false,
      displayName: 'Ana',
      avatarUrl: null,
    });

    expect(sent).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      type: 'MEDIA_STATE',
      userType: 'patient',
      cameraOff: true,
      muted: false,
      displayName: 'Ana',
    });
  });

  it('não entrega quando o canal ainda não está aberto', () => {
    const channel = attachCallSignalChannel(
      { ondatachannel: null, createDataChannel: () => ({ readyState: 'connecting', send: () => {}, onmessage: null }) } as any,
      () => {}
    );
    expect(channel.isOpen()).toBe(false);
    expect(channel.sendMediaState({ userType: 'psychologist', cameraOff: false, muted: true })).toBe(false);
  });

  it('valida o payload recebido', () => {
    expect(parseCallSignal(JSON.stringify({ type: 'MEDIA_STATE', userType: 'alien' }))).toBeNull();
    expect(
      parseCallSignal(JSON.stringify({ type: 'MEDIA_STATE', userType: 'psychologist', cameraOff: 1, muted: 0 }))
    ).toMatchObject({ cameraOff: true, muted: false });
  });

  it('não duplica a mesma atualização recebida pelos dois canais', () => {
    const pair = makePeerPair();
    const received: CallSignal[] = [];
    const a = attachCallSignalChannel(pair.pcA, () => {});
    attachCallSignalChannel(pair.pcB, (s) => received.push(s));
    pair.connect();

    const payload = { userType: 'patient' as const, cameraOff: false, muted: true };
    a.sendMediaState(payload);
    expect(received).toHaveLength(1);
  });
});
