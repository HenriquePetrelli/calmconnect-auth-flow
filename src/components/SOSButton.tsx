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
    console.log('🆘 SOS Button clicked');
    const { data, error } = await supabase.functions.invoke('check-subscription');
    console.log('🆘 Subscription check:', { data, error });
    const allowed = Boolean(data?.can_use_sos);
    console.log('🆘 SOS allowed:', allowed);
    if (!allowed) {
      console.log('❌ SOS not allowed, showing toast');
      toast({
        title: 'SOS Bloqueado',
        description: 'Você precisa de uma assinatura Premium para usar o SOS',
        variant: 'destructive',
      });
      return;
    }
    console.log('✅ Opening SOS confirmation modal');
    setShowModal(true);
  };

  const handleConfirm = async () => {
    console.log('🆘 SOS Confirmed, closing modal and creating request');
    setShowModal(false);
    try {
      console.log('🆘 Calling createEmergencyRequest()...');
      const requestId = await createEmergencyRequest();
      console.log('🆘 Request created with ID:', requestId);
      if (requestId) {
        console.log('🆘 Navigating to /sos with requestId:', requestId);
        navigate('/sos', { state: { requestId } });
      } else {
        console.error('❌ No requestId returned from createEmergencyRequest');
      }
    } catch (error) {
      console.error('❌ Error creating emergency request:', error);
    }
  };

  return (
    <>
      <div className="fixed bottom-20 right-6 z-50 flex items-center gap-3">
        <Button
          onClick={handleButtonClick}
          disabled={!canUse || loading}
          className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 animate-pulse-gentle"
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