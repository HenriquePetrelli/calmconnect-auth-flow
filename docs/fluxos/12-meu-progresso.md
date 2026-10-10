# 12. Meu progresso: humor, sequência, conquistas, metas da semana e histórico

> **Status:** Pronto.
> **Última verificação:** 2026-10-12 (varredura de funcionamento: metas da semana e humor pelo servidor, semana certa à noite, virada da semana sem apagar nada). Antes: 2026-10-04 (gráfico de humor à parte) e 2026-10-03 (sequência no horário de Brasília).
> **Quem usa:** paciente.

## Resumo

"Meu progresso" (`/statistics`) junta o que o paciente fez no app:

- dias seguidos de uso;
- evolução do humor (gráfico de 30 dias);
- seus padrões (ficha 11);
- metas da semana e desafios de 7 dias;
- visão geral de atividades;
- conquistas;
- histórico completo.

Também tem atalho para os questionários (ficha 13).

## Telas

| Rota | Tela |
|---|---|
| `/home` | Registro do humor do dia ("Registre seu humor") e metas da semana |
| `/statistics` | Meu progresso |
| `/achievements` | Conquistas: nível, "Quase lá", medalhas por grupo |
| `/statistics/activity-history` | Histórico completo de atividades, hábitos e questionários |

## Como funciona

### Humor do dia
Na Home, o paciente escolhe de 1 a 5. A função `log_mood` grava, numa operação só, a linha do dia em `patient_mood_logs` (gráfico) e o agregado em `patients` (média e "já respondeu hoje"). Mudar o humor no mesmo dia troca o valor (não conta outro dia). Conta para a meta da semana "humor" e entra no histórico só no primeiro registro do dia.

### Dias seguidos
Ao abrir o app, `update_patient_streak` atualiza a sequência no **horário de Brasília**. Só o próprio paciente atualiza a dele.

### Metas da semana
1. A semana vai de **domingo a sábado**, no dia do aparelho (o desafio de 7 dias pede para começar no domingo).
2. O paciente escolhe atividades de autocuidado: respiração, sons, diário, humor ou um **desafio de 7 dias** (dormir melhor, respiração, gratidão, acalmar a ansiedade, menos tela). A escolha é gravada por `set_week_goals`, que cria as metas da semana e para de acompanhar as desmarcadas, numa operação só.
3. **As metas escolhidas continuam na semana seguinte sozinhas** (`ensure_week_goals`, chamado ao abrir as metas). No domingo de madrugada a rotina `reset-weekly-goals-sunday` só convida a revisar a escolha; **nada é apagado** (semanas com mais de 6 meses saem do banco).
4. O progresso sobe sozinho quando a pessoa faz a atividade: `record_goal_progress` conta no servidor, numa operação só. Metas "todo dia" (humor, sons) e desafios contam **um passo por dia** (`last_progress_date`). A meta concluída gera o aviso "Meta da semana concluída".
5. Os desafios têm um passo por dia, com atalho para a tela certa.
6. O app só lê as metas; quem grava progresso, metas, estatísticas e o histórico do humor é o servidor.

### Conquistas
- O app compara o uso com as regras de cada conquista (`src/lib/achievementRules.ts`) e marca como alcançada em `patient_achievements`.
- Ao desbloquear, aparece um aviso animado e uma notificação, uma vez só (com o app aberto em dois lugares, só o primeiro comemora).
- A tela mostra o **nível** (Semente, Broto, Florescendo, Árvore forte, Floresta), "Quase lá" com as 3 mais próximas, e medalhas por grupo com barra de progresso.

### Visão geral e histórico
- Os números vêm das tabelas de cada funcionalidade, sem tabela própria: consultas (com % de comparecimento), SOS, minutos de respiração e sons, anotações do diário e participação em grupos.
- O histórico junta tudo em ordem de data. Guarda 3 meses (rotina semanal `cleanup-quarterly-activities-weekly`).

## Regras

- **Dados só do próprio paciente.** As funções que gravam estatísticas conferem que o ID é de quem chama.
- O tempo de respiração e sons por sessão é limitado a 240 min, para evitar números absurdos.
- O gráfico de humor carrega à parte (a biblioteca de gráficos é grande), então o resto da tela aparece antes.

## Onde está no código

