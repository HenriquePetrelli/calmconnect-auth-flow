/**
 * SOS diagnostics mode.
 *
 * Pure helpers so the panel stays dumb and everything is unit-testable:
 *  - how the mode is turned on/off (URL flag, localStorage, shortcut)
 *  - how the raw call state is normalised into readable rows
 *  - how a snapshot is serialised for a support ticket
 */

export const DIAGNOSTICS_STORAGE_KEY = 'sos:diagnostics';

export type DiagnosticsTone = 'ok' | 'warn' | 'error' | 'idle';

export interface DiagnosticsRow {
  label: string;
  value: string;
  tone: DiagnosticsTone;
}

export interface DiagnosticsGroup {
  title: string;
  rows: DiagnosticsRow[];
}

export interface DiagnosticsInput {
  // identity
  sessionId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  userType: 'patient' | 'psychologist';
  // webrtc
  connectionState?: string | null;
  iceConnectionState?: string | null;
  signalingState?: string | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  isNetworkOffline: boolean;
  hasLocalStream: boolean;
  hasRemoteStream: boolean;
  localTracks?: string[];
  remoteTracks?: string[];
  dataChannelState?: string | null;
  // media
  isMuted: boolean;
  isCameraOff: boolean;
  remoteMuted: boolean;
  remoteCameraOff: boolean;
  // presence
  remotePresent: boolean;
  remoteLeftAt?: number | null;
  heartbeatEnabled: boolean;
  // timers
  timeLeft: number;
  timeLimit: number;
  isTimerPaused: boolean;
  // termination
  callTerminatedMessage?: string | null;
  callEndedBy?: { userType?: string; reason?: string } | null;
  error?: string | null;
}

