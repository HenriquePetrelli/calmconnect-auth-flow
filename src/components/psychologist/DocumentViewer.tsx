import { useState } from 'react';
import { FileText, Image, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocumentViewerProps {
  url?: string;
}

export const DocumentViewer = ({ url }: DocumentViewerProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (!url) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Nenhum documento anexado
        </AlertDescription>
      </Alert>
    );
  }

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isPDF = /\.pdf$/i.test(url);

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  const openInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/30">
      {isImage && (
        <div className="relative min-h-[200px] flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {error ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Erro ao carregar a imagem
              </p>
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
          ) : (
            <img 
              src={url} 
              alt="Documento do psicólogo"
              className="max-w-full max-h-96 object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: loading ? 'none' : 'block' }}
            />
          )}
        </div>
      )}
      
      {isPDF && (
        <div className="relative">
          <iframe 
            src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full h-96 border-none"
            title="Visualização do documento PDF"
            sandbox="allow-same-origin"
          />
          <div className="absolute top-2 right-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={openInNewTab}
              className="gap-2 bg-background/80 backdrop-blur-sm"
            >
              <ExternalLink className="h-3 w-3" />
              Expandir
            </Button>
          </div>
        </div>
      )}
      
      {!isImage && !isPDF && (
        <div className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Tipo de documento não suportado para visualização
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={openInNewTab}
            className="gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Abrir documento
          </Button>
        </div>
      )}
    </div>
  );
};