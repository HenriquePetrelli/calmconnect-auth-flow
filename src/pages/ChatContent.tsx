import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListaConversas } from '@/components/chat/ListaConversas';
import { ChatInterface } from '@/components/chat/ChatInterface';

/**
 * A conversa aberta fica no endereço (`/chat?c=<id>`): o botão voltar do
 * celular volta para a lista, recarregar mantém a conversa aberta e o aviso
 * de mensagem nova abre direto a conversa certa.
 */
const ChatContent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversaSelecionada = searchParams.get('c');

  if (conversaSelecionada) {
    return (
      <ChatInterface
        key={conversaSelecionada}
        conversaId={conversaSelecionada}
        onVoltar={() => setSearchParams({}, { replace: false })}
      />
    );
  }

  return <ListaConversas onSelectConversa={(id) => setSearchParams({ c: id })} />;
};

export default ChatContent;
