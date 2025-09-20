import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ListaConversas } from '@/components/chat/ListaConversas';
import { ChatInterface } from '@/components/chat/ChatInterface';
import BottomNavigation from '@/components/BottomNavigation';
import RouteGuard from '@/components/RouteGuard';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);

  const handleSelectConversa = (conversaId: string) => {
    setConversaSelecionada(conversaId);
  };

  const handleVoltar = () => {
    setConversaSelecionada(null);
  };

  const handleVoltarHome = () => {
    navigate('/home');
  };

  return (
    <RouteGuard allowedUserTypes={['patient', 'psychologist']}>
      <div className="min-h-screen bg-background">
        {/* Header com botão de voltar */}
        <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
          <div className="flex items-center p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVoltarHome}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">
              {conversaSelecionada ? 'Conversa' : 'Chat'}
            </h1>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="container mx-auto px-4 py-8 pb-24 max-w-4xl">
          {conversaSelecionada ? (
            <ChatInterface 
              conversaId={conversaSelecionada} 
              onVoltar={handleVoltar}
            />
          ) : (
            <ListaConversas onSelectConversa={handleSelectConversa} />
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </div>
    </RouteGuard>
  );
};

export default Chat;