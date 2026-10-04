/**
 * Campos invisíveis que recebem o estado e a cidade do preenchimento
 * automático do navegador. As listas de Estado e Cidade do app não recebem
 * esse preenchimento de forma confiável: a cidade fica desativada até o
 * estado ser escolhido e a lista de cidades ainda está sendo baixada quando
 * o navegador preenche tudo de uma vez.
 */
const AddressAutofillInputs = ({
  onState,
  onCity,
}: {
  onState: (value: string) => void;
  onCity: (value: string) => void;
}) => (
  <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0 pointer-events-none" style={{ left: -9999 }}>
    <input
      type="text"
      name="address-state"
      autoComplete="address-level1"
      tabIndex={-1}
      onChange={(e) => e.target.value && onState(e.target.value)}
    />
    <input
      type="text"
      name="address-city"
      autoComplete="address-level2"
      tabIndex={-1}
      onChange={(e) => e.target.value && onCity(e.target.value)}
    />
  </div>
);

export default AddressAutofillInputs;
