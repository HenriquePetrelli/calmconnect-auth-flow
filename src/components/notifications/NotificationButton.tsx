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
      className="relative rounded-full hover:bg-accent/50 transition-all duration-200 hover:scale-105"
      onClick={handleClick}
    >
      <Bell size={20} className="text-muted-foreground hover:text-foreground transition-colors" />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground min-w-[18px] h-[18px] text-xs px-1 animate-pulse"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};