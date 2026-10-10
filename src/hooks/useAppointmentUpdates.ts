import { useEffect, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

/** Intervalo mínimo entre duas atualizações ao voltar para o app. */
const MIN_INTERVAL_MS = 20_000;

/**
 * Mantém as listas de consultas em dia sem recarregar a página.
 *
 * Antes, o paciente só via "Consulta confirmada" (ou a proposta de novo
 * horário) recarregando a tela, e o psicólogo só via um pedido novo do
 * mesmo jeito. Toda mudança de consulta gera um aviso (sino) para a outra
 * pessoa, e os avisos já chegam em tempo real: quando chega um aviso de
 * consulta, a lista é buscada de novo. Também atualiza ao voltar para o app.
 */
export const useAppointmentUpdates = (refetch: () => void | Promise<unknown>) => {
  const { notifications, loading } = useNotifications();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const seenRef = useRef<Set<string> | null>(null);
  const lastRunRef = useRef(0);

  const run = () => {
    lastRunRef.current = Date.now();
    void refetchRef.current();
  };

  // Aviso novo de consulta (pedido, confirmação, proposta, cancelamento...).
  useEffect(() => {
    if (loading) return;
    const ids = notifications.filter((n) => n.appointment_id).map((n) => n.id);
    const seen = seenRef.current;
    seenRef.current = new Set(ids);
    if (!seen) return; // primeira leitura: o que já existia não conta
    if (ids.some((id) => !seen.has(id))) run();
  }, [notifications, loading]);

  // Voltou para o app (outra aba, tela desbloqueada, internet de volta).
  useEffect(() => {
    const onWake = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (Date.now() - lastRunRef.current < MIN_INTERVAL_MS) return;
      run();
    };
    lastRunRef.current = Date.now();
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => {
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, []);
};
