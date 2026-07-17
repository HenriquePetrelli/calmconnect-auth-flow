import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Plus, Camera, Lock, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NovoChat: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <MessageCircle className="w-6 h-6" />
          Sistema de Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-center">
          Converse com seus psicólogos de forma segura e privada.
        </p>
        
        <div className="space-y-3">
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-1 inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Chat em tempo real
            </h4>
            <p className="text-xs text-muted-foreground">
              Troque mensagens instantaneamente com seus psicólogos
            </p>
          </div>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-1 inline-flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Compartilhe imagens
            </h4>
            <p className="text-xs text-muted-foreground">
              Envie fotos e documentos quando necessário
            </p>
          </div>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-1 inline-flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Seguro e privado
            </h4>
            <p className="text-xs text-muted-foreground">
              Suas conversas são protegidas e confidenciais
            </p>
          </div>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-1 inline-flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Disponível por 30 dias
            </h4>
            <p className="text-xs text-muted-foreground">
              Converse por até 1 mês após sua consulta
            </p>
          </div>
        </div>

        <Button 
          onClick={() => navigate('/chat')} 
          className="w-full flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Acessar Chat
        </Button>
      </CardContent>
    </Card>
  );
};

export default NovoChat;