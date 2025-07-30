import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Check, 
  X, 
  Eye, 
  ArrowLeft, 
  User, 
  Mail, 
  FileText, 
  IdCard,
  Loader2,
  UserCheck,
  Shield,
  Users,
  Calendar,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Activity
} from 'lucide-react';
import AdminProfile from '@/components/AdminProfile';
import RejectModal from '@/components/RejectModal';

interface Psychologist {
  id: string;
  full_name: string;
  crp: string;
  specialty: string;
  cpf: string;
  professional_email: string;
  created_at: string;
}

interface AdminMetrics {
  total_patients: number;
  active_psychologists: number;
  pending_psychologists: number;
  appointments_last_30_days: number;
  sos_requests_last_30_days: number;
  active_subscribers: number;
}

const AdminDashboard = () => {
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState<Psychologist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [psychologistToReject, setPsychologistToReject] = useState<string | null>(null);
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
        navigate('/patient-login');
        return;
      }

      // Check if user is admin using the new secure admin system
      const { data: isAdminResult, error: adminError } = await supabase
        .rpc('is_admin');

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
      fetchPendingPsychologists();
      fetchMetrics();
    } catch (error) {
      console.error('Error checking admin access:', error.message);
      navigate('/patient-login');
    }
  };

  const fetchPendingPsychologists = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-psychologist-management/pending');
      
      if (error) throw error;
      
      setPsychologists(data.psychologists || []);
    } catch (error) {
      console.error('Error fetching psychologists:', error.message);
      toast({
        title: "Erro",
        description: "Falha ao carregar psicólogos pendentes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    } catch (error) {
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

  const handleApprove = async (profileId: string) => {
    setActionLoading(profileId);
    try {
      const { error } = await supabase.functions.invoke('admin-psychologist-management/approve', {
        body: { profileId }
      });

      if (error) throw error;

      toast({
        title: "Psicólogo aprovado",
        description: "O cadastro foi aprovado e o email de confirmação foi enviado.",
      });

      setPsychologists(prev => prev.filter(p => p.id !== profileId));
      fetchMetrics(); // Refresh metrics
    } catch (error) {
      console.error('Error approving psychologist:', error.message);
      toast({
        title: "Erro",
        description: "Falha ao aprovar psicólogo",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!psychologistToReject) return;

    setActionLoading(psychologistToReject);
    try {
      const { error } = await supabase.functions.invoke('admin-psychologist-management/reject', {
        body: { 
          profileId: psychologistToReject,
          reason 
        }
      });

      if (error) throw error;

      toast({
        title: "Psicólogo recusado",
        description: "O cadastro foi recusado e o email foi enviado.",
      });

      setPsychologists(prev => prev.filter(p => p.id !== psychologistToReject));
      setRejectModalOpen(false);
      setPsychologistToReject(null);
      fetchMetrics(); // Refresh metrics
    } catch (error) {
      console.error('Error rejecting psychologist:', error.message);
      toast({
        title: "Erro",
        description: "Falha ao recusar psicólogo",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (profileId: string) => {
    setPsychologistToReject(profileId);
    setRejectModalOpen(true);
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.**$4');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (selectedPsychologist) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setSelectedPsychologist(null)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à Lista
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Detalhes do Psicólogo
              </CardTitle>
              <CardDescription>
                Cadastro realizado em {formatDate(selectedPsychologist.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nome Completo
                    </Label>
                    <p className="text-lg">{selectedPsychologist.full_name}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <IdCard className="h-4 w-4" />
                      Número do CRP
                    </Label>
                    <p className="text-lg font-mono">{selectedPsychologist.crp}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Especialidade(s)
                    </Label>
                    <p className="text-lg">{selectedPsychologist.specialty || 'Não informado'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <IdCard className="h-4 w-4" />
                      CPF
                    </Label>
                    <p className="text-lg font-mono">{formatCPF(selectedPsychologist.cpf)}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Profissional
                    </Label>
                    <p className="text-lg">{selectedPsychologist.professional_email}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t">
                <Button
                  onClick={() => handleApprove(selectedPsychologist.id)}
                  disabled={actionLoading === selectedPsychologist.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading === selectedPsychologist.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Aprovar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openRejectModal(selectedPsychologist.id)}
                  disabled={actionLoading === selectedPsychologist.id}
                >
                  <X className="mr-2 h-4 w-4" />
                  Recusar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <RejectModal
          isOpen={rejectModalOpen}
          onClose={() => {
            setRejectModalOpen(false);
            setPsychologistToReject(null);
          }}
          onConfirm={handleReject}
          isLoading={actionLoading === psychologistToReject}
        />
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
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="psychologists">Psicólogos</TabsTrigger>
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
                  {metrics?.pending_psychologists > 0 && (
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
                  
                  {metrics?.sos_requests_last_30_days > 10 && (
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Psicólogos Pendentes
                </CardTitle>
                <CardDescription>
                  {psychologists.length} cadastro(s) aguardando aprovação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Carregando...</span>
                  </div>
                ) : psychologists.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum psicólogo pendente no momento</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {psychologists.map((psychologist) => (
                      <div
                        key={psychologist.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedPsychologist(psychologist)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-medium">{psychologist.full_name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>CRP: {psychologist.crp}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {formatDate(psychologist.created_at)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPsychologist(psychologist);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(psychologist.id);
                            }}
                            disabled={actionLoading === psychologist.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading === psychologist.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRejectModal(psychologist.id);
                            }}
                            disabled={actionLoading === psychologist.id}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <AdminProfile />
          </TabsContent>
        </Tabs>
      </div>

      <RejectModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setPsychologistToReject(null);
        }}
        onConfirm={handleReject}
        isLoading={actionLoading === psychologistToReject}
      />
    </div>
  );
};

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={className}>{children}</label>
);

export default AdminDashboard;