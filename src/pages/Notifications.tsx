import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  CheckCheck,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  MessageCircle,
  CreditCard,
  Star,
  Heart,
  Video,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const Notifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  } = useNotifications();

  const getNotificationIcon = (title: string, message: string = '') => {
    const text = `${title} ${message}`.toLowerCase();

    if (text.includes('cancel')) return <CalendarX className="h-5 w-5 text-destructive" />;
    if (text.includes('remarc') || text.includes('reagend')) return <CalendarClock className="h-5 w-5 text-primary" />;
    if (text.includes('videochamada') || text.includes('vídeo') || text.includes('video')) return <Video className="h-5 w-5 text-primary" />;
    if (text.includes('lembrete') || text.includes('em breve') || text.includes('próxim')) return <CalendarClock className="h-5 w-5 text-primary" />;
    if (text.includes('confirm') || text.includes('aprovad') || text.includes('aceit')) return <CalendarCheck className="h-5 w-5 text-primary" />;
    if (text.includes('consulta') || text.includes('agendamento') || text.includes('agend')) return <CalendarCheck className="h-5 w-5 text-primary" />;
    if (text.includes('mensagem') || text.includes('chat') || text.includes('conversa')) return <MessageCircle className="h-5 w-5 text-primary" />;
    if (text.includes('pagamento') || text.includes('assinatura') || text.includes('plano') || text.includes('cobran')) return <CreditCard className="h-5 w-5 text-primary" />;
    if (text.includes('avali') || text.includes('feedback')) return <Star className="h-5 w-5 text-primary" />;
    if (text.includes('conquista') || text.includes('meta')) return <Sparkles className="h-5 w-5 text-primary" />;
    if (text.includes('humor') || text.includes('bem-estar')) return <Heart className="h-5 w-5 text-primary" />;
    if (text.includes('sos') || text.includes('emerg')) return <AlertTriangle className="h-5 w-5 text-destructive" />;
    if (text.includes('psicólog') || text.includes('psicolog') || text.includes('profissional')) return <UserCheck className="h-5 w-5 text-primary" />;
    if (text.includes('importante') || text.includes('urgente') || text.includes('atenção')) return <AlertCircle className="h-5 w-5 text-warning" />;
    return <Info className="h-5 w-5 text-muted-foreground" />;
  };

  const handleNotificationClick = async (notification: any) => {
    if (notification.status === 'unread') {
      await markAsRead(notification.id);
      toast.success('Notificação marcada como lida');
    }
    
    // If notification is related to an appointment, navigate to appointments
    if (notification.appointment_id) {
      navigate('/appointments');
    }
  };

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
    toast.success('Notificação excluída');
  };

  const handleDeleteAllNotifications = async () => {
    await deleteAllNotifications();
    toast.success('Todas as notificações foram excluídas');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-calm">
        {/* Loading Content */}
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse border-border/50">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="has-tabs">
      <div className="screen">
        {/* Actions bar (no title/back) */}
        {(unreadCount > 0 || notifications.length > 0) && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-end gap-2 px-4 py-3">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="hover-scale"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Marcar todas
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAllNotifications}
                  className="hover-scale text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir todas
                </Button>
              )}
              
            </div>
          </div>
        )}


        {/* Content */}
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          {notifications.length === 0 ? (
            <Card className="border-border/50 bg-gradient-card shadow-primary/5">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                  <Bell className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Nenhuma notificação
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                  Você receberá notificações sobre consultas, lembretes e atualizações importantes aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <Card
                  key={notification.id}
                  className={`group cursor-pointer transition-all duration-200 hover-lift border-border/50 ${
                    notification.status === 'unread' 
                      ? 'bg-primary/5 border-primary/20 shadow-primary/10' 
                      : 'bg-card hover:bg-accent/50'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.status === 'unread'
                          ? 'bg-primary/10'
                          : 'bg-muted/50'
                      }`}>
                        {getNotificationIcon(notification.title)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <h4 className={`font-semibold text-base leading-tight mb-1 ${
                              notification.status === 'unread' 
                                ? 'text-foreground' 
                                : 'text-foreground/80'
                            }`}>
                              {notification.title}
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {notification.message}
                            </p>
                          </div>
                          {notification.status === 'unread' && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <p className="text-xs text-muted-foreground/80 font-medium">
                            {format(new Date(notification.created_at), 'PPp', { locale: ptBR })}
                          </p>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => handleDeleteNotification(notification.id, e)}
                              title="Excluir notificação"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  {/* Separator - only show if not last item */}
                  {index < notifications.length - 1 && (
                    <Separator className="opacity-30" />
                  )}
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

    </div>
  );
};

export default Notifications;