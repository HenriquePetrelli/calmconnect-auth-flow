import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, Camera, CameraOff, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatTimeOnly } from "@/utils/timezone";

interface ConsultationVideoCallProps {
  appointment: {
    id: string;
    scheduled_at: string;
    psychologist: {
      full_name: string;
      specialty?: string;
      specialization?: string;
    };
  };
  onEndCall: () => void;
}

const ConsultationVideoCall = ({ appointment, onEndCall }: ConsultationVideoCallProps) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    toast({
      title: "Consulta finalizada",
      description: "Sua consulta foi encerrada. Obrigado por usar nossos serviços.",
    });
    onEndCall();
    navigate('/appointments');
  };

  const psychologistInitials = appointment.psychologist.full_name
    .split(' ')
    .map(name => name[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header com informações da consulta */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Consulta em Andamento</h1>
            <p className="text-sm opacity-90">
              Agendada para {formatTimeOnly(appointment.scheduled_at)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-bold">{formatDuration(timeElapsed)}</div>
            <div className="text-xs opacity-75">Duração</div>
          </div>
        </div>
      </div>

      {/* Área do vídeo principal */}
      <div className="flex-1 relative bg-gradient-to-b from-card to-card/50">
        {/* Vídeo do psicólogo */}
        <div className="w-full h-full flex items-center justify-center p-8">
          <Card className="w-full max-w-md border-primary/20">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">
                    {psychologistInitials}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  {appointment.psychologist.full_name}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {appointment.psychologist.specialty || appointment.psychologist.specialization || 'Psicólogo'}
                </p>
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-green-700 dark:text-green-400 text-sm font-medium">
                      Conectado
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vídeo próprio (canto inferior direito) */}
        <div className="absolute bottom-6 right-6 w-36 h-28 bg-card rounded-lg border-2 border-border shadow-lg overflow-hidden">
          {isCameraOff ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
              <CameraOff className="text-muted-foreground mb-1" size={20} />
              <span className="text-xs text-muted-foreground">Câmera desligada</span>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex flex-col items-center justify-center">
              <User className="text-primary mb-1" size={20} />
              <span className="text-xs text-primary font-medium">Você</span>
            </div>
          )}
        </div>
      </div>

      {/* Controles da chamada */}
      <div className="p-6 bg-card border-t border-border">
        <div className="flex justify-center items-center space-x-8">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
            onClick={handleEndCall}
          >
            <PhoneOff size={26} />
          </Button>

          <Button
            variant={isCameraOff ? "destructive" : "secondary"}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={() => setIsCameraOff(!isCameraOff)}
          >
            {isCameraOff ? <CameraOff size={22} /> : <Camera size={22} />}
          </Button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Consulta de 50 minutos
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConsultationVideoCall;