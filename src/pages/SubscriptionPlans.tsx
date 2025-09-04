import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, ArrowLeft, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscribed, subscriptionTier, checkSubscription } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  const plans = [
    {
      id: "plus",
      name: "Plus",
      price: "R$ 69,99",
      period: "/mês",
      priceId: "price_1Rq1DDPhFwqSktZsLw00oVjj",
      features: [
        "1 chamada emergencial por mês",
        "Duração: 25 minutos",
        "Acesso à biblioteca de sons",
        "Exercícios de respiração",
      ],
      appointments: 0,
      sosUses: 1,
      duration: "25 minutos",
    },
    {
      id: "premium",
      name: "Premium",
      price: "R$ 120,00",
      period: "/mês",
      priceId: "price_1Rq1HXPhFwqSktZsnHu3qDIA",
      features: [
        "1 chamada emergencial por mês",
        "1 consulta agendada por mês",
        "Duração: 50 minutos",
        "Acesso à biblioteca de sons",
        "Exercícios de respiração",
        "Suporte prioritário",
      ],
      appointments: 1,
      sosUses: 1,
      duration: "50 minutos",
      popular: true,
    },
  ];

  const handleSubscribe = async (plan: typeof plans[0]) => {
    try {
      setLoading(plan.id);
      
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para assinar um plano",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: plan.priceId,
          plan: plan.name,
        },
      });

      if (error) {
        console.error('Error creating checkout:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar sessão de pagamento",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao processar assinatura",
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/home")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Escolha seu Plano</h1>
          <p className="text-muted-foreground">
            Acesso completo aos nossos serviços de bem-estar mental
          </p>
          
          {subscribed && (
            <div className="mt-6">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Plano Atual: {subscriptionTier}
              </Badge>
              <div className="mt-4 space-y-2">
                <Button 
                  onClick={() => navigate('/subscription-plans')}
                  disabled={loading === "manage"}
                  variant="outline"
                  className="w-full"
                >
                  {loading === "manage" ? "Carregando..." : "Trocar Plano"}
                </Button>
                
                {subscriptionTier === "Premium" && (
                  <Button 
                    onClick={handleDowngrade}
                    variant="outline"
                    className="w-full"
                  >
                    Fazer Downgrade
                  </Button>
                )}
                
                <Button 
                  onClick={() => setShowCancelModal(true)}
                  disabled={loading === "cancel"}
                  variant="destructive"
                  className="w-full"
                >
                  {loading === "cancel" ? "Cancelando..." : "Cancelar Assinatura"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''} ${
                subscriptionTier === plan.name ? 'ring-2 ring-primary' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  Mais Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading === plan.id || (subscribed && subscriptionTier === plan.name)}
                  className="w-full"
                  variant={subscriptionTier === plan.name ? "secondary" : "default"}
                >
                  {loading === plan.id ? "Processando..." : 
                   subscriptionTier === plan.name ? "Plano Atual" : 
                   subscribed ? `Trocar para ${plan.name}` : 
                   "Assinar Agora"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button 
            onClick={checkSubscription}
            variant="ghost"
            size="sm"
          >
            Atualizar Status da Assinatura
          </Button>
        </div>
      </div>

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
                    handleSubscribe(plans[0]);
                  }}
                >
                  Trocar para Plus
                </Button>
              </div>
            </Card>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowDowngradeModal(false);
                setShowCancelModal(true);
              }}
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

export default SubscriptionPlans;