import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Wind } from 'lucide-react';

const addActivity = vi.fn();
const updateActivityTime = vi.fn();
vi.mock('@/hooks/usePatientStatistics', () => ({ usePatientStatistics: () => ({ addActivity, updateActivityTime }) }));
vi.mock('@/hooks/useAchievements', () => ({ useAchievements: () => ({ checkAchievements: vi.fn() }) }));
vi.mock('@/components/PageHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('@/components/PatientBottomNav', () => ({ default: () => <div /> }));

import PracticeScreen from '@/components/breathing/PracticeScreen';
import CompletionScreen from '@/components/breathing/CompletionScreen';
import SoundFeedback from '@/pages/SoundFeedback';

const technique = {
  id: '4-7-8',
  name: 'Respiração 4-7-8',
  description: '',
  duration: '5-10 min',
  difficulty: 'basic' as const,
  category: 'Relaxamento',
  icon: Wind,
  iconBg: '',
};

beforeEach(() => {
  addActivity.mockClear();
  updateActivityTime.mockClear();
  sessionStorage.clear();
});

describe('respiração: tempo pelo relógio de verdade', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => vi.useRealTimers());

  const startPractice = (onComplete: (m: number) => void) => {
    render(<PracticeScreen technique={technique} onBack={() => {}} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /Começar prática \(5 min\)/ }));
    act(() => {
      vi.advanceTimersByTime(5000); // preparação
    });
  };

  it('com a tela apagada (sem tiques), a sessão termina na hora certa ao voltar', () => {
    const onComplete = vi.fn();
    startPractice(onComplete);
    // O celular apagou: o relógio anda 5 min e 10 s sem nenhum tique do app.
    act(() => {
      vi.setSystemTime(Date.now() + 310_000);
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(5);
  });

  it('"Terminar agora" conta os minutos feitos', () => {
    const onComplete = vi.fn();
    startPractice(onComplete);
    act(() => {
      vi.advanceTimersByTime(150_000); // 2 min e 30 s
    });
    fireEvent.click(screen.getByRole('button', { name: 'Terminar agora' }));
    expect(onComplete).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: 'Terminar agora' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('respiração: registro', () => {
  it('conta uma vez, só com 1 minuto ou mais', () => {
    const { unmount } = render(<CompletionScreen onViewOtherOptions={() => {}} onBackToHome={() => {}} duration={0} />);
    expect(screen.getByText(/menos de 1 minuto/)).toBeInTheDocument();
    expect(addActivity).not.toHaveBeenCalled();
    unmount();
    render(<CompletionScreen onViewOtherOptions={() => {}} onBackToHome={() => {}} duration={3} />);
    expect(addActivity).toHaveBeenCalledTimes(1);
    expect(updateActivityTime).toHaveBeenCalledWith('breathing', 3);
  });
});

describe('sons: "Como você se sente?"', () => {
  const renderFeedback = (state: Record<string, unknown>) =>
    render(
      <MemoryRouter initialEntries={[{ pathname: '/sounds/feedback', state }]}>
        <Routes>
          <Route path="/sounds/feedback" element={<SoundFeedback />} />
        </Routes>
      </MemoryRouter>,
    );

  it('voltar a esta tela (ou recarregar) não soma o tempo de novo', () => {
    const state = { sound: { id: 'rain', name: 'Chuva' }, duration: '10', sessionId: 's-1' };
    const first = renderFeedback(state);
    first.unmount();
    renderFeedback(state);
    expect(updateActivityTime).toHaveBeenCalledTimes(1);
    expect(updateActivityTime).toHaveBeenCalledWith('sound', 10);
  });

  it('sessão curta (menos de 1 minuto) não conta', () => {
    renderFeedback({ sound: { id: 'rain', name: 'Chuva' }, duration: '0', sessionId: 's-2' });
    expect(updateActivityTime).not.toHaveBeenCalled();
  });
});
