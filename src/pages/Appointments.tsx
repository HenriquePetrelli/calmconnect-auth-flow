import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Plus, Clock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Appointments = () => {
  const navigate = useNavigate();

  const upcomingAppointments = [
    {
      id: 1,
      psychologist: "Dr. Ana Silva",
      date: "2024-01-25",
      time: "14:00",
      type: "Consulta Regular",
      status: "confirmado"
    },
    {
      id: 2,
      psychologist: "Dr. Carlos Santos",
      date: "2024-01-30",
      time: "10:00",
      type: "Consulta de Acompanhamento",
      status: "pendente"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'text-green-600 bg-green-100';
      case 'pendente':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Consultas</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Schedule New Appointment */}
        <Card>
          <CardContent className="p-6">
            <Button className="w-full flex items-center gap-2" size="lg">
              <Plus size={20} />
              Agendar Nova Consulta
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="text-primary" size={20} />
              Próximas Consultas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="text-primary" size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {appointment.psychologist}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.type}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(appointment.date).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {appointment.time}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Reagendar
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            ))}

            {upcomingAppointments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma consulta agendada</p>
                <p className="text-sm">Agende sua primeira consulta acima</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consultation History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="text-primary" size={20} />
              Histórico de Consultas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Histórico mockado - será integrado com dados reais */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
              <div className="flex-1">
                <div className="font-medium text-foreground">Dr. Ana Silva</div>
                <div className="text-sm text-muted-foreground">Emergência</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-foreground">20/01/2024</div>
                <div className="text-muted-foreground flex items-center gap-1">
                  <Clock size={12} />
                  14:00 • 50 min
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
              <div className="flex-1">
                <div className="font-medium text-foreground">Dr. Carlos Santos</div>
                <div className="text-sm text-muted-foreground">Consulta Regular</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-foreground">15/01/2024</div>
                <div className="text-muted-foreground flex items-center gap-1">
                  <Clock size={12} />
                  10:00 • 45 min
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Appointments;