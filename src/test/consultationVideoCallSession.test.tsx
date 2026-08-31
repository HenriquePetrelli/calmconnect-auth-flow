import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import ConsultationVideoCall from '@/components/appointments/ConsultationVideoCall';
import { useWebRTC } from '@/hooks/useWebRTC';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useWebRTC', () => ({
  useWebRTC: vi.fn().mockReturnValue({
    localStream: null,
    remoteStream: null,
    connectionState: 'new',
    isConnected: false,
    error: null,
    toggleAudio: vi.fn(),
    toggleVideo: vi.fn(),
    cleanup: vi.fn(),
  }),
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
});
