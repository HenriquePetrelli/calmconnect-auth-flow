import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2,
  UserCheck,
  Shield,
  Users,
  Calendar,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Activity,
  Check
} from 'lucide-react';
import AdminProfile from '@/components/AdminProfile';
import { PsychologistApprovalPanel } from '@/components/psychologist/PsychologistApprovalPanel';
import { PaymentsPanel } from '@/components/payments/PaymentsPanel';
import { Button } from '@/components/ui/button';

interface AdminMetrics {
  total_patients: number;
  active_psychologists: number;
  pending_psychologists: number;
  appointments_last_30_days: number;
  sos_requests_last_30_days: number;
  active_subscribers: number;
}

const AdminDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/');
        return;
      }

      // Check if user is super admin using the new system
      const { data: isAdminResult, error: adminError } = await supabase
        .rpc('is_super_admin', { user_id_param: session.user.id });

      if (adminError) {
        console.error('Error checking admin status:', adminError.message);
        toast({
          title: "Erro",
          description: "Erro ao verificar permissões",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      if (!isAdminResult) {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem acessar esta área.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setUser(session.user);
      setIsAdmin(true);
      fetchMetrics();
    } catch (error: any) {
      console.error('Error checking admin access:', error.message);
      navigate('/');
    }
  };

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_admin_metrics');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setMetrics(data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching metrics:', error.message);
      toast({
        title: "Erro",
        description: "Falha ao carregar métricas do sistema",
        variant: "destructive",
      });
    } finally {
      setMetricsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Verificando permissões...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground mt-2">
            Bem-vindo, {user?.email}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="psychologists">Psicólogos</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Métricas Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metricsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))
              ) : metrics ? (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.total_patients}</div>
                      <p className="text-xs text-muted-foreground">Pacientes registrados</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Psicólogos Ativos</CardTitle>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.active_psychologists}</div>
                      <p className="text-xs text-muted-foreground">Aprovados e ativos</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.pending_psychologists}</div>
                      <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Consultas (30d)</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.appointments_last_30_days}</div>
                      <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">SOS (30d)</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.sos_requests_last_30_days}</div>
                      <p className="text-xs text-muted-foreground">Pedidos de emergência</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Assinantes Ativos</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.active_subscribers}</div>
                      <p className="text-xs text-muted-foreground">Planos pagos</p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">Falha ao carregar métricas</p>
                </div>
              )}
            </div>

            {/* Alertas e Ações Rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Resumo de Atividade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {metrics && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Taxa de Aprovação</span>
                        <span className="font-medium">
                          {metrics.active_psychologists + metrics.pending_psychologists > 0 
                            ? Math.round((metrics.active_psychologists / (metrics.active_psychologists + metrics.pending_psychologists)) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Consultas por Psicólogo</span>
                        <span className="font-medium">
                          {metrics.active_psychologists > 0 
                            ? Math.round(metrics.appointments_last_30_days / metrics.active_psychologists)
                            : 0} média
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Taxa de Conversão</span>
                        <span className="font-medium">
                          {metrics.total_patients > 0 
                            ? Math.round((metrics.active_subscribers / metrics.total_patients) * 100)
                            : 0}%
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Ações Necessárias
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {metrics?.pending_psychologists && metrics.pending_psychologists > 0 && (
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div>
                        <p className="font-medium text-orange-800 dark:text-orange-200">
                          {metrics.pending_psychologists} psicólogo(s) pendente(s)
                        </p>
                        <p className="text-sm text-orange-600 dark:text-orange-300">
                          Necessita aprovação
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab("psychologists")}>
                        Ver
                      </Button>
                    </div>
                  )}
                  
                  {metrics?.sos_requests_last_30_days && metrics.sos_requests_last_30_days > 10 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-200">
                          Alto volume de SOS
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-300">
                          {metrics.sos_requests_last_30_days} nos últimos 30 dias
                        </p>
                      </div>
                    </div>
                  )}

                  {(!metrics?.pending_psychologists || metrics.pending_psychologists === 0) && 
                   (!metrics?.sos_requests_last_30_days || metrics.sos_requests_last_30_days <= 10) && (
                    <div className="flex items-center justify-center p-6 text-center">
                      <div>
                        <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Tudo em ordem! Nenhuma ação urgente necessária.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="psychologists" className="space-y-6">
            <PsychologistApprovalPanel adminUserId={user?.id} />
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <PaymentsPanel />
          </TabsContent>

          <TabsContent value="profile">
            <AdminProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;