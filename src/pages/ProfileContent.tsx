import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  MessageCircle
} from 'lucide-react';

interface ProfileData {
  full_name: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
}

const ProfileContent: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get patient data first
      const { data: patientData } = await supabase
        .from('patients')
        .select('full_name, email, phone, city, state')
        .eq('user_id', user.id)
        .single();

      if (patientData) {
        setProfileData(patientData);
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
      setIsLoading(false);
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

  if (isLoading) {
    return <PageSkeleton type="profile" />;
  }

  const menuItems = [
    {
      icon: Settings,
      label: "Configurações da Conta",
      description: "Altere suas informações pessoais",
      onClick: () => navigate('/account-settings'),
      color: 'hsl(230,100%,66%)'
    },
    {
      icon: CreditCard,
      label: "Planos de Assinatura",
      description: "Gerencie sua assinatura",
      onClick: () => navigate('/subscription-plans'),
      color: 'hsl(142,76%,66%)'
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

        {/* Daily Mood Toggle */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyMoodToggle />
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