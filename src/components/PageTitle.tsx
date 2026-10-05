import type { ReactNode } from 'react';

/** Título das telas dentro dos layouts do psicólogo e do admin (sem cabeçalho roxo). */
const PageTitle = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) => (
  // Sem espaço para título e botões lado a lado (celular), os botões descem.
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-[12rem] flex-1">
      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export default PageTitle;
