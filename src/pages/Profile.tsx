import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown, LogOut, Settings, User as UserIcon, MessageCircle, Edit, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DailyMoodToggle } from "@/components/DailyMoodToggle";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { useWeeklyGoals } from "@/hooks/useWeeklyGoals";

import ProfileSkeleton from "@/components/ProfileSkeleton";
import EditSymptomsModal from "@/components/EditSymptomsModal";

const Profile = () => {
  const navigate = useNavigate();
  const { subscribed, subscriptionTier } = useSubscription();
  const { toast } = useToast();
  const { getShowGoalModalPreference, setShowGoalModal } = useWeeklyGoals();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editSymptomsOpen, setEditSymptomsOpen] = useState(false);
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [showWeeklyGoalModal, setShowWeeklyGoalModal] = useState(true);

  useEffect(() => {
    fetchUserData();
    loadGoalModalPreference();
  }, []);

  const loadGoalModalPreference = async () => {
    const preference = await getShowGoalModalPreference();
    setShowWeeklyGoalModal(preference);
  };

  const handleToggleWeeklyGoalModal = async (checked: boolean) => {
    setShowWeeklyGoalModal(checked);
    await setShowGoalModal(checked);
  };

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
        price: "R$ 69,90",
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

  const initials = (user?.profile?.full_name || user?.email || 'U')
    .split(' ')
    .map((s: string) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">

          {/* Hero identity card */}
          <Card className="overflow-hidden border-border/60">
            <div className="relative p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-primary tracking-wide">
                      {initials}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-semibold text-foreground truncate">
                    {user?.profile?.full_name || 'Usuário'}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1.5 font-medium">
                      <Crown size={12} className="text-premium-primary" />
                      {subscribed ? `Plano ${subscriptionTier}` : 'Plano Grátis'}
                    </Badge>
                  </div>
                </div>
                <div className="hidden sm:flex">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/account-settings')}
                  >
                    <Edit size={14} className="mr-2" />
                    Editar perfil
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Plan */}
          <Collapsible open={planDropdownOpen} onOpenChange={setPlanDropdownOpen}>
            <Card className="overflow-hidden border-border/60">
              <CollapsibleTrigger className="w-full text-left">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-premium-primary/10 flex items-center justify-center">
                      <Crown className="text-premium-primary" size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{planInfo.name}</h3>
                      <p className="text-xs text-muted-foreground">{planInfo.price}/mês</p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`text-muted-foreground transition-transform duration-300 ${planDropdownOpen ? 'rotate-180' : ''}`}
                    size={18}
                  />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="animate-accordion-down">
                <div className="px-5 pb-5 space-y-5 border-t border-border/60 pt-5">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Benefícios inclusos</h4>
                    <ul className="space-y-1.5">
                      {planInfo.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span>{feature.replace('• ', '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {!subscribed ? (
                    <Button className="w-full h-11" onClick={handleManageSubscription}>
                      <Crown size={16} className="mr-2" />
                      Fazer upgrade
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full h-11" onClick={handleManageSubscription}>
                      Gerenciar assinatura
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Settings */}
          <Collapsible open={settingsDropdownOpen} onOpenChange={setSettingsDropdownOpen}>
            <Card className="overflow-hidden border-border/60">
              <CollapsibleTrigger className="w-full text-left">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                      <Settings size={20} className="text-foreground" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Configurações</h3>
                      <p className="text-xs text-muted-foreground">Preferências do aplicativo</p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`text-muted-foreground transition-transform duration-300 ${settingsDropdownOpen ? 'rotate-180' : ''}`}
                    size={18}
                  />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="animate-accordion-down">
                <div className="px-5 pb-5 pt-5 border-t border-border/60 divide-y divide-border/60">
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-sm font-medium">Tema do aplicativo</div>
                      <div className="text-xs text-muted-foreground">
                        Alternar entre modo claro e escuro
                      </div>
                    </div>
                    <ThemeToggle />
                  </div>

                  <PushNotificationToggle />

                  <div className="py-4">
                    <DailyMoodToggle />
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-sm font-medium">Modal de metas semanais</div>
                      <div className="text-xs text-muted-foreground">
                        Exibir modal toda segunda-feira para adicionar metas
                      </div>
                    </div>
                    <Switch
                      checked={showWeeklyGoalModal}
                      onCheckedChange={handleToggleWeeklyGoalModal}
                    />
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-sm font-medium">Meus sintomas</div>
                      <div className="text-xs text-muted-foreground">
                        Configure os sintomas que você apresenta
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditSymptomsOpen(true)}
                    >
                      <Edit size={14} className="mr-2" />
                      Editar
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Account actions */}
          <Card className="overflow-hidden border-border/60">
            <div className="divide-y divide-border/60">
              <button
                onClick={() => navigate('/account-settings')}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Settings size={18} className="text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Alterar dados da conta</div>
                  <div className="text-xs text-muted-foreground">Nome, e-mail e senha</div>
                </div>
                <ChevronDown size={16} className="-rotate-90 text-muted-foreground" />
              </button>

              <button
                onClick={() => navigate('/paciente/suporte')}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <MessageCircle size={18} className="text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Suporte</div>
                  <div className="text-xs text-muted-foreground">Fale com nossa equipe</div>
                </div>
                <ChevronDown size={16} className="-rotate-90 text-muted-foreground" />
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-destructive/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <LogOut size={18} className="text-destructive" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-destructive">Sair da conta</div>
                  <div className="text-xs text-muted-foreground">Encerrar sessão neste dispositivo</div>
                </div>
              </button>
            </div>
          </Card>


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