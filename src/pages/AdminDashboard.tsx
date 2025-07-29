import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
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
  UserCheck
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

const AdminDashboard = () => {
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState<Psychologist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [psychologistToReject, setPsychologistToReject] = useState<string | null>(null);
  const { admin } = useAdmin();
  const { toast } = useToast();

  const fetchPendingPsychologists = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-psychologist-management/pending');
      
      if (error) throw error;
      
      setPsychologists(data.psychologists || []);
    } catch (error) {
      console.error('Error fetching psychologists:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar psicólogos pendentes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPsychologists();
  }, []);

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

      // Remove from list
      setPsychologists(prev => prev.filter(p => p.id !== profileId));
    } catch (error) {
      console.error('Error approving psychologist:', error);
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

      // Remove from list
      setPsychologists(prev => prev.filter(p => p.id !== psychologistToReject));
      setRejectModalOpen(false);
      setPsychologistToReject(null);
    } catch (error) {
      console.error('Error rejecting psychologist:', error);
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
          <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-2">
            Bem-vindo, {admin?.email}
          </p>
        </div>

        <Tabs defaultValue="home" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-6">
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