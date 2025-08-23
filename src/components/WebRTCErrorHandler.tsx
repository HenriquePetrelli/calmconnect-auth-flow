import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface WebRTCErrorHandlerProps {
  error: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  sessionId?: string;
}

export const WebRTCErrorHandler: React.FC<WebRTCErrorHandlerProps> = ({
  error,
  onRetry,
  onGoHome,
  sessionId
}) => {
  const isTooManyConnectionsError = error.includes('Cannot create so many PeerConnections') || 
                                   error.includes('WEBRTC_TOO_MANY_CONNECTIONS') ||
                                   error.includes('Muitas conexões ativas');

  const handleReloadPage = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          
          <CardTitle className="text-xl text-destructive">
            {isTooManyConnectionsError ? 'Muitas Conexões Ativas' : 'Erro na Videochamada'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {isTooManyConnectionsError 
                ? 'O navegador atingiu o limite de conexões WebRTC simultâneas.'
                : error
              }
            </p>
            
            {isTooManyConnectionsError && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg space-y-2">
                <p><strong>Soluções recomendadas:</strong></p>
                <ul className="text-left space-y-1">
                  <li>• Recarregue a página para limpar conexões</li>
                  <li>• Feche outras abas com videochamadas</li>
                  <li>• Aguarde alguns segundos e tente novamente</li>
                </ul>
              </div>
            )}
            
            {sessionId && (
              <div className="text-xs text-muted-foreground border-t pt-3">
                ID da Sessão: {sessionId.substring(0, 8)}...
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-3">
            {isTooManyConnectionsError ? (
              <>
                <Button 
                  onClick={handleReloadPage}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recarregar Página
                </Button>
                
                {onRetry && (
                  <Button 
                    variant="outline" 
                    onClick={onRetry}
                    className="w-full"
                  >
                    Tentar Sem Recarregar
                  </Button>
                )}
              </>
            ) : (
              <>
                {onRetry && (
                  <Button 
                    onClick={onRetry}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tentar Novamente
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={handleReloadPage}
                  className="w-full"
                >
                  Recarregar Página
                </Button>
              </>
            )}
            
            {onGoHome && (
              <Button 
                variant="ghost" 
                onClick={onGoHome}
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};