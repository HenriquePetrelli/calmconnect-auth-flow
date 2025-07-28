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

const ConfirmationModal = ({ open, onOpenChange, onConfirm }: ConfirmationModalProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-sos-primary/20 flex items-center justify-center">
            <Phone className="text-sos-primary" size={32} />
          </div>
          <AlertDialogTitle className="text-2xl font-semibold">
            Você está tendo uma crise agora?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Vamos conectar você imediatamente com um psicólogo especializado para ajudá-lo(a).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 sm:flex-col">
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-sos-primary hover:bg-sos-secondary text-white font-medium py-3"
          >
            Sim, preciso de ajuda
          </AlertDialogAction>
          <AlertDialogCancel className="py-3">
            Não
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationModal;