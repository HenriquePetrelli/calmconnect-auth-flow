import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface PsychologistFiltersProps {
  specialty: string;
  setSpecialty: (value: string) => void;
  onlineOnly: boolean = true;
  setOnlineOnly: (value: boolean) => void;
  specialties: string[];
}

export const PsychologistFilters: React.FC<PsychologistFiltersProps> = ({
  specialty,
  setSpecialty,
  onlineOnly,
  setOnlineOnly,
  specialties
}) => {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
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

        <div className="flex items-center space-x-2">
          <Checkbox
            id="onlineOnly"
            checked={onlineOnly}
            onCheckedChange={setOnlineOnly}
          />
          <label
            htmlFor="onlineOnly"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Atendimento Online
          </label>
        </div>
      </CardContent>
    </Card>
  );
};