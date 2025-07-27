import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import Lottie from "lottie-react";
import lotusAnimation from "@/assets/lotus-animation.json";

interface Technique {
  id: string;
  name: string;
  description: string;
  duration: string;
  difficulty: 'basic' | 'advanced' | 'emergency';
  category: string;
  icon: string;
  instructions?: string;
}

interface PracticeScreenProps {
  technique: Technique;
  onBack: () => void;
  onComplete: () => void;
}

const motivationalPhrases = [
  "Um passo de cada vez",
  "Você não está sozinho(a)",
  "Isso vai passar",
  "Você é mais forte do que imagina",
  "Respire e encontre a calma",
  "Este momento é temporário"
];

const animations = [
  { id: 'lotus', name: 'Flor de Lótus', icon: '🪷' },
  { id: 'waves', name: 'Ondas do Mar', icon: '🌊' },
  { id: 'clouds', name: 'Nuvens', icon: '☁️' },
  { id: 'circle', name: 'Círculo Suave', icon: '⭕' }
];

const PracticeScreen = ({ technique, onBack, onComplete }: PracticeScreenProps) => {
  const [duration, setDuration] = useState([5]);
  const [selectedPhrase, setSelectedPhrase] = useState(motivationalPhrases[0]);
  const [selectedAnimation, setSelectedAnimation] = useState(animations[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'setup' | 'preparation' | 'exercise' | 'completed'>('setup');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [cyclePhase, setCyclePhase] = useState<'inhale' | 'exhale'>('inhale');
  const [preparationTime, setPreparationTime] = useState(5);
  const [cycleProgress, setCycleProgress] = useState(0);
  const [inhaleTime] = useState(4); // Tempo de inspiração em segundos
  const [exhaleTime] = useState(6); // Tempo de expiração em segundos
  const lottieRef = useRef<any>(null);

  // Timer principal da sessão
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (currentPhase === 'preparation' && preparationTime > 0) {
      interval = setInterval(() => {
        setPreparationTime(prev => {
          if (prev <= 1) {
            setCurrentPhase('exercise');
            setTimeRemaining(duration[0] * 60);
            setIsPlaying(true);
            setCycleProgress(0);
            setCyclePhase('inhale');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    if (currentPhase === 'exercise' && isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setCurrentPhase('completed');
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [currentPhase, preparationTime, timeRemaining, isPlaying, duration, onComplete]);

  // Controle do ciclo de respiração
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentPhase === 'exercise' && isPlaying) {
      interval = setInterval(() => {
        const currentTime = Date.now() / 1000;
        const totalCycleTime = inhaleTime + exhaleTime;
        const cycleTime = currentTime % totalCycleTime;
        
        if (cycleTime < inhaleTime) {
          // Durante inspiração: flor abre (0 a 1), barra 0 a 100
          setCyclePhase('inhale');
          const progress = (cycleTime / inhaleTime) * 100;
          const lottieProgress = cycleTime / inhaleTime; // 0 a 1 (flor abre)
          updateLottieAnimation(lottieProgress);
          setCycleProgress(progress);
        } else {
          // Durante expiração: flor fecha (1 a 0), barra 100 a 0
          setCyclePhase('exhale');
          const exhaleElapsed = cycleTime - inhaleTime;
          const progress = 100 - ((exhaleElapsed / exhaleTime) * 100);
          const lottieProgress = 1 - (exhaleElapsed / exhaleTime); // 1 a 0 (flor fecha)
          updateLottieAnimation(lottieProgress);
          setCycleProgress(progress);
        }
      }, 100);
    }

    return () => clearInterval(interval);
  }, [currentPhase, isPlaying, inhaleTime, exhaleTime]);

  const updateLottieAnimation = (progress: number) => {
    if (lottieRef.current && selectedAnimation.id === 'lotus') {
      const totalFrames = lottieRef.current.getDuration(true);
      const frame = progress * totalFrames;
      lottieRef.current.goToAndStop(frame, true);
    }
  };

  const handleStart = () => {
    setCurrentPhase('preparation');
    setPreparationTime(5);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentPhase('setup');
    setTimeRemaining(duration[0] * 60);
    setCyclePhase('inhale');
    setPreparationTime(5);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnimationClass = () => {
    if (currentPhase !== 'exercise' || !isPlaying) return 'scale-100';
    
    switch (selectedAnimation.id) {
      case 'lotus':
        return cyclePhase === 'inhale' ? 'scale-150 rotate-12' : 'scale-100 rotate-0';
      case 'waves':
        return cyclePhase === 'inhale' ? 'scale-125 translate-y-2' : 'scale-100 translate-y-0';
      case 'clouds':
        return cyclePhase === 'inhale' ? 'scale-140 opacity-80' : 'scale-100 opacity-100';
      default:
        return cyclePhase === 'inhale' ? 'scale-150' : 'scale-100';
    }
  };

  if (currentPhase === 'preparation') {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-breathing-primary/10 backdrop-blur-sm"></div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">{technique.icon}</div>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Prepare-se...</h2>
            <div className="text-4xl font-bold text-breathing-primary mb-2">{preparationTime}</div>
            <p className="text-muted-foreground">Encontre uma posição confortável</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentPhase === 'exercise') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">{technique.name}</h1>
          <div className="w-8"></div> {/* Spacer para centralizar o título */}
        </div>

        {/* Animation Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
          {/* Lottie Animation */}
          <div className="relative flex items-center justify-center">
            {selectedAnimation.id === 'lotus' ? (
              <div className="w-64 h-64">
                <Lottie
                  lottieRef={lottieRef}
                  animationData={lotusAnimation}
                  loop={false}
                  autoplay={false}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="w-64 h-64 flex items-center justify-center">
                <div
                  className={`w-48 h-48 rounded-full bg-breathing-primary/20 border-4 border-breathing-primary transition-all duration-[4000ms] ease-in-out ${getAnimationClass()}`}
                >
                  <div className="absolute inset-4 rounded-full bg-breathing-primary/30 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">{selectedAnimation.icon}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Motivational Phrase */}
          <div className="text-center max-w-sm">
            <p className="text-lg text-foreground font-medium leading-relaxed">
              {selectedPhrase}
            </p>
          </div>

          {/* Enhanced Progress Bar with Internal Labels */}
          <div className="w-full max-w-sm space-y-4">
            <div className="relative">
              <div className="relative h-16 bg-secondary rounded-lg overflow-hidden">
                <div 
                  className="h-full bg-breathing-primary transition-all duration-300 ease-out flex items-center justify-center"
                  style={{ width: `${cycleProgress}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium text-white mix-blend-difference">
                    {cyclePhase === 'inhale' ? 'Inspirar' : 'Expirar'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="text-center">
            <div className="text-2xl font-mono text-foreground">
              {formatTime(timeRemaining)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Tempo restante</p>
          </div>

          {/* Controls */}
          <div className="flex gap-4">
            <Button
              onClick={togglePlayPause}
              className="flex items-center gap-2 px-8 py-3 text-lg"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              {isPlaying ? 'Pausar' : 'Retomar'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-3"
            >
              <RotateCcw size={18} />
              Reiniciar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">{technique.name}</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* Technique Info */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-4">{technique.icon}</div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">{technique.name}</h2>
            <p className="text-muted-foreground mb-4">{technique.description}</p>
            {technique.instructions && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-foreground">{technique.instructions}</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Duration */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Duração: {duration[0]} minuto{duration[0] !== 1 ? 's' : ''}
            </label>
            <Slider
              value={duration}
              onValueChange={setDuration}
              max={20}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          {/* Motivational Phrase */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Frase Motivacional</label>
            <Select value={selectedPhrase} onValueChange={setSelectedPhrase}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {motivationalPhrases.map((phrase) => (
                  <SelectItem key={phrase} value={phrase}>
                    {phrase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Animation */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Animação</label>
            <Select 
              value={selectedAnimation.id} 
              onValueChange={(value) => setSelectedAnimation(animations.find(a => a.id === value) || animations[0])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {animations.map((animation) => (
                  <SelectItem key={animation.id} value={animation.id}>
                    {animation.icon} {animation.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4">
          <Button 
            onClick={handleStart}
            className="w-full flex items-center gap-2 py-4 text-lg"
          >
            <Play size={24} />
            Começar ({duration[0]} min)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PracticeScreen;