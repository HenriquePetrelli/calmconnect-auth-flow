import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SINTOMAS } from "@/data/sintomas";

interface SintomasSelectorProps {
  value: string[];
  onChange: (sintomas: string[]) => void;
  error?: boolean;
}

const SintomasSelector = ({ value, onChange, error }: SintomasSelectorProps) => {
  const handleSintomaChange = (sintoma: string, checked: boolean) => {
    if (checked) {
      onChange([...value, sintoma]);
    } else {
      onChange(value.filter(s => s !== sintoma));
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-foreground font-medium">
        Sintomas que você apresenta *
      </Label>
      <p className="text-sm text-muted-foreground">
        Selecione todos os sintomas que você tem experimentado (pode selecionar múltiplos):
      </p>
      
      <div className={`border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto ${error ? 'border-destructive' : 'border-border'}`}>
        <div className="grid grid-cols-1 gap-3">
          {SINTOMAS.map((sintoma) => (
            <div key={sintoma} className="flex items-start space-x-3">
              <Checkbox
                id={sintoma}
                checked={value.includes(sintoma)}
                onCheckedChange={(checked) => handleSintomaChange(sintoma, checked as boolean)}
                className="mt-1"
              />
              <Label 
                htmlFor={sintoma} 
                className="text-sm text-foreground cursor-pointer leading-relaxed flex-1"
              >
                {sintoma}
              </Label>
            </div>
          ))}
        </div>
      </div>
      
      {value.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {value.length} sintoma{value.length !== 1 ? 's' : ''} selecionado{value.length !== 1 ? 's' : ''}
        </p>
      )}
      
      {error && (
        <p className="text-sm text-destructive">
          Por favor, selecione pelo menos um sintoma
        </p>
      )}
    </div>
  );
};

export default SintomasSelector;