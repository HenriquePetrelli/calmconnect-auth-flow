import React from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "muted" | "primary" | "secondary" | "destructive" | "success";
  className?: string;
  inCard?: boolean;
}

const accentMap = {
  muted: { bg: "bg-muted/40", text: "text-muted-foreground" },
  primary: { bg: "bg-primary/10", text: "text-primary" },
  secondary: { bg: "bg-secondary/15", text: "text-secondary-foreground" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive" },
  success: { bg: "bg-success/10", text: "text-success" },
} as const;

/**
 * Standardized empty-state block used across the admin section (and reusable
 * anywhere else). Renders a soft icon badge, a title and an optional
 * description + action button. Wrap in a Card by default.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  variant = "muted",
  className,
  inCard = true,
}) => {
  const accent = accentMap[variant];
  const content = (
    <div className={cn("flex flex-col items-center justify-center text-center py-10 px-6", className)}>
      <div className={cn("rounded-full p-3 mb-3", accent.bg)}>
        <Icon className={cn("h-6 w-6", accent.text)} />
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );

  if (!inCard) return content;
  return (
    <Card>
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
};

export default EmptyState;
