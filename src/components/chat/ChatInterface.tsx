import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  XCircle,
  X,
  MessageCircle,
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMensagens } from '@/hooks/useMensagens';
import { useAuth } from '@/contexts/AuthContext';
import { useConversas } from '@/hooks/useConversas';

interface ChatInterfaceProps {
  conversaId: string;
  onVoltar: () => void;
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

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ conversaId, onVoltar }) => {
  const [novaMensagem, setNovaMensagem] = useState('');
  const [imagemSelecionada, setImagemSelecionada] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { mensagens, loading, enviando, enviarMensagem, uploadImagem } = useMensagens(conversaId);
  const { conversas } = useConversas();

  const conversaAtual = conversas.find((c) => c.id === conversaId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversaId]);

  const handleEnviarMensagem = async () => {
    if (!novaMensagem.trim() && !imagemSelecionada) return;
    let sucesso = false;

    if (imagemSelecionada) {
      const imagemUrl = await uploadImagem(imagemSelecionada);
      if (imagemUrl) {
        sucesso = await enviarMensagem('', 'imagem', imagemUrl);
      }
      setImagemSelecionada(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      sucesso = await enviarMensagem(novaMensagem);
    }

    if (sucesso) {
      setNovaMensagem('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviarMensagem();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 5MB.');
        return;
      }
      setImagemSelecionada(file);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ativa':
        return {
          icon: <CheckCircle className="w-3.5 h-3.5 text-success" />,
          text: 'Ativa',
          description: 'Você pode enviar mensagens',
        };
      case 'somente_leitura':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-warning" />,
          text: 'Somente leitura',
          description: 'Esta conversa expirou para envio de mensagens',
        };
      case 'expirada':
        return {
          icon: <XCircle className="w-3.5 h-3.5 text-destructive" />,
          text: 'Expirada',
          description: 'Esta conversa foi arquivada',
        };
      default:
        return { icon: null, text: status, description: '' };
    }
  };

  const statusInfo = getStatusInfo(conversaAtual?.status || 'ativa');
  const podeEnviarMensagens = conversaAtual?.status === 'ativa';
  const nomeOutro = conversaAtual?.outro_usuario?.full_name;

  return (
    <Card className="border-l-4 border-l-primary flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)]">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
        <CardTitle className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onVoltar}
            className="h-9 w-9 shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
            {getInitials(nomeOutro)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground truncate">{nomeOutro}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
                {statusInfo.icon}
                {statusInfo.text}
              </Badge>
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                {statusInfo.description}
              </span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <h4 className="text-base font-semibold text-foreground">Nenhuma mensagem ainda</h4>
            <p className="text-sm text-muted-foreground mt-1">Envie a primeira mensagem.</p>
          </div>
        ) : (
          mensagens.map((mensagem, index) => {
            const isMinhaMsg = mensagem.autor_id === user?.id;
            const previa = mensagens[index - 1];
            const mostrarDivisor =
              !previa ||
              !isSameDay(new Date(previa.created_at), new Date(mensagem.created_at));
            const dataMsg = new Date(mensagem.created_at);

            return (
              <React.Fragment key={mensagem.id}>
                {mostrarDivisor && (
                  <div className="flex items-center justify-center my-2">
                    <span className="text-xs text-muted-foreground bg-background border rounded-full px-3 py-0.5">
                      {format(dataMsg, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMinhaMsg ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!isMinhaMsg && (
                    <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0 mt-auto">
                      {getInitials(nomeOutro)}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isMinhaMsg ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                        isMinhaMsg
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-card border rounded-bl-sm text-foreground'
                      }`}
                    >
                      {mensagem.tipo === 'imagem' ? (
                        <img
                          src={mensagem.imagem_url}
                          alt="Imagem da conversa"
                          className="max-w-full h-auto rounded-lg"
                          style={{ maxHeight: '280px' }}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                      {format(dataMsg, 'HH:mm')}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Composer */}
      {podeEnviarMensagens ? (
        <div className="p-3 border-t bg-card">
          {imagemSelecionada && (
            <div className="mb-2 p-2 bg-muted rounded-lg flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm flex-1 truncate">{imagemSelecionada.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setImagemSelecionada(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={enviando}
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary"
              aria-label="Anexar imagem"
            >
              <ImageIcon className="w-5 h-5" />
            </Button>
            <Input
              ref={inputRef}
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              disabled={enviando}
              className="flex-1 rounded-full bg-muted/50 border-transparent focus-visible:bg-background"
            />
            <Button
              onClick={handleEnviarMensagem}
              disabled={enviando || (!novaMensagem.trim() && !imagemSelecionada)}
              size="icon"
              className="h-10 w-10 rounded-full shrink-0 text-primary-foreground"
              aria-label="Enviar mensagem"
            >
              {enviando ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t bg-muted/40">
          <p className="text-center text-xs text-muted-foreground">{statusInfo.description}</p>
        </div>
      )}
    </Card>
  );
};
