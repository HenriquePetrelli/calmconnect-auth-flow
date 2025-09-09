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
    <div className="fixed top-4 right-4 z-50">
      <Button
        size="sm"
        variant="outline"
        className="relative bg-background shadow-lg border-border hover:bg-accent"
        onClick={handleClick}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground min-w-[20px] h-5 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
};