import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { clearLoginState } from '@/lib/loginState';
import { hasAdminMfaSession, mfaErrorMessage } from '@/lib/adminMfa';

type Step =
  | { kind: 'loading' }
  | { kind: 'enroll'; factorId: string; qrCode: string; secret: string }
  | { kind: 'verify'; factorId: string }
  | { kind: 'error'; message: string };

/**
 * Verificação em duas etapas do admin (app autenticador, código de 6 dígitos).
 * Primeira vez: lê o QR code no app e confirma um código. Nas próximas: só o
 * código. Sem isso, o banco e as funções de admin recusam tudo.
 */
const AdminMfaVerification = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = 'Verificação em duas etapas | Soliv';
    let cancelled = false;

    const start = async () => {
      if (await hasAdminMfaSession()) {
        navigate('/admin-dashboard', { replace: true });
        return;
      }
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const totp = data?.all?.filter((f) => f.factor_type === 'totp') ?? [];
      const verified = totp.find((f) => f.status === 'verified');
      if (verified) {
        if (!cancelled) setStep({ kind: 'verify', factorId: verified.id });
        return;
      }
      // Cadastro que ficou pela metade (QR lido mas código não confirmado): recomeça.
      for (const factor of totp) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (enrollError || !enrolled) throw enrollError ?? new Error('enroll');
      if (!cancelled) {
        setStep({ kind: 'enroll', factorId: enrolled.id, qrCode: enrolled.totp.qr_code, secret: enrolled.totp.secret });
      }
    };

    start().catch((err) => {
      console.error('Erro ao preparar a verificação em duas etapas:', err);
      if (!cancelled) setStep({ kind: 'error', message: 'Não foi possível preparar a verificação. Recarregue a página.' });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const confirm = async () => {
    if (step.kind !== 'enroll' && step.kind !== 'verify') return;
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) {
      setError('Digite os 6 números que aparecem no app autenticador.');
      return;
    }
    setError(null);
    setSending(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: step.factorId, code: digits });
    setSending(false);
    if (verifyError) {
      setError(mfaErrorMessage(verifyError));
      setCode('');
      return;
    }
    clearLoginState();
    if (step.kind === 'enroll') toast.success('Verificação em duas etapas ativada');
    navigate('/admin-dashboard', { replace: true });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <Logo className="mb-12" />
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle>
              {step.kind === 'enroll' ? 'Ative a verificação em duas etapas' : 'Verificação em duas etapas'}
            </CardTitle>
            <CardDescription>
              {step.kind === 'enroll'
                ? 'O painel do admin exige um código do celular, além da senha.'
                : 'Digite o código de 6 dígitos do seu app autenticador.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step.kind === 'loading' && <p className="text-sm text-muted-foreground">Carregando...</p>}

            {step.kind === 'error' && <p className="text-sm text-destructive">{step.message}</p>}

            {step.kind === 'enroll' && (
              <div className="space-y-3 text-sm">
                <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li>Instale um app autenticador no celular (Google Authenticator, Microsoft Authenticator, Authy ou 1Password).</li>
                  <li>No app, adicione uma conta lendo o QR code abaixo.</li>
                  <li>Digite o código de 6 dígitos que o app mostrar.</li>
                </ol>
                <div className="flex justify-center rounded-lg border bg-white p-3">
                  <img src={step.qrCode} alt="QR code para o app autenticador" className="h-44 w-44" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Não consegue ler o QR code? Digite esta chave no app:{' '}
                  <span className="break-all font-mono text-foreground" data-testid="mfa-secret">{step.secret}</span>
                </p>
              </div>
            )}

            {(step.kind === 'enroll' || step.kind === 'verify') && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void confirm();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="mfa-code">Código</Label>
                  <Input
                    id="mfa-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? 'Confirmando...' : 'Confirmar'}
                </Button>
              </form>
            )}

            {step.kind === 'verify' && (
              <p className="text-xs text-muted-foreground">
                Perdeu o celular? Outra pessoa com acesso ao Supabase pode remover a verificação desta conta em
                Authentication → Users; no próximo login, você cadastra o app de novo.
              </p>
            )}

            <Button variant="ghost" className="w-full" onClick={() => void signOut()}>
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminMfaVerification;
