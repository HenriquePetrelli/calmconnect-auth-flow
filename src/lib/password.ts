/** Regras de senha para contas novas e trocas de senha (dados de saúde). */
export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_HINT = `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres, com letras e números`;

/** Mensagem do problema, ou null se a senha serve. */
export const passwordProblem = (password: string): string | null => {
  if (password.length < MIN_PASSWORD_LENGTH) return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (password.length > 72) return 'A senha pode ter no máximo 72 caracteres.';
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.';
  return null;
};
