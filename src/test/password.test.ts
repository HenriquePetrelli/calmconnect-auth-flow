import { describe, expect, it } from 'vitest';
import { passwordProblem } from '@/lib/password';

describe('passwordProblem', () => {
  it('aceita senha com 8+ caracteres, letras e números', () => {
    expect(passwordProblem('calma2024')).toBeNull();
  });
  it('recusa curta, só letras ou só números', () => {
    expect(passwordProblem('ab12')).toMatch(/8 caracteres/);
    expect(passwordProblem('somenteletras')).toMatch(/letras e números/);
    expect(passwordProblem('12345678')).toMatch(/letras e números/);
  });
});
