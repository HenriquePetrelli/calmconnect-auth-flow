import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PsychologistSupport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.description) {
      toast({
        title: "Erro",
        description: "Por favor, preencha pelo menos o email e a descrição do problema.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Send support request via edge function
      const { data, error } = await supabase.functions.invoke('send-psychologist-support-request', {
        body: {
          email_retorno: formData.email,
          telefone_retorno: formData.phone,
          descricao: formData.description
        }
      });

      if (error) throw error;

      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de suporte foi enviada com sucesso. Em breve entraremos em contato."
      });

      // Reset form
      setFormData({
        email: '',
        phone: '',
        description: ''
      });

      // Navigate back after a delay
      setTimeout(() => {
        navigate('/psychologist-profile');
      }, 2000);

    } catch (error) {
      console.error('Error sending support request:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/psychologist-profile')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Suporte</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 pb-24">
        <Card>
          <CardHeader>
            <CardTitle>Entre em contato conosco</CardTitle>
            <p className="text-sm text-muted-foreground">
              Descreva seu problema e entraremos em contato o mais rápido possível.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email para retorno *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone para retorno</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição do problema *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva detalhadamente o problema que você está enfrentando..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[120px]"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2"
              >
                <Send size={16} />
                {loading ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Informações importantes:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Responderemos em até 24 horas úteis</li>
              <li>• Para emergências técnicas, entre em contato imediatamente</li>
              <li>• Mantenha seu email atualizado para receber nossa resposta</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PsychologistSupport;