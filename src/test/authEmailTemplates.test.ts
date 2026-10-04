import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';

const dir = 'supabase/templates';
const templates = readdirSync(dir).filter((f) => f.endsWith('.html'));
const read = (name: string) => readFileSync(`${dir}/${name}`, 'utf8');

describe('e-mails de login do Supabase', () => {
  it('existem os 6 modelos', () => {
    expect(templates.sort()).toEqual(
      ['confirmation', 'email_change', 'invite', 'magic_link', 'reauthentication', 'recovery'].map((n) => `${n}.html`),
    );
  });

  it.each(templates)('%s: português, logo do Soliv e sem marca do Supabase', (name) => {
    const html = read(name);
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain('{{ .SiteURL }}/email/soliv-logo.png');
    expect(html).not.toMatch(/supabase|reset password|follow this link/i);
    expect(html).not.toMatch(/gradient/i);
  });

  it.each(templates.filter((n) => n !== 'reauthentication.html'))('%s: botão e link alternativo com o endereço de confirmação', (name) => {
    expect(read(name).match(/\{\{ \.ConfirmationURL \}\}/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('código de confirmação mostra o token', () => {
    expect(read('reauthentication.html')).toContain('{{ .Token }}');
  });

  it('redefinir senha diz a validade e o que fazer se não foi você', () => {
    const html = read('recovery.html');
    expect(html).toContain('1 hora');
    expect(html).toContain('Não foi você?');
    expect(html).toContain('{{ .Email }}');
  });
});
