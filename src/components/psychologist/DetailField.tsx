import { cn } from '@/lib/utils';

interface DetailFieldProps {
  label: string;
  value?: string;
  fullWidth?: boolean;
  className?: string;
}

export const DetailField = ({ 
  label, 
  value, 
  fullWidth = false, 
  className 
}: DetailFieldProps) => {
  return (
    <div 
      className={cn(
        "space-y-1",
        fullWidth && "md:col-span-2",
        className
      )}
    >
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <div className="text-sm font-medium min-h-[1.25rem] p-2 bg-background border rounded-md">
        {value || 'Não informado'}
      </div>
    </div>
  );
};