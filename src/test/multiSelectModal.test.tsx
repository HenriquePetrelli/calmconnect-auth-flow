import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import MultiSelectModal from '@/components/ui/multi-select-modal';
import { SINTOMAS, SINTOMA_GRUPOS } from '@/data/sintomas';

const Harness = ({ onChange }: { onChange: (v: string[]) => void }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  return (
    <MultiSelectModal
      options={[...SINTOMAS]}
      groups={SINTOMA_GRUPOS}
      selectedValues={selected}
      onSelectionChange={(v) => {
        setSelected(v);
        onChange(v);
      }}
      placeholder="Escolher sintomas"
      title="O que você tem sentido?"
      noun={['sintoma', 'sintomas']}
      isOpen={open}
      onOpenChange={setOpen}
    />
  );
};

describe('escolha de sintomas', () => {
  it('agrupa, busca sem acento, confirma e mostra a contagem', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escolher sintomas' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Sono')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Buscar'), { target: { value: 'palpitacoes' } });
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(1);
    fireEvent.click(within(dialog).getByText('Palpitações ou coração acelerado'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    expect(onChange).toHaveBeenLastCalledWith(['Palpitações ou coração acelerado']);
    expect(screen.getByRole('button', { name: '1 sintoma selecionado' })).toBeInTheDocument();
  });

  it('chip removido fora da janela não volta marcado ao reabrir', () => {
    render(<Harness onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escolher sintomas' }));
    fireEvent.click(screen.getByText('Fadiga fácil'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover Fadiga fácil' }));

    fireEvent.click(screen.getByRole('button', { name: 'Escolher sintomas' }));
    expect(within(screen.getByRole('dialog')).queryAllByRole('checkbox', { checked: true })).toHaveLength(0);
  });
});
