import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWeeklyGoals } from "@/hooks/useWeeklyGoals";

const AccountSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showGoalModal, setShowGoalModalState] = useState(true);
  const { getShowGoalModalPreference, setShowGoalModal } = useWeeklyGoals();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchUserData();
    loadGoalModalPreference();
  }, []);

  const loadGoalModalPreference = async () => {
    const preference = await getShowGoalModalPreference();
    setShowGoalModalState(preference);
  };

  const handleToggleGoalModal = async (checked: boolean) => {
    setShowGoalModalState(checked);
    await setShowGoalModal(checked);
  };

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();

        setUser({ ...user, profile });
        setFormData((prev) => ({
          ...prev,
          fullName: profile?.full_name || "",
          email: user.email || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: formData.fullName })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email,
        });
        if (emailError) throw emailError;
      }

      toast({
        title: "Sucesso",
        description: "Dados atualizados com sucesso!",
      });

      fetchUserData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Senha atualizada com sucesso!",
      });

      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar senha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Alterar Dados da Conta</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 max-w-md mx-auto">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Digite seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Digite seu email"
              />
            </div>

            <Button onClick={handleUpdateProfile} disabled={loading} className="w-full">
              <Save size={16} className="mr-2" />
              {loading ? "Salvando..." : "Salvar Informações"}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Digite a nova senha"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirme a nova senha"
              />
            </div>

            <Button
              onClick={handleUpdatePassword}
              disabled={loading || !formData.newPassword || !formData.confirmPassword}
              className="w-full"
              variant="outline"
            >
              <Save size={16} className="mr-2" />
              {loading ? "Alterando..." : "Alterar Senha"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;
