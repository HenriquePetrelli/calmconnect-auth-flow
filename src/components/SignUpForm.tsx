import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
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
    specialty: "", // Para psicólogos
    professionalEmail: "", // Para psicólogos
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const navigate = useNavigate();

  const isPatient = userType === "patient";
  const title = isPatient ? "Cadastro do Paciente" : "Cadastro do Psicólogo";

  // Função para aplicar máscara no CPF
  const formatCPF = (value: string) => {
    const cpf = value.replace(/\D/g, '');
    return cpf
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Função para aplicar máscara no telefone
  const formatPhone = (value: string) => {
    const phone = value.replace(/\D/g, '');
    return phone
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  // Função para validar CPF
  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(10))) return false;

    return true;
  };

  const handleInputChange = (field: string, value: string) => {
    // Aplicar máscaras
    if (field === 'cpf') {
      value = formatCPF(value);
    } else if (field === 'phone') {
      value = formatPhone(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowErrorAlert(false);
    
    try {
      const newErrors: { [key: string]: boolean } = {};
      
      // Validar campos obrigatórios
      if (!formData.name) newErrors.name = true;
      if (!formData.email) newErrors.email = true;
      if (!formData.password) newErrors.password = true;
      if (!formData.confirmPassword) newErrors.confirmPassword = true;
      
      if (isPatient) {
        if (!formData.cpf) newErrors.cpf = true;
        if (!formData.phone) newErrors.phone = true;
        if (!formData.reason) newErrors.reason = true;
        
        // Validar CPF se preenchido
        if (formData.cpf && !validateCPF(formData.cpf)) {
          newErrors.cpf = true;
          toast.error("CPF inválido");
          setErrors(newErrors);
          setShowErrorAlert(true);
          return;
        }
      } else {
        if (!formData.crp) newErrors.crp = true;
        if (!formData.specialty) newErrors.specialty = true;
        if (!formData.professionalEmail) newErrors.professionalEmail = true;
      }

      // Se há erros, mostrar alert e marcar campos
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setShowErrorAlert(true);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error("As senhas não coincidem");
        setErrors({ password: true, confirmPassword: true });
        return;
      }

      if (formData.password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        setErrors({ password: true });
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
            cpf: isPatient ? formData.cpf : formData.cpf,
            phone: isPatient ? formData.phone : null,
            reason: isPatient ? formData.reason : null,
            crp: !isPatient ? formData.crp : null,
            specialty: !isPatient ? formData.specialty : null,
            professional_email: !isPatient ? formData.professionalEmail : null,
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

          {showErrorAlert && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Por favor, preencha todos os campos obrigatórios corretamente.
              </AlertDescription>
            </Alert>
          )}

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
                className={`h-12 rounded-xl border-border focus:ring-primary ${errors.name ? 'border-destructive' : ''}`}
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
                className={`h-12 rounded-xl border-border focus:ring-primary ${errors.email ? 'border-destructive' : ''}`}
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
                    className={`h-12 rounded-xl border-border focus:ring-primary ${errors.cpf ? 'border-destructive' : ''}`}
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
                    className={`h-12 rounded-xl border-border focus:ring-primary ${errors.phone ? 'border-destructive' : ''}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-foreground font-medium">
                    Motivo para usar o app
                  </Label>
                  <Select value={formData.reason} onValueChange={(value) => handleInputChange("reason", value)}>
                    <SelectTrigger className={`h-12 rounded-xl border-border focus:ring-primary ${errors.reason ? 'border-destructive' : ''}`}>
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
                    className={`h-12 rounded-xl border-border focus:ring-primary ${errors.cpf ? 'border-destructive' : ''}`}
                  />
                </div>

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
                    className={`h-12 rounded-xl border-border focus:ring-primary ${errors.crp ? 'border-destructive' : ''}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialty" className="text-foreground font-medium">
                    Especialidade(s)
                  </Label>
                  <Input
                    id="specialty"
                    type="text"
                    value={formData.specialty}
                    onChange={(e) => handleInputChange("specialty", e.target.value)}
                    placeholder="Ex: Psicologia Clínica, Neuropsicologia"
                    required
                    className={`h-12 rounded-xl border-border focus:ring-primary ${errors.specialty ? 'border-destructive' : ''}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="professionalEmail" className="text-foreground font-medium">
                    Email Profissional Adicional
                  </Label>
                  <Input
                    id="professionalEmail"
                    type="email"
                    value={formData.professionalEmail}
                    onChange={(e) => handleInputChange("professionalEmail", e.target.value)}
                    placeholder="contato@consultorio.com"
                    required
                    className={`h-12 rounded-xl border-border focus:ring-primary ${errors.professionalEmail ? 'border-destructive' : ''}`}
                  />
                </div>
              </>
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
                  className={`h-12 rounded-xl border-border focus:ring-primary pr-12 ${errors.password ? 'border-destructive' : ''}`}
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
                  className={`h-12 rounded-xl border-border focus:ring-primary pr-12 ${errors.confirmPassword ? 'border-destructive' : ''}`}
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