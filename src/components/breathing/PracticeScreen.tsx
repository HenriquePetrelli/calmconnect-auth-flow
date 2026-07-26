import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Wind,
  Heart,
  Waves,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SoundAnimation, { type AnimationType } from "@/components/sounds/SoundAnimation";
import AnimationSelector from "@/components/sounds/AnimationSelector";
import ContextualPhrases from "./ContextualPhrases";
import BreathingTimer from "./BreathingTimer";
import BreathingOrb from "./BreathingOrb";
import PatternSelector from "./PatternSelector";
import { BreathingPattern, getPatternByTechniqueId } from "./BreathingPatterns";
import { useBreathingPhase } from "@/hooks/useBreathingPhase";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";

interface Technique {
  id: string;
  name: string;
  description: string;
  duration: string;
  difficulty: "basic" | "advanced" | "emergency";
  category: string;
  icon: LucideIcon;
  iconBg: string;
  instructions?: string;
}

interface PracticeScreenProps {
  technique: Technique;
  onBack: () => void;
  onComplete: (durationMinutes: number) => void;
}

const PracticeScreen = ({ technique, onBack, onComplete }: PracticeScreenProps) => {
  const [duration, setDuration] = useState([5]);
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationType>("breathing");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<
    "setup" | "pattern-selection" | "preparation" | "exercise"
  >("setup");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [cyclePhase, setCyclePhase] = useState<"inhale" | "hold" | "exhale" | "pause">("inhale");
  const [preparationTime, setPreparationTime] = useState(5);
  const [cycleCount, setCycleCount] = useState(0);
  const [breathingPattern, setBreathingPattern] = useState<BreathingPattern>(
    getPatternByTechniqueId(technique.id)
  );
  const [selectedPatternKey, setSelectedPatternKey] = useState<string>("");

  // Static levels ref (no real audio, just keeps SoundAnimation alive)
  const levelsRef = useRef({ volume: 0.5, bass: 0.4, mid: 0.4, treble: 0.4 });

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;

    if (currentPhase === "preparation" && preparationTime > 0) {
      interval = setInterval(() => {
        setPreparationTime((prev) => {
          if (prev <= 1) {
            setCurrentPhase("exercise");
            setTimeRemaining(duration[0] * 60);
            setIsPlaying(true);
            setCyclePhase("inhale");
            setCycleCount(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    if (currentPhase === "exercise" && isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            onComplete(duration[0]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [currentPhase, preparationTime, timeRemaining, isPlaying, duration, onComplete]);

  const handlePatternSelect = (pattern: BreathingPattern, patternKey: string) => {
    setBreathingPattern(pattern);
    setSelectedPatternKey(patternKey);
    setCurrentPhase("setup");
  };

  const handleStart = () => {
    setCurrentPhase("preparation");
    setPreparationTime(5);
  };

  const togglePlayPause = () => setIsPlaying((p) => !p);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentPhase("setup");
    setTimeRemaining(duration[0] * 60);
    setCyclePhase("inhale");
    setPreparationTime(5);
    setCycleCount(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ===== Pattern selection screen =====
  if (currentPhase === "pattern-selection") {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Escolher Padrão" onBack={() => setCurrentPhase("setup")} />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <PatternSelector onSelect={handlePatternSelect} currentPattern={selectedPatternKey} />
        </div>
      </div>
    );
  }

  // ===== Preparation screen =====
  if (currentPhase === "preparation") {
    const Icon = technique.icon;
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-secondary-active flex items-center justify-center p-6">
        <div className="text-center space-y-6">
          <div
            className={cn(
              "w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-xl bg-white/15 backdrop-blur-sm"
            )}
          >
            <Icon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Prepare-se...</h2>
          <div className="text-7xl font-bold tabular-nums animate-scale-in text-white" key={preparationTime}>
            {preparationTime}
          </div>
          <p className="text-white/80">Encontre uma posição confortável</p>
        </div>
      </div>
    );
  }

  // ===== Exercise screen =====
  if (currentPhase === "exercise") {
    return (
      <ExerciseView
        pattern={breathingPattern}
        isPlaying={isPlaying}
        cycleCount={cycleCount}
        cyclePhase={cyclePhase}
        timeRemaining={timeRemaining}
        totalSeconds={duration[0] * 60}
        onPhaseChange={setCyclePhase}
        onCycleComplete={() => setCycleCount((p) => p + 1)}
        onBack={onBack}
        onTogglePlay={togglePlayPause}
        onReset={handleReset}
        formatTime={formatTime}
      />
    );
  }

  // ===== Setup screen =====
  const Icon = technique.icon;
  return (
    <div className="min-h-screen bg-background pb-12">
      <PageHeader title={technique.name} onBack={onBack} />

      {/* Description */}
      <div className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-sm sm:text-base text-muted-foreground">
            {technique.description}
          </p>
        </div>
      </div>


      {/* Hero card */}
      <div className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-4">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md",
              technique.iconBg
            )}
          >
            <Icon className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{technique.category}</p>
            <h2 className="text-lg font-semibold text-foreground">{technique.name}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {technique.duration}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Instructions */}
        {technique.instructions && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Como praticar
            </p>
            <p className="text-sm text-foreground leading-relaxed">{technique.instructions}</p>
          </div>
        )}

        {/* Pattern */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Padrão de Respiração
            </p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setCurrentPhase("pattern-selection")}
            >
              <Settings2 className="w-3.5 h-3.5 mr-1.5" />
              Alterar
            </Button>
          </div>
          <h3 className="text-base font-semibold text-foreground">{breathingPattern.name}</h3>
          <p className="text-sm text-muted-foreground mb-3">{breathingPattern.description}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <PatternStep icon={<Wind className="w-3.5 h-3.5" />} label="Inspirar" value={breathingPattern.inhale} color="bg-primary" />
            {breathingPattern.hold > 0 && (
              <PatternStep icon={<Heart className="w-3.5 h-3.5" />} label="Segurar" value={breathingPattern.hold} color="bg-secondary" />
            )}
            <PatternStep icon={<Waves className="w-3.5 h-3.5" />} label="Expirar" value={breathingPattern.exhale} color="bg-primary" />
            {breathingPattern.pause > 0 && (
              <PatternStep icon={<Pause className="w-3.5 h-3.5" />} label="Pausar" value={breathingPattern.pause} color="bg-secondary" />
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Duração
            </p>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {duration[0]} {duration[0] === 1 ? "minuto" : "minutos"}
            </span>
          </div>
          <Slider value={duration} onValueChange={setDuration} max={20} min={1} step={1} />
        </div>

        {/* Animation selector */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Animação
          </p>
          <AnimationSelector selected={selectedAnimation} onChange={setSelectedAnimation} />
        </div>

        {/* Start */}
        <Button
          onClick={handleStart}
          className="w-full h-14 text-base font-semibold rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg"
        >
          <Play className="w-5 h-5 mr-2 fill-current" />
          Começar prática ({duration[0]} min)
        </Button>
      </div>
    </div>
  );
};

const PatternStep = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) => (
  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50">
    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0", color)}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground leading-none">{label}</p>
      <p className="text-sm font-semibold text-foreground tabular-nums">{value}s</p>
    </div>
  </div>
);

interface ExerciseViewProps {
  pattern: BreathingPattern;
  isPlaying: boolean;
  cycleCount: number;
  cyclePhase: "inhale" | "hold" | "exhale" | "pause";
  timeRemaining: number;
  totalSeconds: number;
  onPhaseChange: (p: "inhale" | "hold" | "exhale" | "pause") => void;
  onCycleComplete: () => void;
  onBack: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
  formatTime: (s: number) => string;
}

const ExerciseView = ({
  pattern,
  isPlaying,
  cycleCount,
  cyclePhase,
  timeRemaining,
  totalSeconds,
  onPhaseChange,
  onCycleComplete,
  onBack,
  onTogglePlay,
  onReset,
  formatTime,
}: ExerciseViewProps) => {
  const state = useBreathingPhase(pattern, isPlaying, onPhaseChange, onCycleComplete);
  const sessionProgress = totalSeconds > 0 ? 1 - timeRemaining / totalSeconds : 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 dark:opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(60% 45% at 50% 0%, hsl(var(--secondary) / 0.18), transparent 70%), radial-gradient(50% 40% at 50% 100%, hsl(var(--primary) / 0.12), transparent 70%)',
        }}
      />

      <PageHeader title={pattern.name} onBack={onBack} />

      <div className="flex-1 min-h-0 flex flex-col items-center justify-between px-5 py-5 max-w-xl w-full mx-auto">
        <div className="shrink-0 flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border/60">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Ciclo {cycleCount + 1}
          </span>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center w-full py-3">
          <div className="aspect-square h-full max-h-[42vh] max-w-[42vh]">
            <BreathingOrb state={state} isPlaying={isPlaying} />
          </div>
        </div>

        <div className="shrink-0 min-h-[3rem] flex items-center">
          <ContextualPhrases
            currentPhase={cyclePhase}
            patternType={pattern.type}
            cycleCount={cycleCount}
          />
        </div>

        <div className="shrink-0 w-full mt-4">
          <BreathingTimer pattern={pattern} state={state} />
        </div>

        <div className="shrink-0 w-full mt-5 space-y-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            <span>Sessão</span>
            <span className="tabular-nums text-foreground/80">{formatTime(timeRemaining)}</span>
          </div>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-500 ease-linear"
              style={{ width: `${sessionProgress * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onReset}
              className="w-11 h-11 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground"
              aria-label="Reiniciar"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-shadow"
              onClick={onTogglePlay}
              aria-label={isPlaying ? "Pausar" : "Continuar"}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5 fill-current" />}
            </Button>
            <div className="w-11" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeScreen;
