import { Clock, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
      <DialogContent className="max-w-sm gap-5">
        <DialogHeader className="items-center space-y-2 text-center sm:text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
            <Wind className="h-5 w-5" />
          </span>
          <DialogTitle>Respire comigo</DialogTitle>
          <DialogDescription>Inspire quando o círculo crescer e solte o ar quando ele diminuir.</DialogDescription>
        </DialogHeader>

        {/* O círculo ocupa o espaço do pai: precisa de tamanho próprio. */}
        <div className="relative mx-auto aspect-square w-56 max-w-full" aria-live="polite">
          <BreathingOrb state={state} isPlaying={open} />
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Seu pedido continua na fila. Quando um psicólogo aceitar, a chamada abre sozinha.
        </p>

        <DialogClose asChild>
          <Button variant="outline" className="h-11 w-full">
            Voltar para a espera
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default SosBreathingDialog;
