import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SignUpFormProps {
  userType: "patient" | "psychologist";
}

const SignUpForm = ({ userType }: SignUpFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "", // Para pacientes
    phone: "", // Para pacientes
    reason: "", // Para pacientes
    password: "",
    confirmPassword: "",
    crp: "", // Apenas para psicólogos
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const isPatient = userType === "patient";
  const title = isPatient ? "Cadastro do Paciente" : "Cadastro do Psicólogo";

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validações
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        toast.error("Por favor, preencha todos os campos");
        return;
      }

      if (isPatient && (!formData.cpf || !formData.phone || !formData.reason)) {
        toast.error("Por favor, preencha todos os campos obrigatórios");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error("As senhas não coincidem");
        return;
      }

      if (formData.password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }

      if (!isPatient && !formData.crp) {
        toast.error("Por favor, informe seu número do CRP");
        return;
      }

      // Registro com Supabase
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            user_type: userType,
            full_name: formData.name,
            cpf: isPatient ? formData.cpf : null,
            phone: isPatient ? formData.phone : null,
            reason: isPatient ? formData.reason : null,
            crp: !isPatient ? formData.crp : null,
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("Este email já está cadastrado. Tente fazer login.");
        } else if (error.message.includes("Password should be at least")) {
          toast.error("A senha deve ter pelo menos 6 caracteres");
        } else if (error.message.includes("Unable to validate email address")) {
          toast.error("Email inválido. Verifique o endereço informado.");
        } else {
          toast.error("Erro ao criar conta. Tente novamente.");
        }
        console.error("SignUp error:", error);
        return;
      }

      if (!data.user) {
        toast.error("Erro ao criar conta. Tente novamente.");
        return;
      }

      toast.success(`Cadastro realizado com sucesso! Bem-vindo${!isPatient ? ' Dr.(a)' : ''} ${formData.name}!`);
      toast.info("Verifique seu email para confirmar a conta antes de fazer login.");
      
      // Redirecionar para login após cadastro
      setTimeout(() => {
        navigate(isPatient ? '/patient-login' : '/psychologist-login');
      }, 2000);

    } catch (error) {
      toast.error("Erro ao criar conta. Tente novamente.");
      console.error("SignUp error:", error);
    } finally {
      setIsLoading(false);
    }
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
              Crie sua conta e comece sua jornada de bem-estar
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground font-medium">
                Nome completo
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Digite seu nome completo"
                required
                className="h-12 rounded-xl border-border focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                {isPatient ? "Email" : "Email profissional"}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder={isPatient ? "seu@email.com" : "profissional@email.com"}
                required
                className="h-12 rounded-xl border-border focus:ring-primary"
              />
            </div>

            {isPatient && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-foreground font-medium">
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => handleInputChange("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                    required
                    className="h-12 rounded-xl border-border focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground font-medium">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="(11) 99999-9999"
                    required
                    className="h-12 rounded-xl border-border focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-foreground font-medium">
                    Motivo para usar o app
                  </Label>
                  <Select value={formData.reason} onValueChange={(value) => handleInputChange("reason", value)}>
                    <SelectTrigger className="h-12 rounded-xl border-border focus:ring-primary">
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ansiedade">Ansiedade</SelectItem>
                      <SelectItem value="estresse">Estresse</SelectItem>
                      <SelectItem value="panico">Pânico</SelectItem>
                      <SelectItem value="inseguranca">Insegurança</SelectItem>
                      <SelectItem value="meditacao">Meditação</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {!isPatient && (
              <div className="space-y-2">
                <Label htmlFor="crp" className="text-foreground font-medium">
                  Número do CRP
                </Label>
                <Input
                  id="crp"
                  type="text"
                  value={formData.crp}
                  onChange={(e) => handleInputChange("crp", e.target.value)}
                  placeholder="Ex: CRP 01/12345"
                  required
                  className="h-12 rounded-xl border-border focus:ring-primary"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                Confirmar senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  placeholder="Digite sua senha novamente"
                  required
                  className="h-12 rounded-xl border-border focus:ring-primary pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-calm-sm transition-all duration-300 hover:shadow-calm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Criando conta..." : "Criar conta"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate(isPatient ? '/patient-login' : '/psychologist-login')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Já tem uma conta? Faça login
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SignUpForm;