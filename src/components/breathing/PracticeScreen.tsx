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
import PatternSelector from "./PatternSelector";
import { BreathingPattern, getPatternByTechniqueId } from "./BreathingPatterns";
import { cn } from "@/lib/utils";

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
        <div className="bg-[#7C3AED] text-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPhase("setup")}
                className="rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white h-10 w-10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                <h1 className="text-lg sm:text-xl font-semibold text-white">Escolher Padrão</h1>
              </div>
            </div>
          </div>
        </div>
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
      <div className="min-h-screen bg-gradient-to-br from-[#7C3AED] via-[#5B21B6] to-[#1E1B4B] flex items-center justify-center p-6">
        <div className="text-center text-white space-y-6">
          <div
            className={cn(
              "w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-xl",
              technique.iconBg
            )}
          >
            <Icon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold">Prepare-se...</h2>
          <div className="text-7xl font-bold tabular-nums animate-scale-in" key={preparationTime}>
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
      <div className="h-screen flex flex-col bg-gradient-to-br from-background to-secondary/5 overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon-sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{technique.category}</p>
              <h1 className="text-sm font-semibold text-foreground truncate">
                {breathingPattern.name}
              </h1>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex flex-col items-center justify-between px-4 py-4 max-w-2xl w-full mx-auto">
          {/* Animation circle */}
          <div className="flex-1 min-h-0 flex items-center justify-center w-full py-2">
            <div className="aspect-square h-full max-h-[40vh] max-w-[40vh]">
              <SoundAnimation
                type={selectedAnimation}
                isPlaying={isPlaying}
                levelsRef={levelsRef as any}
                circular
              />
            </div>
          </div>

          {/* Phrases */}
          <div className="shrink-0">
            <ContextualPhrases
              currentPhase={cyclePhase}
              patternType={breathingPattern.type}
              cycleCount={cycleCount}
            />
          </div>

          {/* Timer */}
          <div className="shrink-0 w-full mt-2">
            <BreathingTimer
              pattern={breathingPattern}
              isActive={isPlaying}
              onPhaseChange={setCyclePhase}
              onCycleComplete={() => setCycleCount((p) => p + 1)}
            />
          </div>

          {/* Session timer + controls */}
          <div className="shrink-0 w-full mt-3 space-y-2">
            <div className="text-center">
              <div className="text-2xl font-mono text-foreground">{formatTime(timeRemaining)}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Tempo restante</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleReset}
                className="rounded-full bg-muted/60 hover:bg-muted"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                size="icon-lg"
                className="w-14 h-14 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <div className="w-9" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== Setup screen =====
  const Icon = technique.icon;
  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header — solid purple */}
      <div className="bg-[#7C3AED] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-white" />
              <h1 className="text-lg sm:text-xl font-semibold text-white">{technique.name}</h1>
            </div>
          </div>
          <p className="text-white/85 text-sm sm:text-base mt-3 ml-13 sm:ml-14">
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
            <PatternStep icon={<Wind className="w-3.5 h-3.5" />} label="Inspirar" value={breathingPattern.inhale} color="bg-[#3B82F6]" />
            {breathingPattern.hold > 0 && (
              <PatternStep icon={<Heart className="w-3.5 h-3.5" />} label="Segurar" value={breathingPattern.hold} color="bg-[#10B981]" />
            )}
            <PatternStep icon={<Waves className="w-3.5 h-3.5" />} label="Expirar" value={breathingPattern.exhale} color="bg-[#F97316]" />
            {breathingPattern.pause > 0 && (
              <PatternStep icon={<Pause className="w-3.5 h-3.5" />} label="Pausar" value={breathingPattern.pause} color="bg-[#7C3AED]" />
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

export default PracticeScreen;
