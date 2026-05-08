import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  backTo?: string;
  onBack?: () => void;
  showBack?: boolean;
  rightAction?: ReactNode;
  className?: string;
}

const PageHeader = ({
  title,
  backTo,
  onBack,
  showBack = true,
  rightAction,
  className = "",
}: PageHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    if (backTo) return navigate(backTo);
    navigate(-1);
  };

  return (
    <div className={`bg-secondary text-secondary-foreground ${className}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
        <div className="w-10 flex items-center justify-start">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              aria-label="Voltar"
              className="rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
        </div>
        <h1 className="flex-1 text-center text-base sm:text-lg font-semibold text-white truncate px-2">
          {title}
        </h1>
        <div className="w-10 flex items-center justify-end">
          {rightAction}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
