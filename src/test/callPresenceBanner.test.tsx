import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { fakeDb, fakeSupabase, FakeChannel } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import { useCallPresence } from '@/hooks/useCallPresence';
import { getConnectionBannerState, isRemoteDropInvoluntary } from '@/lib/callBanner';

const SESSION_ID = '55555555-5555-4555-8555-555555555555';

const baseBanner = {
  isReconnecting: false,
  isNetworkOffline: false,
  remoteDroppedInvoluntarily: false,
  callTerminated: false,
  reconnectAttempt: 0,
};

const roles = ['patient', 'psychologist'] as const;

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.channels = [];
});

describe('banner de conexão — paciente e psicólogo', () => {
  it.each(roles)('fica oculto quando a chamada está estável (%s)', (userType) => {
    expect(getConnectionBannerState({ ...baseBanner, userType }).visible).toBe(false);
  });

  it.each(roles)('mostra "sem internet" sem botão de retry (%s)', (userType) => {
    const state = getConnectionBannerState({
      ...baseBanner,
      isNetworkOffline: true,
      isReconnecting: true,
      userType,
    });
    expect(state).toMatchObject({ visible: true, variant: 'offline', showRetry: false });
    expect(state.title).toContain('Sem conexão');
    expect(state.description).toContain('continua aberta');
  });

  it.each(roles)('mostra a tentativa de reconexão com o número da tentativa (%s)', (userType) => {
    const first = getConnectionBannerState({ ...baseBanner, isReconnecting: true, reconnectAttempt: 1, userType });
    const third = getConnectionBannerState({ ...baseBanner, isReconnecting: true, reconnectAttempt: 3, userType });

    expect(first.title).toBe('Tentando reconectar...');
    expect(third.title).toBe('Tentando reconectar (tentativa 3)...');
    expect(third).toMatchObject({ visible: true, variant: 'reconnecting', showRetry: true });
    expect(third.description).toContain('não foi encerrada');
  });

  it('nomeia o participante ausente conforme quem está vendo a tela', () => {
    const forPatient = getConnectionBannerState({ ...baseBanner, remoteDroppedInvoluntarily: true, userType: 'patient' });
    const forPsychologist = getConnectionBannerState({ ...baseBanner, remoteDroppedInvoluntarily: true, userType: 'psychologist' });

    expect(forPatient.variant).toBe('remote-unstable');
    expect(forPatient.description).toContain('O psicólogo');
    expect(forPsychologist.description).toContain('O paciente');
    expect(forPsychologist.showRetry).toBe(true);
  });

  it.each(roles)('nunca aparece depois que a chamada foi realmente encerrada (%s)', (userType) => {
    const state = getConnectionBannerState({
      ...baseBanner,
      isReconnecting: true,
      isNetworkOffline: true,
      remoteDroppedInvoluntarily: true,
      callTerminated: true,
      userType,
    });
    expect(state.visible).toBe(false);
  });

  it('só considera queda involuntária quando o par já esteve presente', () => {
    expect(isRemoteDropInvoluntary(false, null, false)).toBe(false); // ainda não entrou
    expect(isRemoteDropInvoluntary(false, Date.now(), false)).toBe(true); // caiu
    expect(isRemoteDropInvoluntary(true, Date.now(), false)).toBe(false); // voltou
    expect(isRemoteDropInvoluntary(false, Date.now(), true)).toBe(false); // encerrada
  });
});

describe('presença do participante durante reconexões', () => {
  const setup = (userType: 'patient' | 'psychologist') =>
    renderHook(() => useCallPresence({ sessionId: SESSION_ID, userType }));

  it.each(roles)('assina o canal da sala com a própria chave (%s)', async (userType) => {
    setup(userType);
    await waitFor(() => expect(fakeDb.channels).toHaveLength(1));
    expect(fakeDb.channels[0].topic).toBe(`call-presence:${SESSION_ID}`);
  });

  it.each(roles)('detecta entrada, queda e retorno do outro participante (%s)', async (userType) => {
    const remote = userType === 'patient' ? 'psychologist' : 'patient';
    const { result } = setup(userType);

    await waitFor(() => expect(fakeDb.channels).toHaveLength(1));
    const channel = fakeDb.channels[0] as FakeChannel;

    expect(result.current.remotePresent).toBe(false);

    act(() => channel.remoteJoin(remote));
    await waitFor(() => expect(result.current.remotePresent).toBe(true));
    expect(result.current.remoteLeftAt).toBeNull();

    act(() => channel.remoteLeave(remote));
    await waitFor(() => expect(result.current.remotePresent).toBe(false));
    expect(result.current.remoteLeftAt).toBeGreaterThan(0);

    // Banner de queda involuntária aparece durante a ausência...
    expect(
      getConnectionBannerState({
        ...baseBanner,
        remoteDroppedInvoluntarily: isRemoteDropInvoluntary(
          result.current.remotePresent,
          result.current.remoteLeftAt,
          false
        ),
        userType,
      }).visible
    ).toBe(true);

    // ...e some assim que o participante reconecta.
    act(() => channel.remoteJoin(remote));
    await waitFor(() => expect(result.current.remotePresent).toBe(true));
    expect(result.current.remoteLeftAt).toBeNull();
    expect(
      getConnectionBannerState({
        ...baseBanner,
        remoteDroppedInvoluntarily: isRemoteDropInvoluntary(
          result.current.remotePresent,
          result.current.remoteLeftAt,
          false
        ),
        userType,
      }).visible
    ).toBe(false);
  });

  it('remove o canal ao sair da tela de chamada', async () => {
    const { unmount } = setup('patient');
    await waitFor(() => expect(fakeDb.channels).toHaveLength(1));
    unmount();
    await waitFor(() => expect(fakeDb.channels).toHaveLength(0));
  });

  it('não assina nada quando a presença está desabilitada', async () => {
    renderHook(() => useCallPresence({ sessionId: SESSION_ID, userType: 'patient', enabled: false }));
    expect(fakeDb.channels).toHaveLength(0);
  });
});
