import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VacationModal from '@/components/psychologist/VacationModal';

describe('Férias com consultas marcadas', () => {
  it('mostra as consultas do período e cancela junto (com aviso aos pacientes)', async () => {
    const setVacation = vi.fn().mockResolvedValue(true);
    const checkConflicts = vi.fn().mockResolvedValue([
      { id: 'a1', starts_at: '2030-02-03T17:00:00.000Z', status: 'scheduled', patient_name: 'Ana' },
    ]);
    render(
      <VacationModal
        open
        onClose={vi.fn()}
        activeVacation={null}
        upcomingVacation={null}
        saving={false}
        setVacation={setVacation}
        checkConflicts={checkConflicts}
        cancelVacation={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2030-02-01' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2030-02-10' } });

    const box = await screen.findByTestId('vacation-conflicts');
    expect(box.textContent).toContain('1 consulta nesse período');
    expect(box.textContent).toContain('Ana');
    fireEvent.click(screen.getByRole('button', { name: /agendar férias/i }));
    expect(setVacation).toHaveBeenCalledWith('2030-02-01', '2030-02-10', true);
  });

  it('desmarcando, as consultas ficam e o psicólogo é avisado disso', async () => {
    const setVacation = vi.fn().mockResolvedValue(true);
    const checkConflicts = vi.fn().mockResolvedValue([
      { id: 'a1', starts_at: '2030-02-03T17:00:00.000Z', status: 'pending', patient_name: null },
    ]);
    render(
      <VacationModal
        open
        onClose={vi.fn()}
        activeVacation={null}
        upcomingVacation={null}
        saving={false}
        setVacation={setVacation}
        checkConflicts={checkConflicts}
        cancelVacation={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2030-02-01' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2030-02-10' } });
    await screen.findByTestId('vacation-conflicts');
    fireEvent.click(screen.getByRole('checkbox', { name: /cancelar essas consultas/i }));
    expect(screen.getByText(/continuam marcadas/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /agendar férias/i }));
    expect(setVacation).toHaveBeenCalledWith('2030-02-01', '2030-02-10', false);
  });
});
