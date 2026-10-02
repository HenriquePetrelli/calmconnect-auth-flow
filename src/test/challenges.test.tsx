import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GoalCard } from '@/components/goals/GoalCard';
import { CHALLENGES, currentStep, daysLeftInWeek, isChallenge, stepDoneToday } from '@/lib/challenges';
import type { PatientWeeklyGoal } from '@/hooks/useWeeklyGoals';

const goal = (progress: number, updated_at: string): PatientWeeklyGoal => ({
  id: 'pg1',
  user_id: 'u',
  goal_id: 'g1',
  target: 7,
  progress,
  completed: progress >= 7,
  week_start_date: '2026-10-04',
  week_end_date: '2026-10-10',
  created_at: '2026-10-04T10:00:00Z',
  updated_at,
  weekly_goals: {
    id: 'g1',
    category: 'challenge_sleep',
    title: 'Desafio: 7 dias para dormir melhor',
    description: 'Um passo por dia',
    type: 'challenge',
    target: 7,
    active: true,
    created_at: '2026-10-01T00:00:00Z',
  },
});

describe('desafios de 7 dias', () => {
  it('todos os desafios têm 7 passos', () => {
    for (const steps of Object.values(CHALLENGES)) expect(steps).toHaveLength(7);
  });

  it('passo atual, um por dia e dias restantes na semana', () => {
    expect(currentStep('challenge_sleep', 0)?.step.title).toBe('Horário fixo para acordar');
    expect(currentStep('challenge_sleep', 7)).toBeNull();
    const now = new Date(2026, 9, 7, 15); // quarta
    expect(stepDoneToday(1, new Date(2026, 9, 7, 9).toISOString(), now)).toBe(true);
    expect(stepDoneToday(1, new Date(2026, 9, 6, 9).toISOString(), now)).toBe(false);
    expect(stepDoneToday(0, new Date(2026, 9, 7, 9).toISOString(), now)).toBe(false);
    expect(daysLeftInWeek(new Date(2026, 9, 4))).toBe(7); // domingo
    expect(daysLeftInWeek(now)).toBe(4);
    expect(isChallenge({ type: 'challenge', category: 'x' })).toBe(true);
    expect(isChallenge({ type: 'count', category: 'breathing' })).toBe(false);
  });

  it('mostra o passo do dia e marca como feito', () => {
    const onStepDone = vi.fn();
    render(
      <MemoryRouter>
        <GoalCard goal={goal(2, '2020-01-01T00:00:00Z')} onStepDone={onStepDone} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Dia 3 de 7')).toBeInTheDocument();
    expect(screen.getByText('Uma hora sem tela')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fiz o passo de hoje' }));
    expect(onStepDone).toHaveBeenCalled();
  });

  it('depois do passo de hoje, mostra o de amanhã sem botão', () => {
    render(
      <MemoryRouter>
        <GoalCard goal={goal(3, new Date().toISOString())} onStepDone={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Passo de hoje feito/)).toHaveTextContent('Quarto para dormir');
    expect(screen.queryByRole('button', { name: 'Fiz o passo de hoje' })).not.toBeInTheDocument();
  });
});
