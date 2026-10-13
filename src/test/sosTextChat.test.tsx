import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  isPatientUnanswered,
  isPsychologistAway,
  isSeenBy,
  parseHeartbeat,
  secondsLeft,
  emptySosChatState,
} from '@/lib/sosTextChat';
import { saveSosChannel, takeSosChannel } from '@/lib/sosChannel';

// --- supabase mínimo: mensagens, sinal da conversa e envio --------------------
const db = vi.hoisted(() => ({
  messages: [] as Record<string, unknown>[],
  heartbeat: {} as Record<string, unknown>,
  rpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => {
  const channel = () => {
    const ch = { on: () => ch, subscribe: () => ch, send: vi.fn() };
    return ch;
  };
  const query = (table: string) => {
    const result = () =>
      table === 'sos_messages'
        ? { data: db.messages, error: null }
        : { data: table === 'emergency_requests' ? { patient_details: { full_name: 'Ana' }, accepted_by: 'psi-1' } : { full_name: 'Dra. Marta' }, error: null };
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.order = async () => result();
    q.maybeSingle = async () => result();
    return q;
  };
  return {
    supabase: {
      from: query,
      channel,
      removeChannel: vi.fn(),
      rpc: (name: string, params: Record<string, unknown>) => {
        db.rpc(name, params);
        if (name === 'sos_chat_heartbeat') return Promise.resolve({ data: db.heartbeat, error: null });
        if (name === 'send_sos_message') {
          return Promise.resolve({
            data: {
              id: 'm-new',
              client_id: params.p_client_id,
              sender_type: 'patient',
              body: params.p_body,
              created_at: new Date().toISOString(),
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      },
    },
  };
});
vi.mock('@/lib/currentUser', () => ({ getSessionUser: async () => ({ data: { user: { id: 'pac-1' } } }) }));
vi.mock('@/lib/endEmergencySession', () => ({ endEmergencySession: vi.fn(async () => ({ ok: true })) }));
const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/sos/PatientContextPanel', () => ({ default: () => <div /> }));
vi.mock('@/components/sos/FeedbackModal', () => ({ FeedbackModal: () => <div>avaliar</div> }));

import SosTextChatRoom from '@/components/calls/SosTextChatRoom';
import ConfirmationModal from '@/components/sos/ConfirmationModal';

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

const baseHeartbeat = () => ({
  server_now: new Date().toISOString(),
  status: 'in_progress',
  accepted_at: iso(5 * 60_000),
  started_at: iso(60_000),
  time_limit_seconds: 1500,
  psychologist_seen_at: iso(5_000),
  patient_seen_at: iso(1_000),
  psychologist_read_at: null,
  patient_read_at: null,
  last_patient_message_at: null,
  last_psychologist_message_at: null,
});

const renderRoom = (userType: 'patient' | 'psychologist' = 'patient') =>
  render(
    <MemoryRouter>
      <SosTextChatRoom requestId="req-1" sessionId="ses-1" userType={userType} onLeave={() => {}} />
    </MemoryRouter>,
  );

beforeEach(() => {
  db.messages = [];
  db.heartbeat = baseHeartbeat();
  db.rpc.mockReset();
  toast.mockReset();
  sessionStorage.clear();
});

describe('SOS por mensagem: regras de tempo e presença', () => {
  const now = Date.now();
  const state = (patch: Partial<ReturnType<typeof emptySosChatState>>) => ({ ...emptySosChatState(), status: 'in_progress', ...patch });

  it('psicólogo longe da conversa há mais de 60 s', () => {
    expect(isPsychologistAway(state({ psychologistSeenAt: new Date(now - 61_000).toISOString() }), now)).toBe(true);
    expect(isPsychologistAway(state({ psychologistSeenAt: new Date(now - 30_000).toISOString() }), now)).toBe(false);
    // Atendimento encerrado: não alerta.
    expect(isPsychologistAway({ ...state({ psychologistSeenAt: new Date(now - 600_000).toISOString() }), status: 'completed' }, now)).toBe(false);
  });

  it('mensagem do paciente sem resposta há mais de 2 min', () => {
    const p = new Date(now - 130_000).toISOString();
    expect(isPatientUnanswered(state({ lastPatientMessageAt: p }), now)).toBe(true);
    expect(isPatientUnanswered(state({ lastPatientMessageAt: p, lastPsychologistMessageAt: new Date(now - 10_000).toISOString() }), now)).toBe(false);
    expect(isPatientUnanswered(state({ lastPatientMessageAt: new Date(now - 60_000).toISOString() }), now)).toBe(false);
  });

  it('25 minutos contados da 1ª resposta; antes dela, sem relógio', () => {
    expect(secondsLeft(state({ startedAt: null, timeLimitSeconds: 1500 }), now)).toBeNull();
    expect(secondsLeft(state({ startedAt: new Date(now - 60_000).toISOString(), timeLimitSeconds: 1500 }), now)).toBe(1440);
    expect(secondsLeft(state({ startedAt: new Date(now - 30 * 60_000).toISOString(), timeLimitSeconds: 1500 }), now)).toBe(0);
  });

  it('"visto" quando o outro leu depois da mensagem', () => {
    expect(isSeenBy('2026-10-13T10:00:05Z', '2026-10-13T10:00:00Z')).toBe(true);
    expect(isSeenBy('2026-10-13T09:59:00Z', '2026-10-13T10:00:00Z')).toBe(false);
    expect(isSeenBy(null, '2026-10-13T10:00:00Z')).toBe(false);
  });

  it('lê o sinal do servidor', () => {
    const { state: s, serverNow } = parseHeartbeat({ server_now: '2026-10-13T10:00:00Z', status: 'accepted', time_limit_seconds: 1500 });
    expect(s.status).toBe('accepted');
    expect(s.timeLimitSeconds).toBe(1500);
    expect(serverNow).toBe(Date.parse('2026-10-13T10:00:00Z'));
  });

  it('o canal escolhido passa da confirmação para o SOS uma vez só', () => {
    saveSosChannel('text');
    expect(takeSosChannel()).toBe('text');
    expect(takeSosChannel()).toBe('video');
  });
});

describe('SOS por mensagem: confirmação', () => {
  it('vídeo é o padrão; "Por mensagem" segue com o pedido', () => {
    const onConfirm = vi.fn();
    render(<ConfirmationModal open onOpenChange={() => {}} onConfirm={onConfirm} />);
    expect(screen.getByRole('radio', { name: 'Por vídeo' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Por mensagem' }));
    expect(screen.getByText('Um psicólogo disponível conversa com você por mensagem')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, chamar um psicólogo' }));
    expect(onConfirm).toHaveBeenCalled();
    expect(takeSosChannel()).toBe('text');
  });
});

describe('SOS por mensagem: conversa', () => {
  it('mostra as mensagens e envia com um id do aparelho (reenviar não duplica)', async () => {
    db.messages = [
      { id: 'm1', client_id: 'c1', sender_type: 'psychologist', body: 'Oi, estou aqui com você.', created_at: iso(30_000) },
    ];
    renderRoom('patient');
    expect(await screen.findByText('Oi, estou aqui com você.')).toBeInTheDocument();
    expect(await screen.findByText('Dra. Marta')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Escreva sua mensagem'), { target: { value: 'Não consigo respirar direito' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Não consigo respirar direito')).toBeInTheDocument();
    const call = db.rpc.mock.calls.find(([name]) => name === 'send_sos_message');
    expect(call?.[1]).toEqual(
      expect.objectContaining({ p_request_id: 'req-1', p_body: 'Não consigo respirar direito', p_client_id: expect.any(String) }),
    );
  });

  it('psicólogo longe: o paciente vê o aviso, "Chamar outro psicólogo" e o CVV', async () => {
    db.heartbeat = { ...baseHeartbeat(), psychologist_seen_at: iso(90_000) };
    renderRoom('patient');
    expect(await screen.findByText(/O psicólogo pode ter se afastado da conversa/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chamar outro psicólogo' }));
    await waitFor(() =>
      expect(db.rpc).toHaveBeenCalledWith('sos_request_other_psychologist', { p_request_id: 'req-1' }),
    );
    expect(screen.getByRole('link', { name: /CVV 188/ })).toHaveAttribute('href', 'tel:188');
  });

  it('sem resposta há 2 min: também oferece chamar outro psicólogo', async () => {
    db.heartbeat = { ...baseHeartbeat(), last_patient_message_at: iso(150_000), last_psychologist_message_at: iso(200_000) };
    renderRoom('patient');
    expect(await screen.findByText(/O psicólogo ainda não respondeu/)).toBeInTheDocument();
  });

  it('psicólogo: aviso para manter a conversa aberta, contexto e plano pós-crise', async () => {
    renderRoom('psychologist');
    expect(await screen.findByText(/Mantenha esta conversa aberta até encerrar/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contexto do paciente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plano pós-crise' })).toBeInTheDocument();
    expect(screen.queryByText(/pode ter se afastado/)).not.toBeInTheDocument();
  });

  it('antes da 1ª resposta, o psicólogo sabe que o atendimento ainda não começou', async () => {
    db.heartbeat = { ...baseHeartbeat(), started_at: null };
    renderRoom('psychologist');
    expect(await screen.findByText(/começa quando você enviar a primeira mensagem/)).toBeInTheDocument();
  });

  it('minha última mensagem lida mostra "Visto"', async () => {
    db.messages = [{ id: 'm1', client_id: 'c1', sender_type: 'patient', body: 'Oi', created_at: iso(30_000) }];
    db.heartbeat = { ...baseHeartbeat(), psychologist_read_at: iso(10_000) };
    renderRoom('patient');
    expect(await screen.findByText('Visto')).toBeInTheDocument();
  });

  it('o psicólogo encerrou: mostra o fim e a avaliação', async () => {
    renderRoom('patient');
    await screen.findByText('Dra. Marta');
    db.heartbeat = { ...baseHeartbeat(), status: 'completed', ended_by_type: 'psychologist' };
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(await screen.findByText('O psicólogo encerrou a conversa.')).toBeInTheDocument();
    expect(screen.getByText('avaliar')).toBeInTheDocument();
  });
});
