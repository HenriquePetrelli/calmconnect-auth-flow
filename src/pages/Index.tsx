import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Settings } from "lucide-react";
import Logo from "@/components/Logo";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <Logo className="mb-12" />
        
        <div className="space-y-4">
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
            
            <Button
              onClick={() => navigate('/psychologist-signup')}
              variant="outline"
              size="sm"
              className="w-full text-sm text-muted-foreground hover:text-foreground border-dashed"
            >
              Cadastrar como Psicólogo
            </Button>
          </div>
        </div>

        {/* Administrative Access */}
        <div className="border-t border-border pt-6 mt-8">
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate('/admin-login')}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Shield className="h-4 w-4 mr-2" />
              Acesso Administrativo
            </Button>
            
            <Button
              onClick={() => navigate('/create-admin-account')}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4 mr-2" />
              Criar Conta Admin
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
