import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Crown, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppointmentScheduler } from '@/components/appointments/AppointmentScheduler';
import { UpcomingAppointments } from '@/components/appointments/UpcomingAppointments';
import { AppointmentHistory } from '@/components/appointments/AppointmentHistory';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';


const Appointments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscribed, subscriptionTier } = useSubscription();
  const [showScheduler, setShowScheduler] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleScheduleSuccess = () => {
    setShowScheduler(false);
  };

  const handleScheduleClick = () => {
    if (!subscribed) {
      toast({
        title: "Assinatura necessária",
        description: "Você precisa de uma assinatura para agendar consultas.",
        variant: "destructive",
      });
      navigate('/subscription-plans');
      return;
    }

    if (subscriptionTier === 'Plus') {
      setShowUpgradeModal(true);
      return;
    }

    if (subscriptionTier === 'Premium') {
      setShowScheduler(true);
    }
  };

  if (showScheduler) {
    return (
      <AppointmentScheduler
        onBack={() => setShowScheduler(false)}
        onSuccess={handleScheduleSuccess}
      />
    );
  }

  return (
    <div className="has-tabs">
      <div className="screen">

        {/* Content */}
        <main className="p-4 space-y-6">
          {/* Schedule New Appointment */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Schedule New Appointment</h3>
                  <p className="text-sm text-muted-foreground">Book a session with a psychologist</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button 
                  className="flex-1 flex items-center gap-2 transition-all duration-200 hover:scale-105" 
                  size="lg"
                  onClick={handleScheduleClick}
                  disabled={subscriptionTier !== 'Premium'}
                >    
                   <Plus className="w-4 h-4" />
                    Agendar Nova Consulta
                    {subscriptionTier !== 'Premium' && <Crown className="w-4 h-4 ml-2" />}
                </Button>
                {subscriptionTier !== 'Premium' && (
                  <Badge className="bg-premium-primary text-white px-3 py-2 text-xs flex items-center gap-1 rounded-full">
                    <Crown className="w-3 h-3" />
                    Premium
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <UpcomingAppointments />

          {/* Consultation History */}
          <AppointmentHistory />
        </main>
      </div>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Upgrade para Premium
            </DialogTitle>
            <DialogDescription>
              O agendamento de consultas está disponível apenas para usuários Premium.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Plano Premium - R$ 120,00/mês</h4>
              <ul className="text-sm space-y-1">
                <li>• 1 consulta agendada por mês (50 minutos)</li>
                <li>• 1 chamada emergencial por mês</li>
                <li>• Acesso completo à biblioteca de sons</li>
                <li>• Suporte prioritário</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setShowUpgradeModal(false);
                  navigate('/subscription-plans');
                }}
                className="flex-1"
              >
                Fazer Upgrade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Appointments;