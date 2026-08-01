import React, { useState, useEffect } from 'react';
import { SkeletonFullPage, SkeletonStatsGrid } from '@/components/skeletons/Skeletons';
import { ContentTransition } from '@/components/skeletons/ContentTransition';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  UserCheck,
  Shield,
  Users,
  Calendar,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Activity,
  Check,
  LogOut,
  LayoutDashboard,
  UserCog,
  Menu,
} from 'lucide-react';
import AdminProfile from '@/components/AdminProfile';
import { PsychologistApprovalPanel } from '@/components/psychologist/PsychologistApprovalPanel';
import { PatientsPanel } from '@/components/admin/PatientsPanel';
import { PaymentsPanel } from '@/components/payments/PaymentsPanel';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const navItems = [
    { value: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { value: 'psychologists', label: 'Psicólogos', icon: UserCheck },
    { value: 'patients', label: 'Pacientes', icon: Users },
    { value: 'payments', label: 'Pagamentos', icon: CreditCard },
    { value: 'profile', label: 'Perfil', icon: UserCog },
  ] as const;

  const activeNav = navItems.find(n => n.value === activeTab) ?? navItems[0];

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
      setMetricsLoading(true);
      setMetricsError(null);
      const { data, error } = await supabase.rpc('get_admin_metrics');
      if (error) throw error;
      if (data && data.length > 0) setMetrics(data[0]);
    } catch (error: any) {
      console.error('Error fetching metrics:', error.message);
      setMetricsError(error?.message || 'Falha ao carregar métricas');
      toast({
        title: "Erro",
        description: "Falha ao carregar métricas do sistema",
        variant: "destructive",
      });
    } finally {
      setMetricsLoading(false);
    }
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (!isAdmin) {
    return <SkeletonFullPage />;
  }

  const tabTriggerClass =
    'flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium rounded-md ' +
    'data-[state=active]:bg-secondary data-[state=active]:text-white data-[state=active]:shadow-sm transition-colors';

  const metricCards = metrics
    ? [
        {
          label: 'Total de Pacientes',
          value: metrics.total_patients,
          hint: 'Pacientes registrados',
          icon: Users,
          accent: 'primary',
        },
        {
          label: 'Psicólogos Ativos',
          value: metrics.active_psychologists,
          hint: 'Aprovados e não bloqueados',
          icon: UserCheck,
          accent: 'secondary',
        },
        {
          label: 'Psicólogos Pendentes',
          value: metrics.pending_psychologists,
          hint: 'Cadastros aguardando aprovação do admin',
          icon: AlertTriangle,
          accent: 'warning',
        },
        {
          label: 'Consultas (30d)',
          value: metrics.appointments_last_30_days,
          hint: 'Últimos 30 dias',
          icon: Calendar,
          accent: 'primary',
        },
        {
          label: 'SOS (30d)',
          value: metrics.sos_requests_last_30_days,
          hint: 'Pedidos de emergência',
          icon: Activity,
          accent: 'destructive',
        },
        {
          label: 'Assinantes Ativos',
          value: metrics.active_subscribers,
          hint: 'Planos pagos',
          icon: CreditCard,
          accent: 'secondary',
        },
      ]
    : [];

  const accentStyles: Record<string, { border: string; bg: string; iconBg: string; iconText: string; value: string }> = {
    primary: {
      border: 'border-primary/20',
      bg: 'bg-gradient-to-br from-primary/5 to-transparent',
      iconBg: 'bg-primary/10',
      iconText: 'text-primary',
      value: 'text-primary',
    },
    secondary: {
      border: 'border-secondary/30',
      bg: 'bg-gradient-to-br from-secondary/10 to-transparent',
      iconBg: 'bg-secondary/20',
      iconText: 'text-secondary-foreground',
      value: 'text-secondary-foreground',
    },
    destructive: {
      border: 'border-destructive/20',
      bg: 'bg-gradient-to-br from-destructive/5 to-transparent',
      iconBg: 'bg-destructive/10',
      iconText: 'text-destructive',
      value: 'text-destructive',
    },
    warning: {
      border: 'border-warning/30',
      bg: 'bg-gradient-to-br from-warning/10 to-transparent',
      iconBg: 'bg-warning/15',
      iconText: 'text-warning',
      value: 'text-warning',
    },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-secondary text-secondary-foreground border-b border-secondary/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 md:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-secondary-foreground/70 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Painel Administrativo
              </p>
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-white truncate">
                {user?.email}
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden rounded-full text-white hover:bg-white/15 hover:text-white h-9 w-9"
                    aria-label="Abrir menu"
                  >
                    <Menu className="w-[18px] h-[18px]" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[82vw] max-w-xs p-0 bg-secondary text-secondary-foreground border-r-0">
                  <SheetHeader className="p-4 border-b border-white/10 text-left">
                    <SheetTitle className="text-white flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4" /> Painel Administrativo
                    </SheetTitle>
                    <p className="text-xs text-white/70 truncate">{user?.email}</p>
                  </SheetHeader>
                  <nav className="p-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.value;
                      return (
                        <button
                          key={item.value}
                          onClick={() => {
                            setActiveTab(item.value);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-white/15 text-white'
                              : 'text-white/85 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => {
                          setMobileNavOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/85 hover:bg-destructive/30 hover:text-white transition-colors"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Sair</span>
                      </button>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex rounded-full text-white hover:bg-destructive/40 hover:text-white h-9 w-9"
                onClick={handleLogout}
                title="Sair"
                aria-label="Sair"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </Button>
            </div>

          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4 sm:space-y-5 md:space-y-6">
        {/* Mobile: current section indicator */}
        <div className="md:hidden flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <activeNav.icon className="w-4 h-4 text-secondary shrink-0" />
            <span className="text-sm font-semibold truncate">{activeNav.label}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="w-4 h-4" />
            Menu
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="hidden md:grid w-full h-auto p-1 bg-muted/60 grid-cols-5 gap-1 rounded-lg">
            <TabsTrigger value="overview" className={tabTriggerClass}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="psychologists" className={tabTriggerClass}>
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Psicólogos</span>
            </TabsTrigger>
            <TabsTrigger value="patients" className={tabTriggerClass}>
              <Users className="w-4 h-4 shrink-0" />
              <span>Pacientes</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className={tabTriggerClass}>
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Pagamentos</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className={tabTriggerClass}>
              <UserCog className="w-4 h-4 shrink-0" />
              <span>Perfil</span>
            </TabsTrigger>
          </TabsList>


          <TabsContent value="overview" className="space-y-4 sm:space-y-6 mt-4">
            {/* Métricas Gerais */}
            <ContentTransition
              loading={metricsLoading}
              skeleton={
                <SkeletonStatsGrid
                  count={6}
                  columns="grid-cols-2 md:grid-cols-3"
                  compact
                />
              }
            >
              {metrics ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                  {metricCards.map(({ label, value, hint, icon: Icon, accent }) => {
                    const s = accentStyles[accent];
                    return (
                      <Card key={label} className={`${s.border} ${s.bg}`}>
                        <CardContent className="p-3 sm:p-5">
                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                                {label}
                              </p>
                              <p className={`text-xl sm:text-3xl font-bold mt-1 sm:mt-1.5 ${s.value}`}>
                                {value}
                              </p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                                {hint}
                              </p>
                            </div>
                            <div className={`rounded-lg p-1.5 sm:p-2.5 shrink-0 ${s.iconBg}`}>
                              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.iconText}`} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <ErrorState
                  title="Falha ao carregar métricas"
                  description={metricsError || "Não conseguimos buscar os dados agora. Tente novamente em instantes."}
                  onRetry={fetchMetrics}
                  retrying={metricsLoading}
                />
              )}
            </ContentTransition>


            {/* Resumo e Ações */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Resumo de Atividade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {metrics && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Taxa de Aprovação</span>
                        <span className="font-semibold text-sm">
                          {metrics.active_psychologists + metrics.pending_psychologists > 0
                            ? Math.round((metrics.active_psychologists / (metrics.active_psychologists + metrics.pending_psychologists)) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Consultas por Psicólogo</span>
                        <span className="font-semibold text-sm">
                          {metrics.active_psychologists > 0
                            ? Math.round(metrics.appointments_last_30_days / metrics.active_psychologists)
                            : 0} <span className="text-muted-foreground font-normal">média</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
                        <span className="font-semibold text-sm">
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                    Ações Necessárias
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {metrics?.pending_psychologists && metrics.pending_psychologists > 0 ? (
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground">
                          {metrics.pending_psychologists} psicólogo(s) pendente(s)
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Necessita aprovação
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab("psychologists")}>
                        Revisar
                      </Button>
                    </div>
                  ) : null}

                  {metrics?.sos_requests_last_30_days && metrics.sos_requests_last_30_days > 10 ? (
                    <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-destructive">
                          Alto volume de SOS
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {metrics.sos_requests_last_30_days} nos últimos 30 dias
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {(!metrics?.pending_psychologists || metrics.pending_psychologists === 0) &&
                    (!metrics?.sos_requests_last_30_days || metrics.sos_requests_last_30_days <= 10) && (
                      <div className="flex items-center justify-center py-8 text-center">
                        <div>
                          <div className="rounded-full bg-success/10 p-3 mx-auto w-fit mb-3">
                            <Check className="h-6 w-6 text-success" />
                          </div>
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

          <TabsContent value="psychologists" className="mt-4">
            <PsychologistApprovalPanel adminUserId={user?.id} />
          </TabsContent>

          <TabsContent value="patients" className="mt-4">
            <PatientsPanel />
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <PaymentsPanel />
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <AdminProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
