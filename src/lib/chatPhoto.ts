/**
 * Foto do chat pronta para enviar.
 *
 * Fotos de celular passam fácil de 5 a 12 MB e eram recusadas. Aqui a foto é
 * reduzida (lado maior até 2048 px, JPEG) antes de subir: chega rápido mesmo
 * com internet ruim e cabe no limite do armazenamento. Se o navegador não
 * consegue abrir o formato (ex.: HEIC fora do Safari), vai a original.
 */

/** Limite do armazenamento (bucket `documents`). */
export const LIMITE_FOTO_BYTES = 10 * 1024 * 1024;
const LADO_MAXIMO = 2048;
const QUALIDADE = 0.85;
/** Abaixo disso, JPEG/PNG/WebP vão como estão. */
const PEQUENA_BYTES = 1.5 * 1024 * 1024;

export class FotoInvalidaError extends Error {}

const reduzir = async (arquivo: File): Promise<File | null> => {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.max(1, Math.round(bitmap.width * escala));
    const altura = Math.max(1, Math.round(bitmap.height * escala));
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALIDADE));
    if (!blob) return null;
    const nome = arquivo.name.replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${nome}.jpg`, { type: 'image/jpeg' });
  } catch {
    return null;
  }
};

export const prepararFoto = async (arquivo: File): Promise<File> => {
  if (!arquivo.type.startsWith('image/')) throw new FotoInvalidaError('Selecione apenas arquivos de imagem.');
  // GIF pode ser animado; foto pequena em formato comum não precisa mexer.
  const comum = ['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type);
  if (arquivo.type === 'image/gif' || (comum && arquivo.size <= PEQUENA_BYTES)) {
    if (arquivo.size > LIMITE_FOTO_BYTES) throw new FotoInvalidaError('A foto deve ter no máximo 10 MB.');
    return arquivo;
  }
  const reduzida = await reduzir(arquivo);
  const final = reduzida && reduzida.size < arquivo.size ? reduzida : arquivo;
  if (final.size > LIMITE_FOTO_BYTES) throw new FotoInvalidaError('A foto deve ter no máximo 10 MB.');
  return final;
};