- **Telas**: `src/pages/Statistics.tsx`, `Achievements.tsx`, `ActivityHistory.tsx`, `HomeContent.tsx`.
- **Componentes**: `src/components/progress/` (`MoodTrendChart`, `MoodAreaChart`, `InsightsCard`, `QuestionnairesCard`, `FeedList`, `ProgressSection`), `src/components/goals/`, `src/components/achievements/`, `src/components/MoodAccordion.tsx`.
- **Hooks**: `useMoodLog`, `usePatientMoodHistory`, `usePatientStatistics`, `usePatientEngagementMetrics`, `useWeeklyGoals`, `useAchievements`, `useActivityFeed`, `useQuarterlyActivities`.
- **Regras puras**: `src/lib/achievementRules.ts`, `challenges.ts`, `activityFeed.ts`, `insights.ts`.
- **Banco**: `patients` (humor agregado), `patient_mood_logs`, `patient_statistics`, `patient_achievements`, `patient_weekly_goals`, `weekly_goals`, `default_weekly_goals`. Funções: `update_patient_streak`, `log_mood`, `ensure_week_goals`, `set_week_goals`, `record_goal_progress`, `reset_weekly_goals`, `add_patient_activity`, `add_quarterly_activity`, `update_patient_activity_time`, `initialize_patient_achievements`. A edge function `reset-weekly-goals` ficou só para chamadas antigas e não apaga nada.

## Como validar

### Teste manual
1. Registrar o humor na Home → aparece no gráfico de Meu progresso (com 2 ou mais dias registrados).
2. Abrir o app em dois dias seguidos → a sequência sobe para 2. Abrir às 23h e à 0h10 → conta como dias diferentes.
3. Escolher a meta "Respiração 5x" → fazer uma respiração → a barra sobe 1. "Humor diário": registrar duas vezes no mesmo dia → sobe 1 só.
3a. Às 22h, abrir Meu progresso → as metas da semana continuam lá (antes sumiam depois das 21h).
3b. Escolher um desafio no domingo e fazer o passo → na segunda o passo continua feito (antes a rotina de segunda apagava tudo).
3c. Virar a semana sem abrir o app → no domingo as mesmas metas estão lá, zeradas, sem precisar escolher de novo.
3d. Mudar o humor do dia de 4 para 2 → a média conta 2, uma vez.
4. Completar a primeira respiração → conquista "Primeiro Passo" com aviso animado.
5. Histórico completo → aparecem a respiração, o humor e os hábitos do dia.

### Testes automáticos
`moodTrendChart`, `useMoodLog`, `weekRange`, `usePatientMoodHistory`, `usePatientEngagementMetrics`, `statisticsEngagementCards`, `patientStatisticsGoalCategories`, `progressFeedAchievements`, `goalSelectionModal`, `challenges`, `insights`.

### Conferência no banco
```sql
select streak_days, last_active_date, total_guided_breathing_time, total_therapeutic_sound_time
from patient_statistics where patient_id = '<id>';

select logged_date, mood_value from patient_mood_logs where patient_id = '<id>' order by logged_date desc limit 30;

select title, achieved, achieved_at from patient_achievements where user_id = '<id>' order by achieved desc;

select goal_id, progress, target, completed, week_start_date from patient_weekly_goals
where user_id = '<id>' order by week_start_date desc limit 10;

-- A semana atual começa no domingo
select distinct week_start_date, extract(dow from week_start_date) as dia_da_semana
from patient_weekly_goals where user_id = '<id>' order by 1 desc limit 3;
```

## Pendências

Nenhuma conhecida.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Sequência zerou | Um dia sem abrir o app (no horário de Brasília) | `patient_statistics.last_active_date` |
| Gráfico de humor vazio | Menos de 2 registros, ou humor diário desativado | `patient_mood_logs`; `patients.daily_mood_enabled` |
| Meta não avança | A atividade não é da categoria da meta, ou já contou hoje (metas "todo dia" e desafios) | `patient_weekly_goals.last_progress_date` |
| Metas sumiram na semana nova | Nenhuma meta escolhida | `patients.weekly_goals`; as escolhidas voltam sozinhas |
| Conquista não desbloqueia | Regra ainda não atingida | "Quase lá" mostra quanto falta |
