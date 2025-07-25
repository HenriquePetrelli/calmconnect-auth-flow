import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  userType: "patient" | "psychologist";
  onForgotPassword: () => void;
  onSignUp: () => void;
}

const LoginForm = ({ userType, onForgotPassword, onSignUp }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isPatient = userType === "patient";
  
  const title = isPatient ? "Login do Paciente" : "Login do Psicólogo";
  const emailLabel = isPatient ? "Email" : "Email profissional";
  const signUpText = isPatient 
    ? "Não tem uma conta? Cadastre-se como Paciente"
    : "Ainda não é parceiro? Cadastre-se como Psicólogo";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você implementaria a lógica de login
    console.log("Login attempt:", { email, password, userType });
  };

  return (
    <Card className="w-full max-w-sm mx-auto shadow-calm border-0 animate-slide-up">
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              {title}
            </h2>
            <p className="text-muted-foreground text-sm">
              Entre para continuar sua jornada de bem-estar
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                {emailLabel}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isPatient ? "seu@email.com" : "profissional@email.com"}
                required
                className="h-12 rounded-xl border-border focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="h-12 rounded-xl border-border focus:ring-primary pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-calm-sm transition-all duration-300 hover:shadow-calm"
          >
            Entrar
          </Button>

          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Esqueceu a senha?
            </button>
            
            <div className="pt-2">
              <button
                type="button"
                onClick={onSignUp}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {signUpText}
              </button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;