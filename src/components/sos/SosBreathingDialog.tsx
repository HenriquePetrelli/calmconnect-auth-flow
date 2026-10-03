import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BreathingOrb from '@/components/breathing/BreathingOrb';
import { breathingPatterns } from '@/components/breathing/BreathingPatterns';
import { useBreathingPhase } from '@/hooks/useBreathingPhase';

/**
 * Respiração dentro da tela de SOS. Antes o botão levava para /breathing, e
 * sair da tela de SOS cancela o pedido: quem tocava em "Respiração guiada"
 * enquanto esperava perdia o lugar na fila sem saber.
 */
const SosBreathingDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const pattern = breathingPatterns.emergency ?? breathingPatterns.box;
  const state = useBreathingPhase(pattern, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Respire comigo</DialogTitle>
          <DialogDescription className="text-center">
            Seu pedido continua na fila. Quando um psicólogo aceitar, a chamada abre sozinha.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <BreathingOrb state={state} isPlaying={open} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SosBreathingDialog;
