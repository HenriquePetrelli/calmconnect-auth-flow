import { describe, it, expect } from 'vitest';
import { canCancelAppointment, cancellationNotice, cancellationRefunds } from '@/lib/appointmentCancellation';
import { chatImagePath } from '@/lib/chatImage';
import { getFunctionErrorMessage, unwrapFunctionError } from '@/utils/errorMessage';

const now = new Date('2026-10-04T12:00:00Z').getTime();
const inHours = (h: number) => new Date(now + h * 3_600_000).toISOString();

describe('cancelamento de consulta', () => {
  it('só antes do início e em status que ainda valem', () => {
    expect(canCancelAppointment({ scheduled_at: inHours(5), status: 'scheduled' }, now)).toBe(true);
    expect(canCancelAppointment({ scheduled_at: inHours(5), status: 'pending' }, now)).toBe(true);
    expect(canCancelAppointment({ scheduled_at: inHours(-1), status: 'scheduled' }, now)).toBe(false);
    expect(canCancelAppointment({ scheduled_at: inHours(5), status: 'completed' }, now)).toBe(false);
    expect(canCancelAppointment({ scheduled_at: inHours(5), status: 'cancelled' }, now)).toBe(false);
  });

  it('paciente: devolve com 24h ou mais, ou se ainda não estava confirmada', () => {
    expect(cancellationRefunds({ scheduled_at: inHours(30), status: 'scheduled' }, 'patient', now)).toBe(true);
    expect(cancellationRefunds({ scheduled_at: inHours(5), status: 'scheduled' }, 'patient', now)).toBe(false);
    expect(cancellationRefunds({ scheduled_at: inHours(5), status: 'pending' }, 'patient', now)).toBe(true);
    expect(cancellationNotice({ scheduled_at: inHours(5), status: 'scheduled' }, 'patient', now)).toMatch(/menos de 24h/);
  });

  it('psicólogo: sempre devolve para o paciente', () => {
    expect(cancellationRefunds({ scheduled_at: inHours(1), status: 'scheduled' }, 'psychologist', now)).toBe(true);
    expect(cancellationNotice({ scheduled_at: inHours(1), status: 'scheduled' }, 'psychologist', now)).toMatch(/volta para ele/);
  });
});

describe('imagem do chat', () => {
  it('aceita o caminho novo e converte o link público antigo', () => {
    expect(chatImagePath('chat-images/u-1.jpg')).toBe('chat-images/u-1.jpg');
    expect(
      chatImagePath('https://x.supabase.co/storage/v1/object/public/documents/chat-images/u-1.png'),
    ).toBe('chat-images/u-1.png');
    expect(chatImagePath('https://x.supabase.co/storage/v1/object/public/documents/u/doc.pdf')).toBeNull();
    expect(chatImagePath(null)).toBeNull();
  });
});

describe('erro de edge function', () => {
  it('usa o motivo enviado pelo servidor', async () => {
    const error = Object.assign(new Error('Edge Function returned a non-2xx status code'), {
      context: new Response(JSON.stringify({ error: 'Esse horário já está ocupado por outra consulta confirmada.' }), { status: 409 }),
    });
    expect(await unwrapFunctionError(error)).toBe('Esse horário já está ocupado por outra consulta confirmada.');
    expect(await getFunctionErrorMessage(error, 'Falhou')).toBe('Esse horário já está ocupado por outra consulta confirmada.');
  });

  it('sem corpo útil, cai na mensagem padrão', async () => {
    const error = Object.assign(new Error('Edge Function returned a non-2xx status code'), {
      context: new Response('oops', { status: 500 }),
    });
    expect(await getFunctionErrorMessage(error, 'Falhou')).toBe('Falhou');
  });
});
