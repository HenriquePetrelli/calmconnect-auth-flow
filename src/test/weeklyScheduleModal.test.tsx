import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { WeeklyScheduleModal } from '@/components/psychologist/WeeklyScheduleModal';
import { getWeekStartISO, weekDatesFrom } from '@/lib/psychologistAvailability';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));

const weekStart = getWeekStartISO(new Date());
const dates = weekDatesFrom(weekStart);
const monday = dates[0];

const addOverrideMock = vi.fn().mockResolvedValue(true);
const removeOverrideMock = vi.fn().mockResolvedValue(true);

// Referências estáveis — um novo array a cada render faria o efeito de
// sincronização do componente (se houvesse) entrar em loop.
const baseBlocks = [{ day_of_week: 1, start_time: '08:00', end_time: '12:00' }];
let currentOverrides: Array<{ id: string; date: string; start_time: string; end_time: string; type: 'bloqueio' | 'abertura' }> = [];

vi.mock('@/hooks/usePsychologistAvailability', () => ({
  usePsychologistAvailability: () => ({ blocks: baseBlocks, loading: false }),
}));

vi.mock('@/hooks/usePsychologistAvailabilityOverrides', () => ({
  usePsychologistAvailabilityOverrides: () => ({
    overrides: currentOverrides,
    loading: false,
    addOverride: addOverrideMock,
    removeOverride: removeOverrideMock,
  }),
}));

beforeEach(() => {
  addOverrideMock.mockClear();
  removeOverrideMock.mockClear();
  currentOverrides = [];
});

describe('WeeklyScheduleModal', () => {
  it('mostra o horário efetivo de segunda-feira (horário-padrão) entre os 7 dias', () => {
    render(<WeeklyScheduleModal open onClose={() => {}} onConfirmed={() => {}} />);
    expect(screen.getByText('Segunda-feira', { exact: false })).toBeTruthy();
    expect(screen.getByText('08:00–12:00')).toBeTruthy();
  });

  it('adiciona um bloqueio pontual chamando addOverride com a data certa', async () => {
    render(<WeeklyScheduleModal open onClose={() => {}} onConfirmed={() => {}} />);

    const mondayCard = screen.getByText('Segunda-feira', { exact: false }).closest('div')!.parentElement!;
    fireEvent.click(within(mondayCard).getByRole('button', { name: /bloquear/i }));

    const timeInputs = within(mondayCard).getAllByDisplayValue(/^\d{2}:\d{2}$/);
    fireEvent.change(timeInputs[0], { target: { value: '10:00' } });
    fireEvent.change(timeInputs[1], { target: { value: '11:00' } });

    // O botão "Bloquear" do cabeçalho (abre o editor) e o de confirmar a
    // exceção têm o mesmo texto acessível; o de confirmar é o último no DOM.
    const bloquearButtons = within(mondayCard).getAllByRole('button', { name: /^bloquear$/i });
    fireEvent.click(bloquearButtons[bloquearButtons.length - 1]);

    await waitFor(() => {
      expect(addOverrideMock).toHaveBeenCalledWith({
        date: monday,
        start_time: '10:00',
        end_time: '11:00',
        type: 'bloqueio',
      });
    });
  });

  it('remove uma exceção existente ao clicar no x do badge', async () => {
    currentOverrides = [
      { id: 'ov-1', date: monday, start_time: '12:00', end_time: '13:00', type: 'bloqueio' },
    ];
    render(<WeeklyScheduleModal open onClose={() => {}} onConfirmed={() => {}} />);

    fireEvent.click(screen.getByLabelText('Remover exceção'));

    await waitFor(() => expect(removeOverrideMock).toHaveBeenCalledWith('ov-1'));
  });

  it('confirma a semana chamando onConfirmed com o início da semana atual', () => {
    const onConfirmed = vi.fn();
    render(<WeeklyScheduleModal open onClose={() => {}} onConfirmed={onConfirmed} />);

    fireEvent.click(screen.getByRole('button', { name: /confirmar agenda da semana/i }));

    expect(onConfirmed).toHaveBeenCalledWith(weekStart);
  });

  it('leva para o editor de horário padrão', () => {
    render(<WeeklyScheduleModal open onClose={() => {}} onConfirmed={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /editar horário padrão/i }));

    expect(navigateMock).toHaveBeenCalledWith('/psychologist-availability');
  });
});
