import { BreathingPattern } from "./BreathingPatterns";

interface BreathingStepsProps {
  pattern: BreathingPattern;
  currentPhase: 'inhale' | 'hold' | 'exhale' | 'pause';
}

const BreathingSteps = ({ pattern, currentPhase }: BreathingStepsProps) => {
  const phases = [
    { phase: 'inhale', duration: pattern.inhale, label: 'Inspirar' },
    ...(pattern.hold > 0 ? [{ phase: 'hold', duration: pattern.hold, label: 'Segurar' }] : []),
    { phase: 'exhale', duration: pattern.exhale, label: 'Expirar' },
    ...(pattern.pause > 0 ? [{ phase: 'pause', duration: pattern.pause, label: 'Pausa' }] : [])
  ];

  return (
    <div className="breathing-steps-container">
      {phases.map((step, index) => (
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
      ))}
    </div>
  );
};

export default BreathingSteps;