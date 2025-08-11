import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Settings } from "lucide-react";
import Logo from "@/components/Logo";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background py-8 p-4">
      <div className="w-full max-w-md text-center mt-6 mb-3">
        <Logo className="mt-6 mb-2" />

        <h1 className="text-3xl md:text-4xl font-bold text-primary animate-fade-in">soliv</h1>

        <div className="w-16 h-1 bg-primary mx-auto mt-1 mb-8 rounded-full"></div>
        
        <div className="space-y-4 mt-6">
          <h2 className="text-xl font-medium text-foreground">
            Como você gostaria de acessar?
          </h2>
          
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/patient-login')}
              className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-calm-sm transition-all duration-300 hover:shadow-calm"
            >
              Sou Paciente
            </Button>
            
            <Button
              onClick={() => navigate('/psychologist-login')}
              variant="outline"
              className="w-full h-14 rounded-xl border-primary text-primary hover:bg-primary hover:text-primary-foreground font-medium transition-all duration-300"
            >
              Sou Psicólogo
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Conectando pessoas em busca de bem-estar emocional
        </p>
      </div>
    </div>
  );
};

export default Index;
