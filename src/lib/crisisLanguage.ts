/**
 * Texto que fala em se ferir ou em não querer viver. Usado para oferecer
 * apoio (CVV, SOS) na hora em que a pessoa escreve. Não bloqueia nada e não
 * avisa ninguém: só mostra ajuda para quem escreveu.
 */
const CRISIS_PATTERNS = [
  /quero morrer/,
  /vontade de morrer/,
  /me matar/,
  /\bsuicid/,
  /tirar (a )?minha (propria )?vida/,
  /acabar com (a )?minha vida/,
  /acabar com tudo/,
  /nao (aguento|quero) mais viver/,
  /sem vontade de viver/,
  /melhor (estar )?mort[oa]/,
  /me (cortar|machucar|ferir)/,
  /sumir (de vez|para sempre|pra sempre)/,
];

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');

export const mentionsCrisis = (text: string): boolean => {
  const value = normalize(text);
  return CRISIS_PATTERNS.some((pattern) => pattern.test(value));
};
