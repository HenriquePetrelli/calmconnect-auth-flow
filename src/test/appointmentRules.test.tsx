import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { notificationsState, toastMock, invokeMock } = vi.hoisted(() => ({
  notificationsState: { notifications: [] as Array<{ id: string; appointment_id?: string | null }>, loading: false },
  toastMock: vi.fn(),
  invokeMock: vi.fn(),
}));

vi.mock('@/hooks/useNotifications', () => ({ useNotifications: () => notificationsState }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }), toast: toastMock }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

import { useAppointmentUpdates } from '@/hooks/useAppointmentUpdates';
import { useAppointments } from '@/hooks/useAppointments';

beforeEach(() => {
  notificationsState.notifications = [{ id: 'n-old', appointment_id: 'a-1' }];
  notificationsState.loading = false;
  toastMock.mockReset();
  invokeMock.mockReset();
  invokeMock.mockResolvedValue({ data: [], error: null });
});

describe('Consultas — lista em dia sem recarregar', () => {
  it('busca de novo quando chega um aviso de consulta, não pelos avisos que já existiam', () => {
    const refetch = vi.fn();
    const { rerender } = renderHook(() => useAppointmentUpdates(refetch));
    expect(refetch).not.toHaveBeenCalled();

    notificationsState.notifications = [{ id: 'n-new', appointment_id: 'a-1' }, ...notificationsState.notifications];
    rerender();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('aviso que não é de consulta não dispara nada', () => {
    const refetch = vi.fn();
    const { rerender } = renderHook(() => useAppointmentUpdates(refetch));
    notificationsState.notifications = [{ id: 'n-chat', appointment_id: null }, ...notificationsState.notifications];
    rerender();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('ao voltar para o app depois de um tempo, atualiza', () => {
    vi.useFakeTimers();
    try {
      const refetch = vi.fn();
      renderHook(() => useAppointmentUpdates(refetch));
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });
      expect(refetch).not.toHaveBeenCalled(); // acabou de carregar
      vi.advanceTimersByTime(25_000);
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });
      expect(refetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Consultas — pedido sem duplicar', () => {
  it('manda o id do pedido e deixa o aviso de sucesso para a tela', async () => {
    const { result } = renderHook(() => useAppointments());
    invokeMock.mockResolvedValueOnce({ data: { appointment: { id: 'req-1' }, message: 'ok' }, error: null });

    await act(async () => {
      await result.current.createAppointment('psi-1', '2030-01-10T13:00:00.000Z', 50, 'regular', undefined, 'req-1');
    });

    const post = invokeMock.mock.calls.find(([, opts]) => (opts as { body?: unknown })?.body);
    expect((post?.[1] as { body: Record<string, unknown> }).body).toMatchObject({ request_id: 'req-1' });
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Consulta solicitada' }));
  });
});
