import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, MapPin, User } from 'lucide-react';

export interface PsychologistData {
  id: string;
  user_id: string;
  full_name: string;
  specialty?: string;
  specialization?: string;
  city?: string;
  bio?: string;
  crp_number?: string;
  age?: number;
  address?: string;
  approved: boolean;
}

interface PsychologistListProps {
  psychologists: PsychologistData[];
  onSelect: (psychologist: PsychologistData) => void;
  loading?: boolean;
}

export const PsychologistList: React.FC<PsychologistListProps> = ({
  psychologists,
  onSelect,
  loading = false
}) => {
  // Filtrar apenas psicólogos aprovados
  const approvedPsychologists = psychologists.filter(psych => psych.approved === true);

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
            className="cursor-pointer hover:shadow-md transition-shadow"
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Verificado
                        </span>
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
                    {psychologist.city && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin size={12} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">
                          {psychologist.city}
                        </span>
                      </div>
                    )}
                    {/* Rating display - placeholder for future implementation */}
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-yellow-400 text-xs">
                          {i < 4 ? '★' : '☆'}
                        </span>
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
              Nenhum psicólogo aprovado no momento
            </h3>
            <p className="text-muted-foreground">
              Estamos analisando os cadastros dos profissionais. Por favor, verifique novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};