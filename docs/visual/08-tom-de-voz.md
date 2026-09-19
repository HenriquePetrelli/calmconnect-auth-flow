# Tom de voz do Soliv

Guia curto para quem for escrever ou revisar texto no app — patient-facing, não documentação técnica.

## Princípios

1. **Frases curtas.** Uma ideia por frase. Se precisar de "e" no meio, considere quebrar em duas.
2. **Segunda pessoa, sempre.** "Você completou sua meta", nunca "O usuário completou a meta" ou passivo impessoal ("foi completada").
3. **Sem jargão clínico para o paciente.** "Psicólogo", "consulta", "conversa" — não "sessão terapêutica", "protocolo de atendimento", "profissional de saúde mental" (isso é para telas do psicólogo/admin, não do paciente).
4. **Sem positividade forçada.** Nada de "Vai ficar tudo bem!", "É só pensar positivo!", "Tudo vai dar certo!" — frases que soam vazias ou minimizam o que a pessoa está sentindo. Prefira reconhecer o momento e oferecer o próximo passo concreto.
5. **Nunca culpa, nunca cobrança.** Sem "Você não completou sua meta esta semana", "Sua sequência foi perdida", "Não esqueça de...". Se algo não aconteceu, é neutro — nunca é falha da pessoa.
6. **Erros são claros e sem jargão técnico.** "Sem conexão com a internet" — não "Network request failed" ou "Erro 500". Nunca expor termos como "ID da sessão", "token", "constraint" para o paciente.
7. **Na crise, ainda mais enxuto.** Frases curtíssimas, verbo no presente, uma instrução de cada vez. "Buscando um profissional." — não "Estamos processando sua solicitação e em breve um profissional disponível será notificado." Nada de explicação técnica sobre o que está acontecendo por trás.

## Exemplos — o que fazer / o que evitar

| Situação | Evitar | Preferir |
|---|---|---|
| Erro de conexão | "Network request failed" / "Erro 500" | "Sem conexão com a internet. Verifique sua rede e tente novamente." |
| Sessão/ID inválido | "ID da sessão não foi fornecido ou é inválido." | "Não conseguimos encontrar essa chamada. Volte para o início e tente de novo." |
| Meta não concluída | "Você não completou sua meta esta semana." | (não dizer nada — silêncio é a opção certa aqui) |
| Conquista desbloqueada | "Achievement unlocked: Streak Master" | "Parabéns! Você desbloqueou uma nova conquista." |
| Crise, tela de espera | "Estamos processando sua solicitação de atendimento emergencial." | "Buscando um profissional para você agora." |
| Ninguém disponível | "Nenhum profissional pôde atender." | "Ainda não encontramos um profissional livre. Você não está sozinho — veja outras formas de ajuda abaixo." |

## Onde isso já está bem aplicado (referência)

- `GoalCompletionModal.tsx`: "Continue assim! Cada pequena conquista te leva mais longe no seu autocuidado." — segunda pessoa, caloroso, sem cobrança.
- `AchievementModal.tsx`: "Parabéns! ... Você desbloqueou uma nova conquista!" — mesmo padrão.
- `getFriendlyErrorMessage` (`src/utils/errorMessage.ts`): mensagens de erro já claras, curtas, sem jargão técnico — usar como padrão para qualquer erro novo.

## Onde há oportunidade

Ver a tabela completa em `docs/visual/08-microcopy-proposto.md`, com **texto atual → texto proposto → arquivo**, apresentada para aprovação antes de qualquer mudança (regra do plano). Confirmado, como já indicava a Fase 0: não há texto de culpa/pressão em metas, sequências ou conquistas — não há "incêndio" nessa frente. As oportunidades encontradas são pontuais, principalmente em telas de erro técnico que vazam linguagem de desenvolvedor para o paciente.
