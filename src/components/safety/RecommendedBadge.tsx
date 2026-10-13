/** Selo dos planos que vieram de um psicólogo (plano pós-crise). */
const RecommendedBadge = ({ name, edited }: { name: string; edited?: boolean }) => (
  <span className="inline-flex flex-wrap items-center gap-1 text-xs">
    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-medium text-primary">
      Recomendado por {name}
    </span>
    {edited && <span className="text-muted-foreground">· editado por você</span>}
  </span>
);

export default RecommendedBadge;
