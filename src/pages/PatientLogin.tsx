import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";
import PasswordResetModal from "@/components/PasswordResetModal";

const PatientLogin = () => {
  const navigate = useNavigate();
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);

  const handleForgotPassword = () => {
    setIsPasswordResetOpen(true);
  };

  const handleSignUp = () => {
    navigate('/patient-signup');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <Logo className="mb-12" />
        
        <LoginForm 
          userType="patient"
          onForgotPassword={handleForgotPassword}
          onSignUp={handleSignUp}
        />

        <div className="text-center mt-8 space-y-2">
          <button
            onClick={() => navigate('/psychologist-login')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors block"
          >
            É um psicólogo? Faça login aqui
          </button>
          <button
            onClick={() => navigate('/psychologist-signup')}
            className="text-sm text-primary hover:text-primary/80 transition-colors block font-medium"
          >
            Cadastrar como Psicólogo
          </button>
        </div>
      </div>

      <PasswordResetModal 
        open={isPasswordResetOpen}
        onOpenChange={setIsPasswordResetOpen}
      />
    </div>
  );
};

export default PatientLogin;