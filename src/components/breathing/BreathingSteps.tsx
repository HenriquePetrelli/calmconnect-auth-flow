import { BreathingPattern } from "./BreathingPatterns";

interface BreathingStepsProps {
  pattern: BreathingPattern;
  currentPhase: 'inhale' | 'hold' | 'exhale' | 'pause';
  activeStep?: number;
}

const BreathingSteps = ({ pattern, currentPhase, activeStep = 0 }: BreathingStepsProps) => {
  const steps = [
    { phase: 'inhale', duration: pattern.inhale, label: 'Inspirar', color: 'hsl(var(--breathing-inhale))' },
    { phase: 'hold', duration: pattern.hold, label: 'Segurar', color: 'hsl(var(--breathing-hold))' },
    { phase: 'exhale', duration: pattern.exhale, label: 'Expirar', color: 'hsl(var(--breathing-exhale))' },
    { phase: 'pause', duration: pattern.pause, label: 'Pausa', color: 'hsl(var(--breathing-pause))' }
  ];

  return (
    <div className="dynamic-steps-grid">
      {steps.map((step, index) => {
        // Only show phases that have duration > 0
        if (step.duration === 0) return null;
        
        return (
          <div key={index} className="step-group">
            <div className="step-label" style={{
              color: step.phase === currentPhase ? step.color : 'hsl(var(--muted-foreground))'
            }}>
              {step.label.toUpperCase()}
            </div>
            <div className="step-bars">
              {Array.from({ length: step.duration }).map((_, i) => (
                <div 
                  key={i}
                  className={`step-bar ${step.phase} ${
                    step.phase === currentPhase && i <= activeStep ? 'active' : ''
                  }`}
                  style={{ 
                    backgroundColor: step.color,
                    opacity: step.phase === currentPhase && i <= activeStep ? 1 : 0.3
                  }}
                />
              ))}
            </div>
            <div className="step-duration" style={{
              color: step.phase === currentPhase ? step.color : 'hsl(var(--muted-foreground))'
            }}>
              {step.duration}s
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BreathingSteps;