import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CancelConfirmationModal from "@/components/sos/CancelConfirmationModal";
import SupportiveMessages from "@/components/sos/SupportiveMessages";
import VideoCall from "@/components/sos/VideoCall";

const SOS = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: searching, 2: connected
  const [availableProfessionals, setAvailableProfessionals] = useState(3);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Simular busca de profissionais
  useEffect(() => {
    if (step === 1) {
      const searchTimer = setTimeout(() => {
        setStep(2);
      }, 5000); // 5 segundos de busca

      // Simular mudança no número de profissionais disponíveis
      const professionalInterval = setInterval(() => {
        setAvailableProfessionals(prev => Math.max(1, Math.min(5, prev + (Math.random() > 0.5 ? 1 : -1))));
      }, 2000);

      return () => {
        clearTimeout(searchTimer);
        clearInterval(professionalInterval);
      };
    }
  }, [step]);

  const handleCancelConfirm = () => {
    setShowCancelModal(false);
    navigate('/home');
  };

  const handleEndCall = () => {
    navigate('/home');
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-border">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowCancelModal(true)}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Solicitar ajuda</h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
          {/* Status da busca */}
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center space-y-6">
              {/* Loader animado */}
              <div className="w-20 h-20 mx-auto">
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-2 border-primary/40 border-b-transparent animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-foreground">
                  Buscando profissional...
                </h2>
                <p className="text-primary font-medium">
                  Profissionais disponíveis: {availableProfessionals}
                </p>
                <p className="text-muted-foreground text-sm">
                  Estamos conectando você com um especialista. Aguarde alguns instantes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mensagens de apoio */}
          <SupportiveMessages />

          {/* Botão cancelar */}
          <Button
            variant="outline"
            onClick={() => setShowCancelModal(true)}
            className="px-8"
          >
            Cancelar
          </Button>
        </div>

        <CancelConfirmationModal
          open={showCancelModal}
          onOpenChange={setShowCancelModal}
          onConfirm={handleCancelConfirm}
        />
      </div>
    );
  }

  if (step === 2) {
    return <VideoCall onEndCall={handleEndCall} />;
  }

  return null;
};

export default SOS;