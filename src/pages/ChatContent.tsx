import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ListaConversas } from '@/components/chat/ListaConversas';
import { ChatInterface } from '@/components/chat/ChatInterface';
import PageSkeleton from '@/components/PageSkeleton';

const ChatContent: React.FC = () => {
  const navigate = useNavigate();
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="px-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {conversaSelecionada ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVoltar}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-foreground">Conversa</h1>
            </div>
            <div className="bg-card rounded-lg shadow-sm min-h-[600px]">
              <ChatInterface 
                conversaId={conversaSelecionada} 
                onVoltar={handleVoltar} 
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <ListaConversas onSelectConversa={handleSelectConversa} />
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
};

export default ChatContent;