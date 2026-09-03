import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, AlertTriangle, Crown } from "lucide-react";
import PageHeader from "@/components/PageHeader";
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
      price: "R$ 69,90",
      period: "/mês",
      priceId: "price_1S3qAKPhFwqSktZsXexQefrx",
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
      priceId: "price_1S3q9YPhFwqSktZsejrePGuS",
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
    setShowDowngradeModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Planos de Assinatura" backTo="/home" />
      <div className="max-w-4xl mx-auto p-4">



        <div className="text-center mb-16">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Escolha seu Plano
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Acesso completo aos nossos serviços de bem-estar mental com profissionais qualificados
            </p>
          </div>
          
          {subscribed && (
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-8 border border-primary/20">
              <div className="flex flex-col items-center gap-4">
                <Badge 
                  variant="secondary" 
                  className="text-lg px-6 py-3 bg-primary/10 text-primary border border-primary/20"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  Plano Atual: {subscriptionTier}
                </Badge>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                  <Button 
                    onClick={handleDowngrade}
                    variant="outline"
                    className="flex-1 bg-background hover:bg-muted"
                  >
                    Fazer Downgrade
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 ${
                plan.popular 
                  ? 'border-primary shadow-2xl scale-105 bg-gradient-to-b from-primary/5 to-accent/5' 
                  : 'border-border hover:border-primary/50'
              } ${
                subscriptionTier === plan.name ? 'ring-2 ring-primary shadow-primary/25' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
                  <Crown className="w-4 h-4 mr-1" />
                  Mais Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-3xl font-bold mb-2">{plan.name}</CardTitle>
                <CardDescription className="mb-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-lg text-muted-foreground">{plan.period}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-8">
                <ul className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading === plan.id || (subscribed && subscriptionTier === plan.name)}
                  className={`w-full py-6 text-lg font-semibold ${
                    plan.popular ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90' : ''
                  }`}
                  variant={subscriptionTier === plan.name ? "secondary" : "default"}
                  size="lg"
                >
                  {loading === plan.id ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processando...
                    </div>
                  ) : subscriptionTier === plan.name ? (
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      Plano Atual
                    </div>
                  ) : subscribed ? (
                    `Trocar para ${plan.name}`
                  ) : (
                    "Assinar Agora"
                  )}
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
            {subscriptionTier === "Premium" && (
              <Card className="p-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Plano Plus - R$ 69,90/mês</h4>
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
            )}
            
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                setShowDowngradeModal(false);
                setShowCancelModal(true);
              }}
            >
              Cancelar Assinatura
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionPlans;