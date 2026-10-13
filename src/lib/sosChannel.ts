/**
 * Canal do SOS, escolhido na confirmação: vídeo (padrão) ou mensagem.
 * Por mensagem serve para quem não consegue falar (está com outras pessoas,
 * no trabalho, sem voz). A escolha passa da confirmação para a tela do SOS
 * pela sessão da aba, como a triagem.
 */
export type SosChannel = 'video' | 'text';

const STORAGE_KEY = 'sos:canal';

export const sanitizeSosChannel = (value: unknown): SosChannel => (value === 'text' ? 'text' : 'video');

export const saveSosChannel = (channel: SosChannel) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, channel);
  } catch {
    // Sem armazenamento: o SOS segue por vídeo.
  }
};

export const takeSosChannel = (): SosChannel => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return sanitizeSosChannel(raw);
  } catch {
    return 'video';
  }
};
