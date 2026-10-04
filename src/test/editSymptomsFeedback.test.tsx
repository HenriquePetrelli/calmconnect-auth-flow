import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const success = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => success(...a) } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) =>
      table === 'transtornos_sintomas'
        ? { select: async () => ({ data: [{ sintomas: ['Ansiedade', 'Insônia'] }], error: null }) }
        : {
            select: () => ({ eq: () => ({ single: async () => ({ data: { sintomas_selecionados: [] }, error: null }) }) }),
            update: () => ({ eq: async () => ({ error: null }) }),
          },
  },
}));

import EditSymptomsModal from '@/components/EditSymptomsModal';

describe('Meus sintomas: aviso depois de salvar', () => {
  it('fecha a janela e só depois mostra "Sintomas atualizados"', async () => {
    const onOpenChange = vi.fn();
    render(<EditSymptomsModal open onOpenChange={onOpenChange} userId="u1" />);
    fireEvent.click(await screen.findByText('Insônia'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(success).not.toHaveBeenCalled();
    await waitFor(() => expect(success).toHaveBeenCalledWith('Sintomas atualizados', expect.anything()));
  });
});
