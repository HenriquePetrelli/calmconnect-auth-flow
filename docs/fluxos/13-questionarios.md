# 13. Questionários do mês (GAD-7 e PHQ-9)

> **Status:** Pronto, com uma pendência pequena (ver Pendências).
> **Última verificação:** 2026-10-03.
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
3. Ao enviar, o gatilho `score_mental_health_screening` calcula a pontuação e a faixa no banco. O app não envia a pontuação.
4. Faixas:

   | Faixa | GAD-7 | PHQ-9 |
   |---|---|---|
   | Mínimos | 0–4 | 0–4 |
   | Leves | 5–9 | 5–9 |
   | Moderados | 10–14 | 10–14 |
   | Moderadamente graves | — | 15–19 |
   | Graves | 15+ | 20+ |

5. A partir de "moderados", o app sugere uma consulta.
6. **Pergunta 9 do PHQ-9** (pensamentos de se machucar) com qualquer resposta acima de zero: marca `self_harm_flag` e mostra apoio imediato (CVV 188 e SOS).
7. **Compartilhar**: o paciente liga "mostrar aos meus psicólogos". O resultado aparece no histórico do paciente para psicólogos com quem ele tem consulta.

## Regras

- O app **não dá diagnóstico**: mostra a faixa e orienta procurar um profissional.
- Por padrão, os resultados são só do paciente. O psicólogo só vê com o compartilhamento ligado.

## Onde está no código

- **Telas**: `src/pages/Questionnaires.tsx`, `QuestionnaireForm.tsx`, `src/components/progress/QuestionnairesCard.tsx`.
- **Regras puras**: `src/lib/screenings.ts` (perguntas, faixas, orientação, quando refazer).
- **Hook**: `useScreenings`.
- **Banco**: `mental_health_screenings` (`answers`, `score`, `severity`, `self_harm_flag`, `shared_with_psychologist`). Gatilho `score_mental_health_screening`.
- **Teste SQL**: `supabase/tests/habits_more_and_screenings.sql`.

## Como validar

### Teste manual
1. Responder o GAD-7 com tudo 0 → "Mínimos" e "refaça no próximo mês"; ele some de "para responder".
2. Responder o PHQ-9 com tudo 2 → 18, "Moderadamente graves", com sugestão de consulta.
3. PHQ-9 com a pergunta 9 marcada como 1 → aparece o apoio imediato com CVV e SOS.
4. Ligar o compartilhamento → o psicólogo com consulta com esse paciente vê o resultado no histórico do paciente.

### Testes automáticos
`screenings`.

### Conferência no banco
```sql
select instrument, score, severity, self_harm_flag, shared_with_psychologist, created_at
from mental_health_screenings where user_id = '<id>' order by created_at desc;
```

## Pendências

Registradas também no item 7 de `docs/pendencias-antes-do-lancamento.md`.

- **Pontuação editável pela API** (achado em 2026-10-04, baixo impacto): o gatilho recalcula a pontuação só quando as respostas mudam. Chamando a API direto, o próprio paciente consegue alterar `score`/`severity` de um resultado já gravado, sem mudar as respostas, e isso apareceria para o psicólogo se compartilhado. Correção: recriar o gatilho para rodar em qualquer `UPDATE` (`BEFORE INSERT OR UPDATE ON mental_health_screenings`).

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Questionário não aparece para responder | Respondido há menos de um mês | Data do último em `/questionarios` |
| Psicólogo não vê o resultado | Compartilhamento desligado ou sem consulta com o paciente | `shared_with_psychologist`; consultas entre os dois |
