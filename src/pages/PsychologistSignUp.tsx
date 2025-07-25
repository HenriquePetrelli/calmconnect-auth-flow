import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import SignUpForm from "@/components/SignUpForm";

const PsychologistSignUp = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <Logo className="mb-12" />
        
        <SignUpForm userType="psychologist" />

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