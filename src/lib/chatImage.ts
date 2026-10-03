/**
 * Caminho da imagem do chat dentro do bucket `documents`.
 * Mensagens novas guardam o caminho (`chat-images/...`); as antigas guardavam
 * o link público (`.../storage/v1/object/public/documents/chat-images/...`),
 * que deixou de abrir quando o bucket ficou privado.
 */
export const chatImagePath = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (value.startsWith('chat-images/')) return value;
  const marker = '/documents/';
  const index = value.indexOf(marker);
  if (index === -1) return null;
  const path = decodeURIComponent(value.slice(index + marker.length).split('?')[0]);
  return path.startsWith('chat-images/') ? path : null;
};
