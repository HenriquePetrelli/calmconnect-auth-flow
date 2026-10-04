import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PsychologistList, type PsychologistData } from '@/components/appointments/PsychologistList';

const base: PsychologistData = {
  id: 'p1',
  user_id: 'u1',
  full_name: 'Psicologo 01',
  specialization: 'Psicologia Clínica',
  crp_number: '12/345678',
  city: 'Almadina',
  state: 'BA',
  address: 'Rua A, 10',
  approved: true,
};

describe('Agendar: lista de psicólogos', () => {
  it('não mostra cidade, estado nem endereço', () => {
    render(<PsychologistList psychologists={[base]} onSelect={vi.fn()} />);
    expect(screen.getByText('Psicologo 01')).toBeInTheDocument();
    expect(screen.queryByText(/Almadina/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rua A/)).not.toBeInTheDocument();
  });

  it('mostra quantas consultas e quantos SOS o psicólogo atendeu', () => {
    render(<PsychologistList psychologists={[{ ...base, consultation_count: 12, sos_count: 1 }]} onSelect={vi.fn()} />);
    expect(screen.getByText('12 consultas')).toBeInTheDocument();
    expect(screen.getByText('1 SOS atendido')).toBeInTheDocument();
  });

  it('sem os totais do banco, mostra só as consultas do cadastro', () => {
    render(<PsychologistList psychologists={[{ ...base, total_appointments: 1 }]} onSelect={vi.fn()} />);
    expect(screen.getByText('1 consulta')).toBeInTheDocument();
    expect(screen.queryByText(/SOS/)).not.toBeInTheDocument();
  });
});
