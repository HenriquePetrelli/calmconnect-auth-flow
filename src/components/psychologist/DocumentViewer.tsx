import { FileText, ExternalLink, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useSignedDocumentUrl } from '@/hooks/useSignedDocumentUrl';

interface DocumentViewerProps {
  documentPath?: string;
}

export const DocumentViewer = ({ documentPath }: DocumentViewerProps) => {
  const { signedUrl, loading, error, retry } = useSignedDocumentUrl(documentPath);

  const handleDownload = async () => {
    if (!signedUrl || !documentPath) return;
    
    try {
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error('Falha ao baixar arquivo');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentPath.split('/').pop() || 'documento';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download iniciado');
    } catch (err) {
      console.error('Error downloading file:', err);
      toast.error('Erro ao fazer download do arquivo');
    }
  };

  const openInNewTab = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!documentPath) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Nenhum documento anexado
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-8 bg-muted/30">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando documento...</span>
        </div>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="border rounded-lg p-8 bg-muted/30">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            {error || 'Erro ao carregar documento'}
          </p>
          {error && error.includes('403') && (
            <p className="text-xs text-red-600 mb-4">
              Erro de permissão - verifique se você tem acesso a este documento
            </p>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={retry}
            className="gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(documentPath);
  const isPDF = /\.pdf$/i.test(documentPath);

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/30">
      {/* Barra de ações */}
      <div className="p-3 border-b bg-background/50 flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">
          Documento: {documentPath.split('/').pop()}
        </span>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={openInNewTab}
            className="gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Abrir em nova aba
          </Button>
        </div>
      </div>

      {/* Visualização do documento */}
      {isImage && (
        <div className="p-4 flex items-center justify-center bg-muted/10">
          <img 
            src={signedUrl} 
            alt="Documento do psicólogo"
            className="max-w-full max-h-96 object-contain rounded shadow-sm"
          />
        </div>
      )}
      
      {isPDF && (
        <div className="relative">
          <iframe 
            src={`${signedUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full h-96 border-none"
            title="Visualização do documento PDF"
            sandbox="allow-same-origin"
          />
        </div>
      )}
      
      {!isImage && !isPDF && (
        <div className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Tipo de documento não suportado para visualização
          </p>
          <p className="text-xs text-muted-foreground">
            Use o botão "Download" acima para baixar o arquivo
          </p>
        </div>
      )}
    </div>
  );
};