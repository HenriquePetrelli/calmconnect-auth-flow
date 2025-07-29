import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Pause, RotateCcw, Waves, Wind, Heart } from "lucide-react";
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

// Padrões de respiração por técnica
const breathingPatterns = {
  '1': { // Respiração 4-7-8
    inhale: 4,
    hold: 7,
    exhale: 8,
    pause: 0,
    type: 'hold-breathing'
  },
  '2': { // Respiração Tática
    inhale: 4,
    hold: 4,
    exhale: 4,
    pause: 0,
    type: 'tactical-breathing'
  },
  '3': { // Respiração Profunda
    inhale: 4,
    hold: 0,
    exhale: 6,
    pause: 0,
    type: 'deep-breathing'
  },
  '4': { // Respiração de Emergência
    inhale: 2,
    hold: 1,
    exhale: 3,
    pause: 0,
    type: 'emergency-breathing'
  },
  '5': { // Respiração Coerente
    inhale: 5,
    hold: 0,
    exhale: 5,
    pause: 0,
    type: 'coherent-breathing'
  },
  '6': { // Respiração Alternada
    inhale: 4,
    hold: 2,
    exhale: 4,
    pause: 0,
    type: 'alternate-breathing'
  },
  '7': { // Respiração Caixa (Box Breathing)
    inhale: 4,
    hold: 4,
    exhale: 4,
    pause: 4,
    type: 'box-breathing'
  },
  '8': { // Respiração Equilibrada
    inhale: 4,
    hold: 2,
    exhale: 4,
    pause: 0,
    type: 'balanced-breathing'
  },
  '9': { // 4-7-8 Profundo
    inhale: 6,
    hold: 9,
    exhale: 12,
    pause: 0,
    type: 'deep-478-breathing'
  }
};

