import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
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
  BellOff,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import PageTitle from '@/components/PageTitle';
import { NotificationsBodySkeleton } from '@/components/skeletons/PageSkeletons';

import { differenceInCalendarDays, format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const Notifications = () => {
  const navigate = useNavigate();
  const { userType } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    hasMore,
    loadingMore,
    loadMore,
  } = useNotifications();

  /** "agora", "há 5 min", "ontem às 14:00", "12 de out. às 09:30". */
  const formatWhen = (iso: string) => {
    const date = new Date(iso);
    const days = differenceInCalendarDays(new Date(), date);
    if (days === 0) {
      if (Date.now() - date.getTime() < 60_000) return 'agora';
      return `há ${formatDistanceToNowStrict(date, { locale: ptBR })}`;
    }
    if (days === 1) return `ontem às ${format(date, 'HH:mm')}`;
    return format(date, "d 'de' MMM 'às' HH:mm", { locale: ptBR });
  };

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
    if (text.includes('conquista') || text.includes('meta') || text.includes('hábito')) return <Sparkles className="h-5 w-5 text-primary" />;
    if (text.includes('humor') || text.includes('bem-estar')) return <Heart className="h-5 w-5 text-primary" />;
    if (text.includes('sos') || text.includes('emerg')) return <AlertTriangle className="h-5 w-5 text-destructive" />;
    if (text.includes('psicólog') || text.includes('psicolog') || text.includes('profissional')) return <UserCheck className="h-5 w-5 text-primary" />;
    if (text.includes('importante') || text.includes('urgente') || text.includes('atenção')) return <AlertCircle className="h-5 w-5 text-warning" />;
    return <Info className="h-5 w-5 text-muted-foreground" />;
  };

  const handleNotificationClick = (notification: Notification) => {
    // Abrir já marca como lida (sem aviso na tela: o ponto some na hora).
    if (notification.status === 'unread') void markAsRead(notification.id);

    // Notificações novas trazem o destino (link) gravado pelo servidor.
    // Só caminhos do próprio app: "//site.com" também começa com "/".
    if (typeof notification.link === 'string' && /^\/(?!\/)/.test(notification.link)) {
      navigate(notification.link);
      return;
    }

    // If notification is related to an appointment, navigate to the
    // appointments view for whichever side is looking at it.
    if (notification.appointment_id) {
      navigate(userType === 'psychologist' ? '/psicologo/consultas' : '/appointments');
      return;
    }

    if (userType === 'admin') {
      // Admin notifications (new psychologist registration, etc.) all lead
      // back to the dashboard — the admin picks the relevant tab there.
      navigate('/admin-dashboard');
      return;
    }

    const text = `${notification.title} ${notification.message}`.toLowerCase();
    if (text.includes('mensagem') || text.includes('chat') || text.includes('conversa')) {
      navigate('/chat');
    } else if (text.includes('conquista')) {
      navigate('/achievements');
    }
  };

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await deleteNotification(notificationId);
    if (ok) toast.success('Notificação excluída');
    else toast.error('Não foi possível excluir. Tente de novo.');
  };

  const handleDeleteAllNotifications = async () => {
    const ok = await deleteAllNotifications();
    if (ok) toast.success('Todas as notificações foram excluídas');
    else toast.error('Não foi possível excluir. Tente de novo.');
  };

  // Paciente, psicólogo e admin veem esta tela dentro do layout deles
  // (cabeçalho e barra de navegação); psicólogo e admin com o título da tela.

  if (loading) {
    return (
      <div>
        <div>
          <NotificationsBodySkeleton />
        </div>
      </div>
    );
  }


  return (
    <div>
      {(userType === 'psychologist' || userType === 'admin') && (
        <div className="mb-2">
          <PageTitle
            title="Notificações"
            description={userType === 'admin' ? 'Novos cadastros e avisos do painel' : 'Pedidos, confirmações e lembretes'}
          />
        </div>
      )}
      <div>
        {/* Actions bar (no title/back) */}
        {(unreadCount > 0 || notifications.length > 0) && (
          <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-end gap-2 px-4 py-3">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Marcar todas
                </Button>
              )}
              {notifications.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir todas
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir todas as notificações?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Elas saem da sua lista e não podem ser recuperadas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAllNotifications}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir todas
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
            </div>
          </div>
        )}


        {/* Content */}
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <BellOff className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Nenhuma notificação
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                {userType === 'admin'
                  ? 'Novos cadastros de psicólogos e outros avisos do painel aparecem aqui.'
                  : 'Você receberá notificações sobre consultas, lembretes e atualizações importantes aqui.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${notification.status === 'unread' ? 'Não lida: ' : ''}${notification.title}`}
                  data-testid="notification-item"
                  className={`group cursor-pointer rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    notification.status === 'unread'
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-card hover:bg-accent/50'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        {getNotificationIcon(notification.title, notification.message)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <h4
                            className={`text-base leading-tight ${
                              notification.status === 'unread' ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {notification.status === 'unread' && (
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" aria-hidden="true" />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{notification.message}</p>

                        <div className="mt-2 flex items-center justify-between">
                          <time
                            dateTime={notification.created_at}
                            title={format(new Date(notification.created_at), 'PPp', { locale: ptBR })}
                            className="text-xs text-muted-foreground"
                          >
                            {formatWhen(notification.created_at)}
                          </time>
                          {/* No celular sempre visível (não existe "passar o mouse"). */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            aria-label="Excluir notificação"
                            title="Excluir notificação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
                    {loadingMore && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
                    Ver mais antigas
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

    </div>
  );
};

export default Notifications;