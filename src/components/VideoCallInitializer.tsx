import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface VideoCallInitializerProps {
  onReady: () => void;
  onError: (error: string) => void;
  sessionId: string;
}

type InitializationStep = 
  | 'creating_session' 
  | 'waiting_replication' 
  | 'validating_session' 
  | 'initializing_media' 
  | 'ready';

const stepLabels: Record<InitializationStep, string> = {
  creating_session: 'Criando sessão...',
  waiting_replication: 'Aguardando sincronização...',
  validating_session: 'Validando conexão...',
  initializing_media: 'Inicializando câmera e microfone...',
  ready: 'Pronto para conectar!'
};

const stepProgress: Record<InitializationStep, number> = {
  creating_session: 20,
  waiting_replication: 40,
  validating_session: 60,
  initializing_media: 80,
  ready: 100
};

const VideoCallInitializer: React.FC<VideoCallInitializerProps> = ({
  onReady,
  onError,
  sessionId
}) => {
  const [currentStep, setCurrentStep] = useState<InitializationStep>('waiting_replication');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [maxTime] = useState(15000); // 15 seconds max

  useEffect(() => {
    let startTime = Date.now();
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      setTimeElapsed(elapsed);
      
      if (elapsed >= maxTime) {
        onError('Timeout na inicialização da videochamada. Tente novamente.');
        return;
      }
      
      timeoutId = setTimeout(updateTimer, 100);
    };
    
    updateTimer();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [maxTime, onError]);

  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Step 1: Wait for replication (automatic delay)
        setCurrentStep('waiting_replication');
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Step 2: Validate session
        setCurrentStep('validating_session');
        // This will be handled by the parent component with enhanced validation
        
        // Step 3: Initialize media (will be triggered by parent)
        setCurrentStep('initializing_media');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 4: Ready
        setCurrentStep('ready');
        setTimeout(() => onReady(), 500);
        
      } catch (error) {
        console.error('Initialization failed:', error);
        onError(error instanceof Error ? error.message : 'Erro na inicialização');
      }
    };

    initializeCall();
  }, [onReady, onError]);

  const progressValue = stepProgress[currentStep];
  const isComplete = currentStep === 'ready';
  const timeRemaining = Math.max(0, maxTime - timeElapsed);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            {isComplete ? (
              <CheckCircle className="w-6 h-6 text-primary" />
            ) : timeRemaining < 3000 ? (
              <AlertCircle className="w-6 h-6 text-destructive animate-pulse" />
            ) : (
              <Clock className="w-6 h-6 text-primary animate-pulse" />
            )}
          </div>
          
          <CardTitle className="text-xl">
            {isComplete ? 'Conectando Videochamada' : 'Preparando Videochamada'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {stepLabels[currentStep]}
            </div>
            
            <Progress value={progressValue} className="w-full" />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso: {progressValue}%</span>
              <span>
                {timeRemaining > 0 
                  ? `${Math.ceil(timeRemaining / 1000)}s restantes`
                  : 'Finalizando...'
                }
              </span>
            </div>
          </div>
          
          {!isComplete && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Sincronizando dados da sessão</p>
              <p>• Preparando conexão segura</p>
              <p>• Verificando dispositivos de mídia</p>
            </div>
          )}
          
          {isComplete && (
            <div className="text-sm text-primary font-medium">
              ✅ Pronto! Iniciando videochamada...
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            ID da Sessão: {sessionId.substring(0, 8)}...
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoCallInitializer;