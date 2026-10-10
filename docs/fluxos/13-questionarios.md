# 13. Questionários do mês (GAD-7 e PHQ-9)

> **Status:** Pronto.
> **Última verificação:** 2026-10-13 (varredura de funcionamento: apoio de crise na hora, rascunho, envio sem duplicar, compartilhamento que segue valendo, quem vê, apagar resultados). Antes: 2026-10-04 (pontuação recalculada em qualquer alteração).
> **Quem usa:** paciente (responde) e psicólogo com consulta com o paciente (vê, se o paciente compartilhar).

## Resumo

Dois questionários validados internacionalmente: **GAD-7** (ansiedade) e **PHQ-9** (depressão). A sugestão é responder uma vez por mês. A pontuação e a faixa são calculadas **no banco**. O paciente vê a evolução e a orientação da faixa, e decide se compartilha com os psicólogos com quem tem consulta.

## Telas

| Rota | Tela |
|---|---|
| `/questionarios` | Questionários do mês: quando responder, últimos resultados, gráfico, compartilhar |
| `/questionarios/:instrument` | Responder (`gad7` ou `phq9`) |
| `/statistics` | Atalho em Meu progresso |

## Como funciona

1. O app indica quais questionários estão "para responder": nunca respondidos ou com mais de um mês do último.
2. Pergunta padrão: "Nas últimas 2 semanas, com que frequência você se sentiu incomodado(a) por…", com 4 opções de 0 a 3.
3. Ao enviar, o gatilho `score_mental_health_screening` calcula a pontuação e a faixa no banco, e recalcula em qualquer alteração. Nem o app nem o paciente conseguem gravar outra pontuação.
4. Faixas:

   | Faixa | GAD-7 | PHQ-9 |
   |---|---|---|
   | Mínimos | 0–4 | 0–4 |
   | Leves | 5–9 | 5–9 |
   | Moderados | 10–14 | 10–14 |
   | Moderadamente graves | — | 15–19 |
   | Graves | 15+ | 20+ |

5. A partir de "moderados", o app sugere uma consulta.
6. **Pergunta 9 do PHQ-9** (pensamentos de se machucar) com qualquer resposta acima de zero: o apoio (CVV 188 e SOS) aparece **na hora, logo abaixo da pergunta**, antes de enviar e mesmo se o envio falhar (antes só aparecia depois de salvar; sem internet, a pessoa não via nada). Depois de enviado, o banco marca `self_harm_flag` e a tela do resultado repete o apoio.
7. **Respostas guardadas no aparelho**: sair da tela, recarregar ou cair a internet não apaga o que já foi respondido. Se o envio falhar, o botão vira "Tentar de novo". O envio leva um id gerado no aparelho: tentar de novo nunca cria dois resultados.
8. **Compartilhar**: o paciente liga "mostrar aos meus psicólogos", e a escolha **continua valendo para os próximos resultados** até ele desligar (antes cada resultado novo nascia escondido e o psicólogo continuava vendo só o antigo). Quem vê: psicólogos que **atendem** o paciente (consulta aceita, em andamento ou realizada). Pedido recusado, cancelado ou nunca aceito não dá acesso.
9. **Apagar**: em Questionários, "Apagar meus resultados deste questionário" apaga todos os resultados daquele questionário, com confirmação.

## Regras

- O app **não dá diagnóstico**: mostra a faixa e orienta procurar um profissional.
- Por padrão, os resultados são só do paciente. O psicólogo só vê com o compartilhamento ligado.
- Depois de enviado, só o "mostrar aos meus psicólogos" muda: respostas, tipo e data não podem ser alterados pelo app (a data é a do servidor).
- No máximo 10 envios por hora por pessoa.

## Onde está no código

- **Telas**: `src/pages/Questionnaires.tsx`, `QuestionnaireForm.tsx`, `src/components/progress/QuestionnairesCard.tsx`.
- **Regras puras**: `src/lib/screenings.ts` (perguntas, faixas, orientação, quando refazer).
- **Hook**: `useScreenings`.
- **Banco**: `mental_health_screenings` (`answers`, `score`, `severity`, `self_harm_flag`, `shared_with_psychologist`). Gatilhos `a_guard_screening_client_write` (data do servidor, só o compartilhar muda depois, compartilhamento herdado), `score_mental_health_screening`, `rate_limit_screenings`. Política do psicólogo: só com consulta aceita, em andamento ou realizada.
- **Teste SQL**: `supabase/tests/habits_more_and_screenings.sql`.

## Como validar

### Teste manual
1. Responder o GAD-7 com tudo 0 → "Mínimos" e "refaça no próximo mês"; ele some de "para responder".
2. Responder o PHQ-9 com tudo 2 → 18, "Moderadamente graves", com sugestão de consulta.
3. PHQ-9 com a pergunta 9 marcada como 1 → aparece o apoio imediato com CVV e SOS.
4. Ligar o compartilhamento → o psicólogo com consulta com esse paciente vê o resultado no histórico do paciente.

### Testes automáticos
`screenings` (faixas, um por mês, apoio na hora mesmo com falha no envio, rascunho e mesmo id ao tentar de novo).

### Conferência no banco
```sql
select instrument, score, severity, self_harm_flag, shared_with_psychologist, created_at
from mental_health_screenings where user_id = '<id>' order by created_at desc;
```

## Pendências

Nenhuma. A pontuação editável pela API foi corrigida em 2026-10-04 (migration `20261003232116_d6f3adac-0952-4317-8e77-a3a5ec8ff312.sql`).

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Questionário não aparece para responder | Respondido há menos de um mês | Data do último em `/questionarios` |
| Psicólogo não vê o resultado | Compartilhamento desligado, ou só pedido sem consulta aceita | `shared_with_psychologist`; consultas entre os dois com status agendada, confirmada, em andamento ou realizada |
| Respostas voltaram marcadas | Rascunho guardado de uma vez anterior | Esperado; some depois de enviar |
