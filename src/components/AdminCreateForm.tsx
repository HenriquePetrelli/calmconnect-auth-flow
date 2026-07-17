import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, Check, CheckCircle, AlertTriangle } from "lucide-react";

interface AdminCreateFormProps {
  onSuccess?: () => void;
}

const AdminCreateForm: React.FC<AdminCreateFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('admin@soliv.com');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('Administrador do Sistema');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<any>(null);

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
    let result = 'CC@dmin';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar para a área de transferência');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-admin-account', {
        body: {
          email,
          password,
          fullName
        }
      });

      if (error) throw error;

      if (data.success) {
        setCreatedAccount({
          email,
          password,
          fullName,
          userId: data.data.userId
        });
        toast.success('Conta de administrador criada com sucesso!');
        onSuccess?.();
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Error creating admin account:', error);
      toast.error(error.message || 'Erro ao criar conta de administrador');
    } finally {
      setLoading(false);
    }
  };

  // Show success screen with credentials
  if (createdAccount) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-success">
            ✅ Conta Criada com Sucesso!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-success">Credenciais da Conta Admin:</h3>
            
            <div className="space-y-2">
              <Label className="text-success">Email:</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={createdAccount.email} 
                  readOnly 
                  className="bg-white text-success"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdAccount.email)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-success">Senha:</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type={showPassword ? "text" : "password"}
                  value={createdAccount.password} 
                  readOnly 
                  className="bg-white text-success font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdAccount.password)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-warning/20 rounded-lg p-3">
            <p className="text-warning text-sm">
              ⚠️ <strong>Importante:</strong> Salve essas credenciais em local seguro. 
              A senha deve ser alterada no primeiro acesso.
            </p>
          </div>

          <Button 
            onClick={() => window.location.href = '/admin-login'}
            className="w-full"
          >
            Ir para Login Administrativo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">Criar Conta de Administrador</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite uma senha ou gere automaticamente"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
              >
                Gerar
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'Criando...' : 'Criar Conta Admin'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminCreateForm;