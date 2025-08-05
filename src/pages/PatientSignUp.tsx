import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import SignUpForm from "@/components/SignUpForm";

const PatientSignUp = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <Logo className="mb-12" />
        
        <SignUpForm userType="patient" />

      </div>
    </div>
  );
};

export default PatientSignUp;