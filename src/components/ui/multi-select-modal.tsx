import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ChevronDown } from "lucide-react";

interface MultiSelectModalProps {
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
  title: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const MultiSelectModal = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
  title,
  isOpen,
  onOpenChange,
}: MultiSelectModalProps) => {
  const [tempSelection, setTempSelection] = useState<string[]>(selectedValues);

  const handleCheckboxChange = (option: string, checked: boolean) => {
    if (checked) {
      setTempSelection([...tempSelection, option]);
    } else {
      setTempSelection(tempSelection.filter(item => item !== option));
    }
  };

  const handleConfirm = () => {
    onSelectionChange(tempSelection);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempSelection(selectedValues);
    onOpenChange(false);
  };

  const removeChip = (item: string) => {
    const newSelection = selectedValues.filter(selected => selected !== item);
    onSelectionChange(newSelection);
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(true)}
        className="w-full justify-between text-left font-normal h-auto py-3 px-4"
      >
        <span className={selectedValues.length === 0 ? "text-muted-foreground" : "text-foreground"}>
          {selectedValues.length === 0 ? placeholder : `${selectedValues.length} item(s) selecionado(s)`}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((item) => (
            <div
              key={item}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              <span className="truncate max-w-xs">{item}</span>
              <button
                type="button"
                onClick={() => removeChip(item)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {options.map((option) => (
                <div key={option} className="flex items-start space-x-3">
                  <Checkbox
                    id={option}
                    checked={tempSelection.includes(option)}
                    onCheckedChange={(checked) => handleCheckboxChange(option, checked as boolean)}
                    className="mt-1"
                  />
                  <Label 
                    htmlFor={option} 
                    className="text-sm cursor-pointer leading-relaxed flex-1"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>
              Confirmar seleção ({tempSelection.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiSelectModal;