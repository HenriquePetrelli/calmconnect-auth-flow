import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppointmentScheduler } from '@/components/appointments/AppointmentScheduler';
import { UpcomingAppointments } from '@/components/appointments/UpcomingAppointments';
import { AppointmentHistory } from '@/components/appointments/AppointmentHistory';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BottomNavigation from '@/components/BottomNavigation';

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Consultas</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 pb-24">
        {/* Schedule New Appointment */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Button 
                className="flex-1 flex items-center gap-2" 
                size="lg"
                onClick={handleScheduleClick}
                disabled={subscriptionTier !== 'Premium'}
              >
                <Plus size={20} />
                Agendar Nova Consulta
              </Button>
              {subscriptionTier !== 'Premium' && (
                <Badge className="bg-premium-primary text-white px-2 py-1 text-xs flex items-center gap-1">
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
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />

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