import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PsychologistAvailability from '@/pages/PsychologistAvailability';

const saveMock = vi.fn().mockResolvedValue(true);
// Stable reference across renders — a fresh array literal returned by the
// mock on every render would make the component's sync effect loop forever.
const savedBlocks = [{ day_of_week: 1, start_time: '08:00', end_time: '12:00' }];

vi.mock('@/hooks/usePsychologistAvailability', () => ({
  usePsychologistAvailability: () => ({
    blocks: savedBlocks,
    loading: false,
    saving: false,
    save: saveMock,
  }),
}));

vi.mock('@/components/PageHeader', () => ({ default: () => <div /> }));

describe('PsychologistAvailability page', () => {
  it('carrega os blocos já salvos e permite adicionar outro horário no mesmo dia', async () => {
    render(<PsychologistAvailability />);

    expect(screen.getByText('Segunda-feira')).toBeTruthy();
    const startInputs = screen.getAllByDisplayValue('08:00');
    expect(startInputs.length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByText('Adicionar horário')[0]);

    await waitFor(() => {
      expect(screen.getAllByDisplayValue('08:00').length).toBe(2);
    });
  });

  it('liga um dia sem horário nenhum e adiciona um bloco padrão', async () => {
    render(<PsychologistAvailability />);

    // Ordem de exibição é [Seg, Ter, Qua, Qui, Sex, Sáb, Dom]; só Segunda
    // vem com bloco salvo, então o switch de Domingo (o último) começa desligado.
    const switches = screen.getAllByRole('switch');
    const domingoSwitch = switches[switches.length - 1];
    expect(domingoSwitch).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(domingoSwitch);

    await waitFor(() => {
      expect(domingoSwitch).toHaveAttribute('aria-checked', 'true');
    });
  });

  it('salva enviando os blocos atuais para o hook', async () => {
    render(<PsychologistAvailability />);

    fireEvent.click(screen.getByRole('button', { name: /salvar agenda/i }));

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith([
        expect.objectContaining({ day_of_week: 1, start_time: '08:00', end_time: '12:00' }),
      ]);
    });
  });
});
