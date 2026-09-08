import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";
import PasswordResetModal from "@/components/PasswordResetModal";
import { Mascot } from "@/components/mascot";

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
        <div className="flex flex-col items-center gap-2 mb-12">
          <Mascot pose="wave" className="w-24 h-24 animate-fade-in" />
          <Logo className="mx-auto flex justify-center w-full" />
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
