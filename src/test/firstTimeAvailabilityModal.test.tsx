import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { FirstTimeAvailabilityModal } from '@/components/psychologist/FirstTimeAvailabilityModal';

const saveMock = vi.fn().mockResolvedValue(true);

vi.mock('@/hooks/usePsychologistAvailability', () => ({
  usePsychologistAvailability: () => ({ blocks: [], loading: false, saving: false, save: saveMock }),
}));

beforeEach(() => {
  saveMock.mockClear();
});

const getDayCard = (dayLabel: string) => screen.getByText(dayLabel).closest('div')!.parentElement!;

describe('FirstTimeAvailabilityModal', () => {
  it('vem com segunda a sexta pré-marcadas das 08:00 às 18:00, fim de semana desligado', () => {
    render(<FirstTimeAvailabilityModal open onClose={() => {}} onSaved={() => {}} />);

    const mondayCard = getDayCard('Segunda-feira');
    expect(within(mondayCard).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(within(mondayCard).getByDisplayValue('08:00')).toBeTruthy();
    expect(within(mondayCard).getByDisplayValue('18:00')).toBeTruthy();

    const sundayCard = getDayCard('Domingo');
    expect(within(sundayCard).getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('salva os dias ligados com o range editado e chama onSaved', async () => {
    const onSaved = vi.fn();
    render(<FirstTimeAvailabilityModal open onClose={() => {}} onSaved={onSaved} />);

    const mondayCard = getDayCard('Segunda-feira');
    fireEvent.change(within(mondayCard).getByDisplayValue('18:00'), { target: { value: '17:00' } });

    // Desliga sábado e domingo continua desligado — só dias úteis ficam no payload.
    fireEvent.click(screen.getByRole('button', { name: /salvar minha agenda/i }));

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith([
        { day_of_week: 1, start_time: '08:00', end_time: '17:00' },
        { day_of_week: 2, start_time: '08:00', end_time: '18:00' },
        { day_of_week: 3, start_time: '08:00', end_time: '18:00' },
        { day_of_week: 4, start_time: '08:00', end_time: '18:00' },
        { day_of_week: 5, start_time: '08:00', end_time: '18:00' },
      ]);
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('ligar um dia extra (ex.: sábado) inclui ele no salvamento', async () => {
    render(<FirstTimeAvailabilityModal open onClose={() => {}} onSaved={() => {}} />);

    const saturdayCard = getDayCard('Sábado');
    fireEvent.click(within(saturdayCard).getByRole('switch'));

    fireEvent.click(screen.getByRole('button', { name: /salvar minha agenda/i }));

    await waitFor(() => {
      const lastCall = saveMock.mock.calls[saveMock.mock.calls.length - 1][0];
      expect(lastCall).toContainEqual({ day_of_week: 6, start_time: '08:00', end_time: '18:00' });
    });
  });

  it('bloqueia salvar quando início é depois do término', async () => {
    render(<FirstTimeAvailabilityModal open onClose={() => {}} onSaved={() => {}} />);

    const mondayCard = getDayCard('Segunda-feira');
    fireEvent.change(within(mondayCard).getByDisplayValue('08:00'), { target: { value: '20:00' } });

    expect(within(mondayCard).getByText(/início deve ser antes do término/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /salvar minha agenda/i }));
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('"Configurar depois" fecha sem salvar', () => {
    const onClose = vi.fn();
    render(<FirstTimeAvailabilityModal open onClose={onClose} onSaved={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /configurar depois/i }));

    expect(onClose).toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });
});
