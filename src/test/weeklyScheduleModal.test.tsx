import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { WeeklyScheduleModal } from '@/components/psychologist/WeeklyScheduleModal';
import { getWeekStartISO, weekDatesFrom } from '@/lib/psychologistAvailability';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
// Referência estável — um objeto novo a cada render faria o efeito que busca
// consultas ocupadas (dependente de `user`) entrar em loop.
const mockUser = { id: 'psi-1' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const weekStart = getWeekStartISO(new Date());
const dates = weekDatesFrom(weekStart);
const monday = dates[0];
const tuesday = dates[1];

// Referências estáveis entre renders — arrays novos a cada chamada do mock
// fariam o efeito de sincronização do rascunho entrar em loop.
let currentBaseBlocks: Array<{ day_of_week: number; start_time: string; end_time: string }> = [];
let currentOverrides: Array<{ id: string; date: string; start_time: string; end_time: string; type: 'bloqueio' | 'abertura' }> = [];
let occupiedAppointments: Array<{ scheduled_at: string; duration: number }> = [];

const saveBaseMock = vi.fn().mockResolvedValue(true);
const addOverrideMock = vi.fn().mockResolvedValue(true);
const removeOverrideMock = vi.fn().mockResolvedValue(true);
const applyChangesMock = vi.fn().mockResolvedValue(true);

vi.mock('@/hooks/usePsychologistAvailability', () => ({
  usePsychologistAvailability: () => ({ blocks: currentBaseBlocks, loading: false, save: saveBaseMock }),
}));

vi.mock('@/hooks/usePsychologistAvailabilityOverrides', () => ({
  usePsychologistAvailabilityOverrides: () => ({
    overrides: currentOverrides,
    loading: false,
    addOverride: addOverrideMock,
    removeOverride: removeOverrideMock,
    applyChanges: applyChangesMock,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            gte: () => ({
              lte: () => Promise.resolve({ data: occupiedAppointments, error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}));

beforeEach(() => {
  saveBaseMock.mockClear();
  addOverrideMock.mockClear();
  removeOverrideMock.mockClear();
  applyChangesMock.mockClear();
  currentBaseBlocks = [{ day_of_week: 1, start_time: '08:00', end_time: '16:00' }];
  currentOverrides = [];
  occupiedAppointments = [];
});

const renderAndWait = async () => {
  render(<WeeklyScheduleModal open onClose={() => {}} onConfirmed={() => {}} />);
  await waitFor(() => expect(screen.getByText('Segunda-feira', { exact: false })).toBeTruthy());
};

const openMondayGrid = async (mondayCard: HTMLElement) => {
  fireEvent.click(within(mondayCard).getByRole('button', { name: /personalizar horários/i }));
  await waitFor(() => expect(within(mondayCard).getByText('08:00')).toBeTruthy());
};

const getDayCard = (dayLabel: string) => screen.getByText(dayLabel, { exact: false }).closest('div')!.parentElement!;

describe('WeeklyScheduleModal — novo fluxo (padrão + grade de bloqueio)', () => {
  it('pré-preenche o range do dia a partir do horário-padrão salvo', async () => {
    await renderAndWait();

    const mondayCard = getDayCard('Segunda-feira');
    expect(within(mondayCard).getByDisplayValue('08:00')).toBeTruthy();
    expect(within(mondayCard).getByDisplayValue('16:00')).toBeTruthy();
  });

  it('abre a grade de meia em meia hora dentro do range do dia', async () => {
    await renderAndWait();
    const mondayCard = getDayCard('Segunda-feira');
    await openMondayGrid(mondayCard);

    expect(within(mondayCard).getByText('08:00')).toBeTruthy();
    expect(within(mondayCard).getByText('15:30')).toBeTruthy();
    expect(within(mondayCard).queryByText('16:00')).toBeNull(); // fora do range, não vira slot
  });

  it('clicar num horário da grade bloqueia; clicar de novo desbloqueia', async () => {
    await renderAndWait();
    const mondayCard = getDayCard('Segunda-feira');
    await openMondayGrid(mondayCard);

    const slot900 = within(mondayCard).getByText('09:00').closest('button')!;
    fireEvent.click(slot900);
    await waitFor(() => expect(within(mondayCard).getByText(/1 bloqueado/)).toBeTruthy());

    fireEvent.click(slot900);
    await waitFor(() => expect(within(mondayCard).queryByText(/bloqueado/)).toBeNull());
  });

  it('horário já ocupado por consulta aparece desabilitado e não pode ser bloqueado', async () => {
    occupiedAppointments = [{ scheduled_at: new Date(`${monday}T09:00:00`).toISOString(), duration: 50 }];

    await renderAndWait();
    const mondayCard = getDayCard('Segunda-feira');
    await openMondayGrid(mondayCard);

    const slot900 = within(mondayCard).getByText('09:00').closest('button') as HTMLButtonElement;
    expect(slot900.disabled).toBe(true);

    fireEvent.click(slot900);
    expect(within(mondayCard).queryByText(/bloqueado/)).toBeNull();
  });

  it('confirmar envia só a diferença de horários bloqueados pro applyChanges', async () => {
    await renderAndWait();
    const mondayCard = getDayCard('Segunda-feira');
    await openMondayGrid(mondayCard);

    fireEvent.click(within(mondayCard).getByText('09:00').closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: /confirmar horários livres da semana/i }));

    await waitFor(() => {
      expect(applyChangesMock).toHaveBeenCalledWith(
        [{ date: monday, start_time: '09:00', end_time: '09:30', type: 'bloqueio' }],
        []
      );
    });
    expect(saveBaseMock).not.toHaveBeenCalled();
  });

  it('desbloquear um horário já salvo remove via applyChanges', async () => {
    currentOverrides = [{ id: 'ov-1', date: monday, start_time: '09:00', end_time: '09:30', type: 'bloqueio' }];

    await renderAndWait();
    const mondayCard = getDayCard('Segunda-feira');
    await openMondayGrid(mondayCard);

    await waitFor(() => expect(within(mondayCard).getByText(/1 bloqueado/)).toBeTruthy());
    fireEvent.click(within(mondayCard).getByText('09:00').closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: /confirmar horários livres da semana/i }));

    await waitFor(() => {
      expect(applyChangesMock).toHaveBeenCalledWith([], ['ov-1']);
    });
  });

  it('mudar o range do dia e confirmar atualiza o horário-padrão', async () => {
    await renderAndWait();
    const mondayCard = getDayCard('Segunda-feira');

    const endInput = within(mondayCard).getByDisplayValue('16:00');
    fireEvent.change(endInput, { target: { value: '17:00' } });

    fireEvent.click(screen.getByRole('button', { name: /confirmar horários livres da semana/i }));

    await waitFor(() => {
      expect(saveBaseMock).toHaveBeenCalledWith([{ day_of_week: 1, start_time: '08:00', end_time: '17:00' }]);
    });
  });

  it('ligar um dia sem horário-padrão nenhum entra com um range default e é salvo ao confirmar', async () => {
    await renderAndWait();
    const tuesdayCard = getDayCard('Terça-feira');

    const toggle = within(tuesdayCard).getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(() => expect(within(tuesdayCard).getByDisplayValue('08:00')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /confirmar horários livres da semana/i }));

    await waitFor(() => {
      expect(saveBaseMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          { day_of_week: 1, start_time: '08:00', end_time: '16:00' },
          { day_of_week: 2, start_time: '08:00', end_time: '18:00' },
        ])
      );
    });
  });

  it('adiciona um horário extra fora do range chamando addOverride', async () => {
    await renderAndWait();
    const mondayCard = getDayCard('Segunda-feira');

    fireEvent.click(within(mondayCard).getByRole('button', { name: /adicionar horário extra/i }));

    const timeInputs = within(mondayCard).getAllByDisplayValue(/^\d{2}:\d{2}$/).filter((el) => {
      const v = (el as HTMLInputElement).value;
      return v === '18:00' || v === '19:00';
    });
    fireEvent.click(within(mondayCard).getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() => {
      expect(addOverrideMock).toHaveBeenCalledWith({ date: monday, start_time: '18:00', end_time: '19:00', type: 'abertura' });
    });
  });

  it('remove um horário extra existente', async () => {
    currentOverrides = [{ id: 'ov-extra', date: monday, start_time: '19:00', end_time: '20:00', type: 'abertura' }];
    await renderAndWait();

    fireEvent.click(screen.getByLabelText('Remover horário extra'));

    await waitFor(() => expect(removeOverrideMock).toHaveBeenCalledWith('ov-extra'));
  });

  it('leva para o editor de horário padrão', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /editar horário padrão/i }));
    expect(navigateMock).toHaveBeenCalledWith('/psychologist-availability');
  });
});
