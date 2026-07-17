import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, BarChart3, MessageCircle, Sun } from "lucide-react";

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
      icon: () => <Sun className="w-7 h-7 text-primary-foreground" />,
      label: "",
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
    <nav className="tabs grid grid-cols-5 !gap-0 !justify-normal px-2">
      {navItems.map((item) => {
        const Icon = item.icon;

        if (item.isSpecial) {
          return (
            <div key={item.path} className="flex items-center justify-center">
              <button
                onClick={onSOSClick || (() => navigate(item.path))}
                className="tab-item sos bg-primary hover:opacity-90 text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl"
                aria-label="Ajuda Emergencial"
              >
                <Icon />
              </button>
            </div>
          );
        }

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`tab-item flex flex-col items-center justify-center h-full p-2 transition-all duration-200 relative rounded-lg ${
              item.isActive
                ? "text-secondary-foreground bg-secondary-foreground/20"
                : "text-secondary-foreground/70 hover:text-secondary-foreground"
            }`}
          >
            {item.isActive && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-secondary-foreground rounded-full transition-all duration-200"></div>
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
