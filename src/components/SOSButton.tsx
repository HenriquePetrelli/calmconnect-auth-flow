import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Hand } from "lucide-react";
import ConfirmationModal from "./sos/ConfirmationModal";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmergencySOS } from "@/hooks/useEmergencySOS";

const SOSButton = () => {
  const [showModal, setShowModal] = useState(false);
  const [canUse, setCanUse] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createEmergencyRequest, loading } = useEmergencySOS();

  useEffect(() => {
    checkCanUse();
  }, []);

  const checkCanUse = async () => {
    const { data, error } = await supabase.functions.invoke('check-subscription');
    if (error) {
      setCanUse(false);
      return;
    }
    setCanUse(Boolean(data?.can_use_sos));
    if (data && data.can_use_sos === false && data.reason) {
      toast({ title: "Aviso", description: data.reason });
    }
  };

  const handleButtonClick = async () => {
    const { data } = await supabase.functions.invoke('check-subscription');
    const allowed = Boolean(data?.can_use_sos);
    if (!allowed) {
      toast({
        title: "Limite atingido",
        description: data?.reason || "Seu plano não permite SOS.",
        variant: "destructive",
      });
      return;
    }
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setShowModal(false);
    try {
      const requestId = await createEmergencyRequest();
      if (requestId) {
        navigate('/sos');
      }
    } catch (error) {
      console.error('Error creating emergency request:', error);
    }
  };

  return (
    <>
      <div className="fixed bottom-20 right-6 z-50">
        <Button
          onClick={handleButtonClick}
          disabled={!canUse || loading}
          className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          aria-label="Botão SOS - Emergência"
        >
          <Hand className="w-8 h-8 text-white" />
        </Button>
      </div>

      <ConfirmationModal
        open={showModal}
        onOpenChange={setShowModal}
        onConfirm={handleConfirm}
      />
    </>
  );
};

export default SOSButton;