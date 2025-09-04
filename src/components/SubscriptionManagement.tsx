import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";

const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscribed, subscriptionTier, checkSubscription } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  const handleManageSubscription = async () => {
    try {
      setLoading("manage");
      
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        console.error('Error creating portal session:', error);
        toast({
          title: "Erro",
          description: "Erro ao acessar portal de gerenciamento",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao abrir portal",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setLoading("cancel");
      
      const { data, error } = await supabase.functions.invoke('cancel-subscription');

      if (error) {
        console.error('Error cancelling subscription:', error);
        toast({
          title: "Erro",
          description: "Erro ao cancelar assinatura",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Assinatura cancelada",
          description: "Sua assinatura foi cancelada com sucesso.",
        });
        
        // Refresh subscription status
        await checkSubscription();
        
        // Redirect to feedback page
        navigate('/subscription-cancel');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao cancelar assinatura",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
      setShowCancelModal(false);
    }
  };

  const handleDowngrade = () => {
    if (subscriptionTier === "Premium") {
      setShowDowngradeModal(true);
    }
  };

  return (
    <div className="space-y-4">
      {subscribed ? (
        <div className="space-y-2">
          <Button 
            className="w-full" 
            onClick={handleManageSubscription}
            disabled={loading === "manage"}
          >
            {loading === "manage" ? "Carregando..." : "Gerenciar Assinatura"}
          </Button>
          
          {subscriptionTier === "Premium" && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleDowngrade}
            >
              Fazer Downgrade
            </Button>
          )}
          
          <Button 
            variant="destructive" 
            className="w-full" 
            onClick={() => setShowCancelModal(true)}
          >
            Cancelar Assinatura
          </Button>
        </div>
      ) : (
        <Button className="w-full" onClick={() => navigate('/subscription-plans')}>
          <Crown size={16} className="mr-2" />
          Fazer Upgrade
        </Button>
      )}

      {/* Cancel Confirmation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Cancelar Assinatura
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar sua assinatura? Você perderá acesso aos benefícios do seu plano atual.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              className="flex-1"
              disabled={loading === "cancel"}
            >
              Manter Assinatura
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              className="flex-1"
              disabled={loading === "cancel"}
            >
              {loading === "cancel" ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Downgrade Modal */}
      <Dialog open={showDowngradeModal} onOpenChange={setShowDowngradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opções de Downgrade</DialogTitle>
            <DialogDescription>
              Escolha uma das opções abaixo para alterar sua assinatura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Card className="p-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Plano Plus - R$ 69,99/mês</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 1 chamada emergencial por mês (25 min)</li>
                  <li>• Acesso à biblioteca de sons</li>
                  <li>• Exercícios de respiração</li>
                </ul>
                <Button 
                  className="w-full"
                  onClick={() => {
                    setShowDowngradeModal(false);
                    navigate('/subscription-plans');
                  }}
                >
                  Trocar para Plus
                </Button>
              </div>
            </Card>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCancelModal(true)}
            >
              Cancelar Assinatura Completamente
            </Button>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowDowngradeModal(false)}
            >
              Manter Plano Atual
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManagement;