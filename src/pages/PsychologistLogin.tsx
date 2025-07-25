import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";
import { toast } from "sonner";

const PsychologistLogin = () => {
  const navigate = useNavigate();

  const handleForgotPassword = () => {
    toast.info("Link de recuperação enviado para seu email profissional!");
  };

  const handleSignUp = () => {
    toast.info("Redirecionando para cadastro de psicólogo...");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <Logo className="mb-12" />
        
        <LoginForm 
          userType="psychologist"
          onForgotPassword={handleForgotPassword}
          onSignUp={handleSignUp}
        />

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/patient-login')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            É um paciente? Faça login aqui
          </button>
        </div>
      </div>
    </div>
  );
};

export default PsychologistLogin;