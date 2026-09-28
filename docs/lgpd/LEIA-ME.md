# Documentos jurídicos do Soliv — o que falta para publicar

Esta pasta tem a **versão para revisão** de:

- `politica-de-privacidade.md` — para pacientes e psicólogos;
- `termos-de-uso-paciente.md`;
- `termos-de-uso-psicologo.md`;
- `registro-de-tratamento.md` — documento **interno**, exigido pela LGPD (art. 37), com o inventário real dos dados. Não é publicado.

Os textos foram escritos a partir do que o app **de fato** faz, com as decisões tomadas em 28/09/2026: empresa **LTDA** como controladora, **só maiores de 18**, **guarda de 5 anos** dos registros de atendimento e **falhas técnicas avaliadas caso a caso** pelo suporte.

## 1. Dados a preencher (campos `[...]`)

| Campo | Onde aparece |
|---|---|
| Razão social, CNPJ e endereço da LTDA | todos os documentos |
| Nome e e-mail do encarregado de dados (DPO) | política e termos |
| E-mail de suporte | termos |
| Data de publicação | todos |
| Hospedagem do site | política, item 6 |
| Cidade da sede (foro dos psicólogos) | termos do psicólogo |

O encarregado pode ser um dos sócios. O importante é que o e-mail seja lido e respondido em até 15 dias.

## 2. Perguntas para o advogado (marcadas com ⚖️ nos textos)

1. **Bases legais para dados de saúde:** o consentimento destacado (art. 11, I) para as funções do app e a tutela da saúde (art. 11, II, "f") para os atendimentos estão bem aplicados?
2. **Guarda de 5 anos após a exclusão da conta:** a Resolução CFP 01/2009 sustenta manter os registros de atendimento mesmo quando o paciente pede a exclusão?
3. **Natureza da relação com os psicólogos:** o texto afasta bem o vínculo empregatício? Qual o tratamento fiscal dos repasses (nota fiscal, RPA, retenções)?
4. **Responsabilidade da plataforma** pelo atendimento feito pelo psicólogo, e o limite de responsabilidade por falhas técnicas diante do Código de Defesa do Consumidor.
5. **SOS sem garantia de tempo:** a redação protege a empresa sem ser abusiva para o consumidor?
6. **Cancelamento imediato da assinatura:** hoje o app encerra o acesso na hora do cancelamento. Seria melhor manter o acesso até o fim do mês já pago?
7. **Transferência internacional:** quais garantias citar para Supabase, Stripe, Resend, Google e Twilio?
8. **Guarda do chat:** as mensagens entre paciente e psicólogo são apagadas após 3 meses. Elas fazem parte do registro do atendimento e deveriam seguir o prazo de 5 anos?
9. **e-Psi e Resolução CFP 11/2018:** exigências de cadastro para atendimento on-line.
10. **Registros de acesso (Marco Civil, art. 15):** o provedor de aplicação deve guardar por 6 meses. Os logs do Supabase no plano atual cobrem esse prazo?

## 3. O que precisa mudar no app antes de publicar

Os documentos descrevem estas regras, mas o app ainda não as cumpre:

- [ ] **Guarda de 5 anos na exclusão de conta.** Hoje, "Excluir minha conta" apaga também os pedidos de SOS, as consultas e as avaliações. É preciso manter esses registros (desvinculados do login) por 5 anos.
- [ ] **Eliminação automática ao fim dos 5 anos**, com uma rotina agendada que apague os registros de atendimento vencidos.
- [ ] **Aceite no cadastro:** caixa de confirmação "Tenho 18 anos ou mais", aceite dos Termos e da Política e **consentimento destacado** para dados de saúde, com data e versão do aceite gravadas no banco.
- [ ] **Telas de Termos e Política no app**, com link no cadastro e no perfil, só depois da revisão jurídica e com os campos preenchidos.
- [ ] **Novo aceite quando os textos mudarem**, pedindo que o usuário aceite a versão nova.
- [ ] **Reembolso em 7 dias** (direito de arrependimento): hoje é feito à mão pelo suporte, no painel do Stripe. Funciona, mas precisa de um processo definido.
