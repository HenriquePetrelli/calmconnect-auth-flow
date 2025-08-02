import { useState, useEffect } from "react";
import { BreathingPattern } from "./BreathingPatterns";
import { Wind, Heart, Waves } from "lucide-react";

interface BreathingTimerProps {
  pattern: BreathingPattern;
  isActive: boolean;
  onPhaseChange?: (phase: 'inhale' | 'hold' | 'exhale' | 'pause') => void;
  onCycleComplete?: () => void;
}

const BreathingTimer = ({ pattern, isActive, onPhaseChange, onCycleComplete }: BreathingTimerProps) => {
  const [currentPhase, setCurrentPhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const [remainingTime, setRemainingTime] = useState(pattern.inhale);
  const [cycleProgress, setCycleProgress] = useState(0);

  const totalCycleTime = pattern.inhale + pattern.hold + pattern.exhale + pattern.pause;

  useEffect(() => {
    setCurrentPhase('inhale');
    setRemainingTime(pattern.inhale);
    setCycleProgress(0);
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

        // Update progress
        const elapsed = pattern[currentPhase] - remainingTime + 1;
        const phaseProgress = (elapsed / pattern[currentPhase]) * 100;
        setCycleProgress(phaseProgress);
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

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'inhale':
        return 'from-blue-400 to-blue-600';
      case 'hold':
        return 'from-green-400 to-green-600';
      case 'exhale':
        return 'from-orange-400 to-orange-600';
      case 'pause':
        return 'from-gray-400 to-gray-600';
      default:
        return 'from-blue-400 to-blue-600';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'inhale':
        return <Wind className="w-6 h-6 text-blue-500 animate-pulse" />;
      case 'hold':
        return <Heart className="w-6 h-6 text-green-500 animate-pulse" />;
      case 'exhale':
        return <Waves className="w-6 h-6 text-orange-500 animate-pulse" />;
      case 'pause':
        return <div className="w-6 h-6 rounded-full border-2 border-gray-400 animate-pulse" />;
      default:
        return <Wind className="w-6 h-6 text-blue-500 animate-pulse" />;
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
          color: currentPhase === 'inhale' ? '#2563eb' :
                 currentPhase === 'hold' ? '#059669' :
                 currentPhase === 'exhale' ? '#d97706' : '#4b5563'
        }}>
          {getPhaseLabel(currentPhase)}
        </span>
      </div>

      {/* Time Blocks */}
      {renderTimeBlocks()}

      {/* Time Display */}
      <div className="text-center">
        <div className="text-3xl font-bold mb-2" style={{
          color: currentPhase === 'inhale' ? '#2563eb' :
                 currentPhase === 'hold' ? '#059669' :
                 currentPhase === 'exhale' ? '#d97706' : '#4b5563'
        }}>
          {remainingTime}s
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 bg-gradient-to-r ${getPhaseColor(currentPhase)}`}
            style={{ width: `${cycleProgress}%` }}
          />
        </div>
      </div>

      {/* Pattern Info */}
      <div className="flex justify-center gap-2 text-center text-xs flex-wrap">
        <div className={`p-2 rounded-lg flex-1 min-w-[60px] ${
          currentPhase === 'inhale' ? 'bg-blue-500/20 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-500'
        }`}>
          <div className="font-semibold">{pattern.inhale}s</div>
          <div>Inspirar</div>
        </div>
        {pattern.hold > 0 && (
          <div className={`p-2 rounded-lg flex-1 min-w-[60px] ${
            currentPhase === 'hold' ? 'bg-green-500/20 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-500'
          }`}>
            <div className="font-semibold">{pattern.hold}s</div>
            <div>Segurar</div>
          </div>
        )}
        <div className={`p-2 rounded-lg flex-1 min-w-[60px] ${
          currentPhase === 'exhale' ? 'bg-orange-500/20 text-orange-700 border border-orange-300' : 'bg-gray-100 text-gray-500'
        }`}>
          <div className="font-semibold">{pattern.exhale}s</div>
          <div>Expirar</div>
        </div>
        {pattern.pause > 0 && (
          <div className={`p-2 rounded-lg flex-1 min-w-[60px] ${
            currentPhase === 'pause' ? 'bg-gray-500/20 text-gray-700 border border-gray-300' : 'bg-gray-100 text-gray-500'
          }`}>
            <div className="font-semibold">{pattern.pause}s</div>
            <div>Pausa</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BreathingTimer;