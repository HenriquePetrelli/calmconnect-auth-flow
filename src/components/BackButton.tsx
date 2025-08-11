import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  to?: string;
  label?: string;
}

const BackButton = ({ to = '/', label = 'Voltar' }: BackButtonProps) => {
  const navigate = useNavigate();
  
  return (
    <Button
      variant="ghost"
      onClick={() => navigate(to)}
      className="flex items-center gap-2 text-foreground/70 hover:text-foreground p-2 h-auto"
      aria-label={`Voltar para ${label}`}
    >
      <ArrowLeft size={20} />
      <span className="font-medium">{label}</span>
    </Button>
  );
};

export default BackButton;