/** Diagnostics is opt-in: `?debug=1` / `?diagnostics=1` in the URL or a stored flag. */
export function isDiagnosticsEnabled(search: string, storage?: Pick<Storage, 'getItem'> | null): boolean {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const flag = params.get('debug') ?? params.get('diagnostics');
    if (flag !== null) return flag !== '0' && flag !== 'false';
  } catch {
    /* ignore malformed query strings */
  }
  try {
    return storage?.getItem(DIAGNOSTICS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistDiagnosticsFlag(enabled: boolean, storage?: Pick<Storage, 'setItem' | 'removeItem'> | null) {
  try {
    if (enabled) storage?.setItem(DIAGNOSTICS_STORAGE_KEY, '1');
    else storage?.removeItem(DIAGNOSTICS_STORAGE_KEY);
  } catch {
    /* storage may be unavailable (private mode) */
  }
}

/** Ctrl/Cmd + Shift + D toggles the panel during an incident. */
export function isDiagnosticsShortcut(event: {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}): boolean {
  return event.shiftKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd';
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const yesNo = (value: boolean, tone: { on: DiagnosticsTone; off: DiagnosticsTone }): DiagnosticsRow['tone'] =>
  value ? tone.on : tone.off;

function connectionTone(state?: string | null): DiagnosticsTone {
  switch (state) {
    case 'connected':
    case 'completed':
    case 'stable':
    case 'open':
      return 'ok';
    case 'connecting':
    case 'checking':
    case 'new':
    case 'connecting-again':
      return 'warn';
    case 'failed':
    case 'disconnected':
    case 'closed':
      return 'error';
    default:
      return 'idle';
  }
}

/** Turns the live call state into grouped, human readable rows. */
export function buildDiagnosticsGroups(input: DiagnosticsInput): DiagnosticsGroup[] {
  const dash = '—';

  return [
    {
      title: 'Sessão',
      rows: [
        { label: 'Sala (session_id)', value: input.sessionId || dash, tone: input.sessionId ? 'ok' : 'error' },
        { label: 'Solicitação', value: input.requestId || dash, tone: input.requestId ? 'ok' : 'warn' },
        { label: 'Trace', value: input.traceId || dash, tone: 'idle' },
        { label: 'Perfil local', value: input.userType === 'psychologist' ? 'Psicólogo' : 'Paciente', tone: 'idle' },
      ],
    },
    {
      title: 'WebRTC',
      rows: [
        { label: 'Peer connection', value: input.connectionState || dash, tone: connectionTone(input.connectionState) },
        { label: 'ICE', value: input.iceConnectionState || dash, tone: connectionTone(input.iceConnectionState) },
        { label: 'Signaling', value: input.signalingState || dash, tone: connectionTone(input.signalingState) },
        { label: 'Data channel', value: input.dataChannelState || dash, tone: connectionTone(input.dataChannelState) },
        {
          label: 'Reconexão',
          value: input.isNetworkOffline
            ? 'Sem rede'
            : input.isReconnecting
              ? `Tentativa ${input.reconnectAttempt}`
              : 'Estável',
          tone: input.isNetworkOffline ? 'error' : input.isReconnecting ? 'warn' : 'ok',
        },
        {
          label: 'Stream local',
          value: input.hasLocalStream ? (input.localTracks?.join(', ') || 'ativo') : 'ausente',
          tone: yesNo(input.hasLocalStream, { on: 'ok', off: 'error' }),
        },
        {
          label: 'Stream remoto',
          value: input.hasRemoteStream ? (input.remoteTracks?.join(', ') || 'ativo') : 'ausente',
          tone: yesNo(input.hasRemoteStream, { on: 'ok', off: 'warn' }),
        },
      ],
    },
    {
      title: 'Mídia',
      rows: [
        { label: 'Meu microfone', value: input.isMuted ? 'Mudo' : 'Ativo', tone: yesNo(!input.isMuted, { on: 'ok', off: 'warn' }) },
        { label: 'Minha câmera', value: input.isCameraOff ? 'Desligada' : 'Ligada', tone: yesNo(!input.isCameraOff, { on: 'ok', off: 'warn' }) },
        { label: 'Microfone remoto', value: input.remoteMuted ? 'Mudo' : 'Ativo', tone: yesNo(!input.remoteMuted, { on: 'ok', off: 'warn' }) },
        { label: 'Câmera remota', value: input.remoteCameraOff ? 'Desligada' : 'Ligada', tone: yesNo(!input.remoteCameraOff, { on: 'ok', off: 'warn' }) },
      ],
    },
    {
      title: 'Presença',
      rows: [
        {
          label: 'Participante remoto',
          value: input.remotePresent ? 'Na sala' : 'Fora da sala',
          tone: yesNo(input.remotePresent, { on: 'ok', off: 'warn' }),
        },
        {
          label: 'Saiu há',
          value: input.remoteLeftAt ? `${Math.max(0, Math.round((Date.now() - input.remoteLeftAt) / 1000))}s` : dash,
          tone: input.remoteLeftAt ? 'warn' : 'idle',
        },
        {
          label: 'Heartbeat',
          value: input.heartbeatEnabled ? 'Enviando (15s)' : 'Parado',
          tone: yesNo(input.heartbeatEnabled, { on: 'ok', off: 'warn' }),
        },
      ],
    },
    {
      title: 'Timers',
      rows: [
        { label: 'Tempo restante', value: formatDuration(input.timeLeft), tone: input.timeLeft <= 60 ? 'warn' : 'ok' },
        { label: 'Limite da sessão', value: formatDuration(input.timeLimit), tone: 'idle' },
        {
          label: 'Estado do timer',
          value: input.isTimerPaused ? 'Pausado' : 'Contando',
          tone: input.isTimerPaused ? 'warn' : 'ok',
        },
      ],
    },
    {
      title: 'Encerramento',
      rows: [
        {
          label: 'Chamada encerrada',
          value: input.callTerminatedMessage ? 'Sim' : 'Não',
          tone: input.callTerminatedMessage ? 'error' : 'ok',
        },
        { label: 'Encerrada por', value: input.callEndedBy?.userType || dash, tone: 'idle' },
        { label: 'Motivo', value: input.callEndedBy?.reason || dash, tone: 'idle' },
        { label: 'Último erro', value: input.error || dash, tone: input.error ? 'error' : 'idle' },
      ],
    },
  ];
}

/** Plain-text snapshot the user can paste into a support ticket. */
export function buildDiagnosticsSnapshot(input: DiagnosticsInput, now: Date = new Date()): string {
  const lines = [`SOS diagnostics — ${now.toISOString()}`];
  for (const group of buildDiagnosticsGroups(input)) {
    lines.push('', `[${group.title}]`);
    for (const row of group.rows) lines.push(`- ${row.label}: ${row.value}`);
  }
  return lines.join('\n');
}
