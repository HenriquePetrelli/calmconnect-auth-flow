import { useMemo } from "react";

interface BreathingProgressBarProps {
  phase: 'inhale' | 'hold' | 'exhale' | 'pause';
  duration: number;
  currentTime: number;
}

const getProgressValue = (phase: string, elapsedTime: number, phaseDuration: number): number => {
  switch(phase) {
    case 'inhale':
      return Math.min(elapsedTime / phaseDuration, 1); // 0% → 100%
    case 'hold':
      return 1; // Mantém 100%
    case 'pause':
      return 0; // Mantém 0%
    case 'exhale':
      return 1 - Math.min(elapsedTime / phaseDuration, 1); // 100% → 0%
    default:
      return 0;
  }
};

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

const BreathingProgressBar = ({ phase, duration, currentTime }: BreathingProgressBarProps) => {
  const progress = useMemo(() => {
    const elapsed = duration - currentTime;
    return getProgressValue(phase, elapsed, duration);
  }, [phase, duration, currentTime]);

  return (
    <div className="breathing-progress-container">
      <div 
        className="breathing-progress-bar"
        style={{
          width: `${Math.max(0, Math.min(100, progress * 100))}%`,
          backgroundColor: getPhaseColor(phase),
          transition: 'width 0.1s linear'
        }}
      />
    </div>
  );
};

export default BreathingProgressBar;