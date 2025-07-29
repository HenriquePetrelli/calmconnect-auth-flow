import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProgressChart } from '@/components/progress/ProgressChart';

const Progress = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Minha Evolução</h1>
      </div>

      {/* Content */}
      <div className="p-4">
        <ProgressChart />
      </div>
    </div>
  );
};

export default Progress;