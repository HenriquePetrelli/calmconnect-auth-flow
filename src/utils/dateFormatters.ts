import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const getRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);

  if (diffInHours > 48) {
    // More than 48 hours ago - show in days
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ${diffInDays === 1 ? 'dia atrás' : 'dias atrás'}`;
  } else {
    // Less than 48 hours - use date-fns for hours/minutes
    return formatDistanceToNow(dateObj, {
      addSuffix: true,
      locale: ptBR,
    });
  }
};

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
