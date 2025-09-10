import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, User, Phone, MessageSquare } from 'lucide-react';
import { usePsychologistEmergency } from '@/hooks/usePsychologistEmergency';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const EmergencyNotifications = () => {
  const { emergencyRequests, loading, acceptEmergencyRequest, declineEmergencyRequest } = usePsychologistEmergency();
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const handleAccept = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    try {
      console.log('🔄 Starting emergency acceptance for request:', requestId);
      const result = await acceptEmergencyRequest(requestId);
      
      console.log('📋 Emergency acceptance result:', result);
      
      if (!result || !result.session_id) {
        console.error('❌ No session_id returned from acceptEmergencyRequest');
        throw new Error('Falha ao obter ID da sessão - tente novamente');
      }
      
      console.log('✅ Navigating to emergency call with session_id:', result.session_id);
      
      // Navigate to WebRTC video call with the actual session ID
      navigate(`/emergency-call/${result.session_id}?requestId=${requestId}&userType=psychologist&session_id=${result.session_id}`);
    } catch (error) {
      console.error('❌ Error accepting emergency:', error);
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleDecline = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    try {
      await declineEmergencyRequest(requestId);
    } catch (error) {
      console.error('Error declining emergency:', error);
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
            <span className="text-muted-foreground">Carregando emergências...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = emergencyRequests.filter(req => req.status === 'pending');

  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-green-600" />
            Solicitações de Emergência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhuma emergência no momento
            </h3>
            <p className="text-muted-foreground">
              Todas as solicitações foram atendidas. Você receberá notificações em tempo real quando houver novas emergências.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Solicitações de Emergência
            <Badge variant="destructive" className="ml-auto">
              {pendingRequests.length} pendente{pendingRequests.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {pendingRequests.map((request) => (
        <Card key={request.id} className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    {request.patient.full_name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {formatDistanceToNow(new Date(request.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </div>
                </div>
              </div>
              <Badge variant="destructive" className="animate-pulse">
                URGENTE
              </Badge>
            </div>

            <div className="bg-card/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-foreground">
                <strong>Paciente solicitou atendimento de emergência.</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                O paciente precisa de suporte psicológico imediato. Aceite a solicitação para iniciar uma sessão de emergência.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleAccept(request.id)}
                disabled={processingRequests.has(request.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {processingRequests.has(request.id) ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Phone className="w-4 h-4 mr-2" />
                )}
                Aceitar e Iniciar Chamada
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDecline(request.id)}
                disabled={processingRequests.has(request.id)}
                className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              >
                {processingRequests.has(request.id) ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                ) : (
                  <MessageSquare className="w-4 h-4 mr-2" />
                )}
                Recusar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Notification Settings */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Notificações em tempo real ativas</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              Online
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Você receberá notificações instantâneas quando houver novas solicitações de emergência.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyNotifications;