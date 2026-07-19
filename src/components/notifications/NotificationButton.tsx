import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate, useLocation } from 'react-router-dom';

export const NotificationButton: React.FC = () => {
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/notifications';

  const handleClick = () => {
    navigate('/notifications');
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className={`relative p-2 rounded-full transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      onClick={handleClick}
      aria-label="Notificações"
    >
      <Bell size={18} fill={isActive ? 'currentColor' : 'none'} />
      {unreadCount > 0 && (
        <Badge
          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground min-w-[20px] h-5 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};
