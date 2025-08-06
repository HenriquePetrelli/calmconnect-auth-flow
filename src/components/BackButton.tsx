import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BackButton = () => {
  const navigate = useNavigate();
  
  return (
    <Button
      variant="ghost"
      onClick={() => navigate('/')}
      className="flex items-center gap-2 text-foreground/70 hover:text-foreground p-2 h-auto"
      aria-label="Voltar para página inicial"
    >
      <ArrowLeft size={20} />
      <span className="font-medium">Voltar</span>
    </Button>
  );
};

export default BackButton;