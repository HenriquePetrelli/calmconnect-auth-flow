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
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 h-16">
      <div className="flex h-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          
          if (item.isSpecial) {
            return (
              <div key={item.path} className="flex-1 flex justify-center items-center">
                <button
                  onClick={() => navigate(item.path)}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl z-10 relative -mt-4"
                >
                  <Icon />
                </button>
              </div>
            );
          }
          
          return (
            <div key={item.path} className="flex-1 flex justify-center items-center">
              <button 
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center w-full h-full p-2 transition-all duration-200 ${
                  item.isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
