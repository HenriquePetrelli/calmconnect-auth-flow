import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, User, IdCard, Briefcase, Star, Calendar } from 'lucide-react';
import { PsychologistData } from './PsychologistList';

interface PsychologistModalProps {
  psychologist: PsychologistData | null;
  onClose: () => void;
  onSchedule?: () => void;
  showLocationInfo?: boolean;
}

export const PsychologistModal: React.FC<PsychologistModalProps> = ({
  psychologist,
  onClose,
  onSchedule,
  showLocationInfo = false
}) => {
  if (!psychologist) return null;

  return (
    <Dialog open={!!psychologist} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{psychologist.full_name}</h2>
              <p className="text-muted-foreground font-normal">
                {psychologist.specialty || psychologist.specialization || 'Psicologia Geral'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          {psychologist.crp_number && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <IdCard size={14} />
                CRP
              </label>
              <p className="text-foreground">{psychologist.crp_number}</p>
            </div>
          )}

          {/* Specialty Badge */}
          {(psychologist.specialty || psychologist.specialization) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Briefcase size={14} />
                Especialidade
              </label>
              <Badge variant="secondary" className="w-fit">
                {psychologist.specialty || psychologist.specialization}
              </Badge>
            </div>
          )}

          {/* Biography */}
          {psychologist.bio && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Biografia Profissional
              </label>
              <p className="text-sm text-foreground leading-relaxed bg-muted/50 p-3 rounded-lg">
                {psychologist.bio}
              </p>
            </div>
          )}

          {/* Rating and Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Star size={14} />
                Avaliação
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < 4 ? "text-warning fill-current" : "text-muted-foreground"}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">(4.0)</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar size={14} />
                Total de Consultas
              </label>
              <p className="text-lg font-semibold text-foreground">
                {psychologist.total_appointments || 0}
              </p>
            </div>
          </div>

          {/* Address - only show when presential */}
          {showLocationInfo && psychologist.address && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <MapPin size={14} />
                Endereço
              </label>
              <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">
                {psychologist.address}
              </p>
            </div>
          )}

          {/* City and State - only show when presential */}
          {showLocationInfo && (psychologist.city || psychologist.state) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <MapPin size={14} />
                Localização
              </label>
              <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">
                {psychologist.city}{psychologist.state && `, ${psychologist.state}`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Fechar
            </Button>
            {onSchedule && (
              <Button onClick={onSchedule} className="flex-1">
                Agendar Consulta
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};