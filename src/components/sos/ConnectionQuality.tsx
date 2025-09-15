import { useEffect, useState } from "react";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";

interface ConnectionQualityProps {
  peerConnection: RTCPeerConnection | null;
}

type ConnectionStatus = 'good' | 'fair' | 'poor' | 'checking' | 'disconnected';

export function ConnectionQuality({ peerConnection }: ConnectionQualityProps) {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [details, setDetails] = useState<{
    packetsLost: number;
    jitter: number;
    bitrate: number;
  }>({ packetsLost: 0, jitter: 0, bitrate: 0 });

  useEffect(() => {
    if (!peerConnection) {
      setStatus('disconnected');
      return;
    }

    const checkConnectionQuality = async () => {
      try {
        const stats = await peerConnection.getStats();
        let packetsLost = 0;
        let jitter = 0;
        let bitrate = 0;
        let hasData = false;

        stats.forEach(report => {
          // Analisar estatísticas de entrada (inbound-rtp)
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetsLost = report.packetsLost || 0;
            jitter = report.jitter || 0;
            bitrate = report.bytesReceived || 0;
            hasData = true;
          }
          
          // Também verificar estatísticas de saída (outbound-rtp)
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            if (!hasData) {
              packetsLost = report.packetsLost || 0;
              jitter = report.jitter || 0;
              bitrate = report.bytesSent || 0;
              hasData = true;
            }
          }
        });

        setDetails({ packetsLost, jitter, bitrate });

        // Determinar qualidade da conexão baseado nos valores
        if (packetsLost > 100 || jitter > 0.2) {
          setStatus('poor');
        } else if (packetsLost > 20 || jitter > 0.08) {
          setStatus('fair');
        } else {
          setStatus('good');
        }
      } catch (error) {
        console.warn('Erro ao obter estatísticas de conexão:', error);
        setStatus('disconnected');
      }
    };

    // Verificar qualidade a cada 3 segundos
    const interval = setInterval(checkConnectionQuality, 3000);
    
    // Verificar imediatamente
    checkConnectionQuality();

    return () => clearInterval(interval);
  }, [peerConnection]);

  const getStatusInfo = () => {
    switch (status) {
      case 'good':
        return {
          icon: <Wifi className="w-4 h-4 text-green-500" />,
          text: 'Boa conexão',
          color: 'text-green-500',
          bg: 'bg-green-500/10'
        };
      case 'fair':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
          text: 'Conexão instável',
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/10'
        };
      case 'poor':
        return {
          icon: <WifiOff className="w-4 h-4 text-red-500" />,
          text: 'Conexão ruim',
          color: 'text-red-500',
          bg: 'bg-red-500/10'
        };
      case 'checking':
        return {
          icon: <Wifi className="w-4 h-4 text-gray-500 animate-pulse" />,
          text: 'Verificando...',
          color: 'text-gray-500',
          bg: 'bg-gray-500/10'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-4 h-4 text-red-500" />,
          text: 'Desconectado',
          color: 'text-red-500',
          bg: 'bg-red-500/10'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusInfo.bg} transition-all duration-300 cursor-help`}
      title={`Pacotes perdidos: ${details.packetsLost} | Jitter: ${details.jitter.toFixed(3)}ms`}
    >
      {statusInfo.icon}
      <span className={`text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    </div>
  );
}