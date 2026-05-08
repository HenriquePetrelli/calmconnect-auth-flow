import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, RotateCcw, Home, Clock } from "lucide-react";
import { usePatientStatistics } from "@/hooks/usePatientStatistics";
import { useAchievements } from "@/hooks/useAchievements";

interface CompletionScreenProps {
  onViewOtherOptions: () => void;
  onBackToHome: () => void;
  duration?: number; // duration in minutes
  techniqueName?: string;
}

const CompletionScreen = ({
  onViewOtherOptions,
  onBackToHome,
  duration = 5,
  techniqueName,
}: CompletionScreenProps) => {
  const { addActivity, updateActivityTime } = usePatientStatistics();
  const { checkAchievements } = useAchievements();

  useEffect(() => {
    addActivity("Respiração Guiada");
    updateActivityTime("breathing", duration);
    checkAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDuration = () => {
    if (duration < 1) {
      const sec = Math.round(duration * 60);
      return `${sec} ${sec === 1 ? "segundo" : "segundos"}`;
    }
    return `${duration} ${duration === 1 ? "minuto" : "minutos"}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/5 flex items-center justify-center p-6">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Sessão Concluída!</h1>
            <p className="text-muted-foreground">
              Esperamos que você se sinta mais calmo e centrado.
            </p>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            {techniqueName && (
              <>
                <p className="text-sm text-muted-foreground">Você praticou:</p>
                <p className="font-medium text-foreground">{techniqueName}</p>
              </>
            )}
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Duração: {formatDuration()}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button onClick={onViewOtherOptions} className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Ver outras técnicas
            </Button>

            <Button variant="outline" onClick={onBackToHome} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Voltar ao menu
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Pratique regularmente para melhores resultados
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletionScreen;
