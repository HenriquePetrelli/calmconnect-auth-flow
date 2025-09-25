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
        navigate('/sos');
      }
    } catch (error) {
      console.error('Error creating emergency request:', error);
    }
  };

  return (
    <>
      <div className="fixed bottom-20 right-6 z-50 flex items-center gap-2">
        <Button
          onClick={handleButtonClick}
          disabled={!canUse || loading}
          className="w-12 h-12 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          aria-label="Botão SOS - Emergência"
        >
           {!canUse && (
          <Badge className="bg-premium-primary text-white px-2 py-1 text-xs flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Premium
          </Badge>
        )}
          <Hand className="w-12 h-12 text-white" strokeWidth={3} />
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