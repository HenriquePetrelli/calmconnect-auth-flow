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

  const sosItem = navItems.find((item) => item.isSpecial)!;
  const SosIcon = sosItem.icon;

  return (
    <nav className="tabs relative grid grid-cols-5 items-center !gap-0 !justify-normal px-2">
      {navItems.map((item) => {
        const Icon = item.icon;

        const isSpecial = item.isSpecial;

        return (
          <button
            key={item.path}
            onClick={() => (isSpecial ? onSOSClick?.() || navigate(item.path) : navigate(item.path))}
            className={`tab-item flex flex-col items-center justify-center h-full px-2 py-1 transition-all duration-200 relative rounded-2xl ${
              isSpecial
                ? ""
                : item.isActive
                  ? "text-secondary-foreground bg-secondary-foreground/20 shadow-sm"
                  : "text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-secondary-foreground/10"
            }`}
          >
            {!isSpecial && item.isActive && (
              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-secondary-foreground rounded-full transition-all duration-200"></div>
            )}
            {isSpecial ? (
              <span className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[0_10px_24px_-6px_hsl(var(--primary)/0.55)] ring-4 ring-background transition-transform duration-200 hover:scale-105 active:scale-95">
                <Icon className="h-8 w-8" />
              </span>
            ) : (
              <Icon className="w-5 h-5 transition-all duration-200" />
            )}
            {!isSpecial && <span className="text-xs mt-1 transition-all duration-200">{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
