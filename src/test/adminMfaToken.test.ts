import { describe, it, expect } from 'vitest';
import { adminMfaOk, tokenAal } from '../../supabase/functions/_shared/adminMfa';

const jwt = (claims: object) =>
  `Bearer h.${btoa(JSON.stringify(claims)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.s`;

describe('funções de admin: verificação em duas etapas no token', () => {
  it('só aceita token aal2', () => {
    expect(adminMfaOk(jwt({ sub: 'a', aal: 'aal2' }))).toBe(true);
    expect(adminMfaOk(jwt({ sub: 'a', aal: 'aal1' }))).toBe(false);
    expect(adminMfaOk(jwt({ sub: 'a' }))).toBe(false);
  });

  it('token ausente ou estragado não passa', () => {
    expect(tokenAal(null)).toBeNull();
    expect(tokenAal('Bearer abc')).toBeNull();
    expect(tokenAal('Bearer a.###.c')).toBeNull();
  });
});
