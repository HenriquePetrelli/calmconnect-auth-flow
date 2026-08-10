import { describe, it, expect } from 'vitest';
import {
  isDiagnosticsEnabled,
  isDiagnosticsShortcut,
  buildDiagnosticsGroups,
  buildDiagnosticsSnapshot,
  formatDuration,
  DIAGNOSTICS_STORAGE_KEY,
  type DiagnosticsInput,
} from '@/lib/callDiagnostics';

const baseInput: DiagnosticsInput = {
  sessionId: 'ses-1',
  requestId: 'req-1',
  traceId: 'req:req-1',
  userType: 'psychologist',
  connectionState: 'connected',
  iceConnectionState: 'connected',
  signalingState: 'stable',
  isConnected: true,
  isReconnecting: false,
  reconnectAttempt: 0,
  isNetworkOffline: false,
  hasLocalStream: true,
  hasRemoteStream: true,
  isMuted: false,
  isCameraOff: false,
  remoteMuted: false,
  remoteCameraOff: false,
  remotePresent: true,
  remoteLeftAt: null,
  heartbeatEnabled: true,
  timeLeft: 900,
  timeLimit: 1200,
  isTimerPaused: false,
  callTerminatedMessage: null,
  callEndedBy: null,
  error: null,
};

const storageWith = (value: string | null) => ({ getItem: () => value });

describe('modo de diagnóstico do SOS', () => {
  it('liga via query string e via flag persistida', () => {
    expect(isDiagnosticsEnabled('?debug=1', storageWith(null))).toBe(true);
    expect(isDiagnosticsEnabled('?diagnostics=true', storageWith(null))).toBe(true);
    expect(isDiagnosticsEnabled('?debug=0', storageWith('1'))).toBe(false);
    expect(isDiagnosticsEnabled('', storageWith('1'))).toBe(true);
    expect(isDiagnosticsEnabled('', storageWith(null))).toBe(false);
    expect(DIAGNOSTICS_STORAGE_KEY).toBe('sos:diagnostics');
  });

  it('reconhece apenas o atalho Ctrl/Cmd + Shift + D', () => {
    expect(isDiagnosticsShortcut({ key: 'D', shiftKey: true, ctrlKey: true, metaKey: false })).toBe(true);
    expect(isDiagnosticsShortcut({ key: 'd', shiftKey: true, ctrlKey: false, metaKey: true })).toBe(true);
    expect(isDiagnosticsShortcut({ key: 'd', shiftKey: false, ctrlKey: true, metaKey: false })).toBe(false);
    expect(isDiagnosticsShortcut({ key: 'x', shiftKey: true, ctrlKey: true, metaKey: false })).toBe(false);
  });

  it('marca uma chamada saudável como ok', () => {
    const groups = buildDiagnosticsGroups(baseInput);
    const webrtc = groups.find((g) => g.title === 'WebRTC')!;
    expect(webrtc.rows.find((r) => r.label === 'Reconexão')).toMatchObject({ value: 'Estável', tone: 'ok' });
    const timers = groups.find((g) => g.title === 'Timers')!;
    expect(timers.rows.find((r) => r.label === 'Tempo restante')?.value).toBe('15:00');
  });

  it('destaca queda de rede, presença perdida e timer pausado', () => {
    const groups = buildDiagnosticsGroups({
      ...baseInput,
      isNetworkOffline: true,
      isReconnecting: true,
      reconnectAttempt: 3,
      remotePresent: false,
      isTimerPaused: true,
      hasRemoteStream: false,
      error: 'ICE failed',
    });

    expect(groups.find((g) => g.title === 'WebRTC')!.rows.find((r) => r.label === 'Reconexão')).toMatchObject({
      value: 'Sem rede',
      tone: 'error',
    });
    expect(groups.find((g) => g.title === 'Presença')!.rows[0]).toMatchObject({ value: 'Fora da sala', tone: 'warn' });
    expect(groups.find((g) => g.title === 'Timers')!.rows.find((r) => r.label === 'Estado do timer')).toMatchObject({
      value: 'Pausado',
      tone: 'warn',
    });
    expect(groups.find((g) => g.title === 'Encerramento')!.rows.find((r) => r.label === 'Último erro')).toMatchObject({
      tone: 'error',
    });
  });

  it('mostra quem encerrou a chamada e o motivo', () => {
    const groups = buildDiagnosticsGroups({
      ...baseInput,
      callTerminatedMessage: 'O paciente encerrou a chamada',
      callEndedBy: { userType: 'patient', reason: 'completed_by_patient' },
    });
    const end = groups.find((g) => g.title === 'Encerramento')!;
    expect(end.rows.find((r) => r.label === 'Chamada encerrada')).toMatchObject({ value: 'Sim', tone: 'error' });
    expect(end.rows.find((r) => r.label === 'Motivo')?.value).toBe('completed_by_patient');
  });

  it('gera um snapshot em texto com todas as seções', () => {
    const snapshot = buildDiagnosticsSnapshot(baseInput, new Date('2026-08-10T00:00:00.000Z'));
    expect(snapshot).toContain('SOS diagnostics — 2026-08-10T00:00:00.000Z');
    for (const title of ['[Sessão]', '[WebRTC]', '[Mídia]', '[Presença]', '[Timers]', '[Encerramento]']) {
      expect(snapshot).toContain(title);
    }
    expect(snapshot).toContain('- Sala (session_id): ses-1');
  });

  it('formata durações com segurança', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(-5)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
  });
});
