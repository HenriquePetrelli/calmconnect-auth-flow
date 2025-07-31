import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PsychologistRegistrationForm } from "@/components/psychologist/PsychologistRegistrationForm";
import Logo from "@/components/Logo";

const PsychologistSignUp = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    navigate('/patient-login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <Logo className="mb-12" />
        
        <PsychologistRegistrationForm 
          userId={user.id}
          userEmail={user.email || ''}
          onSuccess={() => navigate('/home')}
        />

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/patient-signup')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            É um paciente? Cadastre-se aqui
          </button>
        </div>
      </div>
    </div>
  );
};

export default PsychologistSignUp;