import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import Wordmark from "@/components/Wordmark";
import LoginForm from "@/components/LoginForm";
import PasswordResetModal from "@/components/PasswordResetModal";

const Index = () => {
  const navigate = useNavigate();
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);

  const handleForgotPassword = () => {
    setIsPasswordResetOpen(true);
  };

  const handleSignUp = () => {
    navigate('/signup-type');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3 mb-12">
          <Logo className="mx-auto flex justify-center w-full" />
          <Wordmark className="h-[34px] text-primary" />
        </div>

        <LoginForm 
          onForgotPassword={handleForgotPassword}
          onSignUp={handleSignUp}
        />
      </div>

      <PasswordResetModal 
        open={isPasswordResetOpen}
        onOpenChange={setIsPasswordResetOpen}
      />
    </div>
  );
};

export default Index;
