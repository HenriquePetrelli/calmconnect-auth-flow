# 12. Meu progresso: humor, sequência, conquistas, metas da semana e histórico

> **Status:** Pronto.
> **Última verificação:** 2026-10-04 (gráfico de humor passou a carregar à parte). Sequência corrigida para o horário de Brasília em 2026-10-03.
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
Na Home, o paciente escolhe de 1 a 5. O app grava o agregado em `patients` (média e "já respondeu hoje") e uma linha por dia em `patient_mood_logs`, que alimenta o gráfico. Conta para a meta da semana "humor".

### Dias seguidos
Ao abrir o app, `update_patient_streak` atualiza a sequência no **horário de Brasília**. Só o próprio paciente atualiza a dele.

### Metas da semana
1. O paciente escolhe atividades de autocuidado da semana: respiração, sons, diário, humor ou um **desafio de 7 dias** (dormir melhor, respiração, gratidão, acalmar a ansiedade, menos tela).
2. O progresso sobe sozinho quando ele faz a atividade (uma vez por dia nas metas diárias).
3. Toda segunda de madrugada a rotina `reset-weekly-goals-monday` reinicia as metas.
4. Os desafios têm um passo por dia, com atalho para a tela certa.

### Conquistas
- O app compara o uso com as regras de cada conquista (`src/lib/achievementRules.ts`) e marca como alcançada em `patient_achievements`.
- Ao desbloquear, aparece um aviso animado e uma notificação.
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
- **Banco**: `patients` (humor agregado), `patient_mood_logs`, `patient_statistics`, `patient_achievements`, `patient_weekly_goals`, `weekly_goals`, `default_weekly_goals`. Funções: `update_patient_streak`, `add_patient_activity`, `add_quarterly_activity`, `update_patient_activity_time`, `initialize_patient_achievements`.

## Como validar

### Teste manual
1. Registrar o humor na Home → aparece no gráfico de Meu progresso (com 2 ou mais dias registrados).
2. Abrir o app em dois dias seguidos → a sequência sobe para 2. Abrir às 23h e à 0h10 → conta como dias diferentes.
3. Escolher a meta "Respiração 3x" → fazer uma respiração → a barra sobe 1. Fazer outra no mesmo dia → não sobe de novo, se a meta for diária.
4. Completar a primeira respiração → conquista "Primeiro Passo" com aviso animado.
5. Histórico completo → aparecem a respiração, o humor e os hábitos do dia.

### Testes automáticos
`moodTrendChart`, `useMoodLog`, `usePatientMoodHistory`, `usePatientEngagementMetrics`, `statisticsEngagementCards`, `patientStatisticsGoalCategories`, `progressFeedAchievements`, `goalSelectionModal`, `challenges`, `insights`.

### Conferência no banco
```sql
select streak_days, last_active_date, total_guided_breathing_time, total_therapeutic_sound_time
from patient_statistics where patient_id = '<id>';

select logged_date, mood_value from patient_mood_logs where patient_id = '<id>' order by logged_date desc limit 30;

select title, achieved, achieved_at from patient_achievements where user_id = '<id>' order by achieved desc;

select goal_id, progress, target, completed, week_start_date from patient_weekly_goals
where user_id = '<id>' order by week_start_date desc limit 10;
```

## Pendências

Nenhuma conhecida.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Sequência zerou | Um dia sem abrir o app (no horário de Brasília) | `patient_statistics.last_active_date` |
| Gráfico de humor vazio | Menos de 2 registros, ou humor diário desativado | `patient_mood_logs`; `patients.daily_mood_enabled` |
| Meta não avança | A atividade não é da categoria da meta, ou já contou hoje | `patient_weekly_goals` |
| Conquista não desbloqueia | Regra ainda não atingida | "Quase lá" mostra quanto falta |
