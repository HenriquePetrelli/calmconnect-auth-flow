import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageCircle, 
  Calendar, 
  TrendingUp, 
  BookOpen, 
  Users,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

const sidebarItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: MessageCircle, label: 'Chat', path: '/chat' },
  { icon: Calendar, label: 'Consultas', path: '/appointments' },
  { icon: TrendingUp, label: 'Meu Progresso', path: '/statistics' },
  { icon: BookOpen, label: 'Meu Diário', path: '/journal' },
  { icon: Users, label: 'Suporte', path: '/support-groups' },
];

export const DesktopSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-card lg:border-r lg:border-border">
      {/* Logo Section */}
      <div className="flex items-center justify-center p-6 border-b border-border">
        <Logo className="scale-75" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              variant={isActive ? "secondary" : "ghost"}
              className={`
                w-full justify-start gap-3 h-12 text-left
                ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}
              `}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Button>
          );
        })}
      </nav>

      {/* Emergency Button */}
      <div className="p-4 border-t border-border">
        <Button
          variant="destructive"
          className="w-full gap-2 h-12"
          onClick={() => navigate('/sos')}
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">Ajuda Emergencial</span>
        </Button>
      </div>
    </aside>
  );
};