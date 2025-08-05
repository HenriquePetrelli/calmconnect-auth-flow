import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DetailField } from './DetailField';
import { DocumentViewer } from './DocumentViewer';
import { MapPin, UserCheck, Clock, CheckCircle, XCircle } from 'lucide-react';

interface PsychologistDetailProps {
  psychologist: {
    id: string;
    full_name: string;
    email: string;
    crp_number: string;
    specialization: string;
    bio?: string;
    state?: string;
    city?: string;
    address?: string;
    accepts_presential: boolean;
    document_url?: string;
    user_id: string;
    approval_status?: string;
    approved?: boolean;
    submitted_at?: string;
    reviewed_at?: string;
    reviewed_by?: string;
    rejection_reason?: string;
  };
}

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />;
  }
};

const getStatusBadge = (status?: string, approved?: boolean) => {
  if (approved || status === 'approved') {
    return <Badge variant="default" className="bg-green-100 text-green-800">Aprovado</Badge>;
  }
  if (status === 'rejected') {
    return <Badge variant="destructive">Rejeitado</Badge>;
  }
  return <Badge variant="secondary">Pendente</Badge>;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Não informado';
  return new Date(dateString).toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const PsychologistDetail = ({ psychologist }: PsychologistDetailProps) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Seção de Status da Aprovação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(psychologist.approval_status)}
            Status da Aprovação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status Atual
              </label>
              <div className="flex items-center gap-2">
                {getStatusBadge(psychologist.approval_status, psychologist.approved)}
              </div>
            </div>
            
            <DetailField 
              label="Data de Submissão" 
              value={formatDate(psychologist.submitted_at)} 
            />
            
            {psychologist.reviewed_at && (
              <DetailField 
                label="Data de Revisão" 
                value={formatDate(psychologist.reviewed_at)} 
              />
            )}
            
            {psychologist.reviewed_by && (
              <DetailField 
                label="Revisado por (ID)" 
                value={psychologist.reviewed_by} 
              />
            )}
          </div>
          
          {psychologist.rejection_reason && (
            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Motivo da Rejeição
              </label>
              <div className="text-sm p-3 bg-red-50 border border-red-200 rounded-md mt-1">
                {psychologist.rejection_reason}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailField 
              label="Nome Completo" 
              value={psychologist.full_name} 
            />
            <DetailField 
              label="Email" 
              value={psychologist.email} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Seção de Dados Profissionais */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Profissionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <DetailField 
              label="CRP" 
              value={psychologist.crp_number} 
            />
            <DetailField 
              label="Especialidade" 
              value={psychologist.specialization} 
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Tipo de Atendimento:
            </span>
            <Badge 
              variant={psychologist.accepts_presential ? "default" : "secondary"}
              className="text-xs"
            >
              {psychologist.accepts_presential ? 'Online e Presencial' : 'Apenas Online'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Localização - Só aparece se aceita presencial */}
      {psychologist.accepts_presential && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Localização do Consultório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField 
                label="Estado" 
                value={psychologist.state} 
              />
              <DetailField 
                label="Cidade" 
                value={psychologist.city} 
              />
            </div>
            {psychologist.address && (
              <div className="mt-4">
                <DetailField 
                  label="Endereço" 
                  value={psychologist.address} 
                  fullWidth
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seção de Biografia e Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Biografia Profissional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-line text-sm">
            {psychologist.bio || 'Nenhuma biografia fornecida'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documento Anexado</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentViewer url={psychologist.document_url} />
        </CardContent>
      </Card>
    </div>
  );
};