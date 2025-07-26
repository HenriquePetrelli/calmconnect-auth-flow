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
}

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  className, 
  iconClassName,
  disabled = false,
  badge,
  onClick 
}: FeatureCardProps) => {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-calm hover:scale-105 relative",
        disabled && "opacity-60 cursor-not-allowed",
        !disabled && "hover:animate-expand",
        className
      )}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent className="p-6 relative">
        {badge && (
          <div className="absolute -top-2 -right-2">
            {badge}
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
            iconClassName
          )}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-card-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;