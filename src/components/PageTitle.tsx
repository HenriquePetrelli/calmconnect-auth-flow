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
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export default PageTitle;
