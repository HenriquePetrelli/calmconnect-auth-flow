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
      isActive: location.pathname.startsWith("/chat"),
      isSpecial: false
    },
    {
      icon: () => <span className="text-sm font-bold">SOS</span>,
      label: "",
      path: "/sos",
      isActive: location.pathname === "/sos",
      isSpecial: true
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
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          
          if (item.isSpecial) {
            return (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg"
              >
                <span className="text-lg font-bold">SOS</span>
              </Button>
            );
          }
          
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={`flex-col items-center justify-center py-2 px-3 transition-all duration-200 relative ${
                item.isActive
                  ? "bg-primary text-white rounded-md"
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center mb-1">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">
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
