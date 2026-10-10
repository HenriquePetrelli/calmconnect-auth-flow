# 05. Agenda do psicólogo

> **Status:** Pronto.
> **Última verificação:** 2026-10-20 (varredura de funcionamento: férias mostram e podem cancelar as consultas do período, férias gravadas numa operação só, bloqueio por cima de consulta recusado no banco, agenda e férias só para quem está logado). Antes: 2026-10-05 (varredura das regras de agendamento: horários ocupados visíveis ao paciente, fuso de Brasília, trava contra dois pedidos simultâneos, horário proposto reservado; Férias em modal próprio).
> **Quem usa:** psicólogo aprovado.

## Resumo

O psicólogo define um **horário-padrão** semanal e o ajusta por data com **exceções** (bloquear um horário ou abrir um extra), **férias** e **regras de agendamento**. O paciente só vê o que sobra disso tudo, e o servidor confere de novo na hora de agendar.

## Telas

| Rota | Tela |
|---|---|
| `/psychologist-dashboard` (Início) | Modal da 1ª configuração e confirmação semanal |
| `/psychologist-availability` (Agenda) | Horário-padrão e regras; botões **Férias** (modal com as datas) e **Agenda semanal** (confirmação da semana) |

## Como funciona

1. **Primeiro acesso**: se não há horário-padrão, abre a configuração inicial, com segunda a sexta das 8h às 18h pré-marcado e ajustável. Salva por `set_psychologist_availability`.
2. **Horário-padrão**: dias da semana com um ou mais blocos (ex.: manhã e tarde). Tem "Copiar para outros dias".
3. **Confirmação semanal**: uma vez por semana mostra os próximos 7 dias, **só para leitura do padrão**. Em "Personalizar horários", cada meia hora pode ser bloqueada só naquela data; "Adicionar horário extra" abre fora do padrão. Grava **só exceções** (`psychologist_availability_overrides`), nunca mexe no padrão. Abre sozinha uma vez por semana no Início e pelo botão "Agenda semanal" na Agenda; não tem atalhos para editar o padrão nem para férias (ficam na própria Agenda).
4. **Férias** (botão "Férias" na Agenda, abre um modal): de-até, totalmente indisponível, sem apagar padrão nem exceções. Só um período ativo ou futuro por vez; para mudar, cancela e agenda de novo. Gravadas numa operação só (`set_psychologist_vacation`), no máximo um ano à frente.
   - **Consultas no período**: ao escolher as datas, o modal lista as consultas e pedidos marcados nesses dias (`vacation_conflicts`). Com "Cancelar essas consultas e avisar os pacientes" (marcado por padrão), elas são canceladas junto, cada paciente recebe o aviso e a consulta do mês volta. Desmarcando, continuam marcadas e o psicólogo precisa atender ou cancelar uma a uma.
   - Durante as férias, a confirmação semanal mostra só o aviso e "Encerrar férias agora".
5. **Regras de agendamento** (`psychologist_booking_rules`):
   - intervalo entre consultas: 0 a 30 min;
   - antecedência mínima: padrão de 2 h;
   - até quantos dias à frente: padrão de 30.

## Regras

- Sem nenhum bloco no padrão, o psicólogo não aparece com horários para ninguém.
- Horário com consulta marcada aparece travado e não pode ser bloqueado; o banco também recusa (gatilho `guard_override_block`).
- Horário-padrão, exceções e férias dos psicólogos só são lidos por quem está logado.
- O conflito é calculado com sobreposição dos dois lados e com o intervalo: um horário que começa antes e termina no meio de outra consulta também é recusado.
- As mesmas regras valem no app (`src/lib/bookingRules.ts`, `src/lib/psychologistAvailability.ts`) e no servidor (edge function `appointments`).
- Seguram o horário: pedidos pendentes, consultas confirmadas e em andamento, e o **novo horário proposto** a um paciente enquanto ele não responde.
- O paciente só lê as próprias consultas; os horários ocupados de outros pacientes chegam pela função `get_psychologist_busy_times` (só início e duração, janela de até 3 dias).
- Tudo em horário de Brasília, inclusive para paciente com o aparelho em outro fuso (Manaus, Acre).
- O banco recusa duas consultas sobrepostas do mesmo psicólogo (gatilho `prevent_appointment_overlap`, com trava por psicólogo): dois pedidos ao mesmo tempo para o mesmo horário não passam os dois.
- O calendário do paciente vai até o "até quantos dias à frente" de cada psicólogo (antes parava em 30 dias mesmo com 60 ou 90 configurado).

## Onde está no código

- **Telas e componentes**: `src/pages/PsychologistAvailability.tsx`; em `src/components/psychologist/`: `FirstTimeAvailabilityModal`, `WeeklyScheduleModal`, `VacationModal` e a grade de disponibilidade.
- **Hooks**: `usePsychologistAvailability`, `usePsychologistAvailabilityOverrides`, `usePsychologistVacation`, `usePsychologistBookingRules`, `useAvailableTimeSlots`.
- **Banco**: `psychologist_availability`, `psychologist_availability_overrides`, `psychologist_vacations`, `psychologist_booking_rules`. Funções `set_psychologist_availability`, `get_psychologist_busy_times`, `vacation_conflicts`, `set_psychologist_vacation`; gatilhos `prevent_appointment_overlap`, `guard_override_block`. Migração mais recente: `20261010212736_d7ec446a-db8d-492b-b7b7-93c3b85748c1.sql`.

## Como validar

### Teste manual
1. Conta nova de psicólogo → o painel abre a configuração inicial → salvar.
2. Como paciente, agendar → só aparecem horários dentro do padrão.
3. Psicólogo bloqueia 14h de amanhã em "Personalizar horários" → o paciente não vê 14h amanhã, mas vê 14h na semana seguinte.
4. Psicólogo marca férias na próxima semana → nenhum horário nesses dias.
5. Antecedência mínima de 2 h → o paciente não consegue marcar para daqui a 1 h.
6. Com uma consulta confirmada às 10h (50 min) e intervalo de 10 min → 10h30 e 10h50 não aparecem; 11h aparece.

### Testes automáticos
`psychologistAvailabilityGrid`, `psychologistAvailabilityOverrides`, `psychologistAvailabilityPage`, `psychologistAvailabilityValidation`, `psychologistAvailabilityWeek`, `psychologistVacation`, `vacationConflicts`, `firstTimeAvailabilityModal`, `weeklyScheduleModal`, `bookingRules`, `availableTimeSlots`.

### Conferência no banco
```sql
select day_of_week, start_time, end_time, is_available from psychologist_availability where psychologist_id = '<id>' order by 1, 2;
select date, type, start_time, end_time from psychologist_availability_overrides where psychologist_id = '<id>' and date >= current_date order by date;
select start_date, end_date from psychologist_vacations where psychologist_id = '<id>';
select buffer_minutes, min_notice_hours, max_advance_days from psychologist_booking_rules where psychologist_id = '<id>';
```

## Pendências

Nenhuma conhecida.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Bloqueio "vazou" para o mês inteiro | Bug antigo (corrigido em 2026-09-02): a confirmação semanal gravava no padrão | A modal agora só grava exceções; conferir `psychologist_availability` |
| Paciente vê horário que o psicólogo bloqueou | Bloqueio feito em outra data, ou cache da tela | Exceções do dia; recarregar a tela do paciente |
| Horário aparece, mas o agendamento é recusado | Outro paciente marcou antes, ou regra de antecedência | Mensagem do servidor; consultas do dia |
