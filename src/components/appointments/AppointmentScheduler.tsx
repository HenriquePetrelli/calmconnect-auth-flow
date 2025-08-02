import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PsychologistSelection } from './PsychologistSelection';
import { AppointmentForm } from './AppointmentForm';
import { PsychologistData } from './PsychologistList';

interface AppointmentSchedulerProps {
  onBack: () => void;
  onSuccess: () => void;
}

type SchedulerStep = 'selection' | 'form';

export const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({
  onBack,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<SchedulerStep>('selection');
  const [selectedPsychologist, setSelectedPsychologist] = useState<PsychologistData | null>(null);

  const handlePsychologistSelect = (psychologist: PsychologistData) => {
    setSelectedPsychologist(psychologist);
    setCurrentStep('form');
  };

  const handleBackToSelection = () => {
    setCurrentStep('selection');
    setSelectedPsychologist(null);
  };

  const handleSuccess = () => {
    setCurrentStep('selection');
    setSelectedPsychologist(null);
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        {currentStep === 'selection' ? (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
        ) : null}
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {currentStep === 'selection' ? 'Escolher Psicólogo' : 'Agendar Consulta'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentStep === 'selection' 
              ? 'Selecione um profissional para sua consulta'
              : `Agendando com ${selectedPsychologist?.full_name}`
            }
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {currentStep === 'selection' && (
          <PsychologistSelection onSelect={handlePsychologistSelect} />
        )}
        
        {currentStep === 'form' && selectedPsychologist && (
          <AppointmentForm
            psychologist={selectedPsychologist}
            onBack={handleBackToSelection}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
};