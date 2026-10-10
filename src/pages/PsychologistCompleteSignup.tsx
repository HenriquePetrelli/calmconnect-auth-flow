import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { PsychologistService } from '@/services/psychologist.service';

/**
 * Conclusão do cadastro do psicólogo que confirmou o e-mail e entrou pela
 * primeira vez: falta só o documento do CRP. Depois de enviar, o cadastro vai
 * para análise e a pessoa sai da conta até ser aprovada.
 */
const PsychologistCompleteSignup = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = 'Concluir cadastro | Soliv';
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate('/', { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async () => {
    if (!file) {
      setError('Escolha o documento do CRP (PDF, JPG ou PNG de até 5 MB).');
      return;
    }
    setError(null);
    setSending(true);
    const result = await PsychologistService.completePendingRegistration(file);
    setSending(false);
    if (result.success) {
      setDone(true);
      toast.success('Cadastro enviado para análise!');
    } else {
      setError(result.error || 'Não foi possível enviar agora. Tente de novo.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <Logo className="mb-12" />
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle>{done ? 'Cadastro enviado' : 'Falta pouco'}</CardTitle>
            <CardDescription>
              {done
                ? 'Seu cadastro foi enviado para análise. Você receberá um e-mail quando for aprovado.'
                : 'Envie o documento do CRP para o seu cadastro ir para análise.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {done ? (
              <Button className="w-full" onClick={() => navigate('/', { replace: true })}>
                Voltar ao início
              </Button>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="crp-document">Documento do CRP</Label>
                  <Input
                    id="crp-document"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={sending}>
                  {sending ? 'Enviando...' : 'Enviar e concluir cadastro'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PsychologistCompleteSignup;
