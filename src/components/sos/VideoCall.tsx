import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, Camera, CameraOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoCallProps {
  onEndCall: () => void;
}

const VideoCall = ({ onEndCall }: VideoCallProps) => {
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutos em segundos
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          toast({
            title: "Chamada finalizada",
            description: "O tempo da sessão chegou ao fim.",
          });
          onEndCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onEndCall, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    toast({
      title: "Chamada finalizada",
      description: "Obrigado por usar nosso serviço. Esperamos ter ajudado.",
    });
    onEndCall();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header com timer */}
      <div className="bg-success text-white p-4 text-center">
        <div className="text-lg font-semibold">Chamada Conectada</div>
        <div className="text-2xl font-mono font-bold">{formatTime(timeLeft)}</div>
      </div>

      {/* Área do vídeo principal */}
      <div className="flex-1 relative bg-gray-900">
        {/* Simulação do vídeo do profissional */}
        <div className="w-full h-full flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-success/20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
                  <span className="text-white font-bold text-xl">DS</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  Dra. Ana Silva
                </h3>
                <p className="text-muted-foreground text-sm">
                  Psicóloga Especialista em Crise
                </p>
                <div className="mt-3 p-2 bg-success/15 rounded-lg">
                  <p className="text-success text-sm">
                    🟢 Conectado e ouvindo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vídeo próprio (canto inferior direito) */}
        <div className="absolute bottom-4 right-4 w-32 h-24 bg-card rounded-lg border-2 border-white overflow-hidden">
          {isCameraOff ? (
            <div className="w-full h-full flex items-center justify-center bg-card">
              <CameraOff className="text-muted-foreground" size={24} />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary to-secondary-hover flex items-center justify-center">
              <span className="text-white font-bold">Você</span>
            </div>
          )}
        </div>
      </div>

      {/* Controles da chamada */}
      <div className="p-6 bg-white border-t">
        <div className="flex justify-center space-x-6">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="w-14 h-14 rounded-full bg-destructive hover:bg-destructive/90"
            onClick={handleEndCall}
          >
            <PhoneOff size={24} />
          </Button>

          <Button
            variant={isCameraOff ? "destructive" : "secondary"}
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={() => setIsCameraOff(!isCameraOff)}
          >
            {isCameraOff ? <CameraOff size={20} /> : <Camera size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;