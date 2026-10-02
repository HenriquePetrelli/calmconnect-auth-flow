import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { changeSincePrevious, dueInstruments, severityFor, type Screening } from '@/lib/screenings';

const save = vi.fn();
const setShared = vi.fn().mockResolvedValue(undefined);
let history: Screening[] = [];
vi.mock('@/hooks/useScreenings', () => ({
  useScreenings: () => ({ history, loading: false, error: false, save, setShared }),
}));
vi.mock('@/components/PageHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('@/components/PatientBottomNav', () => ({ default: () => <div /> }));

import QuestionnaireForm from '@/pages/QuestionnaireForm';

const screening = (over: Partial<Screening>): Screening => ({
  id: 's1',
  instrument: 'phq9',
  answers: [],
  score: 0,
  severity: 'minimal',
  self_harm_flag: false,
  shared_with_psychologist: false,
  created_at: '2026-09-01T12:00:00Z',
  ...over,
});

const answerAll = (optionLabel: string, lastLabel = optionLabel) => {
  const groups = screen.getAllByRole('radiogroup');
  groups.forEach((group, i) => {
    fireEvent.click(within(group).getByRole('radio', { name: i === groups.length - 1 ? lastLabel : optionLabel }));
  });
};

beforeEach(() => {
  history = [];
  save.mockReset();
});

describe('questionários: regras', () => {
  it('faixas de gravidade iguais às do banco', () => {
    expect(severityFor('gad7', 4)).toBe('minimal');
    expect(severityFor('gad7', 10)).toBe('moderate');
    expect(severityFor('gad7', 15)).toBe('severe');
    expect(severityFor('phq9', 19)).toBe('moderately_severe');
    expect(severityFor('phq9', 20)).toBe('severe');
  });

  it('um por mês: pendente sem histórico ou depois de 28 dias', () => {
    const now = new Date('2026-10-02T12:00:00Z');
    expect(dueInstruments([], now)).toEqual(['gad7', 'phq9']);
    expect(dueInstruments([{ instrument: 'gad7', created_at: '2026-09-20T12:00:00Z' }], now)).toEqual(['phq9']);
    expect(dueInstruments([{ instrument: 'gad7', created_at: '2026-09-04T12:00:00Z' }], now)).toEqual(['gad7', 'phq9']);
  });

  it('melhora relevante: 5 pontos ou mais', () => {
    const old = screening({ id: 'a', score: 15, created_at: '2026-08-01T00:00:00Z' });
    const now = screening({ id: 'b', score: 9, created_at: '2026-09-01T00:00:00Z' });
    expect(changeSincePrevious(now, [old, now])).toEqual({ delta: -6, meaningful: true });
  });
});

describe('questionários: tela', () => {
  const renderForm = (instrument: string) =>
    render(
      <MemoryRouter initialEntries={[`/questionarios/${instrument}`]}>
        <Routes>
          <Route path="/questionarios/:instrument" element={<QuestionnaireForm />} />
        </Routes>
      </MemoryRouter>,
    );

  it('só envia com todas as perguntas respondidas e mostra o resultado', async () => {
    save.mockResolvedValue(screening({ id: 'n1', instrument: 'gad7', score: 7, severity: 'mild', answers: [1, 1, 1, 1, 1, 1, 1] }));
    renderForm('gad7');
    const submit = screen.getByRole('button', { name: 'Ver meu resultado' });
    expect(submit).toBeDisabled();
    answerAll('Vários dias');
    fireEvent.click(submit);
    await waitFor(() => expect(save).toHaveBeenCalledWith('gad7', [1, 1, 1, 1, 1, 1, 1]));
    expect(await screen.findByText('Leves')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('pergunta 9 positiva: mostra apoio imediato (CVV e SOS)', async () => {
    save.mockResolvedValue(
      screening({ id: 'n2', score: 10, severity: 'moderate', self_harm_flag: true, answers: [1, 1, 1, 1, 1, 1, 1, 1, 2] }),
    );
    renderForm('phq9');
    answerAll('Vários dias', 'Mais da metade dos dias');
    fireEvent.click(screen.getByRole('button', { name: 'Ver meu resultado' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Você não está sozinho(a)');
    expect(alert).toHaveTextContent('188');
    expect(screen.getByRole('button', { name: 'Abrir o SOS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agendar consulta' })).toBeInTheDocument();
  });
});
