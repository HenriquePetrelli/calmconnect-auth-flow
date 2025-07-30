import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Logo from "@/components/Logo";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const cleanupAuthState = () => {
    localStorage.removeItem('supabase.auth.token');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean up existing state
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Verify user is admin
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('is_active')
          .eq('user_id', data.user.id)
          .eq('is_active', true)
          .single();

        if (!adminData) {
          await supabase.auth.signOut();
          throw new Error('Acesso negado. Esta conta não possui privilégios administrativos.');
        }

        toast.success('Login administrativo realizado com sucesso!');
        // Force page reload to ensure clean auth state
        window.location.href = '/admin-dashboard';
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast.error(error.message || 'Erro ao fazer login administrativo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Logo className="mb-8" />
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              Acesso Administrativo
            </h1>
          </div>
          <p className="text-muted-foreground">
            Área restrita para administradores do sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Login de Administrador</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Administrativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@calmconnect.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Verificando...' : 'Acessar Sistema'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <button
            onClick={() => navigate('/patient-login')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Área do Paciente
          </button>
          <span className="text-muted-foreground mx-2">•</span>
          <button
            onClick={() => navigate('/psychologist-login')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Área do Psicólogo
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;