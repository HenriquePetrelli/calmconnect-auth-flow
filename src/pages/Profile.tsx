import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Crown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { subscribed, subscriptionTier } = useSubscription();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setUser({
          ...user,
          profile
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout.",
        variant: "destructive"
      });
    }
  };

  const handleManageSubscription = () => {
    navigate('/subscription-plans');
  };

  const getPlanInfo = () => {
    if (!subscribed) {
      return {
        name: "Plano Grátis",
        price: "R$ 0",
        features: [
          "• 1 consulta de emergência por mês",
          "• Acesso limitado aos recursos"
        ]
      };
    }
    
    if (subscriptionTier === "Plus") {
      return {
        name: "Plano Plus",
        price: "R$ 14,99",
        features: [
          "• 1 consulta por mês",
          "• 1 uso do botão SOS por mês",
          "• Acesso à biblioteca de sons",
          "• Exercícios de respiração"
        ]
      };
    }
    
    if (subscriptionTier === "Premium") {
      return {
        name: "Plano Premium",
        price: "R$ 24,99",
        features: [
          "• 2 consultas por mês",
          "• 2 usos do botão SOS por mês",
          "• Acesso à biblioteca de sons",
          "• Exercícios de respiração",
          "• Suporte prioritário"
        ]
      };
    }
    
    return {
      name: "Plano Grátis",
      price: "R$ 0",
      features: [
        "• 1 consulta de emergência por mês",
        "• Acesso limitado aos recursos"
      ]
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const planInfo = getPlanInfo();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Perfil</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* User Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <UserIcon className="text-primary" size={32} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">
                  {user?.profile?.full_name || 'Usuário'}
                </h2>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="text-primary" size={20} />
              Plano Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">{planInfo.name}</div>
                {planInfo.features.map((feature, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    {feature}
                  </div>
                ))}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{planInfo.price}</div>
                <div className="text-sm text-muted-foreground">/mês</div>
              </div>
            </div>
            
            {!subscribed ? (
              <Button className="w-full" onClick={handleManageSubscription}>
                <Crown size={16} className="mr-2" />
                Fazer Upgrade
              </Button>
            ) : (
              <div className="space-y-2">
                <Button className="w-full" onClick={handleManageSubscription}>
                  Gerenciar Assinatura
                </Button>
                {subscriptionTier !== "Plus" && (
                  <Button variant="outline" className="w-full" onClick={handleManageSubscription}>
                    Fazer Downgrade
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => navigate('/account-settings')}
            >
              <Settings size={16} className="mr-2" />
              Alterar Dados da Conta
            </Button>
            
            <Button 
              variant="destructive" 
              className="w-full justify-start" 
              onClick={handleLogout}
            >
              <LogOut size={16} className="mr-2" />
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;