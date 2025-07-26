import { Button } from "@/components/ui/button";
import { Heart, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SOSButton = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-20 right-6 z-50">
      <Button
        onClick={() => navigate('/sos')}
        className="w-16 h-16 rounded-full bg-sos-primary hover:bg-sos-secondary text-white shadow-2xl border-4 border-white hover:scale-110 transition-all duration-900 animate-pulse-gentle"
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
  );
};

export default SOSButton;