import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown, LogOut, Settings, User as UserIcon, MessageCircle, Edit } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DailyMoodToggle } from "@/components/DailyMoodToggle";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";
import ProfileSkeleton from "@/components/ProfileSkeleton";
import EditSymptomsModal from "@/components/EditSymptomsModal";

const Profile = () => {
  const navigate = useNavigate();
  const { subscribed, subscriptionTier } = useSubscription();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editSymptomsOpen, setEditSymptomsOpen] = useState(false);

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
          "• Acesso à biblioteca de sons",
          "• Exercícios de respiração básicos"
        ]
      };
    }
    
    if (subscriptionTier === "Plus") {
      return {
        name: "Plano Plus",
        price: "R$ 69,99",
        features: [
          "• 1 chamada emergencial por mês",
          "• Duração: 25 minutos",
          "• Acesso à biblioteca de sons",
          "• Exercícios de respiração"
        ]
      };
    }
    
    if (subscriptionTier === "Premium") {
      return {
        name: "Plano Premium",
        price: "R$ 120,00",
        features: [
          "• 1 chamada emergencial por mês",
          "• 1 consulta agendada por mês",
          "• Duração: 50 minutos",
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
        "• Acesso à biblioteca de sons",
        "• Exercícios de respiração básicos"
      ]
    };
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  const planInfo = getPlanInfo();

  return (
    <div className="has-tabs">
      <div className="screen">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Perfil</h1>
        </div>

        {/* Content */}
        <main className="p-4 space-y-6">
          {/* User Info */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/30 shadow-lg">
                  <UserIcon className="text-primary" size={36} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    {user?.profile?.full_name || 'Usuário'}
                  </h2>
                  <p className="text-muted-foreground text-base">{user?.email}</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {subscribed ? `Plano ${subscriptionTier}` : 'Plano Grátis'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Current Plan */}
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-premium-primary/20 rounded-full flex items-center justify-center">
                  <Crown className="text-premium-primary" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Plano Atual</h3>
                  <p className="text-sm text-muted-foreground font-normal">Gerencie sua assinatura</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="font-bold text-lg text-foreground">{planInfo.name}</div>
                  <div className="space-y-2">
                    {planInfo.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        <span className="text-sm text-muted-foreground">{feature.replace('• ', '')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right bg-primary/5 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-primary">{planInfo.price}</div>
                  <div className="text-sm text-muted-foreground">/mês</div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                {!subscribed ? (
                  <Button className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-105" onClick={handleManageSubscription}>
                    <Crown size={18} className="mr-2" />
                    Fazer Upgrade
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full h-12 text-base font-semibold" onClick={handleManageSubscription}>
                    Gerenciar Assinatura
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings size={20} className="text-primary" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-muted/30 to-transparent">
                <div className="space-y-1">
                  <div className="text-base font-semibold">Tema do Aplicativo</div>
                  <div className="text-sm text-muted-foreground">
                    Alternar entre modo claro e escuro
                  </div>
                </div>
                <ThemeToggle />
              </div>
              
              <DailyMoodToggle />
              
              <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-muted/30 to-transparent">
                <div className="space-y-1">
                  <div className="text-base font-semibold">Meus Sintomas</div>
                  <div className="text-sm text-muted-foreground">
                    Configure os sintomas que você apresenta
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditSymptomsOpen(true)}
                >
                  <Edit size={16} className="mr-2" />
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 text-base transition-all duration-200 hover:bg-primary/5" 
                onClick={() => navigate('/account-settings')}
              >
                <Settings size={18} className="mr-3" />
                Alterar Dados da Conta
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 text-base transition-all duration-200 hover:bg-primary/5" 
                onClick={() => navigate('/paciente/suporte')}
              >
                <MessageCircle size={18} className="mr-3" />
                Suporte
              </Button>
              
              <div className="pt-2 border-t">
                <Button 
                  variant="destructive" 
                  className="w-full justify-start h-12 text-base font-semibold transition-all duration-200 hover:scale-105" 
                  onClick={handleLogout}
                >
                  <LogOut size={18} className="mr-3" />
                  Sair da Conta
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Edit Symptoms Modal */}
      {user && (
        <EditSymptomsModal 
          open={editSymptomsOpen}
          onOpenChange={setEditSymptomsOpen}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default Profile;