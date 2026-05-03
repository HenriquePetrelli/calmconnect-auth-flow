import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Video, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PageSkeleton from '@/components/PageSkeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  psychologist: {
    full_name: string;
    specialization?: string;
  };
}

const AppointmentsContent: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          status,
          psychologists (
            full_name,
            specialization
          )
        `)
        .eq('patient_id', user.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const appointmentsData = (data || []).map(appointment => ({
        ...appointment,
        psychologist: appointment.psychologists
      }));

      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as consultas.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-success/15 text-success">Confirmada</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'completed':
        return <Badge className="bg-secondary/15 text-secondary">Concluída</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <PageSkeleton type="appointments" />;
  }

  return (
    <div className="px-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Minhas Consultas</h1>
          <Button onClick={() => navigate('/appointments/schedule')}>
            <Calendar className="w-4 h-4 mr-2" />
            Agendar Consulta
          </Button>
        </div>

        {/* Appointments List */}
        {appointments.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma consulta agendada</h3>
              <p className="text-muted-foreground mb-4">
                Você ainda não possui consultas marcadas.
              </p>
              <Button onClick={() => navigate('/appointments/schedule')}>
                Agendar Primeira Consulta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {appointment.psychologist?.full_name}
                        </span>
                      </div>
                      {appointment.psychologist?.specialization && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {appointment.psychologist.specialization}
                          </span>
                        </div>
                      )}
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(appointment.scheduled_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(appointment.scheduled_at), 'HH:mm', { locale: ptBR })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {appointment.status === 'confirmed' && (
                      <Button size="sm" onClick={() => navigate(`/consultation-call/${appointment.id}`)}>
                        <Video className="w-4 h-4 mr-1" />
                        Entrar na Consulta
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsContent;