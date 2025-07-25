import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Phone, PhoneOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SOS = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: confirmation, 2: searching, 3: connected
  const [timer, setTimer] = useState(1200); // 20 minutes in seconds
  const [isConnected, setIsConnected] = useState(false);

  // Timer countdown when connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (step === 3 && isConnected && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [step, isConnected, timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCrisisConfirmation = (inCrisis: boolean) => {
    if (inCrisis) {
      setStep(2);
      // Simulate searching for 3 seconds
      setTimeout(() => {
        setStep(3);
        setIsConnected(true);
      }, 3000);
    } else {
      navigate('/home');
    }
  };

  const endCall = () => {
    setIsConnected(false);
    navigate('/home');
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">SOS - Emergência</h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                <Phone className="text-destructive" size={32} />
              </div>
              
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Você está em crise?
                </h2>
                <p className="text-muted-foreground">
                  Vamos conectar você imediatamente com um psicólogo especializado
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => handleCrisisConfirmation(true)}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground py-3"
                >
                  Sim
                </Button>
                <Button
                  onClick={() => handleCrisisConfirmation(false)}
                  variant="outline"
                  className="flex-1 py-3"
                >
                  Não
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Buscando psicólogo...
              </h2>
              <p className="text-muted-foreground">
                Estamos conectando você com um profissional especializado. 
                Aguarde alguns instantes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header with timer */}
        <div className="bg-green-500 text-white p-4 text-center">
          <div className="text-lg font-semibold">Chamada Conectada</div>
          <div className="text-2xl font-mono font-bold">{formatTime(timer)}</div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <Phone className="text-green-600" size={40} />
              </div>
              
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Dr. Ana Silva
                </h2>
                <p className="text-muted-foreground mb-4">
                  Psicóloga Especialista em Crise
                </p>
                <p className="text-sm text-muted-foreground">
                  Você está conectado. Fale livremente sobre como está se sentindo.
                </p>
              </div>

              <Button
                onClick={endCall}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground py-3 flex items-center gap-2"
              >
                <PhoneOff size={20} />
                Encerrar Chamada
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
};

export default SOS;