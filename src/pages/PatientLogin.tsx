import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
        
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </Button>
        
        <Logo className="mb-12" />
        
        <LoginForm 
          userType="patient"
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

export default PatientLogin;