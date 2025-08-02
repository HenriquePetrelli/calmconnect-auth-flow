import { useState, useEffect } from "react";
import { BreathingPattern } from "./BreathingPatterns";
import { Wind, Heart, Waves } from "lucide-react";
import BreathingProgressBar from "./BreathingProgressBar";
import BreathingSteps from "./BreathingSteps";

interface BreathingTimerProps {
  pattern: BreathingPattern;
  isActive: boolean;
  onPhaseChange?: (phase: 'inhale' | 'hold' | 'exhale' | 'pause') => void;
  onCycleComplete?: () => void;
}

const BreathingTimer = ({ pattern, isActive, onPhaseChange, onCycleComplete }: BreathingTimerProps) => {
  const [currentPhase, setCurrentPhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const [remainingTime, setRemainingTime] = useState(pattern.inhale);
  
  // Calculate active step for visual feedback
  const activeStep = pattern[currentPhase] - remainingTime;

  useEffect(() => {
    setCurrentPhase('inhale');
    setRemainingTime(pattern.inhale);
  }, [pattern]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            const nextPhase = getNextPhase(currentPhase, pattern);
            setCurrentPhase(nextPhase);
            onPhaseChange?.(nextPhase);
            
            if (nextPhase === 'inhale') {
              onCycleComplete?.();
            }
            
            return pattern[nextPhase] || pattern.inhale;
          }
          return prev - 1;
        });

      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, currentPhase, pattern, remainingTime, onPhaseChange, onCycleComplete]);

  const getNextPhase = (phase: 'inhale' | 'hold' | 'exhale' | 'pause', pattern: BreathingPattern) => {
    switch (phase) {
      case 'inhale':
        return pattern.hold > 0 ? 'hold' : 'exhale';
      case 'hold':
        return 'exhale';
      case 'exhale':
        return pattern.pause > 0 ? 'pause' : 'inhale';
      case 'pause':
        return 'inhale';
      default:
        return 'inhale';
    }
  };


  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'inhale':
        return <Wind className="w-6 h-6 animate-pulse" style={{ color: 'hsl(var(--breathing-inhale))' }} />;
      case 'hold':
        return <Heart className="w-6 h-6 animate-pulse" style={{ color: 'hsl(var(--breathing-hold))' }} />;
      case 'exhale':
        return <Waves className="w-6 h-6 animate-pulse" style={{ color: 'hsl(var(--breathing-exhale))' }} />;
      case 'pause':
        return <div className="w-6 h-6 rounded-full border-2 animate-pulse" style={{ borderColor: 'hsl(var(--breathing-pause))' }} />;
      default:
        return <Wind className="w-6 h-6 animate-pulse" style={{ color: 'hsl(var(--breathing-inhale))' }} />;
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'inhale': return 'Inspirar';
      case 'hold': return 'Segurar';
      case 'exhale': return 'Expirar';
      case 'pause': return 'Pausa';
      default: return 'Inspirar';
    }
  };

  const renderTimeBlocks = () => {
    const total = pattern[currentPhase];
    const remaining = remainingTime;
    
    return (
      <div className="flex gap-1 justify-center mb-4">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i < remaining ? 'bg-current opacity-100' : 'bg-current opacity-30'
            }`}
            style={{ 
              width: `${Math.max(8, 100 / total)}px`,
              color: currentPhase === 'inhale' ? '#3b82f6' :
                     currentPhase === 'hold' ? '#10b981' :
                     currentPhase === 'exhale' ? '#f59e0b' : '#6b7280'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Phase Indicator */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {getPhaseIcon(currentPhase)}
        <span className="text-lg font-semibold" style={{
          color: currentPhase === 'inhale' ? 'hsl(var(--breathing-inhale))' :
                 currentPhase === 'hold' ? 'hsl(var(--breathing-hold))' :
                 currentPhase === 'exhale' ? 'hsl(var(--breathing-exhale))' : 'hsl(var(--breathing-pause))'
        }}>
          {getPhaseLabel(currentPhase)}
        </span>
      </div>

      {/* Time Blocks */}
      {renderTimeBlocks()}

      {/* Time Display */}
      <div className="text-center">
        <div className="text-3xl font-bold mb-2" style={{
          color: currentPhase === 'inhale' ? 'hsl(var(--breathing-inhale))' :
                 currentPhase === 'hold' ? 'hsl(var(--breathing-hold))' :
                 currentPhase === 'exhale' ? 'hsl(var(--breathing-exhale))' : 'hsl(var(--breathing-pause))'
        }}>
          {remainingTime}s
        </div>
      </div>

      {/* Progress Bar */}
      <BreathingProgressBar 
        phase={currentPhase}
        duration={pattern[currentPhase]}
        elapsed={pattern[currentPhase] - remainingTime}
      />

      {/* Breathing Steps */}
      <BreathingSteps pattern={pattern} currentPhase={currentPhase} activeStep={activeStep} />
    </div>
  );
};

export default BreathingTimer;