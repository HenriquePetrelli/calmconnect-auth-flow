import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, X, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentUploadProps {
  userId: string;
  onFileChange: (url: string | null) => void;
  documentUrl?: string;
  error?: boolean;
}

export const DocumentUpload = ({ 
  userId, 
  onFileChange, 
  documentUrl,
  error 
}: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use apenas imagens ou PDF.');
      return;
    }

    setUploading(true);
    
    // Store file temporarily in browser to be uploaded after auth
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Store file data temporarily
      const fileData = {
        dataUrl,
        name: file.name,
        type: file.type,
        size: file.size
      };
      
      // Store in session storage temporarily
      sessionStorage.setItem('temp_document', JSON.stringify(fileData));
      
      // For now, use a placeholder URL that indicates file is ready
      const tempUrl = `temp://document-${crypto.randomUUID()}`;
      onFileChange(tempUrl);
      setFileName(file.name);
      toast.success('Documento carregado temporariamente. Será enviado após o cadastro.');
      setUploading(false);
    };
    
    reader.onerror = () => {
      toast.error('Erro ao processar arquivo');
      setUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const removeDocument = () => {
    onFileChange(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <FormLabel className={error ? 'text-destructive' : ''}>
        Documento (CRP/Identidade/CNH) *
      </FormLabel>
      
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-4">
          Envie seu documento comprobatório (máximo 5MB)
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          
          <Input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 sm:flex-none"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Enviando...' : 'Escolher Arquivo'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleCameraCapture}
            disabled={uploading}
            className="flex-1 sm:flex-none"
          >
            <Camera className="h-4 w-4 mr-2" />
            Tirar Foto
          </Button>
        </div>
      </div>

      {(documentUrl || fileName) && (
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">
                {fileName || 'Documento enviado'}
              </span>
              <Badge variant="secondary" className="text-xs">
                Sucesso
              </Badge>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeDocument}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      
      {error && (
        <FormMessage>
          Por favor, envie um documento comprobatório
        </FormMessage>
      )}
    </div>
  );
};