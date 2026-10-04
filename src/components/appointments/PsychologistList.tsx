import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, ChevronRight, User, CheckCircle, LifeBuoy, Star } from 'lucide-react';

export interface PsychologistData {
  id: string;
  user_id: string;
  full_name: string;
  specialty?: string;
  specialization?: string;
  city?: string;
  state?: string;
  bio?: string;
  crp_number?: string;
  address?: string;
  approved: boolean;
  document_url?: string;
  total_appointments?: number;
  /** Consultas e SOS concluídos (get_psychologists_public_stats). */
  consultation_count?: number;
  sos_count?: number;
}

interface PsychologistListProps {
  psychologists: PsychologistData[];
  onSelect: (psychologist: PsychologistData) => void;
  loading?: boolean;
  onlineOnly?: boolean;
}

const countLabel = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const PsychologistList: React.FC<PsychologistListProps> = ({
  psychologists,
  onSelect,
  loading = false,
  onlineOnly = false
}) => {
  // Filtrar apenas psicólogos aprovados
  const approvedPsychologists = psychologists.filter(psych => psych.approved === true);
  console.log('Approved psychologists:', approvedPsychologists);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-muted rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                </div>
                <div className="w-6 h-6 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Verificar se há psicólogos aprovados
  const hasApprovedPsychologists = approvedPsychologists.length > 0;

  return (
    <div className="space-y-3">
      {hasApprovedPsychologists ? (
        approvedPsychologists.map((psychologist) => (
          <Card 
            key={psychologist.id} 
            className="cursor-pointer transition-shadow"
            onClick={() => onSelect(psychologist)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="text-primary" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground truncate">
                        {psychologist.full_name}
                      </h4>
                      {psychologist.approved && (
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {psychologist.specialization || psychologist.specialty || 'Psicologia Geral'}
                    </p>
                    {psychologist.crp_number && (
                      <p className="text-xs text-muted-foreground">
                        CRP: {psychologist.crp_number}
                      </p>
                    )}
                    {/* Quanto já atendeu pelo app: consultas e SOS concluídos. */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="h-3 w-3" aria-hidden="true" />
                        {countLabel(psychologist.consultation_count ?? psychologist.total_appointments ?? 0, 'consulta', 'consultas')}
                      </span>
                      {psychologist.sos_count !== undefined && (
                        <span className="flex items-center gap-1">
                          <LifeBuoy className="h-3 w-3" aria-hidden="true" />
                          {countLabel(psychologist.sos_count, 'SOS atendido', 'SOS atendidos')}
                        </span>
                      )}
                    </div>
                    {/* Rating display - placeholder for future implementation */}
                    <div className="flex items-center gap-0.5 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < 4 ? 'fill-warning text-warning' : 'text-warning'}`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">(4.0)</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum psicólogo disponível no momento
            </h3>
            <p className="text-muted-foreground">
                Verifique novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};