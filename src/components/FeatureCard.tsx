import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
  iconClassName?: string;
  disabled?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
  variant?: 'breathing' | 'sounds' | 'evolution' | 'sos' | 'default';
}

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  className, 
  iconClassName,
  disabled = false,
  badge,
  onClick,
  variant = 'default'
}: FeatureCardProps) => {
  
  const getVariantStyles = () => {
    if (disabled) return "opacity-50 cursor-not-allowed bg-muted/50";
    
    const variants = {
      breathing: "bg-gradient-to-br from-breathing-primary/5 to-breathing-secondary/10 border-breathing-primary/20 hover:border-breathing-primary/40 hover:shadow-primary hover:from-breathing-primary/10 hover:to-breathing-secondary/15",
      sounds: "bg-gradient-to-br from-sounds-primary/5 to-sounds-secondary/10 border-sounds-primary/20 hover:border-sounds-primary/40 hover:from-sounds-primary/10 hover:to-sounds-secondary/15",
      evolution: "bg-gradient-to-br from-evolution-primary/5 to-evolution-secondary/10 border-evolution-primary/20 hover:border-evolution-primary/40 hover:from-evolution-primary/10 hover:to-evolution-secondary/15",
      sos: "bg-gradient-to-br from-sos-primary/5 to-sos-secondary/10 border-sos-primary/20 hover:border-sos-primary/40 hover:from-sos-primary/10 hover:to-sos-secondary/15",
      default: "border-border hover:border-primary/30 hover:shadow-md"
    };
    
    return cn(
      "cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1",
      variants[variant]
    );
  };

  const getIconStyles = () => {
    if (disabled) return "bg-muted text-muted-foreground";
    
    const iconVariants = {
      breathing: "bg-breathing-primary/10 text-breathing-primary shadow-breathing-primary/20",
      sounds: "bg-sounds-primary/10 text-sounds-primary shadow-sounds-primary/20",
      evolution: "bg-evolution-primary/10 text-evolution-primary shadow-evolution-primary/20", 
      sos: "bg-sos-primary/10 text-sos-primary shadow-sos-primary/20 animate-pulse-gentle",
      default: "bg-primary/10 text-primary shadow-primary/20"
    };
    
    return cn(
      "w-16 h-16 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 hover:shadow-lg hover:scale-110",
      iconVariants[variant],
      iconClassName
    );
  };

  return (
    <Card 
      className={cn(
        getVariantStyles(),
        className
      )}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent className="p-6 relative">
        {badge && (
          <div className="absolute -top-2 -right-2 animate-scale-in">
            {badge}
          </div>
        )}
        <div className="flex items-start gap-4">
          <div className={getIconStyles()}>
            {icon}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="font-semibold text-lg text-card-foreground leading-tight">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;