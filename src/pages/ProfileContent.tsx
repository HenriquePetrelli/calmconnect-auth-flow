import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { DailyMoodToggle } from '@/components/DailyMoodToggle';
import PageSkeleton from '@/components/PageSkeleton';
import { 
  User, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Phone, 
  Mail, 
  MapPin,
  Shield,
  CreditCard,
  MessageCircle,
  Crown,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';

interface ProfileData {
  full_name: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  daily_mood_enabled?: boolean;
}

const ProfileContent: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscribed, subscriptionTier, loading: subscriptionLoading } = useSubscription();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [toggleReady, setToggleReady] = useState(false);
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Wait for all profile-related data to load
      const [patientDataResult] = await Promise.allSettled([
        supabase
          .from('patients')
          .select('full_name, email, phone, city, state, daily_mood_enabled')
          .eq('user_id', user.id)
          .single()
      ]);

      if (patientDataResult.status === 'fulfilled' && patientDataResult.value.data) {
        setProfileData(patientDataResult.value.data);
      } else {
        // Fallback to user metadata
        setProfileData({
          full_name: user.user_metadata?.full_name || 'Usuário',
          email: user.email || '',
          phone: user.user_metadata?.phone,
          city: user.user_metadata?.city,
          state: user.user_metadata?.state
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do perfil.",
        variant: "destructive"
      });
    } finally {
      setDataReady(true);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout.",
        variant: "destructive"
      });
    }
  };

  const showSkeleton = !(dataReady && toggleReady && !subscriptionLoading);
  if (showSkeleton) {
    return <PageSkeleton type="profile" />;
  }

  const getPlanDisplayInfo = () => {
    if (!subscribed) {
      return { name: 'Plano Gratuito', price: 'R$ 0,00/mês' };
    }
    
    switch (subscriptionTier?.toLowerCase()) {
      case 'plus':
        return { name: 'Plano Plus', price: 'R$ 89,00/mês' };
      case 'premium':
        return { name: 'Plano Premium', price: 'R$ 120,00/mês' };
      default:
        return { name: 'Plano Ativo', price: 'Consulte valor' };
    }
  };

  const getPlanBenefits = () => {
    const commonBenefits = [
      'Acesso à biblioteca de sons',
      'Exercícios de respiração'
    ];

    if (!subscribed) {
      return [
        'Funcionalidades limitadas',
        ...commonBenefits
      ];
    }

    switch (subscriptionTier?.toLowerCase()) {
      case 'plus':
        return [
          '1 chamada emergencial por mês',
          '1 consulta agendada por mês',
          'Duração: 50 minutos',
          ...commonBenefits,
          'Suporte prioritário'
        ];
      case 'premium':
        return [
          'Chamadas emergenciais ilimitadas',
          '1 consulta agendada por mês',
          'Duração: 50 minutos',
          ...commonBenefits,
          'Suporte prioritário'
        ];
      default:
        return commonBenefits;
    }
  };

  const menuItems = [
    {
      icon: Settings,
      label: "Configurações da Conta",
      description: "Altere suas informações pessoais",
      onClick: () => navigate('/account-settings'),
      color: 'hsl(230,100%,66%)'
    },
    {
      icon: HelpCircle,
      label: "Suporte",
      description: "Precisa de ajuda? Entre em contato",
      onClick: () => navigate('/paciente/suporte'),
      color: 'hsl(271,91%,65%)'
    }
  ];

  return (
    <div className="px-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">
                  {profileData?.full_name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">{profileData?.full_name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Paciente
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="w-4 h-4 mr-2" />
              {profileData?.email}
            </div>
            {profileData?.phone && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="w-4 h-4 mr-2" />
                {profileData.phone}
              </div>
            )}
            {(profileData?.city || profileData?.state) && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2" />
                {[profileData.city, profileData.state].filter(Boolean).join(', ')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Plan Section */}
        <Card className="shadow-sm">
          <div 
            className="cursor-pointer transition-all duration-200 hover:bg-accent/5"
            onClick={() => setPlanDropdownOpen(!planDropdownOpen)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{getPlanDisplayInfo().name}</h3>
                    <p className="text-sm text-muted-foreground">{getPlanDisplayInfo().price}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {planDropdownOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
                  )}
                </div>
              </div>
            </CardContent>
          </div>
          
          {/* Dropdown Content with Animation */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            planDropdownOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="border-t border-border/50 pt-4">
                <h4 className="font-medium text-foreground mb-3">Benefícios do seu plano:</h4>
                <div className="space-y-2 mb-4">
                  {getPlanBenefits().map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
                <Button 
                  className="w-full"
                  onClick={() => navigate('/subscription-plans')}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Gerenciar Assinatura
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Daily Mood Toggle */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyMoodToggle 
              initialEnabled={profileData?.daily_mood_enabled !== false}
              onReady={() => setToggleReady(true)}
            />
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card 
                key={index} 
                className="shadow-sm cursor-pointer hover:border-primary/50 transition-colors group"
                onClick={item.onClick}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{item.label}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sign Out */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileContent;