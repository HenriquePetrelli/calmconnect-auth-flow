import { 
  Calendar, 
  MessageCircle, 
  Users2, 
  Activity, 
  Headphones, 
  BarChart3, 
  BookOpen,
  Bell,
  Home,
  User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      icon: <Calendar className="w-12 h-12 text-emma-primary" />,
      title: "Appointments",
      onClick: () => navigate('/appointments')
    },
    {
      icon: <Activity className="w-12 h-12 text-emma-primary" />,
      title: "Guided Breathing", 
      onClick: () => navigate('/breathing')
    },
    {
      icon: <Headphones className="w-12 h-12 text-emma-primary" />,
      title: "Therapeutic Sounds",
      onClick: () => navigate('/sounds')
    },
    {
      icon: <Users2 className="w-12 h-12 text-emma-primary" />,
      title: "Support Groups",
      onClick: () => navigate('/support-groups')
    },
    {
      icon: <BookOpen className="w-12 h-12 text-emma-primary" />,
      title: "My Diary",
      onClick: () => navigate('/journal')
    },
    {
      icon: <BarChart3 className="w-12 h-12 text-emma-primary" />,
      title: "My Progress", 
      onClick: () => navigate('/statistics')
    }
  ];

  return (
    <div className="min-h-screen bg-emma-background">
      {/* Emma-style Header */}
      <div className="bg-emma-header text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{firstName}</h1>
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {/* Feature Grid - 2x3 Layout like Emma */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="emma-card cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={feature.onClick}
            >
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-emma-text text-sm leading-tight">
                  {feature.title}
                </h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Navigation like Emma */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-emma-primary">
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-gray-400" onClick={() => navigate('/appointments')}>
            <Calendar className="w-5 h-5" />
            <span className="text-xs">Consultas</span>
          </Button>
          
          {/* SOS Button */}
          <Button 
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-sm font-bold shadow-lg"
            onClick={() => navigate('/sos')}
          >
            SOS
          </Button>
          
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-gray-400" onClick={() => navigate('/chat')}>
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">Chat</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-gray-400" onClick={() => navigate('/profile')}>
            <User className="w-5 h-5" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;