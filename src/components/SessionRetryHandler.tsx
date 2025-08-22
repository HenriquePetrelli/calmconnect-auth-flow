import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { validateWebRTCSession, SessionValidationError } from '@/utils/session-validation';

interface SessionRetryHandlerProps {
  sessionId: string;
  onSessionReady: (session: any) => void;
  onGiveUp: () => void;
  maxRetries?: number;
  initialDelay?: number;
}

export const SessionRetryHandler: React.FC<SessionRetryHandlerProps> = ({
  sessionId,
  onSessionReady,
  onGiveUp,
  maxRetries = 5,
  initialDelay = 2000
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lastError, setLastError] = useState<string>('');
  const { toast } = useToast();

  const attemptValidation = async (currentAttempt: number) => {
    try {
      console.log(`🔍 Session retry attempt ${currentAttempt}/${maxRetries}`);
      setAttempt(currentAttempt);
      setIsRetrying(true);
      
      const session = await validateWebRTCSession(sessionId);
      console.log('✅ Session validation successful on retry:', session);
      
      toast({
        title: 'Conectado!',
        description: 'Sessão de videochamada encontrada com sucesso.',
      });
      
      onSessionReady(session);
    } catch (error) {
      console.error(`❌ Retry attempt ${currentAttempt} failed:`, error);
      setLastError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      if (currentAttempt >= maxRetries) {
        console.error('❌ All retry attempts exhausted');
        setIsRetrying(false);
        toast({
          title: 'Erro de Conexão',
          description: 'Não foi possível encontrar a sessão após várias tentativas.',
          variant: 'destructive',
        });
        return;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(1.5, currentAttempt - 1);
      console.log(`⏳ Waiting ${delay}ms before next attempt...`);
      
      // Start countdown
      let remaining = Math.ceil(delay / 1000);
      setTimeRemaining(remaining);
      
      const countdownInterval = setInterval(() => {
        remaining--;
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          attemptValidation(currentAttempt + 1);
        }
      }, 1000);
    }
  };

  const handleManualRetry = () => {
    setLastError('');
    setTimeRemaining(0);
    attemptValidation(1);
  };

  const handleGiveUp = () => {
    setIsRetrying(false);
    setTimeRemaining(0);
    onGiveUp();
  };

  // Start initial retry on mount
  useEffect(() => {
    attemptValidation(1);
    
    return () => {
      setIsRetrying(false);
      setTimeRemaining(0);
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            {isRetrying && timeRemaining > 0 ? (
              <Clock className="w-6 h-6 text-primary animate-pulse" />
            ) : isRetrying ? (
              <RefreshCw className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            )}
          </div>
          
          <CardTitle className="text-xl">
            {isRetrying ? 'Conectando Videochamada' : 'Erro de Conexão'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          {isRetrying ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Aguarde enquanto tentamos estabelecer a conexão...
              </p>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Tentativa {attempt} de {maxRetries}
                </div>
                
                {timeRemaining > 0 && (
                  <div className="text-2xl font-bold text-primary">
                    {timeRemaining}s
                  </div>
                )}
                
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2 transition-all duration-300"
                    style={{ width: `${(attempt / maxRetries) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Não foi possível conectar à sessão de videochamada.
              </p>
              
              {lastError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  {lastError}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Sessão ID: {sessionId.substring(0, 8)}...
              </p>
            </div>
          )}
          
          <div className="flex gap-3 justify-center">
            {!isRetrying && (
              <>
                <Button 
                  onClick={handleManualRetry}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleGiveUp}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </>
            )}
            
            {isRetrying && (
              <Button 
                variant="outline" 
                onClick={handleGiveUp}
                disabled={timeRemaining > 0}
              >
                Cancelar Tentativas
              </Button>
            )}
          </div>
          
          {isRetrying && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Verificando se a sessão foi criada...</p>
              <p>• Aguardando sincronização do banco de dados</p>
              <p>• Tentativas automáticas a cada alguns segundos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};