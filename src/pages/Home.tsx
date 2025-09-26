import { 
  Calendar, 
  MessageCircle, 
  Users2, 
  Activity, 
  Headphones, 
  BarChart3, 
  BookOpen,
  Bell
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNavigation from "@/components/BottomNavigation";

const HomePage = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile(user);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const firstName = userProfile?.user_metadata?.full_name?.split(' ')[0] || 'Soliv';

  const features = [
    {
      icon: <Calendar className="w-8 h-8 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "Appointments",
      subtitle: "Schedule consultations",
      onClick: () => navigate('/appointments')
    },
    {
      icon: <Activity className="w-8 h-8 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "Guided Breathing", 
      subtitle: "Relaxation exercises",
      onClick: () => navigate('/breathing')
    },
    {
      icon: <Headphones className="w-8 h-8 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "Therapeutic Sounds",
      subtitle: "Calming audio library",
      onClick: () => navigate('/sounds')
    },
    {
      icon: <Users2 className="w-8 h-8 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "Support Groups",
      subtitle: "Community support",
      onClick: () => navigate('/support-groups')
    },
    {
      icon: <BookOpen className="w-8 h-8 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "My Diary",
      subtitle: "Personal journaling",
      onClick: () => navigate('/journal')
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "My Progress", 
      subtitle: "Track your journey",
      onClick: () => navigate('/statistics')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground p-6 shadow-lg">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div>
            <h1 className="text-2xl font-bold mb-1">Olá, {firstName}!</h1>
            <p className="text-primary-foreground/80 text-sm">Como você está se sentindo hoje?</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationButton />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 pb-24">
        {/* Feature Grid - 2x3 Layout */}
        <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-border/60 hover:border-primary/30"
              onClick={feature.onClick}
            >
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4 p-3 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300 mx-auto w-fit">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground text-sm leading-tight mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                  {feature.subtitle}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions Section */}
        <div className="mt-8 max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card 
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-border/60"
              onClick={() => navigate('/sos')}
            >
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">SOS</span>
                </div>
                <p className="text-sm font-medium text-foreground">Emergency Help</p>
              </CardContent>
            </Card>
            
            <Card 
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-border/60"
              onClick={() => navigate('/chat')}
            >
              <CardContent className="p-4 text-center">
                <MessageCircle className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
                <p className="text-sm font-medium text-foreground">Chat</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default HomePage;