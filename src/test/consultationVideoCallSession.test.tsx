import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import ConsultationVideoCall from '@/components/appointments/ConsultationVideoCall';
import { useWebRTC } from '@/hooks/useWebRTC';
import { supabase } from '@/integrations/supabase/client';

const webrtcState = {
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  connectionState: 'new',
  isConnected: false,
  error: null,
  callEndedBy: null as null | { userId: string; userType: string },
  isReconnecting: false,
  reconnectAttempt: 0,
  isNetworkOffline: false,
  forceReconnect: vi.fn(),
  toggleAudio: vi.fn(),
  toggleVideo: vi.fn(),
  cleanup: vi.fn(),
  sendCallEndedSignal: vi.fn(),
};

vi.mock('@/hooks/useWebRTC', () => ({
  useWebRTC: vi.fn(() => webrtcState),
}));

const presence = { remotePresent: false, remoteLeftAt: null as number | null };
vi.mock('@/hooks/useCallPresence', () => ({ useCallPresence: () => presence }));
vi.mock('@/hooks/useParticipantHeartbeat', () => ({ useParticipantHeartbeat: () => ({}) }));
vi.mock('@/hooks/useSharedCallTimer', () => ({
  useSharedCallTimer: (p: { timeLimit: number }) => ({ timeLeft: p.timeLimit, isPaused: true, loaded: true }),
}));

vi.mock('@/components/sos/VideoCallSettingsModal', () => ({
  VideoCallSettingsModal: () => null,
}));

vi.mock('@/components/sos/FeedbackModal', () => ({
  FeedbackModal: (props: { userType: string }) => (
    <div data-testid="feedback-modal" data-usertype={props.userType} />
  ),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: 'shared-session-id', error: null }),
    from: vi.fn(() => ({
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    })),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'psi-1' } } }) },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'psychologist' }) }));

const appointment = {
  id: 'appt-1',
  scheduled_at: '2026-08-31T10:00:00Z',
  psychologist: { full_name: 'Psicóloga Exemplo' },
};

beforeEach(() => {
  webrtcState.callEndedBy = null;
  presence.remotePresent = false;
  presence.remoteLeftAt = null;
});

describe('ConsultationVideoCall — shared session and role', () => {
  it('reuses one webrtc session per appointment via RPC, not a fresh insert per tab', async () => {
    render(<ConsultationVideoCall appointment={appointment} onEndCall={() => {}} />);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('get_or_create_appointment_webrtc_session', {
        p_appointment_id: 'appt-1',
      });
    });
  });

  it('passes the real logged-in role to useWebRTC and FeedbackModal instead of a hardcoded patient', async () => {
    render(<ConsultationVideoCall appointment={appointment} onEndCall={() => {}} />);

    await waitFor(() => {
      expect(vi.mocked(useWebRTC)).toHaveBeenCalledWith(
        expect.objectContaining({ userType: 'psychologist' })
      );
    });
  });

  it('shows who ended the consultation when the other participant hangs up', async () => {
    webrtcState.callEndedBy = { userId: 'pat-1', userType: 'patient' };
    render(<ConsultationVideoCall appointment={appointment} onEndCall={() => {}} />);

    expect(await screen.findByTestId('consultation-ended-overlay')).toHaveTextContent(
      'O paciente encerrou a consulta.'
    );
    expect(webrtcState.cleanup).toHaveBeenCalled();
  });

  it('warns when the other participant drops instead of looking frozen', async () => {
    presence.remoteLeftAt = Date.now();
    render(<ConsultationVideoCall appointment={appointment} onEndCall={() => {}} />);

    expect(await screen.findByTestId('connection-banner')).toHaveTextContent('O paciente perdeu a conexão');
  });

  it('counts down the appointment duration instead of counting up from zero', async () => {
    render(<ConsultationVideoCall appointment={{ ...appointment, duration: 30 }} onEndCall={() => {}} />);

    expect(await screen.findByTestId('consultation-timer')).toHaveTextContent('30:00');
  });
});
