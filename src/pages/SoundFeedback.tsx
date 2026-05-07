import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, RotateCcw, Home } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePatientStatistics } from "@/hooks/usePatientStatistics";
import { useAchievements } from "@/hooks/useAchievements";

const SoundFeedback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sound, duration, isPlaylist, totalSounds } = location.state || {};
  const { addActivity, updateActivityTime } = usePatientStatistics();
  const { checkAchievements } = useAchievements();

  useEffect(() => {
    if (sound) {
      addActivity(`Sons Terapêuticos: ${sound.name}`);
      updateActivityTime('sound', parseInt(duration) || 10);
      checkAchievements();
    }
  }, []);

  const handleListenOther = () => {
    navigate('/sounds');
  };

  const handleBackToMenu = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/5 flex items-center justify-center p-6">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Sessão Concluída!
            </h1>
            <p className="text-muted-foreground">
              Como você está se sentindo?
            </p>
          </div>

          {/* Session Summary */}
          {sound && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Você ouviu:</p>
              <p className="font-medium text-foreground">{sound.name}</p>
              {isPlaylist && (
                <p className="text-sm text-muted-foreground">
                  Playlist concluída — {totalSounds || 1} {(totalSounds || 1) === 1 ? 'som ouvido' : 'sons ouvidos'}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Duração: {(() => {
                  const d = parseFloat(duration);
                  if (isNaN(d)) return `${duration} minutos`;
                  if (d < 1) {
                    const sec = Math.round(d * 60);
                    return `${sec} ${sec === 1 ? 'segundo' : 'segundos'}`;
                  }
                  return `${d} ${d === 1 ? 'minuto' : 'minutos'}`;
                })()}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button 
              onClick={handleListenOther}
              className="w-full bg-sounds-primary hover:bg-sounds-secondary"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Ouvir Outras Opções
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleBackToMenu}
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Voltar ao Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SoundFeedback;