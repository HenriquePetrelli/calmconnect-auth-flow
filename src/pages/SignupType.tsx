import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const SignupType = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div>
          <Logo />
  
          <h1 className="mt-3 text-5xl md:text-6xl font-black text-secondary lowercase leading-none animate-fade-in" style={{ fontFamily: "'El Messiri', sans-serif" }}>soliv</h1>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-medium text-foreground">
            Como você deseja se cadastrar?
          </h2>
          
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/patient-signup')}
              className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-calm-sm transition-all duration-300 hover:shadow-calm"
            >
              Sou Paciente
            </Button>
            
            <Button
              onClick={() => navigate('/psychologist-signup')}
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

export default SignupType;