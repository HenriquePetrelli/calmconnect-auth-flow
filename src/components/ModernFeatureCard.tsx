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
  variant?: 'breathing' | 'sounds' | 'evolution' | 'default';
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
      breathing: "bg-gradient-to-br from-breathing-primary/5 to-breathing-secondary/10 border-breathing-primary/20 hover:border-breathing-primary/40 hover:shadow-primary",
      sounds: "bg-gradient-to-br from-sounds-primary/5 to-sounds-secondary/10 border-sounds-primary/20 hover:border-sounds-primary/40 hover:from-sounds-primary/10",
      evolution: "bg-gradient-to-br from-evolution-primary/5 to-evolution-secondary/10 border-evolution-primary/20 hover:border-evolution-primary/40 hover:from-evolution-primary/10",
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
      breathing: "bg-gradient-breathing text-white shadow-primary/20",
      sounds: "bg-gradient-sounds text-white shadow-success/20",
      evolution: "bg-gradient-evolution text-white shadow-premium/20", 
      default: "bg-gradient-primary text-white shadow-primary/20"
    };
    
    return cn(
      "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-110",
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
          "rounded-2xl border shadow-sm transition-all duration-200",
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