import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { usePatientStatistics } from "@/hooks/usePatientStatistics";

interface CompletionScreenProps {
  onViewOtherOptions: () => void;
  onBackToHome: () => void;
}

const CompletionScreen = ({ onViewOtherOptions, onBackToHome }: CompletionScreenProps) => {
  const { addActivity } = usePatientStatistics();

  useEffect(() => {
    addActivity("Respiração Guiada");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-breathing-primary/5 to-background flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-8 max-w-md">
        {/* Completion Icon */}
        <div className="flex justify-center">
          <CheckCircle 
            size={80} 
            className="text-breathing-primary animate-scale-in" 
          />
        </div>

        {/* Completion Message */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Exercício Concluído
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Parece que o exercício chegou ao fim. Esperamos que você se sinta mais calmo e centrado.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 w-full">
          <Button 
            onClick={onViewOtherOptions}
            className="w-full py-4 text-lg"
          >
            Ver outras opções
          </Button>
          
          <Button 
            variant="outline"
            onClick={onBackToHome}
            className="w-full py-4 text-lg"
          >
            Voltar ao menu
          </Button>
        </div>

        {/* Additional Message */}
        <div className="pt-4">
          <p className="text-xs text-muted-foreground">
            Pratique regularmente para melhores resultados
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompletionScreen;