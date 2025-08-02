import { useMemo } from "react";

interface BreathingProgressBarProps {
  phase: 'inhale' | 'hold' | 'exhale' | 'pause';
  duration: number;
  elapsed: number;
}

const SmoothProgressBar = ({ phase, duration, elapsed }: BreathingProgressBarProps) => {
  const progress = useMemo(() => {
    const normalizedElapsed = Math.min(elapsed, duration);
    
    switch(phase) {
      case 'inhale':
        return normalizedElapsed / duration; // 0% → 100%
      case 'hold':
        return 1; // Mantém 100%
      case 'exhale':
        return 1 - (normalizedElapsed / duration); // 100% → 0%
      case 'pause':
        return 0; // Mantém 0%
      default:
        return 0;
    }
  }, [phase, duration, elapsed]);

  const getPhaseColor = (phase: string): string => {
    switch (phase) {
      case 'inhale':
        return 'hsl(var(--breathing-inhale))';
      case 'hold':
        return 'hsl(var(--breathing-hold))';
      case 'exhale':
        return 'hsl(var(--breathing-exhale))';
      case 'pause':
        return 'hsl(var(--breathing-pause))';
      default:
        return 'hsl(var(--breathing-inhale))';
    }
  };

  return (
    <div className="smooth-progress-container">
      <div 
        className={`smooth-progress-bar ${phase}`}
        style={{
          width: `${Math.max(0, Math.min(100, progress * 100))}%`,
          backgroundColor: getPhaseColor(phase),
          transition: 'width 1s linear'
        }}
      />
    </div>
  );
};

export default SmoothProgressBar;