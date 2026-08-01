import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, CheckCircle, XCircle, FileText, Download, MapPin, UserCheck, User, Users, Pencil, Ban, Unlock, Search, MoreHorizontal, Trash2 } from 'lucide-react';
import { usePsychologistManagement, PsychologistData } from '@/hooks/usePsychologistManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DocumentViewer } from './DocumentViewer';
import { EditPsychologistModal } from './EditPsychologistModal';
import { BlockPsychologistModal } from './BlockPsychologistModal';
import { isCurrentlyBlocked, formatBlockPeriod } from '@/utils/psychologistBlock';
import { SkeletonCardGrid } from '@/components/skeletons/Skeletons';
import { ContentTransition } from '@/components/skeletons/ContentTransition';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';


const extractDocumentRef = (
  url?: string
): { bucket: string; path: string } | undefined => {
  if (!url) return undefined;

  // Remove query parameters if any
  const cleanUrl = url.split('?')[0];

  // Supabase storage pattern (public or sign), any bucket
  const supabaseMatch = cleanUrl.match(
    /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/
  );

  if (supabaseMatch) {
    return {
      bucket: decodeURIComponent(supabaseMatch[1]),
      path: decodeURIComponent(supabaseMatch[2]),
    };
  }

  // If it's already a simple path (without http)
  if (!cleanUrl.startsWith('http')) {
    return { bucket: 'psychologist-documents', path: cleanUrl };
  }

  return undefined;
};


interface PsychologistApprovalPanelProps {
  adminUserId: string;
}

