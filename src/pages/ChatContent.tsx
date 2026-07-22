import React, { useState } from 'react';
import { ListaConversas } from '@/components/chat/ListaConversas';
import { ChatInterface } from '@/components/chat/ChatInterface';
import PageSkeleton from '@/components/PageSkeleton';

const ChatContent: React.FC = () => {
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const [isLoading] = useState(false);

  const handleSelectConversa = (conversaId: string) => {
    setConversaSelecionada(conversaId);
  };

  const handleVoltar = () => {
    setConversaSelecionada(null);
  };

  if (isLoading) {
    return <PageSkeleton type="chat" />;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {conversaSelecionada ? (
          <ChatInterface conversaId={conversaSelecionada} onVoltar={handleVoltar} />
        ) : (
          <ListaConversas onSelectConversa={handleSelectConversa} />
        )}
      </div>
    </div>
  );
};

export default ChatContent;
