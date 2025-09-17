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
    rtt: number;
  }>({ packetsLost: 0, jitter: 0, bitrate: 0, rtt: 0 });

  useEffect(() => {
    if (!peerConnection) {
      setStatus('disconnected');
      return;
    }

    let statsHistory: any[] = [];

    const checkConnectionQuality = async () => {
      try {
        const stats = await peerConnection.getStats();
        let packetsLost = 0;
        let jitter = 0;
        let bitrate = 0;
        let rtt = 0;
        let hasInboundData = false;
        let hasOutboundData = false;
        let hasRemoteCandidateData = false;

        // Current timestamp for bitrate calculation
        const currentTime = Date.now();

        stats.forEach(report => {
          // Inbound RTP statistics (receiving data)
          if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.kind === 'audio')) {
            packetsLost += report.packetsLost || 0;
            jitter = Math.max(jitter, report.jitter || 0);
            
            // Calculate bitrate from bytes received
            const bytesReceived = report.bytesReceived || 0;
            if (statsHistory.length > 0) {
              const prevReport = statsHistory[statsHistory.length - 1];
              const timeDiff = (currentTime - prevReport.timestamp) / 1000;
              const bytesDiff = bytesReceived - (prevReport.bytesReceived || 0);
              if (timeDiff > 0) {
                bitrate += Math.round((bytesDiff * 8) / timeDiff); // Convert to bits per second
              }
            }
            hasInboundData = true;
          }
          
          // Outbound RTP statistics (sending data)
          if (report.type === 'outbound-rtp' && (report.kind === 'video' || report.kind === 'audio')) {
            if (!hasInboundData) {
              const bytesSent = report.bytesSent || 0;
              if (statsHistory.length > 0) {
                const prevReport = statsHistory[statsHistory.length - 1];
                const timeDiff = (currentTime - prevReport.timestamp) / 1000;
                const bytesDiff = bytesSent - (prevReport.bytesSent || 0);
                if (timeDiff > 0) {
                  bitrate += Math.round((bytesDiff * 8) / timeDiff);
                }
              }
            }
            hasOutboundData = true;
          }

          // Remote candidate pair for RTT
          if (report.type === 'remote-candidate' || report.type === 'candidate-pair') {
            if (report.currentRoundTripTime !== undefined) {
              rtt = Math.max(rtt, report.currentRoundTripTime * 1000); // Convert to ms
              hasRemoteCandidateData = true;
            }
          }
        });

        // Store current stats for next calculation
        statsHistory.push({
          timestamp: currentTime,
          bytesReceived: bitrate,
          bytesSent: bitrate
        });
        
        // Keep only last 2 entries for calculation
        if (statsHistory.length > 2) {
          statsHistory = statsHistory.slice(-2);
        }

        setDetails({ packetsLost, jitter, bitrate, rtt });

        // Enhanced quality determination
        let qualityScore = 100;

        // Packet loss penalty (most critical)
        if (packetsLost > 0) {
          qualityScore -= Math.min(50, packetsLost * 2);
        }

        // Jitter penalty
        if (jitter > 0.05) {
          qualityScore -= Math.min(30, (jitter - 0.05) * 1000);
        }

        // RTT penalty
        if (rtt > 100) {
          qualityScore -= Math.min(20, (rtt - 100) / 10);
        }

        // Bitrate assessment (if very low, might indicate issues)
        if (bitrate > 0 && bitrate < 50000) { // Less than 50kbps might be problematic
          qualityScore -= 15;
        }

        // Connection state check
        if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          setStatus('disconnected');
        } else if (qualityScore >= 80) {
          setStatus('good');
        } else if (qualityScore >= 60) {
          setStatus('fair');
        } else {
          setStatus('poor');
        }

      } catch (error) {
        console.warn('Erro ao obter estatísticas de conexão:', error);
        setStatus('disconnected');
      }
    };

    // Check immediately, then every 2 seconds for more responsive feedback
    checkConnectionQuality();
    const interval = setInterval(checkConnectionQuality, 2000);

    // Also listen to connection state changes
    const handleConnectionStateChange = () => {
      const connectionState = peerConnection.connectionState;
      if (connectionState === 'failed' || connectionState === 'disconnected') {
        setStatus('disconnected');
      } else if (connectionState === 'connecting' || connectionState === 'new') {
        setStatus('checking');
      }
    };

    peerConnection.addEventListener('connectionstatechange', handleConnectionStateChange);

    return () => {
      clearInterval(interval);
      peerConnection.removeEventListener('connectionstatechange', handleConnectionStateChange);
    };
  }, [peerConnection]);

  const getStatusInfo = () => {
    switch (status) {
      case 'good':
        return {
          icon: <Wifi className="w-3 h-3 md:w-4 md:h-4" />,
          text: 'Boa conexão',
          colorClass: 'text-success',
          bgClass: 'bg-success/10 border-success/20'
        };
      case 'fair':
        return {
          icon: <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />,
          text: 'Conexão regular',
          colorClass: 'text-warning',
          bgClass: 'bg-warning/10 border-warning/20'
        };
      case 'poor':
        return {
          icon: <WifiOff className="w-3 h-3 md:w-4 md:h-4" />,
          text: 'Conexão fraca',
          colorClass: 'text-destructive',
          bgClass: 'bg-destructive/10 border-destructive/20'
        };
      case 'checking':
        return {
          icon: <Wifi className="w-3 h-3 md:w-4 md:h-4 animate-pulse" />,
          text: 'Verificando...',
          colorClass: 'text-muted-foreground',
          bgClass: 'bg-muted border-border'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-3 h-3 md:w-4 md:h-4" />,
          text: 'Desconectado',
          colorClass: 'text-destructive',
          bgClass: 'bg-destructive/10 border-destructive/20'
        };
    }
  };

  const statusInfo = getStatusInfo();

  const formatBitrate = (bitrate: number): string => {
    if (bitrate >= 1000000) return `${(bitrate / 1000000).toFixed(1)}Mbps`;
    if (bitrate >= 1000) return `${(bitrate / 1000).toFixed(0)}kbps`;
    return `${bitrate}bps`;
  };

  const tooltipContent = `
    Qualidade: ${statusInfo.text}
    Pacotes perdidos: ${details.packetsLost}
    Jitter: ${details.jitter.toFixed(3)}ms
    ${details.rtt > 0 ? `RTT: ${details.rtt.toFixed(0)}ms` : ''}
    ${details.bitrate > 0 ? `Taxa: ${formatBitrate(details.bitrate)}` : ''}
  `.trim();

  return (
    <div 
      className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full border transition-all duration-300 cursor-help ${statusInfo.bgClass}`}
      title={tooltipContent}
    >
      <div className={statusInfo.colorClass}>
        {statusInfo.icon}
      </div>
      <span className={`text-xs md:text-sm font-medium ${statusInfo.colorClass} hidden sm:inline`}>
        {statusInfo.text}
      </span>
    </div>
  );
}