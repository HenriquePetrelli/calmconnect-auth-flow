import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoodTrendChart } from '@/components/progress/MoodTrendChart';

let currentEntries: Array<{ date: string; value: number }> = [];
let currentLoading = false;
let currentAverage: number | null = null;
let currentTrend: 'up' | 'down' | 'stable' | null = null;

vi.mock('@/hooks/usePatientMoodHistory', () => ({
  usePatientMoodHistory: () => ({
    entries: currentEntries,
    loading: currentLoading,
    average: currentAverage,
    trend: currentTrend,
  }),
}));

beforeEach(() => {
  currentEntries = [];
  currentLoading = false;
  currentAverage = null;
  currentTrend = null;
});

describe('MoodTrendChart', () => {
  it('mostra o estado vazio quando não há histórico', () => {
    render(<MoodTrendChart />);
    expect(screen.getByText('Ainda sem histórico de humor')).toBeTruthy();
  });

  it('mostra skeleton enquanto carrega', () => {
    currentLoading = true;
    const { container } = render(<MoodTrendChart />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
    expect(screen.queryByText('Ainda sem histórico de humor')).toBeNull();
  });

  it('mostra a média e a tendência quando há histórico suficiente', () => {
    currentEntries = [
      { date: '2026-08-25', value: 2 },
      { date: '2026-08-27', value: 3 },
      { date: '2026-08-29', value: 4 },
      { date: '2026-09-01', value: 5 },
    ];
    currentAverage = 3.5;
    currentTrend = 'up';

    render(<MoodTrendChart />);

    expect(screen.getByText('3.5/5')).toBeTruthy();
    expect(screen.getByText('Seu humor está melhorando')).toBeTruthy();
    expect(screen.queryByText('Ainda sem histórico de humor')).toBeNull();
  });
});
