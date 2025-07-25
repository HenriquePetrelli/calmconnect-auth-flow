import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GuidedBreathing = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [cycleCount, setCycleCount] = useState(0);

  const phrases = [
    "Inspire... Isso vai passar",
    "Expire... Você está seguro",
    "Inspire... Você é forte",
    "Expire... Deixe a tensão ir embora",
    "Inspire... Um momento de cada vez",
    "Expire... Você consegue superar isso",
  ];

  const [currentPhrase, setCurrentPhrase] = useState(phrases[0]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setPhase(prev => {
          const newPhase = prev === 'inhale' ? 'exhale' : 'inhale';
          if (newPhase === 'inhale') {
            setCycleCount(c => c + 1);
            setCurrentPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
          }
          return newPhase;
        });
      }, 4000); // 4 seconds for each phase
    }

    return () => clearInterval(interval);
  }, [isPlaying]);

  const toggleBreathing = () => {
    setIsPlaying(!isPlaying);
  };

  const resetBreathing = () => {
    setIsPlaying(false);
    setPhase('inhale');
    setCycleCount(0);
    setCurrentPhrase(phrases[0]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Respiração Guiada</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
        {/* Breathing Circle Animation */}
        <div className="relative flex items-center justify-center">
          <div
            className={`w-48 h-48 rounded-full bg-primary/20 border-4 border-primary transition-all duration-4000 ease-in-out ${
              isPlaying
                ? phase === 'inhale'
                  ? 'scale-150'
                  : 'scale-100'
                : 'scale-100'
            }`}
          >
            <div className="absolute inset-4 rounded-full bg-primary/30 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-medium text-primary">
                  {isPlaying ? (phase === 'inhale' ? 'Inspire' : 'Expire') : 'Pronto?'}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {cycleCount} ciclos
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Phrase */}
        <div className="text-center max-w-sm">
          <p className="text-lg text-foreground font-medium leading-relaxed">
            {currentPhrase}
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          <Button
            onClick={toggleBreathing}
            className="flex items-center gap-2 px-8 py-3 text-lg"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            {isPlaying ? 'Pausar' : 'Começar'}
          </Button>
          
          <Button
            variant="outline"
            onClick={resetBreathing}
            className="flex items-center gap-2 px-4 py-3"
          >
            <RotateCcw size={18} />
            Reiniciar
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-muted-foreground max-w-md">
          <p>Siga o ritmo do círculo. Inspire quando ele cresce, expire quando ele diminui.</p>
        </div>
      </div>
    </div>
  );
};

export default GuidedBreathing;