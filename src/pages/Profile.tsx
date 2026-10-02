import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown, LogOut, Settings, User as UserIcon, MessageCircle, Edit, ChevronDown, LockKeyhole, ScrollText, Building2 } from "lucide-react";
import ExpandableCard from "@/components/ExpandableCard";
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
  const { subscribed, subscriptionTier, entitlementSource, organizationName, paymentIssue, cancelAtPeriodEnd, subscriptionEnd } = useSubscription();
  const fromCompany = entitlementSource === 'organization';
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
      toast({ title: "Logout realizado" });
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
                  <h2 className="text-xl font-semibold text-foreground truncate">
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
          <ExpandableCard
            open={planDropdownOpen}
            onOpenChange={setPlanDropdownOpen}
            title={planInfo.name}
            subtitle={
              fromCompany
                ? `Oferecido pela ${organizationName}`
                : paymentIssue
                  ? 'Pagamento recusado: atualize o cartão'
                  : cancelAtPeriodEnd && subscriptionEnd
                    ? `Cancelado, ativo até ${new Date(subscriptionEnd).toLocaleDateString('pt-BR')}`
                    : `${planInfo.price}/mês`
            }
            contentClassName="px-0 pb-0"
          >
                <div className="px-4 pb-4 space-y-5 border-t border-border/60 pt-4">
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

                  {fromCompany ? (
                    <Button variant="outline" className="w-full h-11" onClick={() => navigate('/beneficio-empresa')}>
                      Ver benefício da empresa
                    </Button>
                  ) : !subscribed ? (
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
          </ExpandableCard>

          {/* Settings */}
          <ExpandableCard
            open={settingsDropdownOpen}
            onOpenChange={setSettingsDropdownOpen}
            title="Configurações"
            subtitle="Preferências do aplicativo"
            contentClassName="px-0 pb-0"
          >
                <div className="px-4 pb-2 pt-1 border-t border-border/60 divide-y divide-border/60">
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-sm font-medium">Tema do aplicativo</div>
                      <div className="text-xs text-muted-foreground">
                        Claro, escuro ou seguir o sistema
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
                      <div className="text-sm font-medium">Hábitos da semana</div>
                      <div className="text-xs text-muted-foreground">
                        Lembrar toda segunda-feira de escolher os hábitos da semana
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
          </ExpandableCard>

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
                onClick={() => navigate('/beneficio-empresa')}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 size={18} className="text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Benefício da empresa</div>
                  <div className="text-xs text-muted-foreground">
                    {fromCompany ? `Plano ${subscriptionTier} pela ${organizationName}` : 'Tem um código da sua empresa?'}
                  </div>
                </div>
                <ChevronDown size={16} className="-rotate-90 text-muted-foreground" />
              </button>

              <button
                onClick={() => navigate('/termos')}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <ScrollText size={18} className="text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Termos de Uso</div>
                  <div className="text-xs text-muted-foreground">Regras de uso, planos e cancelamento</div>
                </div>
                <ChevronDown size={16} className="-rotate-90 text-muted-foreground" />
              </button>

              <button
                onClick={() => navigate('/privacidade')}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <LockKeyhole size={18} className="text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Política de Privacidade</div>
                  <div className="text-xs text-muted-foreground">Como tratamos os seus dados</div>
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