import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import ReasonSelect from "@/components/ReasonSelect";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SignUpFormProps {
  userType: "patient" | "psychologist";
}

interface State {
  abbreviation: string;
  name: string;
}

interface City {
  name: string;
}

const SignUpForm = ({ userType }: SignUpFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    state: "",
    city: "",
    phone: "",
    reason: "",
    password: "",
    confirmPassword: "",
    // Psychologist fields
    crp: "",
    specialty: "",
    professionalEmail: "",
  });

  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const navigate = useNavigate();

  const isPatient = userType === "patient";
  const title = isPatient ? "Cadastro do Paciente" : "Cadastro do Psicólogo";

  // Fetch Brazilian states on component mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const { data, error } = await supabase
          .from('brazilian_states')
          .select('abbreviation, name')
          .order('name');
        
        if (error) throw error;
        setStates(data || []);
      } catch (error) {
        console.error('Error fetching states:', error);
        toast.error('Erro ao carregar estados');
      }
    };

    if (isPatient) {
      fetchStates();
    }
  }, [isPatient]);

  // Fetch cities when state changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.state) {
        setCities([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('brazilian_cities')
          .select('name')
          .eq('state', formData.state)
          .order('name');
        
        if (error) throw error;
        setCities(data || []);
      } catch (error) {
        console.error('Error fetching cities:', error);
        toast.error('Erro ao carregar cidades');
      }
    };

    if (isPatient && formData.state) {
      fetchCities();
    }
  }, [formData.state, isPatient]);

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
    
    // Reset city when state changes
    if (field === 'state') {
      setFormData(prev => ({ ...prev, city: '' }));
    }
    
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
        if (!formData.state) newErrors.state = true;
        if (!formData.city) newErrors.city = true;
        if (!formData.phone) newErrors.phone = true;
        if (!formData.reason || (formData.reason === "Outros")) newErrors.reason = true;
        
        // Validar CPF se preenchido
        if (formData.cpf && !validateCPF(formData.cpf)) {
          newErrors.cpf = true;
          toast.error("CPF inválido");
          setErrors(newErrors);
          setShowErrorAlert(true);
          return;
        }
      } else {
        if (!formData.cpf) newErrors.cpf = true;
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

      // Registro com Supabase Auth
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            user_type: userType,
            full_name: formData.name,
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

      // Save additional data to specific table
      if (isPatient) {
        // Save to patients table
        const { error: patientError } = await supabase
          .from('patients')
          .insert({
            user_id: data.user.id,
            full_name: formData.name,
            email: formData.email,
            cpf: formData.cpf.replace(/\D/g, ''),
            state: formData.state,
            city: formData.city,
            phone: formData.phone.replace(/\D/g, ''),
            reason: formData.reason
          });

        if (patientError) {
          console.error('Error saving patient data:', patientError);
          toast.error("Erro ao salvar dados adicionais. Tente novamente.");
          return;
        }

        // Also create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            user_type: 'patient',
            full_name: formData.name,
            cpf: formData.cpf.replace(/\D/g, ''),
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't fail if profile creation fails - it may already exist
        }
      } else {
        // For psychologists, create a registration record
        try {
          const { error: registrationError } = await supabase
            .from('psychologist_registrations')
            .insert({
              user_id: data.user.id,
              status: 'pending',
            });

          if (registrationError) {
            console.error('Error creating psychologist registration:', registrationError);
          }

          // Create profile for psychologist
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: data.user.id,
              user_type: 'psychologist',
              full_name: formData.name,
              cpf: formData.cpf.replace(/\D/g, ''),
              crp: formData.crp,
              specialty: formData.specialty,
              professional_email: formData.professionalEmail,
            });

          if (profileError) {
            console.error('Error creating psychologist profile:', profileError);
          }
        } catch (regError) {
          console.error('Error creating psychologist registration:', regError);
        }
      }

      if (isPatient) {
        toast.success(`Cadastro realizado com sucesso! Bem-vindo ${formData.name}!`);
        toast.info("Verifique seu email para confirmar a conta antes de fazer login.");
      } else {
        toast.success(`Cadastro realizado com sucesso! Dr.(a) ${formData.name}!`);
        toast.info("Seu cadastro foi enviado para análise. Você receberá um email quando for aprovado.");
      }
      
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
                {isPatient ? "Email" : "Email principal"}
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

            {isPatient && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-foreground font-medium">
                    Estado
                  </Label>
                  <Select value={formData.state} onValueChange={(value) => handleInputChange("state", value)}>
                    <SelectTrigger className={`h-12 rounded-xl border-border focus:ring-primary ${errors.state ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Selecione seu estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.abbreviation} value={state.abbreviation}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-foreground font-medium">
                    Cidade
                  </Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(value) => handleInputChange("city", value)}
                    disabled={!formData.state}
                  >
                    <SelectTrigger className={`h-12 rounded-xl border-border focus:ring-primary ${errors.city ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder={formData.state ? "Selecione sua cidade" : "Primeiro selecione o estado"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city, index) => (
                        <SelectItem key={index} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

                <ReasonSelect
                  value={formData.reason}
                  onChange={(value) => handleInputChange("reason", value)}
                  error={errors.reason}
                />
              </>
            )}

            {!isPatient && (
              <>
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
                  placeholder="Digite sua senha (mín. 6 caracteres)"
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