// Comparação de nomes de lugares vindos do preenchimento automático do
// navegador ("sao paulo", "SÃO PAULO", "SP") com as listas do app.

export const normalizePlace = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Nome da cidade como está na lista, ou null se não existir nesse estado. */
export const findCity = (cities: { name: string }[], value: string | null | undefined): string | null => {
  if (!value) return null;
  const wanted = normalizePlace(value);
  return cities.find((city) => normalizePlace(city.name) === wanted)?.name ?? null;
};

/** Sigla do estado a partir da sigla ou do nome ("SP", "São Paulo", "sao paulo"). */
export const findStateAbbreviation = (
  states: { abbreviation: string; name: string }[],
  value: string | null | undefined,
): string | null => {
  if (!value) return null;
  const wanted = normalizePlace(value);
  return (
    states.find((state) => normalizePlace(state.abbreviation) === wanted || normalizePlace(state.name) === wanted)
      ?.abbreviation ?? null
  );
};
