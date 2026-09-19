import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, BarChart3, MessageCircle } from "lucide-react";
import LifeRingIcon from "@/components/icons/LifeRingIcon";

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
      icon: Calendar,
      label: "Consultas",
      path: "/appointments",
      isActive: location.pathname === "/appointments",
    },
    {
      icon: LifeRingIcon,
      label: "SOS",
      path: "/sos",
      isActive: location.pathname === "/sos",
      isSpecial: true,
    },
    {
      icon: MessageCircle,
      label: "Chat",
      path: "/chat",
      isActive: location.pathname === "/chat",
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
        const isSpecial = item.isSpecial;

        if (isSpecial) {
          return (
            <div key={item.path} className="tab-item sos relative flex items-center justify-center h-full">
              <button
                onClick={() => {
                  if (onSOSClick) onSOSClick();
                  else navigate(item.path);
                }}
                aria-label="Pedir ajuda emergencial agora"
                className="sos-button"
              >
                <Icon className="h-9 w-9" />
              </button>
            </div>
          );
        }

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`tab-item flex flex-col items-center justify-center h-full px-2 py-1 transition-all duration-200 relative rounded-2xl ${
              item.isActive
                ? "text-secondary-foreground bg-secondary-foreground/20 shadow-sm"
                : "text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-secondary-foreground/10"
            }`}
          >
            {item.isActive && (
              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-secondary-foreground rounded-full transition-all duration-200"></div>
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
