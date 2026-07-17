import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Plus, Trash2, Clock, CheckCircle, XCircle, Camera } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useConversas } from '@/hooks/useConversas';
import { useAuth } from '@/contexts/AuthContext';

interface ListaConversasProps {
  onSelectConversa: (conversaId: string) => void;
}

export const ListaConversas: React.FC<ListaConversasProps> = ({ onSelectConversa }) => {
  const { conversas, psicologosDisponiveis, loading, criarConversa, excluirConversa } = useConversas();
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
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'somente_leitura':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'expirada':
        return <XCircle className="w-4 h-4 text-destructive" />;
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          Conversas
        </h2>
        
        {userType === 'patient' && (
          <Dialog open={novaConversaOpen} onOpenChange={setNovaConversaOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nova Conversa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Iniciar Nova Conversa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {psicologosDisponiveis.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum psicólogo disponível para conversa. Você precisa ter uma consulta finalizada nos últimos 30 dias.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-4">
                      Selecione um psicólogo com quem você teve consulta recentemente:
                    </p>
                    {psicologosDisponiveis.map((psicologo) => (
                      <Card key={psicologo.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleCriarConversa(psicologo.user_id)}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{psicologo.full_name}</h4>
                              <p className="text-sm text-muted-foreground">{psicologo.specialization}</p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Última consulta: {formatDistanceToNow(new Date(psicologo.ultima_consulta), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {conversas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma conversa encontrada</h3>
              <p className="text-muted-foreground">
                {userType === 'patient' 
                  ? 'Clique em "Nova Conversa" para iniciar um chat com um psicólogo.'
                  : 'Suas conversas com pacientes aparecerão aqui.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          conversas.map((conversa) => (
            <Card key={conversa.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelectConversa(conversa.id)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{conversa.outro_usuario?.full_name}</h4>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {getStatusIcon(conversa.status)}
                        {getStatusText(conversa.status)}
                      </Badge>
                    </div>
                    {conversa.ultima_mensagem && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {conversa.ultima_mensagem.tipo === 'imagem' 
                          ? '📷 Imagem' 
                          : conversa.ultima_mensagem.conteudo
                        }
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {conversa.ultima_mensagem && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversa.ultima_mensagem.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    )}
                    {userType === 'patient' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir conversa</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir esta conversa com {conversa.outro_usuario?.full_name}? 
                              Esta ação não pode ser desfeita e todas as mensagens serão permanentemente removidas.
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
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};