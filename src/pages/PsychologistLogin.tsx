import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PsychologistLogin = () => {
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    const email = prompt("Digite seu email profissional para recuperação de senha:");
    if (!email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error("Erro ao enviar email de recuperação");
      console.error("Reset password error:", error);
    } else {
      toast.success("Link de recuperação enviado para seu email profissional!");
    }
  };

  const handleSignUp = () => {
    navigate('/psychologist-signup');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <BackButton />
        </div>
        <Logo className="mb-12" />
        
        <LoginForm 
          userType="psychologist"
          onForgotPassword={handleForgotPassword}
          onSignUp={handleSignUp}
        />

      </div>
    </div>
  );
};

export default PsychologistLogin;