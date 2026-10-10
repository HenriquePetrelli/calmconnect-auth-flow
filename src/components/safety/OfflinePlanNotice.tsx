import { WifiOff } from 'lucide-react';

/** Plano aberto sem internet: a última versão guardada neste aparelho. */
const OfflinePlanNotice = () => (
  <p role="status" className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
    <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
    Sem internet: mostrando a última versão salva neste aparelho.
  </p>
);

export default OfflinePlanNotice;
