import { usePsychologistManagement } from '@/hooks/usePsychologistManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';

export const PsychologistAuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, userType } = useAuth();
  const { checkPsychologistApproval } = usePsychologistManagement();
  const [approvalStatus, setApprovalStatus] = useState<{
    isApproved: boolean;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkApproval = async () => {
      if (!user || userType !== 'psychologist') {
        setLoading(false);
        return;
      }

      const result = await checkPsychologistApproval(user.id);
      setApprovalStatus(result);
      setLoading(false);
    };

    checkApproval();
  }, [user, userType]);

  if (loading) {
    return <SkeletonFullPage />;
  }

  // Se não é psicólogo, permite acesso normal
  if (userType !== 'psychologist') {
    return <>{children}</>;
  }

  // Se é psicólogo, verifica aprovação
  if (!approvalStatus?.isApproved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {approvalStatus?.status === 'pending' && (
                <Clock className="h-16 w-16 text-primary" />
              )}
              {approvalStatus?.status === 'rejected' && (
                <XCircle className="h-16 w-16 text-destructive" />
              )}
              {approvalStatus?.status === 'not_registered' && (
                <AlertTriangle className="h-16 w-16 text-warning" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {approvalStatus?.status === 'pending' && 'Cadastro em Análise'}
              {approvalStatus?.status === 'rejected' && 'Cadastro Rejeitado'}
              {approvalStatus?.status === 'not_registered' && 'Cadastro Necessário'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {approvalStatus?.status === 'pending' && (
              <>
                <Badge variant="secondary" className="text-sm">
                  Status: Aguardando Aprovação
                </Badge>
                <p className="text-muted-foreground">
                  Seu cadastro como psicólogo está sendo analisado por nossa equipe. 
                  Você receberá um email com a resposta em até 48 horas.
                </p>
              </>
            )}
            
            {approvalStatus?.status === 'rejected' && (
              <>
                <Badge variant="destructive" className="text-sm">
                  Status: Rejeitado
                </Badge>
                <p className="text-muted-foreground">
                  Infelizmente, seu cadastro como psicólogo não foi aprovado. 
                  Verifique seu email para mais detalhes sobre os motivos.
                </p>
              </>
            )}
            
            {approvalStatus?.status === 'not_registered' && (
              <>
                <Badge variant="outline" className="text-sm">
                  Status: Não Cadastrado
                </Badge>
                <p className="text-muted-foreground">
                  Para acessar funcionalidades de psicólogo, você precisa completar 
                  seu cadastro profissional.
                </p>
              </>
            )}
            
            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Se tiver dúvidas, entre em contato conosco.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se está aprovado, permite acesso
  return <>{children}</>;
};