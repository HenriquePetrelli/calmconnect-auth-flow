import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Convert UTC date to Brazil timezone
 */
export const toBrazilTime = (utcDate: Date | string): Date => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return toZonedTime(date, BRAZIL_TIMEZONE);
};

/**
 * Convert Brazil timezone date to UTC
 */
export const toUTC = (brazilDate: Date): Date => {
  return fromZonedTime(brazilDate, BRAZIL_TIMEZONE);
};

/**
 * Format date in Brazil timezone
 */
export const formatBrazilTime = (
  utcDate: Date | string, 
  formatStr: string = "dd/MM/yyyy 'às' HH:mm"
): string => {
  const brazilDate = toBrazilTime(utcDate);
  return format(brazilDate, formatStr, { locale: ptBR });
};

/**
 * Format date for appointment display
 */
export const formatAppointmentTime = (utcDate: Date | string): string => {
  return formatBrazilTime(utcDate, "dd 'de' MMMM 'às' HH:mm");
};

/**
 * Format time only
 */
export const formatTimeOnly = (utcDate: Date | string): string => {
  return formatBrazilTime(utcDate, 'HH:mm');
};

/**
 * Format date only
 */
export const formatDateOnly = (utcDate: Date | string): string => {
  return formatBrazilTime(utcDate, 'dd/MM/yyyy');
};