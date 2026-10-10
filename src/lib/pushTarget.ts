/** Só caminhos do próprio app ("//site.com" também começa com "/"). */
export const pushTarget = (data: Record<string, unknown> | undefined | null): string | null => {
  if (!data) return null;
  if (typeof data.url === 'string' && /^\/(?!\/)/.test(data.url)) return data.url;
  if (data.type === 'sos') return '/psychologist-dashboard';
  return null;
};
