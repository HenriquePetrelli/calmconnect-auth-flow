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

vi.mock('@/hooks/usePsychologistVacation', () => ({
  usePsychologistVacation: () => ({
    activeVacation: null,
    upcomingVacation: null,
    loading: false,
    saving: false,
    setVacation: vi.fn().mockResolvedValue(true),
    cancelVacation: vi.fn().mockResolvedValue(true),
  }),
  toISODate: () => '2026-01-01',
}));

vi.mock('@/components/PageHeader', () => ({ default: () => <div /> }));

const rules = { buffer_minutes: 0, min_notice_hours: 2, max_advance_days: 30 };
vi.mock('@/hooks/usePsychologistBookingRules', () => ({
  usePsychologistBookingRules: () => ({ rules, loading: false, saving: false, save: vi.fn() }),
}));

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

  it('copia os horários de um dia para outros', () => {
    saveMock.mockClear();
    render(<PsychologistAvailability />);

    fireEvent.click(screen.getByText('Copiar para outros dias'));
    fireEvent.click(screen.getByLabelText('Quarta-feira'));
    fireEvent.click(screen.getByText('Copiar'));
    fireEvent.click(screen.getByText('Salvar agenda'));

    // handleSave calls save() synchronously; no waitFor — polling while the
    // Radix popover's focus scope is mounted never settles in jsdom.
    expect(saveMock).toHaveBeenCalled();
    const saved = saveMock.mock.calls[0][0] as { day_of_week: number; start_time: string; end_time: string }[];
    expect(saved).toContainEqual({ day_of_week: 3, start_time: '08:00', end_time: '12:00' });
    expect(saved).toContainEqual({ day_of_week: 1, start_time: '08:00', end_time: '12:00' });
  });
});
