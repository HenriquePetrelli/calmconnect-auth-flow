import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Phone } from "lucide-react";
import ConfirmationModal from "./sos/ConfirmationModal";
import { useNavigate } from "react-router-dom";

const SOSButton = () => {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const handleConfirm = () => {
    setShowModal(false);
    navigate('/sos');
  };

  return (
    <>
      <div className="fixed bottom-20 right-6 z-50">
        <Button
          onClick={() => setShowModal(true)}
          className="w-16 h-16 rounded-full bg-sos-primary hover:bg-sos-secondary text-white shadow-2xl border-4 border-white hover:scale-110 transition-all duration-300 animate-pulse"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--sos-primary)), hsl(var(--sos-secondary)))',
            boxShadow: '0 0 30px hsl(var(--sos-glow)), 0 8px 32px rgba(0,0,0,0.3)'
          }}
          aria-label="Botão SOS - Emergência"
        >
          <div className="relative flex items-center justify-center">
            <Heart className="absolute w-6 h-6" fill="currentColor" />
            <Phone className="w-4 h-4 translate-x-1 translate-y-1" />
          </div>
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