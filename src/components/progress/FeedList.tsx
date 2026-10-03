import type { FeedItem } from '@/lib/activityFeed';
import { getRelativeTime } from '@/utils/dateFormatters';
import { feedVisual } from './feedVisuals';

const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

/** Lista do histórico: ícone colorido, nome, detalhe e quando. */
const FeedList = ({ items, relative = false }: { items: FeedItem[]; relative?: boolean }) => (
  <ul className="divide-y divide-border">
    {items.map((item) => {
      const { icon: Icon, color, soft } = feedVisual(item.icon);
      return (
        <li key={item.id} className="flex items-center gap-3 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: soft }}>
            <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium text-foreground">{item.name}</p>
            {item.detail && <p className="break-words text-xs text-muted-foreground">{item.detail}</p>}
            {relative && <p className="text-xs text-muted-foreground">{getRelativeTime(item.date)}</p>}
          </div>
          {!relative && (
            <span className="shrink-0 text-right text-xs text-muted-foreground">
              <span className="block font-medium text-foreground">{time(item.date)}</span>
              {day(item.date)}
            </span>
          )}
        </li>
      );
    })}
  </ul>
);

export default FeedList;
