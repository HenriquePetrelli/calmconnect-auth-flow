import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ListaConversas } from '@/components/chat/ListaConversas';
import { ChatInterface } from '@/components/chat/ChatInterface';
import RouteGuard from '@/components/RouteGuard';

const Chat: React.FC = () => {
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);

  const handleSelectConversa = (conversaId: string) => {
    setConversaSelecionada(conversaId);
  };

  const handleVoltar = () => {
    setConversaSelecionada(null);
  };

  return (
    <RouteGuard allowedUserTypes={['patient', 'psychologist']}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {conversaSelecionada ? (
          <ChatInterface 
            conversaId={conversaSelecionada} 
            onVoltar={handleVoltar}
          />
        ) : (
          <ListaConversas onSelectConversa={handleSelectConversa} />
        )}
      </div>
    </RouteGuard>
  );
};

export default Chat;