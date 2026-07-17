import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import BackButton from "@/components/BackButton";
import SignUpForm from "@/components/SignUpForm";

const PatientSignUp = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute left-0">
            <BackButton />
          </div>
          <Logo />
        </div>
        
        <SignUpForm userType="patient" />

      </div>
    </div>
  );
};

export default PatientSignUp;