import { describe, it, expect, vi } from 'vitest';
import { silenceVerboseLogsInProduction } from '@/lib/productionLogging';

const fakeConsole = () => ({ log: vi.fn(), info: vi.fn(), debug: vi.fn() });

describe('logs em produção', () => {
  it('silencia log/info/debug em produção', () => {
    const c = fakeConsole();
    const original = c.log;
    expect(silenceVerboseLogsInProduction(true, '', null, c)).toBe(true);
    c.log('segredo');
    expect(original).not.toHaveBeenCalled();
  });

  it('mantém tudo em desenvolvimento', () => {
    const c = fakeConsole();
    expect(silenceVerboseLogsInProduction(false, '', null, c)).toBe(false);
  });

  it('?debug=1 reativa os logs em produção para suporte', () => {
    const c = fakeConsole();
    expect(silenceVerboseLogsInProduction(true, '?debug=1', null, c)).toBe(false);
  });
});
