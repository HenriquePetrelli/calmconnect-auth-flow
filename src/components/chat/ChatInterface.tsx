import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Image as ImageIcon, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMensagens } from '@/hooks/useMensagens';
import { useAuth } from '@/contexts/AuthContext';
import { useConversas } from '@/hooks/useConversas';

interface ChatInterfaceProps {
  conversaId: string;
  onVoltar: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ conversaId, onVoltar }) => {
  const [novaMensagem, setNovaMensagem] = useState('');
  const [imagemSelecionada, setImagemSelecionada] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { mensagens, loading, enviando, enviarMensagem, uploadImagem } = useMensagens(conversaId);
  const { conversas } = useConversas();
  
  const conversaAtual = conversas.find(c => c.id === conversaId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const handleEnviarMensagem = async () => {
    if (!novaMensagem.trim() && !imagemSelecionada) return;

    let sucesso = false;

    if (imagemSelecionada) {
      const imagemUrl = await uploadImagem(imagemSelecionada);
      if (imagemUrl) {
        sucesso = await enviarMensagem('', 'imagem', imagemUrl);
      }
      setImagemSelecionada(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      sucesso = await enviarMensagem(novaMensagem);
    }

    if (sucesso) {
      setNovaMensagem('');
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
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      // Verificar tamanho (max 5MB)
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
          icon: <CheckCircle className="w-4 h-4 text-success" />,
          text: 'Ativa',
          description: 'Você pode enviar mensagens'
        };
      case 'somente_leitura':
        return {
          icon: <Clock className="w-4 h-4 text-warning" />,
          text: 'Somente leitura',
          description: 'Esta conversa expirou para envio de mensagens'
        };
      case 'expirada':
        return {
          icon: <XCircle className="w-4 h-4 text-destructive" />,
          text: 'Expirada',
          description: 'Esta conversa foi arquivada'
        };
      default:
        return {
          icon: null,
          text: status,
          description: ''
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(conversaAtual?.status || 'ativa');
  const podeEnviarMensagens = conversaAtual?.status === 'ativa';

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onVoltar}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle className="text-lg">{conversaAtual?.outro_usuario?.full_name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {statusInfo.icon}
                    {statusInfo.text}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{statusInfo.description}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
          {mensagens.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Nenhuma mensagem ainda. Inicie a conversa!</p>
            </div>
          ) : (
            mensagens.map((mensagem) => {
              const isMinhaMsg = mensagem.autor_id === user?.id;
              return (
                <div key={mensagem.id} className={`flex ${isMinhaMsg ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMinhaMsg ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-lg p-3 ${
                        isMinhaMsg
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {mensagem.tipo === 'imagem' ? (
                        <img
                          src={mensagem.imagem_url}
                          alt="Imagem da conversa"
                          className="max-w-full h-auto rounded"
                          style={{ maxHeight: '300px' }}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap">{mensagem.conteudo}</p>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
                      isMinhaMsg ? 'justify-end' : 'justify-start'
                    }`}>
                      <span>{format(new Date(mensagem.created_at), 'HH:mm')}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(mensagem.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input de mensagem */}
        {podeEnviarMensagens && (
          <div className="p-4 border-t">
            {imagemSelecionada && (
              <div className="mb-3 p-2 bg-muted rounded-lg flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                <span className="text-sm flex-1">{imagemSelecionada.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImagemSelecionada(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  ✕
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={enviando}
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Input
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={enviando}
                className="flex-1"
              />
              <Button
                onClick={handleEnviarMensagem}
                disabled={enviando || (!novaMensagem.trim() && !imagemSelecionada)}
              >
                {enviando ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {!podeEnviarMensagens && (
          <div className="p-4 border-t bg-muted/50">
            <p className="text-center text-muted-foreground text-sm">
              {statusInfo.description}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};