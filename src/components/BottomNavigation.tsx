import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Calendar, User, MessageCircle } from "lucide-react";

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      icon: Home,
      label: "Home",
      path: "/home",
      isActive: location.pathname === "/home"
    },
    {
      icon: MessageCircle,
      label: "Chat",
      path: "/chat",
      isActive: location.pathname.startsWith("/chat")
    },
    {
      icon: Calendar,
      label: "Consultas",
      path: "/appointments",
      isActive: location.pathname === "/appointments"
    },
    {
      icon: User,
      label: "Perfil",
      path: "/profile",
      isActive: location.pathname === "/profile"
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border/30 shadow-xl safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={`flex-col h-auto py-3 px-4 rounded-2xl transition-all duration-300 hover-lift ${
                item.isActive
                  ? "bg-gradient-primary text-white shadow-primary scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/30 hover:scale-105"
              }`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center mb-1.5 transition-all duration-300 ${
                item.isActive 
                  ? "bg-white/20 shadow-lg" 
                  : "group-hover:bg-accent/20"
              }`}>
                <Icon className={`w-5 h-5 ${item.isActive ? 'drop-shadow-sm' : ''}`} />
              </div>
              <span className={`text-xs font-semibold tracking-wide ${
                item.isActive ? 'drop-shadow-sm' : ''
              }`}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;