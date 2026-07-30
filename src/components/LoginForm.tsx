import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LoginFormProps {
  onForgotPassword: () => void;
  onSignUp: () => void;
}

const LoginForm = ({ onForgotPassword, onSignUp }: LoginFormProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validação básica
      if (!email || !password) {
        toast.error("Por favor, preencha todos os campos");
        return;
      }

      if (password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }

      // Autenticação com Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou senha incorretos");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Por favor, confirme seu email antes de fazer login");
        } else {
          toast.error("Erro ao fazer login. Tente novamente.");
        }
        console.error("Login error:", error);
        return;
      }

      if (!data.user) {
        toast.error("Erro ao fazer login. Tente novamente.");
        return;
      }

      // Verificar o perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type, full_name')
        .eq('user_id', data.user.id)
        .single();

      if (profileError || !profile) {
        toast.error("Erro ao carregar perfil do usuário");
        console.error("Profile error:", profileError);
        return;
      }

      // Para psicólogos, verificar se o cadastro foi aprovado ou rejeitado
      if (profile.user_type === 'psychologist') {
        // Verificar bloqueio administrativo
        const { data: psychRow } = await supabase
          .from('psychologists')
          .select('is_blocked, blocked_until, blocked_reason')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (psychRow && isCurrentlyBlocked(psychRow as any)) {
          const periodo = psychRow.blocked_until
            ? `até ${new Date(psychRow.blocked_until).toLocaleString('pt-BR')} (${formatRemainingTime(psychRow.blocked_until)} restantes)`
            : 'permanentemente';
          toast.error(
            `Seu acesso está bloqueado ${periodo}. Motivo: ${psychRow.blocked_reason || 'não informado'}`,
            { duration: 8000 }
          );
          await supabase.auth.signOut();
          return;
        }

        // Check user metadata first
        if (data.user.user_metadata?.account_status !== 'approved') {
          // Check registration table for status and rejection details
          const { data: registrationData } = await supabase
            .from('psychologist_registrations')
            .select('status, rejected_at, rejection_reason')
            .eq('user_id', data.user.id)
            .single();

          if (!registrationData) {
            toast.error("Cadastro não encontrado. Entre em contato com o suporte.");
            await supabase.auth.signOut();
            return;
          }

          if (registrationData.status === 'rejected') {
            // Check if rejection is within 3 days
            if (registrationData.rejected_at) {
              const rejectedDate = new Date(registrationData.rejected_at);
              const daysSinceRejection = Math.floor((Date.now() - rejectedDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysSinceRejection <= 3) {
                // Within 3 days - show rejection message
                toast.error("Seu cadastro foi recusado. O motivo foi enviado para o seu e-mail.", {
                  duration: 5000,
                });
                await supabase.auth.signOut();
                return;
              }
            }
            
            // After 3 days - show generic message (data should be cleaned up)
            toast.error("Login ou senha incorretos.");
            await supabase.auth.signOut();
            return;
          }

          if (registrationData.status !== 'approved') {
            toast.error("Seu cadastro ainda está sendo analisado. Aguarde a aprovação.");
            await supabase.auth.signOut();
            return;
          }
        }
      }

      toast.success(`Login realizado com sucesso! Bem-vindo${profile.user_type === 'psychologist' ? ' Dr.(a)' : ''} ${profile.full_name}!`);
      
      // Redirecionar para a página apropriada baseado no userType
      if (profile.user_type === 'psychologist') {
        navigate('/psychologist-dashboard');
      } else if (profile.user_type === 'patient') {
        navigate('/home');
      } else if (data.user.user_metadata?.is_super_admin) {
        navigate('/admin-dashboard');
      } else {
        navigate('/home');
      }
      
      // Limpar formulário
      setEmail("");
      setPassword("");
      
    } catch (error) {
      toast.error("Erro ao fazer login. Tente novamente.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto shadow-calm border-0 animate-slide-up">
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-secondary mb-2">
              Login
            </h2>
            <p className="text-muted-foreground text-sm">
              Entre para continuar sua jornada de bem-estar
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
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
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-calm-sm transition-all duration-300 hover:shadow-calm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Entrando..." : "Entrar"}
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
                Não tem uma conta? Cadastre-se
              </button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;