import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscribed, subscriptionTier, checkSubscription } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      id: "plus",
      name: "Plus",
      price: "R$ 14,99",
      period: "/mês",
      priceId: "prod_SlYJKzH70jAWC6",
      features: [
        "1 consulta por mês",
        "1 uso do botão SOS por mês",
        "Acesso à biblioteca de sons",
        "Exercícios de respiração",
      ],
      appointments: 1,
      sosUses: 1,
    },
    {
      id: "premium",
      name: "Premium",
      price: "R$ 24,99",
      period: "/mês",
      priceId: "prod_SlYOe4FFI4UVZJ",
      features: [
        "2 consultas por mês",
        "2 usos do botão SOS por mês",
        "Acesso à biblioteca de sons",
        "Exercícios de respiração",
        "Suporte prioritário",
      ],
      appointments: 2,
      sosUses: 2,
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
        navigate("/patient-login");
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
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
              <div className="mt-4">
                <Button 
                  onClick={handleManageSubscription}
                  disabled={loading === "manage"}
                  variant="outline"
                >
                  {loading === "manage" ? "Carregando..." : "Gerenciar Assinatura"}
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
    </div>
  );
};

export default SubscriptionPlans;