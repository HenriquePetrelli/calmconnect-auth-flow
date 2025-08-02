import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface PsychologistFiltersProps {
  onlyMyCity: boolean;
  setOnlyMyCity: (value: boolean) => void;
  specialty: string;
  setSpecialty: (value: string) => void;
  appointmentType: string;
  setAppointmentType: (value: string) => void;
  specialties: string[];
}

export const PsychologistFilters: React.FC<PsychologistFiltersProps> = ({
  onlyMyCity,
  setOnlyMyCity,
  specialty,
  setSpecialty,
  appointmentType,
  setAppointmentType,
  specialties
}) => {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="onlyMyCity"
            checked={onlyMyCity}
            onCheckedChange={setOnlyMyCity}
          />
          <label
            htmlFor="onlyMyCity"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Mostrar apenas da minha cidade
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Especialidade</label>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as especialidades</SelectItem>
              {specialties.map((spec) => (
                <SelectItem key={spec} value={spec}>
                  {spec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Atendimento</label>
          <Select value={appointmentType} onValueChange={setAppointmentType}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};