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
      breathing: "bg-card border-l-4 border-l-breathing-primary shadow-sm hover:border-l-breathing-primary/80",
      sounds: "bg-card border-l-4 border-l-sounds-primary shadow-sm hover:border-l-sounds-primary/80",
      evolution: "bg-card border-l-4 border-l-evolution-primary shadow-sm hover:border-l-evolution-primary/80",
      professional: "bg-card border-l-4 border-l-professional-primary shadow-sm hover:border-l-professional-primary/80",
      default: "bg-card border-l-4 border-l-border shadow-sm hover:border-l-primary/80"
    };
    
    return cn(
      "cursor-pointer transition-all duration-300",
      variants[variant]
    );
  };

  const getIconStyles = () => {
    if (disabled || (isPremium && showPremiumBadge)) {
      return "bg-muted text-muted-foreground";
    }
    
    const iconVariants = {
      breathing: "bg-breathing-primary text-white",
      sounds: "bg-sounds-primary text-white",
      evolution: "bg-evolution-primary text-white",
      professional: "bg-professional-primary text-white",
      default: "bg-primary text-white"
    };
    
    return cn(
      "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
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