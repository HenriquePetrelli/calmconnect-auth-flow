import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PatientLogin = () => {
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    const email = prompt("Digite seu email para recuperação de senha:");
    if (!email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error("Erro ao enviar email de recuperação");
      console.error("Reset password error:", error);
    } else {
      toast.success("Link de recuperação enviado para seu email!");
    }
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

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/psychologist-login')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            É um psicólogo? Faça login aqui
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientLogin;