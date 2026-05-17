import { Switch } from '@/components/ui/switch';
import { usePsychologistPresence } from '@/hooks/usePsychologistPresence';

export const OnlineStatusToggle = () => {
  const { isOnline, loading, toggle } = usePsychologistPresence();

  return (
    <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-card">
      <div className="flex-1">
        <p className="font-medium text-foreground">Status de Disponibilidade</p>
        <p className="text-sm text-muted-foreground">
          {isOnline ? 'Visível para pacientes' : 'Não visível para pacientes'}
        </p>
      </div>
      <Switch
        checked={isOnline}
        onCheckedChange={toggle}
        disabled={loading}
      />
      <span className={`w-20 text-sm font-medium ${isOnline ? 'text-primary' : 'text-muted-foreground'}`}>
        {loading ? '...' : isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
};

export default OnlineStatusToggle;
