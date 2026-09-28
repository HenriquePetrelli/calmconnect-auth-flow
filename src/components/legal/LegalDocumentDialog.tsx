import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import LegalMarkdown from "@/components/legal/LegalMarkdown";
import { LEGAL_PAGES, LegalPage } from "@/lib/legal";

// Abre o documento por cima da tela, sem perder o que já foi preenchido.
const LegalDocumentDialog = ({ document, children }: { document: LegalPage["id"]; children: ReactNode }) => {
  const page = LEGAL_PAGES[document];
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{page.title}</DialogTitle>
        </DialogHeader>
        <LegalMarkdown markdown={page.markdown} />
      </DialogContent>
    </Dialog>
  );
};

export default LegalDocumentDialog;
