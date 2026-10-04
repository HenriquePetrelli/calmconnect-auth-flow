import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { releaseStuckPointerLock } from '@/lib/pointerLock';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

afterEach(() => {
  vi.useRealTimers();
  document.body.style.removeProperty('pointer-events');
  document.body.innerHTML = '';
});

describe('trava de cliques depois de fechar janela', () => {
  it('libera a página quando não sobrou janela ou menu aberto', () => {
    vi.useFakeTimers();
    document.body.style.pointerEvents = 'none';
    releaseStuckPointerLock();
    vi.advanceTimersByTime(400);
    expect(document.body.style.pointerEvents).toBe('');
  });

  it('mantém a trava enquanto outra janela continua aberta', () => {
    vi.useFakeTimers();
    document.body.style.pointerEvents = 'none';
    const other = document.createElement('div');
    other.setAttribute('role', 'alertdialog');
    other.setAttribute('data-state', 'open');
    document.body.appendChild(other);
    releaseStuckPointerLock();
    vi.advanceTimersByTime(400);
    expect(document.body.style.pointerEvents).toBe('none');
  });

  it('Dialog fechado pelo estado da tela libera a trava que ficou para trás', () => {
    vi.useFakeTimers();
    const ui = (open: boolean) => (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Bloquear</DialogTitle>
          <DialogDescription>Teste</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    const { rerender } = render(ui(true));
    rerender(ui(false));
    // Simula a trava esquecida pelo menu que abriu a janela.
    document.body.style.pointerEvents = 'none';
    vi.advanceTimersByTime(400);
    expect(document.body.style.pointerEvents).toBe('');
  });
});
