import React from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface SessionErrorBoundaryProps {
  error?: string;
  errorCode?: string;
  sessionId?: string;
  onRetry?: () => void;
}

const SessionErrorBoundary: React.FC<SessionErrorBoundaryProps> = ({
  error = 'Sessão de videochamada não encontrada',
  errorCode,
  sessionId,
  onRetry
}) => {
  const navigate = useNavigate();

  const getErrorDetails = () => {
    switch (errorCode) {
      case 'SESSION_NOT_FOUND':
        return {
          title: 'Sessão Não Encontrada',
          description: 'A sessão de videochamada não existe ou foi removida.',
          showSessionId: true,
          canRetry: false
        };
      case 'SESSION_EXPIRED':
        return {
          title: 'Sessão Expirada',
          description: 'Esta sessão já passou do tempo limite e não pode mais ser acessada.',
          showSessionId: false,
          canRetry: false
        };
      case 'ACCESS_DENIED':
        return {
          title: 'Acesso Negado',
          description: 'Você não tem permissão para acessar esta sessão.',
          showSessionId: false,
          canRetry: false
        };
      case 'INVALID_SESSION_ID':
        return {
          title: 'ID Inválido',
          description: 'O identificador da sessão está malformado.',
          showSessionId: true,
          canRetry: false
        };
      default:
        return {
          title: 'Erro na Videochamada',
          description: error,
          showSessionId: false,
          canRetry: true
        };
    }
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                {errorDetails.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {errorDetails.description}
              </p>
            </div>

            {errorDetails.showSessionId && sessionId && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-1">ID da Sessão:</p>
                <code className="text-xs font-mono break-all">
                  {sessionId}
                </code>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {errorDetails.canRetry && onRetry && (
              <Button
                onClick={onRetry}
                variant="default"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            )}
            
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            
            <Button
              onClick={() => navigate('/home')}
              variant="ghost"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Ir para Início
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Se o problema persistir, entre em contato com o suporte técnico.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionErrorBoundary;