import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModernFeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
  disabled?: boolean;
  isPremium?: boolean;
  showPremiumBadge?: boolean;
  onClick?: () => void;
  variant?: 'breathing' | 'sounds' | 'evolution' | 'professional' | 'default';
}

const ModernFeatureCard = ({ 
  icon, 
  title, 
  description, 
  className,
  disabled = false,
  isPremium = false,
  showPremiumBadge = false,
  onClick,
  variant = 'default'
}: ModernFeatureCardProps) => {
  
  const getVariantStyles = () => {
    if (disabled || (isPremium && showPremiumBadge)) {
      return "opacity-60 cursor-not-allowed bg-muted/30";
    }
    
    const variants = {
      breathing: "bg-gradient-to-br from-breathing-primary/8 to-breathing-secondary/12 border-breathing-primary/25 hover:border-breathing-primary/50 hover:shadow-breathing hover:from-breathing-primary/12",
      sounds: "bg-gradient-to-br from-sounds-primary/8 to-sounds-secondary/12 border-sounds-primary/25 hover:border-sounds-primary/50 hover:shadow-sounds hover:from-sounds-primary/12",
      evolution: "bg-gradient-to-br from-evolution-primary/8 to-evolution-secondary/12 border-evolution-primary/25 hover:border-evolution-primary/50 hover:shadow-evolution hover:from-evolution-primary/12",
      professional: "bg-gradient-to-br from-professional-primary/8 to-professional-secondary/12 border-professional-primary/25 hover:border-professional-primary/50 hover:shadow-professional hover:from-professional-primary/12",
      default: "bg-gradient-card border-border/50 hover:border-primary/30 hover:shadow-md"
    };
    
    return cn(
      "cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 tap-scale",
      variants[variant]
    );
  };

  const getIconStyles = () => {
    if (disabled || (isPremium && showPremiumBadge)) {
      return "bg-muted text-muted-foreground";
    }
    
    const iconVariants = {
      breathing: "bg-gradient-breathing text-white shadow-breathing/25",
      sounds: "bg-gradient-sounds text-white shadow-sounds/25",
      evolution: "bg-gradient-evolution text-white shadow-evolution/25",
      professional: "bg-gradient-professional text-white shadow-professional/25",
      default: "bg-gradient-primary text-white shadow-primary/20"
    };
    
    return cn(
      "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-110 group-hover:scale-115",
      iconVariants[variant]
    );
  };

  const handleClick = () => {
    if (disabled || (isPremium && showPremiumBadge)) return;
    onClick?.();
  };

  return (
    <div className="relative">
      <Card 
        className={cn(
          "rounded-2xl border shadow-sm transition-all duration-300 group",
          getVariantStyles(),
          className
        )}
        onClick={handleClick}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center gap-4">
            {/* Icon */}
            <div className={getIconStyles()}>
              {icon}
            </div>
            
            {/* Content */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base text-card-foreground leading-tight">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Premium Badge */}
      {isPremium && showPremiumBadge && (
        <Badge 
          className="absolute -top-2 -right-2 bg-premium-primary text-premium-primary border-premium-primary/20 shadow-premium animate-scale-in flex items-center gap-1 px-2 py-1"
          variant="outline"
        >
          <Crown className="w-3 h-3" />
        </Badge>
      )}
    </div>
  );
};

export default ModernFeatureCard;