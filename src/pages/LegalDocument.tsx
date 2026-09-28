import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LegalMarkdown from "@/components/legal/LegalMarkdown";
import { LEGAL_PAGES, LegalPage, hasPendingPlaceholders } from "@/lib/legal";

// Página pública (sem login) com os Termos ou a Política de Privacidade.
const LegalDocument = ({ document }: { document: LegalPage["id"] }) => {
  const navigate = useNavigate();
  const page = LEGAL_PAGES[document];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="flex items-center gap-2 text-foreground/70 hover:text-foreground p-2 h-auto"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Voltar</span>
        </Button>

        {hasPendingPlaceholders(page.markdown) && (
          <div role="note" className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
            <span>Versão em revisão jurídica: alguns dados da empresa ainda serão preenchidos.</span>
          </div>
        )}

        <Card className="border-0 shadow-calm">
          <CardContent className="p-6">
            <LegalMarkdown markdown={page.markdown} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LegalDocument;
