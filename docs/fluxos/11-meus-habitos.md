# 11. Meus hábitos

> **Status:** Pronto.
> **Última verificação:** 2026-10-11 (varredura de funcionamento: registro sem internet e sem duplicar, lembretes discretos e que não se perdem, regras do servidor, apagar com histórico). Antes: 2026-10-03 (novos hábitos, lembretes por refeição e remédio) e 2026-10-04 (lembretes só pelo agendador do banco).
> **Quem usa:** paciente.

## Resumo

Dois tipos de hábito:

- **Hábitos do dia**: água, sono, movimento, menos cafeína, comer nos horários, tomar o remédio, menos tela e "algo que me faz bem".
- **Largar um hábito**: cigarro, álcool ou outro com nome livre, com contador ao vivo.

São no máximo 10 hábitos ativos, um de cada tipo (remédio e "largar outro" podem repetir). São **dados de saúde**: só o próprio paciente vê. Nem o psicólogo nem a equipe do app têm acesso.

### Registro confiável
- Cada toque (copo, dose, refeição) aparece na hora e nasce com um id gerado no aparelho: reenviar nunca duplica.
- **Sem internet**, o registro fica guardado no aparelho (sobrevive a recarregar a página), com o aviso "Sem internet agora", e é enviado sozinho quando a conexão ou a tela voltam, na ordem em que foi feito.
- **"Desfazer"** logo depois do toque espera o envio terminar antes de apagar (antes o registro podia voltar); sem internet, apaga o que estava guardado.
- Ao voltar para o app, a lista se atualiza (registro feito em outro aparelho), e **à meia-noite** o dia vira sozinho, sem recarregar.
- Limite de 120 registros por minuto por pessoa.

### Tirar da lista ou apagar
- **Tirar da lista**: os lembretes param e o histórico fica guardado.
- **Apagar com o histórico**: apaga o hábito e todos os registros dele, com confirmação (antes só dava para apagar excluindo a conta inteira).

## Telas

| Rota | Tela |
|---|---|
| `/habitos` | Lista dos hábitos, com "Seus padrões" |
| `/habitos/novo`, `/habitos/novo/:kind` | Escolher e configurar um hábito |
| `/habitos/:habitId` | Detalhe: registrar, gráfico de 7 dias, sequência, recorde |
| `/habitos/:habitId/editar` | Editar |
| `/home` | Card "Melhorar hábitos" e lista rápida abaixo do humor |

## Como funciona

### Hábitos do dia
- **Água**: meta sugerida de 35 ml por kg, copos rápidos configuráveis, desfazer, gráfico de 7 dias, sequência e recorde.
- **Sono e movimento**: registro do dia contra uma meta.
- **Menos cafeína** e **menos tela** são hábitos de **limite**: anel vermelho e aviso ao passar.
  - Cafeína: bebidas com mg aproximados e 400 mg por dia como referência.
  - Tela: minutos de tela e "sem tela 1 h antes de dormir".
- **Comer nos horários**: café da manhã, almoço, lanche e jantar, sem calorias, com a pergunta opcional "antes de comer, você estava…". Calorias e dietas ficaram de fora de propósito, pelo risco de transtorno alimentar.
- **Tomar o remédio**: nome e até 6 horários, com % de doses na semana. O app não orienta dose.
- **Algo que me faz bem**: atividades favoritas e "como você se sente agora?".

### Largar um hábito
- Contador ao vivo, dias sem, dinheiro economizado, cigarros ou doses evitados, vida recuperada (11 min por cigarro), calorias evitadas (150 kcal por dose).
- Marcos de 1 dia a 5 anos e linha do tempo de saúde (OMS/INCA) para quem parou de fumar.
- **"Senti vontade"**: intensidade, gatilhos e atalho para a respiração guiada.
- **Recaída sem culpa** (`register_habit_relapse`): a contagem recomeça, mas recorde e histórico ficam. O recorde é gravado só pelo servidor, e dois toques seguidos contam uma recaída só.
- Quem larga o álcool vê um aviso sobre abstinência grave.

### Lembretes por push
A rotina `habit-reminders` roda a cada 15 min e escolhe quem lembrar por `claim_due_habit_reminders`, que é idempotente: não manda o mesmo lembrete duas vezes. Se o Firebase falhar, o lembrete é devolvido (`release_habit_reminders`) e sai na rodada seguinte; antes a dose do remédio ficava sem aviso. O lembrete novo do mesmo hábito substitui o anterior no aparelho, e um lembrete com mais de 2 h é descartado.

