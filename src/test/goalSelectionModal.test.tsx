import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoalSelectionModal } from '@/components/goals/GoalSelectionModal';

const TEMPLATES = [
  { id: 'goal-breathing', category: 'breathing', title: 'Respiração Guiada', description: 'Respirar 5x', target: 5, type: 'count', active: true, created_at: '' },
  { id: 'goal-mood', category: 'mood', title: 'Humor Diário', description: 'Registrar humor todo dia', target: 7, type: 'daily', active: true, created_at: '' },
  { id: 'goal-journal', category: 'journal', title: 'Diário', description: 'Escrever 3x', target: 3, type: 'count', active: true, created_at: '' },
];

// Referências estáveis — literais novos a cada chamada do mock quebrariam
// efeitos que dependem desses valores.
let currentSelectedGoals: string[] = [];
let currentGoals: Array<{ id: string; goal_id: string }> = [];

const updateSelectedGoalsMock = vi.fn().mockResolvedValue(undefined);
const createGoalMock = vi.fn().mockResolvedValue(undefined);
const deleteGoalMock = vi.fn().mockResolvedValue(undefined);
const fetchDefaultGoalsMock = vi.fn().mockResolvedValue(TEMPLATES);

vi.mock('@/hooks/useWeeklyGoals', () => ({
  useWeeklyGoals: () => ({
    selectedGoals: currentSelectedGoals,
    goals: currentGoals,
    fetchDefaultGoals: fetchDefaultGoalsMock,
    updateSelectedGoals: updateSelectedGoalsMock,
    createGoal: createGoalMock,
    deleteGoal: deleteGoalMock,
  }),
  getCurrentWeekRange: () => ({ weekStart: '2026-09-06', weekEnd: '2026-09-12' }),
}));

beforeEach(() => {
  updateSelectedGoalsMock.mockClear();
  createGoalMock.mockClear();
  deleteGoalMock.mockClear();
  fetchDefaultGoalsMock.mockClear();
  currentSelectedGoals = [];
  currentGoals = [];
});

describe('GoalSelectionModal — sincroniza patient_weekly_goals ao salvar', () => {
  it('cria uma linha de progresso pra cada meta nova selecionada', async () => {
    const onGoalsAdded = vi.fn();
    render(<GoalSelectionModal open onOpenChange={() => {}} onGoalsAdded={onGoalsAdded} />);

    await waitFor(() => expect(screen.getByText('Respiração Guiada')).toBeTruthy());

    fireEvent.click(screen.getByText('Respiração Guiada'));
    fireEvent.click(screen.getByText('Humor Diário'));
    fireEvent.click(screen.getByRole('button', { name: /^salvar/i }));

    await waitFor(() => expect(updateSelectedGoalsMock).toHaveBeenCalledWith(['goal-breathing', 'goal-mood']));
    await waitFor(() => {
      expect(createGoalMock).toHaveBeenCalledWith('goal-breathing', 5, '2026-09-06', '2026-09-12');
      expect(createGoalMock).toHaveBeenCalledWith('goal-mood', 7, '2026-09-06', '2026-09-12');
    });
    expect(deleteGoalMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onGoalsAdded).toHaveBeenCalled());
  });

  it('não recria uma linha de progresso pra meta que já está sendo rastreada essa semana', async () => {
    currentSelectedGoals = ['goal-breathing'];
    currentGoals = [{ id: 'pwg-1', goal_id: 'goal-breathing' }];

    render(<GoalSelectionModal open onOpenChange={() => {}} onGoalsAdded={() => {}} />);
    await waitFor(() => expect(screen.getByText('Respiração Guiada')).toBeTruthy());

    // Mantém a seleção como está e apenas confirma.
    fireEvent.click(screen.getByRole('button', { name: /^salvar/i }));

    await waitFor(() => expect(updateSelectedGoalsMock).toHaveBeenCalledWith(['goal-breathing']));
    expect(createGoalMock).not.toHaveBeenCalled();
    expect(deleteGoalMock).not.toHaveBeenCalled();
  });

  it('remove a linha de progresso de uma meta desmarcada', async () => {
    currentSelectedGoals = ['goal-breathing', 'goal-mood'];
    currentGoals = [
      { id: 'pwg-1', goal_id: 'goal-breathing' },
      { id: 'pwg-2', goal_id: 'goal-mood' },
    ];

    render(<GoalSelectionModal open onOpenChange={() => {}} onGoalsAdded={() => {}} />);
    await waitFor(() => expect(screen.getByText('Humor Diário')).toBeTruthy());

    // Desmarca "Humor Diário", mantendo só "Respiração Guiada".
    fireEvent.click(screen.getByText('Humor Diário'));
    fireEvent.click(screen.getByRole('button', { name: /^salvar/i }));

    await waitFor(() => expect(updateSelectedGoalsMock).toHaveBeenCalledWith(['goal-breathing']));
    await waitFor(() => expect(deleteGoalMock).toHaveBeenCalledWith('pwg-2'));
    expect(createGoalMock).not.toHaveBeenCalled();
  });
});
