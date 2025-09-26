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
      icon: <Calendar className="w-12 h-12 text-primary" />,
      title: "Appointments",
      onClick: () => navigate('/appointments')
    },
    {
      icon: <Activity className="w-12 h-12 text-primary" />,
      title: "Guided Breathing", 
      onClick: () => navigate('/breathing')
    },
    {
      icon: <Headphones className="w-12 h-12 text-primary" />,
      title: "Therapeutic Sounds",
      onClick: () => navigate('/sounds')
    },
    {
      icon: <Users2 className="w-12 h-12 text-primary" />,
      title: "Support Groups",
      onClick: () => navigate('/support-groups')
    },
    {
      icon: <BookOpen className="w-12 h-12 text-primary" />,
      title: "My Diary",
      onClick: () => navigate('/journal')
    },
    {
      icon: <BarChart3 className="w-12 h-12 text-primary" />,
      title: "My Progress", 
      onClick: () => navigate('/statistics')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{firstName}</h1>
          <div className="flex items-center gap-3">
            <NotificationButton />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 pb-24">
        {/* Feature Grid - 2x3 Layout */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="bg-card hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer border border-border"
              onClick={feature.onClick}
            >
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground text-sm leading-tight">
                  {feature.title}
                </h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default HomePage;