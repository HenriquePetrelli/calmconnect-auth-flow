import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkSubscription } = useSubscription();
  const { toast } = useToast();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      // Wait a moment then check subscription status
      setTimeout(() => {
        checkSubscription();
      }, 2000);
      
      toast({
        title: "Assinatura Ativada!",
        description: "Sua assinatura foi processada com sucesso.",
      });
    }
  }, [searchParams, checkSubscription, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Assinatura Ativada!</CardTitle>
          <CardDescription>
            Parabéns! Sua assinatura foi processada com sucesso. Agora você tem acesso completo aos nossos serviços.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">O que você pode fazer agora:</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Agendar consultas mensais</li>
              <li>• Usar o botão SOS quando necessário</li>
              <li>• Acessar toda a biblioteca de sons</li>
              <li>• Praticar exercícios de respiração</li>
            </ul>
          </div>
          
          <Button 
            onClick={() => navigate("/")}
            className="w-full"
          >
            Ir para o Início
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;