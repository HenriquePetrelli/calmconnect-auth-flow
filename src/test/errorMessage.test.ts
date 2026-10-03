import { describe, expect, it } from 'vitest';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';

const FALLBACK = 'Não foi possível concluir.';

describe('getFriendlyErrorMessage', () => {
  it('mostra a mensagem de regra que vem do banco (objeto do Supabase, não Error)', () => {
    const postgrestError = { code: 'P0001', message: 'Esta consulta já entrou no repasse. Fale com o suporte para ajustar.', details: null, hint: null };
    expect(getFriendlyErrorMessage(postgrestError, FALLBACK)).toBe(postgrestError.message);
  });

  it('traduz erros técnicos do banco', () => {
    expect(getFriendlyErrorMessage({ message: 'new row violates row-level security policy for table "x"' }, FALLBACK)).toBe(
      'Você não tem permissão para fazer isso.',
    );
    expect(getFriendlyErrorMessage({ message: 'duplicate key value violates unique constraint "x"' }, FALLBACK)).toBe(
      'Esse registro já existe.',
    );
  });

  it('não mostra texto técnico desconhecido', () => {
    expect(getFriendlyErrorMessage({ message: 'relation "public.x" does not exist' }, FALLBACK)).toBe(FALLBACK);
    expect(getFriendlyErrorMessage({ code: '42P01' }, FALLBACK)).toBe(FALLBACK);
    expect(getFriendlyErrorMessage(null, FALLBACK)).toBe(FALLBACK);
  });

  it('continua aceitando Error e texto', () => {
    expect(getFriendlyErrorMessage(new Error('Failed to fetch'), FALLBACK)).toMatch(/Sem conexão/);
    expect(getFriendlyErrorMessage('Horário indisponível.', FALLBACK)).toBe('Horário indisponível.');
  });
});
