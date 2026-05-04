import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, BarChart3, MessageCircle } from "lucide-react";

interface BottomNavigationProps {
  onSOSClick?: () => void;
}

const BottomNavigation = ({ onSOSClick }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      icon: Home,
      label: "Home",
      path: "/home",
      isActive: location.pathname === "/home",
    },
    {
      icon: MessageCircle,
      label: "Chat",
      path: "/chat",
      isActive: location.pathname === "/chat",
    },
    {
      icon: () => <span className="text-sm font-bold">SOS</span>,
      label: "",
      path: "/sos",
      isActive: location.pathname === "/sos",
      isSpecial: true,
    },
    {
      icon: Calendar,
      label: "Consultas",
      path: "/appointments",
      isActive: location.pathname === "/appointments",
    },
    {
      icon: BarChart3,
      label: "Progresso",
      path: "/statistics",
      isActive: location.pathname.startsWith("/statistics") || location.pathname === "/progress",
    },
  ];

  return (
    <nav className="tabs">
      {navItems.map((item) => {
        const Icon = item.icon;

        if (item.isSpecial) {
          return (
            <button
              key={item.path}
              onClick={onSOSClick || (() => navigate(item.path))}
              className="tab-item sos bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
            >
              <Icon />
            </button>
          );
        }

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`tab-item flex flex-col items-center justify-center flex-1 h-full p-2 transition-all duration-200 relative rounded-lg ${
              item.isActive
                ? "text-primary-foreground bg-primary-foreground/20"
                : "text-primary-foreground/70 hover:text-primary-foreground"
            }`}
          >
            {item.isActive && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary-foreground rounded-full transition-all duration-200"></div>
            )}
            <Icon className="w-5 h-5 transition-all duration-200" />
            <span className="text-xs mt-1 transition-all duration-200">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
