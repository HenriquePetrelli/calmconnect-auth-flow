import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: string[] = [];
const uploadMock = vi.fn();
const signUpMock = vi.fn();
const rpcMock = vi.fn();
const invokeMock = vi.fn();
const signOutMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => {
  const table = () => ({ delete: () => ({ eq: () => Promise.resolve({ error: null }) }) });
  return {
    supabase: {
      auth: {
        signUp: (...a: unknown[]) => { calls.push('signUp'); return signUpMock(...a); },
        signOut: (...a: unknown[]) => { calls.push('signOut'); return signOutMock(...a); },
      },
      storage: {
        from: () => ({
          upload: (path: string, ...rest: unknown[]) => { calls.push(`upload:${path.split('/')[0]}`); return uploadMock(path, ...rest); },
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://x/storage/v1/object/public/documents/${path}` } }),
          list: () => Promise.resolve({ data: [] }),
          remove: () => Promise.resolve({ error: null }),
        }),
      },
      from: table,
      rpc: (...a: unknown[]) => { calls.push('rpc'); return rpcMock(...a); },
      functions: { invoke: (name: string, ...a: unknown[]) => { calls.push(`fn:${name}`); return invokeMock(name, ...a); } },
    },
  };
});

import { PsychologistService } from '@/services/psychologist.service';

const form = {
  email: 'psi@exemplo.com', password: 'calma2024', fullName: 'Psi Teste', cpf: '12345678909', crp: '06/12345',
  specialty: 'Ansiedade', areaAtendimento: ['Online'], bio: 'x'.repeat(60), state: 'ES', city: 'Apiacá',
};
const file = new File(['conteudo'], 'Time de Folha.png', { type: 'image/png' });
const USER = '11111111-1111-4111-8111-111111111111';

describe('cadastro do psicólogo: envio do documento', () => {
  beforeEach(() => {
    calls.length = 0;
    [uploadMock, signUpMock, rpcMock, invokeMock, signOutMock].forEach((m) => m.mockReset());
    signUpMock.mockResolvedValue({ data: { user: { id: USER }, session: { access_token: 't' } }, error: null });
    rpcMock.mockResolvedValue({ data: { success: true }, error: null });
    invokeMock.mockResolvedValue({ error: null });
    signOutMock.mockResolvedValue({ error: null });
  });

  it('cria a conta antes e envia o documento para a pasta da própria pessoa', async () => {
    uploadMock.mockResolvedValue({ error: null });
    const result = await PsychologistService.signUpPsychologist(form, file);
    expect(result.success).toBe(true);
    expect(calls).toEqual(['signUp', `upload:${USER}`, 'rpc']);
    expect(rpcMock.mock.calls[0][1].p_document_url).toContain(`/documents/${USER}/`);
  });

  it('se o envio falhar, marca o documento, desfaz a conta e não cria o perfil', async () => {
    uploadMock.mockResolvedValue({ error: { message: 'new row violates row-level security policy' } });
    const result = await PsychologistService.signUpPsychologist(form, file);
    expect(result).toMatchObject({ success: false, documentError: true });
    expect(result.error).toMatch(/PDF, JPG ou PNG/);
    expect(calls).not.toContain('rpc');
    expect(calls).toContain('fn:cleanup-user');
    expect(calls.at(-1)).toBe('signOut');
  });

  it('sem sessão depois de criar a conta, não tenta enviar sem login', async () => {
    signUpMock.mockResolvedValue({ data: { user: { id: USER }, session: null }, error: null });
    const result = await PsychologistService.signUpPsychologist(form, file);
    expect(result.success).toBe(false);
    expect(calls.some((c) => c.startsWith('upload'))).toBe(false);
  });
});
