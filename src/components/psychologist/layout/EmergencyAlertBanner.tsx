import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import LifeRingIcon from '@/components/icons/LifeRingIcon';
import { usePsychologistEmergency } from '@/hooks/usePsychologistEmergency';
import { PSYCHOLOGIST_HOME } from './psychologistNav';

/**
 * Pedido de SOS esperando, visto de qualquer tela do psicólogo (fora do Início,
 * onde a fila já aparece). Só é montado com o psicólogo online, para não
 * buscar a fila à toa.
 */
const EmergencyAlertBanner = () => {
  const navigate = useNavigate();
  const { emergencyRequests } = usePsychologistEmergency();
  const pending = emergencyRequests.filter((request) => request.status === 'pending').length;
  if (pending === 0) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(PSYCHOLOGIST_HOME)}
      className="flex w-full items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-left transition-colors hover:bg-destructive/15"
      role="alert"
    >
      <LifeRingIcon className="h-8 w-8 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">
          {pending === 1 ? '1 pedido de SOS esperando' : `${pending} pedidos de SOS esperando`}
        </span>
        <span className="block text-xs text-muted-foreground">Toque para ver e aceitar no Início</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
};

export default EmergencyAlertBanner;