**Texto discreto** (aparece na tela bloqueada): o lembrete do remédio diz "Hora do remédio (08:00)" sem o nome do remédio, e o de "largar um hábito" diz "3 dias seguidos" sem dizer do quê. Sem emojis.

**Não lembra do que já foi feito hoje**: sono ou "algo que me faz bem" já anotados, meta de água, movimento ou refeições batida.

| Hábito | Quando lembra |
|---|---|
| Água | A cada 1 a 3 h dentro da janela escolhida, só enquanto a meta não foi batida |
| Remédio | Em cada horário, por até 2 h, enquanto a dose não for marcada |
| Refeições | Na hora de cada refeição, por até 2 h, se ainda não foi marcada |
| Tela | 1 h antes da hora de dormir |
| Largar um hábito | Mensagem diária de contagem |
| Sono, algo que me faz bem | Um por dia no horário escolhido, só se ainda não anotou |

### Seus padrões
Cruza o humor com sono, movimento, água, cafeína, tela, refeições e atividades dos últimos 60 dias. Mostra só associações claras: pelo menos 3 dias em cada grupo e diferença de 0,5 ponto. Remédio fica de fora. A mesma seção aparece em Meu progresso.

## Onde está no código

- **Telas**: `src/pages/Habits.tsx`, `HabitSetup.tsx`, `HabitDetail.tsx`; componentes em `src/components/habits/` (`HabitForm`, `HomeHabitsCard` e outros).
- **Regras puras**: `src/lib/habits.ts` (catálogo, metas, sequências, contas do "largar"), `src/lib/insights.ts` (padrões).
- **Hook**: `useHabits`.
- **Edge function**: `habit-reminders`.
- **Banco**: `user_habits`, `habit_events`, ambos só do dono. Funções: `register_habit_relapse`, `claim_due_habit_reminders`, `release_habit_reminders`. Gatilhos: `a_guard_user_habit_fields` (fuso válido, início do "largar" nunca no futuro; recorde, tipo e hora do último lembrete só pelo servidor), `enforce_user_habit_limit` (10 ativos, sem brecha para dois toques), `rate_limit_habit_events`.
- **Testes SQL**: `supabase/tests/user_habits.sql`, `habits_more_and_screenings.sql`, `meal_reminders.sql`.

## Como validar

### Teste manual
1. Criar o hábito Água → tocar num copo → o anel avança; "Desfazer" volta.
2. Criar "Parar de fumar" com data de 3 dias atrás → mostra "3 dias", o dinheiro economizado e os marcos.
3. "Senti vontade" → registra e oferece a respiração.
4. "Recaída" → a contagem recomeça e o recorde continua.
5. Tomar o remédio com horário daqui a 20 min e push ativo → no horário chega o lembrete; marcar a dose → não chega de novo.
6. Cafeína acima de 400 mg → anel vermelho e aviso.

### Testes automáticos
`habits`, `habitsMore`, `habitsPages`, `habitFormMore`, `insights`, `habitsReliability` (sem internet, resposta perdida, desfazer, hábito repetido pelo endereço, apagar com histórico).

### Conferência no banco
```sql
select kind, title, daily_goal, reminders_enabled, quit_started_at, archived_at
from user_habits where user_id = '<id>';

select kind, amount, local_date, occurred_at from habit_events
where habit_id = '<id do hábito>' order by occurred_at desc limit 20;
```

## Pendências

Nenhuma. Lembretes por push dependem do Firebase (ficha 07).

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Lembrete não chega | Push desativado, fora da janela ou meta já batida | `user_habits.reminders_enabled`; ficha 07 |
| Lembrete chega em hora errada | Fuso do hábito | `user_habits.timezone` |
| Não consigo criar mais hábitos | Limite de 10 ativos | Arquivar um |
| Registro com "Sem internet agora" | Celular sem conexão | Sai sozinho quando voltar; fica em `localStorage` (`habitos:pendentes:<id>`) até lá |
| Lembretes pararam para todo mundo | (Corrigido) fuso inválido num hábito travava a rotina | Desde 2026-10-11 o banco corrige o fuso e a rotina ignora o inválido |
| "Seus padrões" vazio | Menos de 3 dias em cada grupo ou humor não registrado | Esperado com pouco histórico |
