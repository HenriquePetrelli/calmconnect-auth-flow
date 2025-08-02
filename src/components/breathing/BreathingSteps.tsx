import { BreathingPattern } from "./BreathingPatterns";

interface BreathingStepsProps {
  pattern: BreathingPattern;
  currentPhase: 'inhale' | 'hold' | 'exhale' | 'pause';
}

const BreathingSteps = ({ pattern, currentPhase }: BreathingStepsProps) => {
  // Always show all phases in order: inhale -> hold -> exhale -> pause
  const phases = [
    { phase: 'inhale', duration: pattern.inhale, label: 'Inspirar' },
    { phase: 'hold', duration: pattern.hold, label: 'Segurar' },
    { phase: 'exhale', duration: pattern.exhale, label: 'Expirar' },
    { phase: 'pause', duration: pattern.pause, label: 'Pausa' }
  ];

  return (
    <div className="breathing-steps-container">
      {phases.map((step, index) => {
        // Only show phases that have duration > 0
        if (step.duration === 0) return null;
        
        return (
          <div 
            key={index}
            className={`breathing-step ${step.phase === currentPhase ? 'active' : ''}`}
          >
            <div 
              className="breathing-step-duration"
              style={{
                color: step.phase === currentPhase ? 
                  step.phase === 'inhale' ? 'hsl(var(--breathing-inhale))' :
                  step.phase === 'hold' ? 'hsl(var(--breathing-hold))' :
                  step.phase === 'exhale' ? 'hsl(var(--breathing-exhale))' :
                  'hsl(var(--breathing-pause))' : 'hsl(var(--muted-foreground))'
              }}
            >
              {step.duration}s
            </div>
            <div className="breathing-step-label">
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BreathingSteps;