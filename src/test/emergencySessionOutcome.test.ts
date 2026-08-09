import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import { persistExplicitTermination } from '@/lib/callTermination';
import {
  END_REASONS,
  ALL_END_REASONS,
  completionReasonFor,
  describeEndReason,
  isEndReason,
} from '@/lib/emergencyEndReasons';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const PSYCHOLOGIST = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';
const SESSION_ID = '55555555-5555-4555-8555-555555555555';

const seedOngoingCall = () => {
  fakeDb.rows('emergency_requests').push({
    id: REQUEST_ID,
    patient_id: PATIENT,
    accepted_by: PSYCHOLOGIST,
    status: 'in_progress',
    started_at: new Date(Date.now() - 60_000).toISOString(),
    ended_at: null,
    ended_by: null,
    ended_by_type: null,
    end_reason: null,
    crisis_resolved: null,
    end_notes: null,
    duration: null,
  });
  fakeDb.rows('webrtc_sessions').push({
    id: SESSION_ID,
    emergency_request_id: REQUEST_ID,
    patient_id: PATIENT,
    psychologist_id: PSYCHOLOGIST,
    status: 'active',
    ended_at: null,
  });
};

const request = () => fakeDb.rows('emergency_requests').find((r) => r.id === REQUEST_ID)!;
const session = () => fakeDb.rows('webrtc_sessions').find((r) => r.id === SESSION_ID)!;

describe('Encerramento único e idempotente do atendimento SOS', () => {
  beforeEach(() => {
    fakeDb.tables = {};
    fakeDb.writes = [];
    fakeDb.currentUserId = PSYCHOLOGIST;
    seedOngoingCall();
  });

  it('in_progress → completed registrando quem encerrou e o desfecho da crise', async () => {
    const result = await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PSYCHOLOGIST,
      endedByType: 'psychologist',
      reason: END_REASONS.COMPLETED_BY_PSYCHOLOGIST,
      crisisResolved: true,
      notes: 'Paciente estabilizado',
    });

    expect(result.alreadyEnded).toBe(false);
    expect(request().status).toBe('completed');
    expect(request().ended_by_type).toBe('psychologist');
    expect(request().end_reason).toBe('completed_by_psychologist');
    expect(request().crisis_resolved).toBe(true);
    expect(request().end_notes).toBe('Paciente estabilizado');
    expect(session().status).toBe('completed');
    expect(result.duration).toBeGreaterThan(0);
  });

  it('chamar endCall duas vezes não sobrescreve o desfecho nem quebra', async () => {
    await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PATIENT,
      endedByType: 'patient',
      reason: END_REASONS.COMPLETED_BY_PATIENT,
    });

    const second = await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PSYCHOLOGIST,
      endedByType: 'psychologist',
      reason: END_REASONS.COMPLETED_BY_PSYCHOLOGIST,
      crisisResolved: false,
    });

    expect(second.alreadyEnded).toBe(true);
    expect(request().ended_by_type).toBe('patient');
    expect(request().end_reason).toBe('completed_by_patient');
    expect(request().crisis_resolved).toBeNull();
  });

  it('encerramento automático por tempo é registrado pelo sistema', async () => {
    await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: null,
      endedByType: 'system',
      reason: END_REASONS.TIME_LIMIT,
    });

    expect(request().status).toBe('completed');
    expect(request().ended_by_type).toBe('system');
    expect(request().end_reason).toBe('time_limit');
  });

  it('crise não resolvida guarda o motivo nas observações', async () => {
    await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PSYCHOLOGIST,
      endedByType: 'psychologist',
      reason: END_REASONS.COMPLETED_BY_PSYCHOLOGIST,
      crisisResolved: false,
      notes: 'Motivo: Tempo insuficiente — precisa de acompanhamento',
    });

    expect(request().crisis_resolved).toBe(false);
    expect(request().end_notes).toContain('Tempo insuficiente');
  });
});

describe('Vocabulário canônico de end_reason', () => {
  it('não possui valores duplicados representando o mesmo conceito', () => {
    expect(new Set(ALL_END_REASONS).size).toBe(ALL_END_REASONS.length);
  });

  it('mapeia o encerramento explícito de cada participante', () => {
    expect(completionReasonFor('patient')).toBe('completed_by_patient');
    expect(completionReasonFor('psychologist')).toBe('completed_by_psychologist');
  });

  it('rejeita valores legados fora do vocabulário', () => {
    expect(isEndReason('encerrada_pelo_usuario')).toBe(false);
    expect(isEndReason('tempo_limite_atingido')).toBe(false);
    expect(isEndReason('time_limit')).toBe(true);
  });

  it('traduz o motivo para o usuário sem expor strings técnicas', () => {
    expect(describeEndReason('expired')).toBe('Expirada sem atendimento');
    expect(describeEndReason(null)).toBe('Não informado');
  });
});
