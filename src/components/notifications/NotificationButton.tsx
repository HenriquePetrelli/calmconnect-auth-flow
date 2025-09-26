import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

export const NotificationButton: React.FC = () => {
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/notifications');
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
      onClick={handleClick}
    >
      <Bell size={18} />
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