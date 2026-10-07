/** Iniciais para o avatar ("Dra. Marina Alves" → "MA"). */
export const initialsOf = (name?: string | null, fallback = '?') => {
  const parts = (name ?? '').replace(/^(dr\.?|dra\.?)\s+/i, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};
