import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hand, Crown } from "lucide-react";
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
    // Remove toast notification for subscription check
  };

  const handleButtonClick = async () => {
    const { data } = await supabase.functions.invoke('check-subscription');
    const allowed = Boolean(data?.can_use_sos);
    if (!allowed) {
      // Just prevent action, no toast notification
      return;
    }
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setShowModal(false);
    try {
      const requestId = await createEmergencyRequest();
      if (requestId) {
        navigate('/sos', { state: { requestId } });
      }
    } catch (error) {
      console.error('Error creating emergency request:', error);
    }
  };

  return (
    <>
      <div className="fixed bottom-20 right-6 z-50 flex items-center gap-3">
        <Button
          onClick={handleButtonClick}
          disabled={!canUse || loading}
          className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 animate-pulse-gentle"
          aria-label="Botão SOS - Emergência"
        >
          <Hand className="w-8 h-8 text-white" strokeWidth={2.5} />
        </Button>
        {!canUse && (
          <Badge className="bg-premium-primary text-premium-primary border-premium-primary/20 shadow-premium px-3 py-1.5 text-xs flex items-center gap-1.5 animate-scale-in">
            <Crown className="w-3.5 h-3.5" />
            <span className="font-medium">Premium</span>
          </Badge>
        )}
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