export const PsychologistApprovalPanel = ({ adminUserId }: PsychologistApprovalPanelProps) => {
  const [selectedPsychologist, setSelectedPsychologist] = useState<PsychologistData | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [editOpen, setEditOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState<any | null>(null);
  const [blockMode, setBlockMode] = useState<'block' | 'unblock'>('block');

  const {
    loading,
    error,
    pendingPsychologists,
    getPendingPsychologists,
    getPsychologistDetails,
    approvePsychologist,
    rejectPsychologist
  } = usePsychologistManagement();

  useEffect(() => {
    getPendingPsychologists();
  }, []);

  const handleViewDetails = async (psychologist: PsychologistData) => {
    const details = await getPsychologistDetails(psychologist.id);
    if (details) {
      setSelectedPsychologist(details);
    }
  };

  const handleApprove = async (psychologistId: string) => {
    const result = await approvePsychologist(psychologistId, adminUserId);
    if (result.success) {
      setSelectedPsychologist(null);
    }
  };

  const handleReject = async (psychologistId: string) => {
    const result = await rejectPsychologist(psychologistId, adminUserId, rejectionReason);
    if (result.success) {
      setSelectedPsychologist(null);
      setRejectionReason('');
    }
  };

  const getStatusBadge = (status: string, psych?: any) => {
    if (isCurrentlyBlocked(psych)) {
      return <Badge className="bg-black text-white hover:bg-black">Bloqueado</Badge>;
    }
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-success">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const filteredPsychologists = pendingPsychologists.filter(psych => {
    if (filter === 'all') return true;
    return psych.approval_status === filter;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Gestão de Psicólogos</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Analise e gerencie os cadastros de psicólogos na plataforma
          </p>
        </div>
        <Button onClick={getPendingPsychologists} disabled={loading} size="sm" className="w-full sm:w-auto">
          {loading ? 'Carregando...' : 'Atualizar'}
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full">
        <TabsList className="w-full h-auto p-1 bg-muted/60 grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-lg">
          <TabsTrigger value="pending" className="text-xs sm:text-sm data-[state=active]:bg-secondary data-[state=active]:text-white">Pendentes ({pendingPsychologists.filter(p => p.approval_status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="approved" className="text-xs sm:text-sm data-[state=active]:bg-secondary data-[state=active]:text-white">Aprovados ({pendingPsychologists.filter(p => p.approval_status === 'approved').length})</TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs sm:text-sm data-[state=active]:bg-secondary data-[state=active]:text-white">Rejeitados ({pendingPsychologists.filter(p => p.approval_status === 'rejected').length})</TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm data-[state=active]:bg-secondary data-[state=active]:text-white">Todos ({pendingPsychologists.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <ContentTransition
        loading={loading && pendingPsychologists.length === 0}
        skeleton={
          <SkeletonCardGrid
            count={6}
            columns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          />
        }
      >
        {error && pendingPsychologists.length === 0 && !loading ? (
          <ErrorState
            title="Falha ao carregar psicólogos"
            description="Não conseguimos buscar os cadastros agora. Verifique sua conexão e tente novamente."
            onRetry={getPendingPsychologists}
            retrying={loading}
          />
        ) : null}
      </ContentTransition>


      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${filteredPsychologists.length ? 'animate-fade-in' : ''}`}>
        {filteredPsychologists.map((psychologist) => (
          <Card key={psychologist.id} className=" transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {psychologist.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{psychologist.full_name}</CardTitle>
                    <CardDescription>CRP: {psychologist.crp_number}</CardDescription>
                  </div>
                </div>
                {getStatusBadge(psychologist.approval_status, psychologist)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{psychologist.email}</span>
                </div>
                {psychologist.specialization && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{psychologist.specialization}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatDistanceToNow(new Date(psychologist.submitted_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleViewDetails(psychologist)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detalhes
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Detalhes do Psicólogo</DialogTitle>
                      <DialogDescription>
                        Informações completas do cadastro
                      </DialogDescription>
                    </DialogHeader>
                    {selectedPsychologist && (
                      <div className="space-y-6">
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar informações
                          </Button>
                        </div>

                        {/* Seção de Status da Aprovação */}
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Status da Aprovação</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status Atual</label>
                              <div className="mt-1">{getStatusBadge(selectedPsychologist.approval_status, selectedPsychologist)}</div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de Submissão</label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {selectedPsychologist.submitted_at ? new Date(selectedPsychologist.submitted_at).toLocaleString('pt-BR') : 'Não informado'}
                              </p>
                            </div>
                            {selectedPsychologist.reviewed_at && (
                              <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de Revisão</label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {new Date(selectedPsychologist.reviewed_at).toLocaleString('pt-BR')}
                                </p>
                              </div>
                            )}
                            {selectedPsychologist.reviewed_by && (
                              <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revisado por</label>
                                <p className="text-sm text-muted-foreground mt-1">{selectedPsychologist.reviewed_by}</p>
                              </div>
                            )}
                          </div>
                          {isCurrentlyBlocked(selectedPsychologist as any) && (
                            <div className="mt-4 space-y-2">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bloqueio</label>
                              <div className="text-sm p-3 bg-muted rounded-md border">
                                <p className="font-medium">{formatBlockPeriod(selectedPsychologist as any)}</p>
                                <p className="text-muted-foreground mt-1">
                                  Motivo: {(selectedPsychologist as any).blocked_reason || 'Não informado'}
                                </p>
                              </div>
                            </div>
                          )}
                          {selectedPsychologist.rejection_reason && (
                            <div className="mt-4">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motivo da Rejeição</label>
                              <div className="text-sm p-3 bg-destructive/10 border border-destructive/20 rounded-md mt-1">
                                {selectedPsychologist.rejection_reason}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Seção de Informações Básicas */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <UserCheck className="h-4 w-4" />
                            <span className="text-sm font-medium">Informações Básicas</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome Completo</label>
                              <p className="text-sm text-muted-foreground mt-1">{selectedPsychologist.full_name}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CPF</label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {selectedPsychologist.cpf ? 
                                  selectedPsychologist.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 
                                  'Não informado'
                                }
                              </p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email Pessoal</label>
                              <p className="text-sm text-muted-foreground mt-1">{selectedPsychologist.email}</p>
                            </div>
                          </div>
                        </div>

                        {/* Seção de Dados Profissionais */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <User className="h-4 w-4" />
                            <span className="text-sm font-medium">Dados Profissionais</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CRP</label>
                              <p className="text-sm text-muted-foreground mt-1">{selectedPsychologist.crp_number}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Especialização</label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {selectedPsychologist.specialization || 'Não informado'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Seção de Informações PIX */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">Informações PIX</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo da chave PIX</label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {selectedPsychologist.pix_type ? 
                                  selectedPsychologist.pix_type.charAt(0).toUpperCase() + selectedPsychologist.pix_type.slice(1) : 
                                  'Não cadastrado'
                                }
                              </p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chave PIX</label>
                              <p className="text-sm text-muted-foreground mt-1 font-mono">
                                {selectedPsychologist.pix_key || 'Não cadastrado'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Seção de Localização */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm font-medium">Localização</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</label>
                              <p className="text-sm text-muted-foreground mt-1">{selectedPsychologist.state || 'Não informado'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cidade</label>
                              <p className="text-sm text-muted-foreground mt-1">{selectedPsychologist.city || 'Não informado'}</p>
                            </div>
                          </div>
                          {selectedPsychologist.address && (
                            <div className="mt-4">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Endereço do Consultório</label>
                              <p className="text-sm text-muted-foreground mt-1">{selectedPsychologist.address}</p>
                            </div>
                          )}
                        </div>

                        {/* Seção de Biografia */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">Biografia Profissional</span>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 text-sm">
                            {selectedPsychologist.bio || 'Nenhuma biografia fornecida'}
                          </div>
                        </div>

                        {/* Seção de Documentos */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">Documentos</span>
                          </div>
                          {selectedPsychologist.document_url ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 border rounded bg-muted/20">
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-4 w-4" />
                                  <span className="text-sm">Documento Profissional</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(selectedPsychologist.document_url, '_blank')}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Visualizar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(selectedPsychologist.document_url, '_blank')}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <DocumentViewer
                                  documentPath={extractDocumentRef(selectedPsychologist.document_url)?.path}
                                  bucket={extractDocumentRef(selectedPsychologist.document_url)?.bucket}
                                  fallbackUrl={selectedPsychologist.document_url}
                                />
                              </div>

                                </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhum documento anexado</p>
                          )}
                        </div>

                        {selectedPsychologist.approval_status === 'pending' && (
                          <div className="flex space-x-2 pt-4 border-t">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button className="flex-1" variant="default">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aprovar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Aprovar Psicólogo</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja aprovar o cadastro de {selectedPsychologist.full_name}?
                                    Isso permitirá que ele acesse a plataforma como psicólogo.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleApprove(selectedPsychologist.id)}
                                    disabled={loading}
                                  >
                                    Confirmar Aprovação
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="flex-1">
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rejeitar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Rejeitar Psicólogo</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Informe o motivo da rejeição para {selectedPsychologist.full_name}:
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Textarea
                                  placeholder="Motivo da rejeição (opcional)"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="my-4"
                                />
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setRejectionReason('')}>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleReject(selectedPsychologist.id)}
                                    disabled={loading}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Confirmar Rejeição
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
      </Dialog>


      {filteredPsychologists.length === 0 && !loading && (
        <EmptyState
          icon={Users}
          title="Nenhum psicólogo encontrado"
          description={
            filter === 'pending'
              ? 'Não há cadastros pendentes de aprovação no momento.'
              : `Não há psicólogos com status "${filter}" no momento.`
          }
          variant={filter === 'pending' ? 'primary' : 'muted'}
        />
      )}

      {blockTarget && (
        <BlockPsychologistModal
          open={!!blockTarget}
          onOpenChange={(o) => { if (!o) setBlockTarget(null); }}
          psychologistId={blockTarget.id}
          psychologistName={blockTarget.full_name}
          mode={blockMode}
          blockInfo={blockTarget}
          onDone={(updated) => {
            if (updated && selectedPsychologist?.id === updated.id) setSelectedPsychologist(updated);
            getPendingPsychologists();
          }}
        />
      )}

      {selectedPsychologist && (
        <EditPsychologistModal
          open={editOpen}
          onOpenChange={setEditOpen}
          psychologist={selectedPsychologist as any}
          onUpdated={(data) => {
            if (data) setSelectedPsychologist(data);
            getPendingPsychologists();
          }}
        />
      )}
    </div>
  );
};