import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  MessageCircle,
  Calendar,
  Sun,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoImg from '@/assets/soliv-logo.svg';
import { useAuth } from '@/contexts/AuthContext';

const sidebarItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: MessageCircle, label: 'Chat', path: '/chat' },
  { icon: Calendar, label: 'Consultas', path: '/appointments' },
  { icon: BarChart3, label: 'Meu Progresso', path: '/statistics' },
];


export const DesktopSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const fullName = user?.user_metadata?.full_name || 'Paciente';
  const firstName = fullName.split(' ')[0] || 'Paciente';
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-secondary lg:text-secondary-foreground lg:border-r lg:border-secondary/40">
      {/* Logo Section */}
      <div className="flex items-center justify-center p-6 border-b border-secondary-foreground/15">
        <div
          className="bg-white rounded-full p-3 flex items-center justify-center shadow-md"
          style={{ border: '2px solid hsl(var(--secondary-glow))' }}
        >
          <img
            src={logoImg}
            alt="Soliv"
            style={{ width: '80px', height: '80px' }}
            className="object-contain select-none"
            draggable={false}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              variant="ghost"
              className={`
                w-full justify-start gap-3 h-12 text-left transition-all duration-200
                text-secondary-foreground hover:bg-secondary-foreground/15 hover:text-secondary-foreground
                ${isActive ? 'bg-secondary-foreground/20' : ''}
              `}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Button>
          );
        })}
      </nav>

      {/* SOS / Ajuda Emergencial */}
      <div className="px-4 pb-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-12 text-left transition-all duration-200 bg-primary text-white hover:bg-primary/90 hover:text-white"
          onClick={() => navigate('/sos')}
        >
          <Sun className="w-5 h-5" />
          <span className="font-medium">Ajuda Emergencial</span>
        </Button>
      </div>

      {/* Profile Card */}
      <div className="p-4 border-t border-secondary-foreground/15">
        <button
          onClick={() => navigate('/profile')}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary-foreground/10 hover:bg-secondary-foreground/20 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-secondary-foreground truncate">{firstName}</p>
            <p className="text-xs text-secondary-foreground/70">Ver perfil</p>
          </div>
          <ChevronRight className="w-4 h-4 text-secondary-foreground/70 flex-shrink-0" />
        </button>
      </div>
    </aside>
  );
};
