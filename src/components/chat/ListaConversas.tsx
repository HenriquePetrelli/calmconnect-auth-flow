import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  MessageCircle,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Camera,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useConversas } from '@/hooks/useConversas';
import { useAuth } from '@/contexts/AuthContext';

interface ListaConversasProps {
  onSelectConversa: (conversaId: string) => void;
}

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
};

export const ListaConversas: React.FC<ListaConversasProps> = ({ onSelectConversa }) => {
  const { conversas, psicologosDisponiveis, loading, criarConversa, excluirConversa } =
    useConversas();
  const { userType } = useAuth();
  const [novaConversaOpen, setNovaConversaOpen] = useState(false);

  const handleCriarConversa = async (psicologoId: string) => {
    const conversa = await criarConversa(psicologoId);
    if (conversa) {
      setNovaConversaOpen(false);
      onSelectConversa(conversa.id);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ativa':
        return <CheckCircle className="w-3.5 h-3.5 text-success" />;
      case 'somente_leitura':
        return <Clock className="w-3.5 h-3.5 text-warning" />;
      case 'expirada':
        return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ativa':
        return 'Ativa';
      case 'somente_leitura':
        return 'Somente leitura';
      case 'expirada':
        return 'Expirada';
      default:
        return status;
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
              <MessageCircle className="text-primary" size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">Conversas</h3>
              <p className="text-sm text-muted-foreground font-normal">
                {conversas.length > 0
                  ? `${conversas.length} ${conversas.length === 1 ? 'conversa' : 'conversas'}`
                  : 'Nenhuma conversa ainda'}
              </p>
            </div>
          </div>

          {userType === 'patient' && (
            <Dialog open={novaConversaOpen} onOpenChange={setNovaConversaOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 shrink-0 text-primary-foreground">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nova conversa</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Iniciar nova conversa</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {psicologosDisponiveis.length === 0 ? (
                    <div className="text-center py-6">
                      <MessageCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum psicólogo disponível para conversa. Você precisa ter uma consulta
                        finalizada nos últimos 30 dias.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Selecione um psicólogo com quem você teve consulta recentemente:
                      </p>
                      <div className="space-y-2">
                        {psicologosDisponiveis.map((psicologo) => (
                          <button
                            key={psicologo.id}
                            onClick={() => handleCriarConversa(psicologo.user_id)}
                            className="w-full text-left rounded-lg border bg-card p-3 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                                {getInitials(psicologo.full_name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-foreground truncate">
                                  {psicologo.full_name}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  {psicologo.specialization}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Última consulta:{' '}
                              {formatDistanceToNow(new Date(psicologo.ultima_consulta), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg border bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : conversas.length === 0 ? (
          <div className="text-center py-10">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Nenhuma conversa encontrada
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {userType === 'patient'
                ? 'Clique em "Nova conversa" para iniciar um chat.'
                : 'Suas conversas com pacientes aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border -mx-2">
            {conversas.map((conversa) => (
              <li key={conversa.id} className="group">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectConversa(conversa.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectConversa(conversa.id);
                    }
                  }}
                  className="flex items-center gap-3 px-2 py-3 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {getInitials(conversa.outro_usuario?.full_name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {conversa.outro_usuario?.full_name}
                      </h4>
                      {conversa.ultima_mensagem && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(conversa.ultima_mensagem.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      {conversa.ultima_mensagem ? (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 min-w-0">
                          {conversa.ultima_mensagem.tipo === 'imagem' ? (
                            <>
                              <Camera className="w-3 h-3 shrink-0" />
                              <span>Imagem</span>
                            </>
                          ) : (
                            <span className="truncate">{conversa.ultima_mensagem.conteudo}</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Sem mensagens</p>
                      )}

                      <Badge
                        variant="secondary"
                        className="gap-1 text-[10px] px-1.5 py-0 shrink-0"
                      >
                        {getStatusIcon(conversa.status)}
                        {getStatusText(conversa.status)}
                      </Badge>
                    </div>
                  </div>

                  {userType === 'patient' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir conversa</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir esta conversa com{' '}
                            {conversa.outro_usuario?.full_name}? Esta ação não pode ser desfeita e
                            todas as mensagens serão permanentemente removidas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => excluirConversa(conversa.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
