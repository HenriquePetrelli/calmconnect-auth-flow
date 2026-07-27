import React from "react";
import { AlertTriangle, RefreshCw, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  retrying?: boolean;
  icon?: LucideIcon;
  className?: string;
  inCard?: boolean;
  compact?: boolean;
}

/**
 * Standardized error block for failed data loads.
 * Shows a soft destructive icon badge, title, description and a retry button.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Não foi possível carregar os dados",
  description = "Ocorreu um erro ao buscar as informações. Verifique sua conexão e tente novamente.",
  onRetry,
  retryLabel = "Tentar novamente",
  retrying = false,
  icon: Icon = AlertTriangle,
  className,
  inCard = true,
  compact = false,
}) => {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6",
        compact ? "py-6" : "py-10",
        className,
      )}
    >
      <div className="rounded-full p-3 mb-3 bg-destructive/10">
        <Icon className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md">
          {description}
        </p>
      )}
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={() => onRetry()}
          disabled={retrying}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", retrying && "animate-spin")} />
          {retryLabel}
        </Button>
      )}
    </div>
  );

  if (!inCard) return content;
  return (
    <Card>
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
};

export default ErrorState;
