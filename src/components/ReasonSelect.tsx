import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ReasonSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

const reasonOptions = [
  { value: "Estresse", label: "Estresse" },
  { value: "Ansiedade", label: "Ansiedade" },
  { value: "Meditação", label: "Meditação" },
  { value: "Burnout", label: "Burnout" },
  { value: "Problemas de sono", label: "Problemas de sono" },
  { value: "Autoestima", label: "Autoestima" },
  { value: "Síndrome do impostor", label: "Síndrome do impostor" },
  { value: "Dificuldade de concentração", label: "Dificuldade de concentração" },
  { value: "Outros", label: "Outros" },
];

const ReasonSelect = ({ value, onChange, error }: ReasonSelectProps) => {
  const [customReason, setCustomReason] = useState("");
  
  // Extract the selected option and custom text from the value
  const isOtherSelected = value.startsWith("Outros");
  const selectedOption = isOtherSelected ? "Outros" : value;
  
  // Initialize custom reason from existing value if it starts with "Outros: "
  useEffect(() => {
    if (value.startsWith("Outros: ")) {
      setCustomReason(value.substring(8)); // Remove "Outros: " prefix
    }
  }, [value]);

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === "Outros") {
      onChange(customReason ? `Outros: ${customReason}` : "Outros");
    } else {
      onChange(selectedValue);
      setCustomReason(""); // Clear custom reason when selecting other options
    }
  };

  const handleCustomReasonChange = (customValue: string) => {
    setCustomReason(customValue);
    onChange(customValue ? `Outros: ${customValue}` : "Outros");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="reason" className="text-foreground font-medium">
        Motivo para usar o app
      </Label>
      <Select value={selectedOption} onValueChange={handleSelectChange}>
        <SelectTrigger className={`h-12 rounded-xl border-border focus:ring-primary ${error ? 'border-destructive' : ''}`}>
          <SelectValue placeholder="Selecione o principal motivo" />
        </SelectTrigger>
        <SelectContent>
          {reasonOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isOtherSelected && (
        <div className="mt-3">
          <Label htmlFor="customReason" className="text-foreground font-medium text-sm">
            Especifique o motivo
          </Label>
          <Input
            id="customReason"
            type="text"
            value={customReason}
            onChange={(e) => handleCustomReasonChange(e.target.value)}
            placeholder="Conte-nos brevemente o que te trouxe até aqui..."
            required
            className={`h-12 rounded-xl border-border focus:ring-primary mt-2 ${error && !customReason ? 'border-destructive' : ''}`}
          />
        </div>
      )}
    </div>
  );
};

export default ReasonSelect;