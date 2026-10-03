import { describe, it, expect, vi } from 'vitest';

const eq = vi.fn().mockResolvedValue({ error: null });
const del = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ delete: del }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => from(...(args as [])), removeChannel: vi.fn() },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { goOfflineOnSignOut } from '@/hooks/usePsychologistPresence';

describe('psicólogo sai da conta', () => {
  it('fica offline na hora (apaga o registro de presença)', async () => {
    await goOfflineOnSignOut('psy-1');
    expect(from).toHaveBeenCalledWith('psychologist_presence');
    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('psychologist_id', 'psy-1');
  });

  it('não impede o logout se a remoção falhar', async () => {
    eq.mockRejectedValueOnce(new Error('rede'));
    await expect(goOfflineOnSignOut('psy-1')).resolves.toBeUndefined();
  });
});
