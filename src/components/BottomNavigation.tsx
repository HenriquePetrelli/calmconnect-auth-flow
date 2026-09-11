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

        // Reserva o espaço da coluna do meio; o botão em si é renderizado
        // fora do grid (abaixo) e centralizado na barra inteira, não nesta
        // célula — assim a centralização não depende da matemática do grid.
        if (item.isSpecial) {
          return <div key={item.path} aria-hidden="true" />;
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

      <button
        onClick={onSOSClick || (() => navigate(sosItem.path))}
        style={{ position: "fixed", left: "50%", bottom: "calc(16px + env(safe-area-inset-bottom) + 8px)", transform: "translateX(-50%)", width: 75, height: 75 }}
        className="tab-item sos flex items-center justify-center rounded-full text-primary-foreground shadow-[0_12px_28px_-8px_hsl(var(--primary)/0.5)] ring-4 ring-background transition-transform duration-200 hover:scale-105 active:scale-95 z-[1001]"
        aria-label="Ajuda Emergencial"
      >
        <SosIcon className="h-10 w-10" />
      </button>
    </nav>
  );
};

export default BottomNavigation;
