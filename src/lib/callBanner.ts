/**
 * Pure UI state for the emergency call connection banner.
 *
 * Keeps the "conexão instável / reconectando / sem internet" messaging
 * identical for patient and psychologist, and guarantees the banner is never
 * shown once the call was really terminated.
 */

export interface ConnectionBannerInput {
  isReconnecting: boolean;
  isNetworkOffline: boolean;
  remoteDroppedInvoluntarily: boolean;
  callTerminated: boolean;
  reconnectAttempt: number;
  /** Who is looking at the screen — used to name the missing participant. */
  userType: 'patient' | 'psychologist';
}

export interface ConnectionBannerState {
  visible: boolean;
  variant: 'offline' | 'reconnecting' | 'remote-unstable';
  title: string;
  description: string;
  showRetry: boolean;
}

const HIDDEN: ConnectionBannerState = {
  visible: false,
  variant: 'reconnecting',
  title: '',
  description: '',
  showRetry: false,
};

/** True when the remote peer left the room without ending the call. */
export function isRemoteDropInvoluntary(
  remotePresent: boolean,
  remoteLeftAt: number | null,
  callTerminated: boolean
): boolean {
  return !callTerminated && !remotePresent && remoteLeftAt !== null;
}

export function getConnectionBannerState(
  input: ConnectionBannerInput
): ConnectionBannerState {
  const {
    isReconnecting,
    isNetworkOffline,
    remoteDroppedInvoluntarily,
    callTerminated,
    reconnectAttempt,
    userType,
  } = input;

  if (callTerminated) return HIDDEN;
  if (!isReconnecting && !isNetworkOffline && !remoteDroppedInvoluntarily) return HIDDEN;

  if (isNetworkOffline) {
    return {
      visible: true,
      variant: 'offline',
      title: 'Sem conexão com a internet',
      description: 'A chamada continua aberta e será retomada assim que a internet voltar.',
      showRetry: false,
    };
  }

  if (isReconnecting) {
    return {
      visible: true,
      variant: 'reconnecting',
      title: `Tentando reconectar${reconnectAttempt > 1 ? ` (tentativa ${reconnectAttempt})` : ''}...`,
      description: 'A chamada não foi encerrada. Restabelecendo automaticamente...',
      showRetry: true,
    };
  }

  const peer = userType === 'psychologist' ? 'O paciente' : 'O psicólogo';
  return {
    visible: true,
    variant: 'remote-unstable',
    title: 'Participante com conexão instável',
    description: `${peer} perdeu a conexão. A chamada não foi encerrada — aguardando o retorno.`,
    showRetry: true,
  };
}
