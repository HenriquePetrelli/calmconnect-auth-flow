import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HabitForm from '@/components/habits/HabitForm';

describe('formulário dos novos hábitos', () => {
  it('remédio: nome obrigatório; meta = número de horários, em ordem', () => {
    const onSubmit = vi.fn();
    render(<HabitForm kind="medication" saving={false} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome do remédio.');

    fireEvent.change(screen.getByLabelText('Nome do remédio'), { target: { value: 'Sertralina' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar horário' }));
    fireEvent.change(screen.getByLabelText('Horário da dose 2'), { target: { value: '07:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'medication',
        title: 'Sertralina',
        daily_goal: 2,
        settings: { times: ['07:30', '08:00'] },
        reminders_enabled: true,
      }),
    );
  });

  it('cafeína: limite e horário do último café', () => {
    const onSubmit = vi.fn();
    render(<HabitForm kind="caffeine" saving={false} onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Limite por dia')).toHaveValue(400);
    fireEvent.change(screen.getByLabelText('Último café do dia até'), { target: { value: '15:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ daily_goal: 400, settings: { cutoff_time: '15:00' } }));
  });

  it('tela: lembrete 1 hora antes de dormir', () => {
    const onSubmit = vi.fn();
    render(<HabitForm kind="screen_time" saving={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Que horas você costuma dormir?'), { target: { value: '23:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ daily_goal: 120, reminder_start: '22:30', settings: { bedtime: '23:30' } }),
    );
  });

  it('algo que me faz bem: precisa de ao menos uma atividade', () => {
    const onSubmit = vi.fn();
    render(<HabitForm kind="joy" saving={false} onSubmit={onSubmit} />);
    for (const name of ['Ler', 'Ouvir música', 'Caminhar', 'Cozinhar']) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha ao menos uma atividade.');
    fireEvent.change(screen.getByLabelText('Outra atividade'), { target: { value: 'Tricô' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ daily_goal: 1, settings: { activities: ['Tricô'] } }));
  });

  it('refeições: um horário por refeição, com lembrete ligado', () => {
    const onSubmit = vi.fn();
    render(<HabitForm kind="meals" saving={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Horário do almoço'), { target: { value: '13:00' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Lanche' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Jantar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'meals',
        reminders_enabled: true,
        reminder_start: '00:00',
        settings: { meal_times: { breakfast: '08:00', lunch: '13:00', snack: '16:00' } },
      }),
    );
  });
});
