import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ArrowLeft } from "lucide-react";

const SubscriptionCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Assinatura Cancelada</CardTitle>
          <CardDescription>
            Sua assinatura foi cancelada. Você pode tentar novamente a qualquer momento.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Não se preocupe! Você ainda pode acessar nossos recursos gratuitos e tentar assinar novamente quando estiver pronto.
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate("/subscription-plans")}
              className="w-full"
            >
              Tentar Novamente
            </Button>
            
            <Button 
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionCancel;