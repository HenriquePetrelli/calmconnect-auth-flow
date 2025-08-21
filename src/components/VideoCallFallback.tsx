import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Wifi, Clock, Camera, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VideoCallFallbackProps {
  type: '404' | 'expired' | 'permissions' | 'connection' | 'timeout';
  onRetry?: () => void;
  customMessage?: string;
}

const VideoCallFallback: React.FC<VideoCallFallbackProps> = ({ 
  type, 
  onRetry, 
  customMessage 
}) => {
  const navigate = useNavigate();

  const getFallbackContent = () => {
    switch (type) {
      case '404':
        return {
          icon: <AlertTriangle className="w-16 h-16 text-destructive" />,
          title: 'Sessão Não Encontrada',
          description: customMessage || 'A sessão de videochamada que você está tentando acessar não foi encontrada ou não existe.',
          actions: [
            <Button key="home" onClick={() => navigate('/home')}>
              Voltar ao Início
            </Button>
          ]
        };

      case 'expired':
        return {
          icon: <Clock className="w-16 h-16 text-warning" />,
          title: 'Sessão Expirada',
          description: customMessage || 'Esta sessão de videochamada já expirou. As sessões são válidas por 2 horas após a criação.',
          actions: [
            <Button key="new-session" onClick={() => navigate('/sos')}>
              Nova Chamada de Emergência
            </Button>,
            <Button key="home" variant="outline" onClick={() => navigate('/home')}>
              Voltar ao Início
            </Button>
          ]
        };

      case 'permissions':
        return {
          icon: <Camera className="w-16 h-16 text-warning" />,
          title: 'Permissões de Mídia Necessárias',
          description: customMessage || 'Para realizar a videochamada, é necessário permitir o acesso à câmera e microfone. Clique no ícone de câmera na barra de endereços do navegador.',
          actions: [
            <Button key="retry" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>,
            <Button key="home" variant="outline" onClick={() => navigate('/home')}>
              Voltar ao Início
            </Button>
          ]
        };

      case 'connection':
        return {
          icon: <Wifi className="w-16 h-16 text-destructive" />,
          title: 'Falha na Conexão',
          description: customMessage || 'Não foi possível estabelecer a conexão de vídeo. Verifique sua conexão com a internet e tente novamente.',
          actions: [
            <Button key="retry" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconectar
            </Button>,
            <Button key="refresh" variant="outline" onClick={() => window.location.reload()}>
              Recarregar Página
            </Button>,
            <Button key="home" variant="outline" onClick={() => navigate('/home')}>
              Voltar ao Início
            </Button>
          ]
        };

      case 'timeout':
        return {
          icon: <Clock className="w-16 h-16 text-warning" />,
          title: 'Timeout de Conexão',
          description: customMessage || 'A conexão demorou muito para ser estabelecida. Isso pode indicar problemas de rede ou que o outro participante não está disponível.',
          actions: [
            <Button key="retry" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>,
            <Button key="home" variant="outline" onClick={() => navigate('/home')}>
              Cancelar Chamada
            </Button>
          ]
        };

      default:
        return {
          icon: <AlertTriangle className="w-16 h-16 text-destructive" />,
          title: 'Erro Desconhecido',
          description: 'Ocorreu um erro inesperado na videochamada.',
          actions: [
            <Button key="home" onClick={() => navigate('/home')}>
              Voltar ao Início
            </Button>
          ]
        };
    }
  };

  const content = getFallbackContent();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {content.icon}
          </div>
          <CardTitle className="text-2xl font-bold">
            {content.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground leading-relaxed">
            {content.description}
          </p>

          {type === 'permissions' && (
            <div className="bg-muted p-4 rounded-lg text-left space-y-2">
              <h4 className="font-semibold text-sm">Como permitir acesso:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Clique no ícone de câmera na barra de endereços</li>
                <li>Selecione "Sempre permitir" para este site</li>
                <li>Recarregue a página ou tente novamente</li>
              </ol>
            </div>
          )}

          {type === 'connection' && (
            <div className="bg-muted p-4 rounded-lg text-left space-y-2">
              <h4 className="font-semibold text-sm">Possíveis soluções:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Verifique sua conexão com a internet</li>
                <li>Tente usar uma rede Wi-Fi diferente</li>
                <li>Feche outros aplicativos que usam internet</li>
                <li>Aguarde alguns minutos e tente novamente</li>
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {content.actions}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoCallFallback;