import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DetailField } from './DetailField';
import { DocumentViewer } from './DocumentViewer';
import { MapPin, UserCheck } from 'lucide-react';

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
  };
}

const maskCPF = (cpf?: string) => {
  if (!cpf) return 'Não informado';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-XX');
};

export const PsychologistDetail = ({ psychologist }: PsychologistDetailProps) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
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