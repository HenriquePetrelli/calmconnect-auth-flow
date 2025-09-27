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
    <nav className="flex h-full">
      <div className="flex h-full w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          
          if (item.isSpecial) {
            return (
              <div key={item.path} className="flex-1 flex justify-center items-center">
                <button
                  onClick={() => navigate(item.path)}
                  className="w-16 h-16 rounded-full bg-[hsl(0,84%,60%)] hover:bg-[hsl(0,84%,50%)] text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 z-10 relative -mt-4"
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
                className={`flex flex-col items-center justify-center w-full h-full p-2 transition-all duration-200 relative ${
                  item.isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                {item.isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full transition-all duration-200"></div>
                )}
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
