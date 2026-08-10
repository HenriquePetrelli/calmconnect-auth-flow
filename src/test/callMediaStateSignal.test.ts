import { describe, it, expect, vi } from 'vitest';
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

describe('MEDIA_STATE ordenação com eventos concorrentes', () => {
  it('numera cada envio com um seq monotônico', () => {
    const pair = makePeerPair();
    const received: CallSignal[] = [];
    const psychologist = attachCallSignalChannel(pair.pcA, () => {});
    attachCallSignalChannel(pair.pcB, (s) => received.push(s));
    pair.connect();

    psychologist.sendMediaState({ userType: 'psychologist', muted: true, cameraOff: false });
    psychologist.sendMediaState({ userType: 'psychologist', muted: false, cameraOff: false });
    psychologist.sendMediaState({ userType: 'psychologist', muted: true, cameraOff: true });

    expect(received.map((s) => (s as any).seq)).toEqual([1, 2, 3]);
    expect((received[2] as any).muted).toBe(true);
  });

  it('entrega toggles no mesmo milissegundo sem descartar nenhum', () => {
    const pair = makePeerPair();
    const received: CallSignal[] = [];
    const psychologist = attachCallSignalChannel(pair.pcA, () => {});
    attachCallSignalChannel(pair.pcB, (s) => received.push(s));
    pair.connect();

    const now = Date.now();
    const spy = vi.spyOn(Date, 'now').mockReturnValue(now);
    psychologist.sendMediaState({ userType: 'psychologist', muted: true, cameraOff: false });
    psychologist.sendMediaState({ userType: 'psychologist', muted: true, cameraOff: true });
    spy.mockRestore();

    expect(received).toHaveLength(2);
  });

  it('ignora atualizações fora de ordem ou repetidas do mesmo peer', () => {
    const received: CallSignal[] = [];
    const pc: any = {
      ondatachannel: null,
      createDataChannel: () => ({ readyState: 'open', send: () => {}, onmessage: null }),
    };
    attachCallSignalChannel(pc, (s) => received.push(s));

    const inbound: any = { readyState: 'open', send: () => {}, onmessage: null };
    pc.ondatachannel({ channel: inbound });

    const msg = (seq: number, muted: boolean) =>
      JSON.stringify({ type: 'MEDIA_STATE', userType: 'psychologist', muted, cameraOff: false, seq, at: seq });

    inbound.onmessage({ data: msg(2, true) });
    inbound.onmessage({ data: msg(1, false) }); // atrasada
    inbound.onmessage({ data: msg(2, false) }); // duplicada
    inbound.onmessage({ data: msg(3, false) });

    expect(received.map((s) => (s as any).seq)).toEqual([2, 3]);
    expect((received[1] as any).muted).toBe(false);
  });

  it('mantém sequências independentes por participante', () => {
    const received: CallSignal[] = [];
    const pc: any = {
      ondatachannel: null,
      createDataChannel: () => ({ readyState: 'open', send: () => {}, onmessage: null }),
    };
    attachCallSignalChannel(pc, (s) => received.push(s));
    const inbound: any = { readyState: 'open', send: () => {}, onmessage: null };
    pc.ondatachannel({ channel: inbound });

    const msg = (userType: string, seq: number) =>
      JSON.stringify({ type: 'MEDIA_STATE', userType, muted: true, cameraOff: false, seq, at: seq });

    inbound.onmessage({ data: msg('psychologist', 5) });
    inbound.onmessage({ data: msg('patient', 1) });

    expect(received).toHaveLength(2);
  });
});

describe('MEDIA_STATE_REQUEST (recuperação do data channel)', () => {
  it('faz o peer reanunciar o estado de mídia ao receber o pedido', () => {
    const pair = makePeerPair();
    const psychologistSignals: CallSignal[] = [];
    const patientSignals: CallSignal[] = [];

    const psychologist = attachCallSignalChannel(pair.pcA, (s) => psychologistSignals.push(s));
    const patient = attachCallSignalChannel(pair.pcB, (s) => patientSignals.push(s));
    pair.connect();

    // O paciente perdeu o canal e, ao recuperar, pede o estado atual.
    expect(patient.requestMediaState('patient')).toBe(true);
    expect(psychologistSignals[0]).toMatchObject({ type: 'MEDIA_STATE_REQUEST', from: 'patient' });

    // O psicólogo responde com seu estado real (microfone mutado).
    psychologist.sendMediaState({ userType: 'psychologist', muted: true, cameraOff: false });
    expect(patientSignals.at(-1)).toMatchObject({ type: 'MEDIA_STATE', muted: true });
  });

  it('valida o remetente do pedido', () => {
    expect(parseCallSignal(JSON.stringify({ type: 'MEDIA_STATE_REQUEST', from: 'alien' }))).toBeNull();
    expect(parseCallSignal(JSON.stringify({ type: 'MEDIA_STATE_REQUEST', from: 'patient' }))).toMatchObject({
      type: 'MEDIA_STATE_REQUEST',
      from: 'patient',
    });
  });
});
