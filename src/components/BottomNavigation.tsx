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
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border/20 shadow-sm safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={`flex-col h-auto py-3 px-4 rounded-xl transition-all duration-200 ${
                item.isActive
                  ? "bg-primary text-white scale-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 hover:scale-105"
              }`}
            >
              <div className={`w-6 h-6 flex items-center justify-center mb-1.5 transition-all duration-200`}>
                <Icon className={`w-5 h-5 ${item.isActive ? '' : 'opacity-70'}`} />
              </div>
              <span className={`text-xs font-medium tracking-wide transition-all duration-200`}>
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