const PracticeScreen = ({ technique, onBack, onComplete }: PracticeScreenProps) => {
  const [duration, setDuration] = useState([5]);
  const [selectedPhrase, setSelectedPhrase] = useState(motivationalPhrases[0]);
  const [selectedAnimation, setSelectedAnimation] = useState(animations[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'setup' | 'preparation' | 'exercise' | 'completed'>('setup');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [cyclePhase, setCyclePhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const [preparationTime, setPreparationTime] = useState(5);
  const [cycleProgress, setCycleProgress] = useState(0);
  const [cycleStartTime, setCycleStartTime] = useState(0);
  const lottieRef = useRef<any>(null);
  
  // Obter padrão de respiração da técnica atual
  const breathingPattern = breathingPatterns[technique.id as keyof typeof breathingPatterns] || breathingPatterns['1'];
  const totalCycleTime = breathingPattern.inhale + breathingPattern.hold + breathingPattern.exhale + breathingPattern.pause;

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
      if (cycleStartTime === 0) {
        setCycleStartTime(Date.now());
      }
      
      interval = setInterval(() => {
        const currentTime = Date.now();
        const elapsedCycleTime = ((currentTime - (cycleStartTime || currentTime)) / 1000) % totalCycleTime;
        
        let currentCyclePhase: 'inhale' | 'hold' | 'exhale' | 'pause' = 'inhale';
        let progress = 0;
        let lottieProgress = 0;
        
        // Determinar fase atual e progresso
        if (elapsedCycleTime < breathingPattern.inhale) {
          // Fase: Inspiração (0% -> 100%)
          currentCyclePhase = 'inhale';
          progress = (elapsedCycleTime / breathingPattern.inhale) * 100;
          lottieProgress = elapsedCycleTime / breathingPattern.inhale;
        } else if (elapsedCycleTime < breathingPattern.inhale + breathingPattern.hold) {
          // Fase: Segurar (100% estático)
          currentCyclePhase = 'hold';
          progress = 100;
          lottieProgress = 1;
        } else if (elapsedCycleTime < breathingPattern.inhale + breathingPattern.hold + breathingPattern.exhale) {
          // Fase: Expiração (100% -> 0%)
          currentCyclePhase = 'exhale';
          const exhaleElapsed = elapsedCycleTime - breathingPattern.inhale - breathingPattern.hold;
          progress = 100 - ((exhaleElapsed / breathingPattern.exhale) * 100);
          lottieProgress = 1 - (exhaleElapsed / breathingPattern.exhale);
        } else {
          // Fase: Pausa (0% estático) - apenas para Box Breathing
          currentCyclePhase = 'pause';
          progress = 0;
          lottieProgress = 0;
        }
        
        setCyclePhase(currentCyclePhase);
        setCycleProgress(Math.max(0, Math.min(100, progress)));
        updateLottieAnimation(lottieProgress);
      }, 100);
    }

    return () => clearInterval(interval);
  }, [currentPhase, isPlaying, cycleStartTime, totalCycleTime, breathingPattern]);

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
    setCycleStartTime(0);
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

          {/* Enhanced Visual Progress Bar */}
          <div className="w-full max-w-sm space-y-6">
            {/* Phase Indicator */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {cyclePhase === 'inhale' && (
                <>
                  <Wind className="w-6 h-6 text-blue-500 animate-pulse" />
                  <span className="text-lg font-semibold text-blue-600">Inspirar</span>
                </>
              )}
              {cyclePhase === 'hold' && (
                <>
                  <Heart className="w-6 h-6 text-green-500 animate-pulse" />
                  <span className="text-lg font-semibold text-green-600">Segurar</span>
                </>
              )}
              {cyclePhase === 'exhale' && (
                <>
                  <Waves className="w-6 h-6 text-orange-500 animate-pulse" />
                  <span className="text-lg font-semibold text-orange-600">Expirar</span>
                </>
              )}
              {cyclePhase === 'pause' && (
                <>
                  <div className="w-6 h-6 rounded-full border-2 border-gray-400 animate-pulse" />
                  <span className="text-lg font-semibold text-gray-600">Pausa</span>
                </>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div className="relative">
              {/* Background Track */}
              <div className="h-6 bg-gray-200/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/20">
                {/* Animated Progress Fill */}
                <div 
                  className={`h-full transition-all duration-300 ease-out relative overflow-hidden ${
                    cyclePhase === 'inhale' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                    cyclePhase === 'hold' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                    cyclePhase === 'exhale' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                    'bg-gradient-to-r from-gray-300 to-gray-500'
                  }`}
                  style={{ width: `${cycleProgress}%` }}
                >
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
              
              {/* Progress Percentage */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white drop-shadow-lg">
                  {Math.round(cycleProgress)}%
                </span>
              </div>
            </div>

            {/* Breathing Pattern Info */}
            <div className="flex justify-center gap-2 text-center text-xs flex-wrap">
              <div className={`p-2 rounded-lg flex-1 min-w-[60px] ${cyclePhase === 'inhale' ? 'bg-blue-500/20 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-500'}`}>
                <div className="font-semibold">{breathingPattern.inhale}s</div>
                <div>Inspirar</div>
              </div>
              {breathingPattern.hold > 0 && (
                <div className={`p-2 rounded-lg flex-1 min-w-[60px] ${cyclePhase === 'hold' ? 'bg-green-500/20 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-500'}`}>
                  <div className="font-semibold">{breathingPattern.hold}s</div>
                  <div>Segurar</div>
                </div>
              )}
              <div className={`p-2 rounded-lg flex-1 min-w-[60px] ${cyclePhase === 'exhale' ? 'bg-orange-500/20 text-orange-700 border border-orange-300' : 'bg-gray-100 text-gray-500'}`}>
                <div className="font-semibold">{breathingPattern.exhale}s</div>
                <div>Expirar</div>
              </div>
              {breathingPattern.pause > 0 && (
                <div className={`p-2 rounded-lg flex-1 min-w-[60px] ${cyclePhase === 'pause' ? 'bg-gray-500/20 text-gray-700 border border-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                  <div className="font-semibold">{breathingPattern.pause}s</div>
                  <div>Pausa</div>
                </div>
              )}
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