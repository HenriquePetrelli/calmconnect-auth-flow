import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Phone } from "lucide-react";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Confirmação em tela cheia antes de acionar o SOS de verdade (Fase 1,
 * pergunta 4 / Fase 6b do plano de identidade visual) — o toque no botão
 * de SOS não aciona a emergência no primeiro toque, abre esta tela.
 */
const ConfirmationModal = ({ open, onOpenChange, onConfirm }: ConfirmationModalProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="fixed inset-0 top-0 left-0 z-50 flex h-full w-full max-w-none translate-x-0 translate-y-0 flex-col items-center justify-center gap-8 rounded-none border-0 bg-calm p-8 shadow-none duration-200 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0"
      >
        <AlertDialogHeader className="items-center text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-sos-primary/20 flex items-center justify-center">
            <Phone className="text-sos-primary" size={40} />
          </div>
          <AlertDialogTitle className="text-3xl font-semibold">
            Você está tendo uma crise agora?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-lg text-muted-foreground max-w-sm">
            Vamos conectar você imediatamente com um psicólogo especializado para ajudá-lo(a).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="w-full max-w-sm flex-col gap-3 sm:flex-col">
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full h-14 text-lg bg-sos-primary hover:bg-sos-secondary text-white font-medium"
          >
            Sim, preciso de ajuda
          </AlertDialogAction>
          <AlertDialogCancel className="w-full h-14 text-lg mt-0">
            Não
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationModal;
