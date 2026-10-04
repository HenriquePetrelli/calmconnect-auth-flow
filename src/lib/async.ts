/** Espera `promise` por no máximo `ms`; nunca rejeita (falha ou demora viram `undefined`). */
export const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | undefined> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
    );
  });

/** Resolve depois que o navegador pinta a próxima tela (para um aviso aparecer antes de trabalho pesado). */
export const nextPaint = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      setTimeout(resolve, 0);
      return;
    }
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
