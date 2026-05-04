import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import BottomNavigation from "@/components/BottomNavigation";
import ConfirmationModal from "@/components/sos/ConfirmationModal";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [moodEnabled, setMoodEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadMoodEnabled = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('patients')
        .select('daily_mood_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) setMoodEnabled(data?.daily_mood_enabled !== false);
    };
    loadMoodEnabled();

    const handleMoodToggleChange = (event: CustomEvent) => {
      setMoodEnabled(event.detail.enabled);
    };
    window.addEventListener('moodToggleChanged', handleMoodToggleChange as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('moodToggleChanged', handleMoodToggleChange as EventListener);
    };
  }, [user?.id]);

  const handleSOSConfirm = () => {
    setShowSOSModal(false);
    navigate('/sos');
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/home':
        return `Olá, ${firstName}!`;
      case '/chat':
        return 'Chat';
      case '/profile':
        return 'Perfil';
      case '/appointments':
        return 'Consultas';
      default:
        return 'Soliv';
    }
  };

  return (
    <div className="min-h-screen">
      <div className="min-h-screen">
        <DesktopSidebar />
        
        <div className="lg:pl-64">
          {/* Mobile/Tablet Header */}
          <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md shadow-sm border-b border-border">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              
              {/* PERFIL À ESQUERDA */}
              <div 
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer" 
                onClick={() => navigate('/profile')}
              >
                <span className="text-primary-foreground text-sm font-medium">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              </div>
              
              {/* SOLIV CENTRALIZADO */}
              <div className="flex items-center space-x-2 absolute left-1/2 transform -translate-x-1/2">
                <Sun className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold text-foreground">Soliv</span>
              </div>
              
              {/* NOTIFICAÇÕES À DIREITA */}
              <button 
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
              </button>
            </div>
          </header>

          {/* Desktop Header */}
          <header className="hidden lg:block bg-card/80 backdrop-blur-md border-b border-border px-6 py-3">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {getPageTitle()}
                </h1>
                {location.pathname === '/home' && moodEnabled && (
                  <p className="text-sm text-muted-foreground">Como você está se sentindo hoje?</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <NotificationButton />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="pt-16 lg:pt-0 pb-20 lg:pb-6">
            {children}
          </main>
        </div>

        {/* Bottom Navigation - Only on Mobile/Tablet */}
        <div className="lg:hidden">
          <BottomNavigation onSOSClick={() => setShowSOSModal(true)} />
        </div>

        {/* SOS Modal */}
        <ConfirmationModal
          open={showSOSModal}
          onOpenChange={setShowSOSModal}
          onConfirm={handleSOSConfirm}
        />
      </div>
    </div>
  );
};

export default MainLayout;