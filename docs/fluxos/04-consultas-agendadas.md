# 04. Consultas agendadas

> **Status:** Pronto.
> **Última verificação:** 2026-10-05 (varredura das regras para paciente e psicólogo: horários de outros pacientes aparecem ocupados, fuso de Brasília, dois pedidos simultâneos, horário proposto reservado, cancelar com novo horário proposto, calendário até o limite do psicólogo).
> **Quem usa:** paciente Premium (1 consulta por mês, incluindo o plano da empresa) e psicólogo aprovado.

## Resumo

O paciente escolhe psicólogo, dia e horário dentro da agenda real dele. O psicólogo aceita, recusa ou propõe outro horário. No dia, os dois entram na sala de vídeo (ficha 03). A consulta só conta como realizada se a chamada conectou. Se não aconteceu, a consulta do mês volta para o paciente.

## Telas

| Rota | Quem | Tela |
|---|---|---|
| `/appointments` | Paciente | Agendar, próximas consultas, histórico (com "Avaliar" e "Relatar problema") |
| `/psychologist-dashboard` (Início) | Psicólogo | Resumo: consultas de hoje, próximos dias, pedidos para responder e a próxima consulta do dia |
| `/psicologo/consultas` | Psicólogo | Aba Próximas (pedidos, hoje, próximos dias) e aba Histórico ("Consulta interrompida", resumo da sessão) |
| `/consultation-call/:appointmentId` | Os dois | Sala da consulta |
| `/notifications`, `/psychologist-notifications` | Os dois | Avisos de pedido, confirmação, mudança e lembrete |

## Como funciona

### 1. Agendar
1. O paciente escolhe o psicólogo numa lista com nome, especialidade, CRP e quantas consultas e SOS ele já concluiu no app e a nota real dos pacientes, com o número de avaliações (função `get_psychologists_public_stats`, que devolve só os totais de psicólogos aprovados). Sem avaliação, aparece "Sem avaliações ainda". Cidade, estado e endereço do psicólogo não aparecem. Depois vê só os horários livres: horário-padrão combinado com exceções do dia, sem férias, sem conflito com outras consultas, respeitando antecedência mínima, intervalo entre consultas e até quantos dias à frente (ficha 05).
2. Confirma. A edge function `appointments` confere de novo, no servidor, a agenda, os conflitos e o plano Premium, e **reserva a cota do mês numa única operação** (dois pedidos ao mesmo tempo não passam os dois). Se a consulta não for criada, a reserva é desfeita. Também limita a 10 tentativas por hora. Toda consulta criada pelo app é do tipo `regular` (o servidor ignora outro tipo enviado) e a observação é cortada em 1.000 caracteres.
3. A consulta nasce como `pending` e o psicólogo é notificado (app e push).

### 2. Resposta do psicólogo (`psychologist-schedule`)
- **Aceitar** → `scheduled`; o paciente é avisado. A cota do mês já foi reservada no pedido.
- **Recusar** → `declined`; a cota volta.
- **Propor outro horário** → `reschedule_proposed`. Só horários livres da agenda dele (mesma lista que o paciente vê). O horário proposto fica reservado até o paciente responder. O paciente aceita (o horário muda; o servidor confere de novo conflito e agenda, ex.: férias marcadas depois) ou recusa (a cota volta).
- **Sem resposta**: o pedido expira em 24 h ou quando o horário chega (`auto-decline-appointments`, de hora em hora); a cota volta.

### 3. Lembretes
24 h e 1 h antes, no app e por push (`queue_appointment_reminders`, a cada 10 min).

### 4. Atendimento
1. A sala abre **10 min antes** e fica aberta até **15 min depois do fim previsto** (duração padrão de 50 min). Ao entrar, a consulta vira `in_progress`.
2. Se o outro não entra em 2 min após o horário, aparece o botão **Avisar**: manda push "Estão esperando você na consulta", no máximo a cada 3 min.
3. O cronômetro compartilhado avisa aos 5 min finais e ao zerar, mas não derruba a chamada.

### 5. Conclusão
- Só conta como concluída se a chamada **conectou** os dois lados (`webrtc_sessions.connected_at`, gravado na primeira conexão e mantido mesmo se a chamada cair depois). Vale para o botão "Concluir" do psicólogo e para o "Encerrar" da sala.
- Quem sai da sala sem a outra pessoa ter entrado não encerra a consulta: ela continua "em andamento" até o fim da janela (a outra pessoa ainda pode entrar), e o app avisa isso.
- Salvar o resumo da sessão no histórico não muda o status da consulta.
- A rotina `finalize-stale-appointments` (a cada 10 min) fecha o que ficou aberto 30 min após o fim previsto:
  - **conectou** → `completed`, e entra no repasse do psicólogo (ficha 09);
  - **não conectou** → `no_show`, a consulta do mês volta para o paciente e ele é avisado.

### 6. Avaliação
- Ao fim da chamada, o paciente avalia (nota e comentário).
- Se fechou o app antes, o convite aparece ao reabrir (dá para pular).
- No histórico, o botão **Avaliar** vale até 30 dias depois. A nota entra na média do psicólogo.

### 7. Cancelamento (`cancel_appointment`)

| Quem cancela | Quando | A consulta do mês volta? |
|---|---|---|
| Paciente | Pedido ainda não confirmado (inclusive com novo horário proposto), ou com 24 h ou mais de antecedência | Sim |
| Paciente | Com menos de 24 h | Não, conta como usada (o app avisa antes) |
| Psicólogo | Qualquer momento antes do início | Sim, e o paciente é avisado |

Com novo horário proposto, o limite "já começou" vale para o horário proposto (antes, passado o horário original, não dava mais para cancelar).

Toda devolução da consulta do mês (cancelar, recusar, expirar, não realizada, interrompida) passa por `release_appointment_quota`: só devolve se a cota marcada é do mesmo mês em que a consulta foi pedida. Assim, recusar em outubro um pedido feito em setembro não libera uma segunda consulta em outubro.

### 8. Problema técnico
- **Paciente**: no histórico, **Relatar problema** (do horário da consulta até 48 h depois). O psicólogo é avisado.
- **Psicólogo**: no histórico, **Consulta interrompida**. Cancela a consulta, devolve a consulta do mês ao paciente, avisa o paciente e tira do repasse. É recusado se a consulta já entrou num repasse pago.

## Regras

- Status: `pending`, `scheduled`/`confirmed`, `reschedule_proposed`, `in_progress`, `completed`, `declined`, `cancelled`, `no_show`.
- O paciente **não** altera a consulta direto: tudo passa por funções do banco ou pela edge function, com transições permitidas definidas (`PSYCHOLOGIST_TRANSITIONS` em `psychologist-schedule`).
- Cada psicólogo vê só as próprias consultas. "Hoje" e "Próximas" não repetem consulta.
- Horários sempre no fuso de Brasília.

## Onde está no código

- **Telas e componentes**: `src/pages/Appointments.tsx`, `src/components/appointments/` (`AppointmentForm`, `PsychologistSelection`, `AppointmentHistory`, `CancelAppointmentDialog`, `ConsultationVideoCall`, `ReportConsultationProblemDialog`), `src/components/psychologist/ConsultationHistory.tsx`.
- **Hooks**: `useAppointments`, `useAvailableTimeSlots`, `usePsychologistSchedule`, `useAppointmentVideoCall`, `usePendingCallFeedback`.
- **Regras puras**: `src/lib/appointmentCancellation.ts`, `appointmentRating.ts`, `consultationWindow.ts`, `consultationProblem.ts`, `bookingRules.ts`.
- **Edge functions**: `appointments` (criar e listar), `psychologist-schedule` (aceitar, recusar, propor, concluir), `auto-decline-appointments`, `send-appointment-notification`, `notification-push`.
- **Banco**: `appointments`, `appointment_reminders_sent`, `appointment_problem_reports`, `session_feedback`, `subscribers` (cota). Funções: `release_appointment_quota`, `appointment_call_connected`, `cancel_appointment`, `get_or_create_appointment_webrtc_session`, `notify_consultation_waiting`, `report_consultation_problem`, `finalize_stale_appointments`, `queue_appointment_reminders`. Gatilhos `guard_appointment_client_update` e `track_call_connected` (em `webrtc_sessions`). Migração mais recente: `20261004000247_cf325ceb-bcdc-471c-9aa3-6bdeea596c98.sql`.

## Como validar

### Teste manual
1. **Agendar** (paciente Premium) → aparece "Aguardando confirmação"; o psicólogo recebe a notificação.
2. **Aceitar** → o paciente recebe "Consulta confirmada".
3. **Propor outro horário** → o paciente aceita → o horário muda nos dois lados.
4. **Segunda consulta no mês** → aviso de cota usada.
5. **Cancelar** com mais de 24 h → o aviso diz que a consulta do mês volta → agendar outra funciona.
6. **Dia da consulta**: 10 min antes, o botão "Entrar" fica ativo → os dois entram → chamada conecta → o psicólogo encerra → o paciente avalia.
7. **Ninguém aparece**: entrar sozinho → depois de 2 min, "Avisar" → o outro recebe push. Deixar passar 30 min após o fim → a consulta vira "Não realizada" e a consulta do mês volta.
8. **Saiu sozinho**: o psicólogo entra, ninguém aparece, ele sai → aviso "Você saiu da sala"; a consulta continua "Em andamento" e depois vira "Não realizada", sem entrar no repasse.
9. **Duplo agendamento**: dois toques rápidos em "Agendar" (ou duas abas) → só uma consulta é criada.
10. **Histórico**: "Avaliar" em consulta concluída; "Relatar problema" (paciente) e "Consulta interrompida" (psicólogo).

### Testes automáticos
`availableTimeSlots`, `bookingRules`, `consultationWindow`, `consultationProblem`, `consultasChatRules`, `appointmentFeedback`, `upcomingConsultationsStartCall`, `consultationCallRouteAccess`, `consultationVideoCallSession`, `webrtcSessionReuse.e2e`.

### Conferência no banco
```sql
-- Consultas de um paciente
select id, status, scheduled_at, duration, video_room_id, cancellation_reason
from appointments where patient_id = '<id>' order by scheduled_at desc;

-- A chamada conectou?
select a.id, a.status, s.connected_at, (s.connected_at is not null) as conectou
from appointments a left join webrtc_sessions s on s.id::text = a.video_room_id
where a.id = '<id da consulta>';

-- Cota Premium do mês
select subscription_tier, appointments_used_this_month, appointments_last_used
from subscribers where user_id = '<id do paciente>';

-- Relatos de problema
select * from appointment_problem_reports order by created_at desc limit 20;
```

## Pendências

Nenhuma no fluxo. O push dos lembretes depende do Firebase (pendência 3).

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Nenhum horário disponível | Psicólogo sem horário-padrão, de férias ou com antecedência mínima maior que o dia escolhido | Ficha 05; `psychologist_availability`, `psychologist_vacations`, `psychologist_booking_rules` |
| "Seu plano não inclui consultas" | Paciente não é Premium (ou plano vencido) | `subscribers` |
| Botão "Entrar" não aparece | Fora da janela (10 min antes até 15 min depois do fim) ou consulta não confirmada | Status e horário da consulta |
| Psicólogo não consegue concluir | A chamada nunca conectou | `webrtc_sessions.connected_at`; a rotina vai marcar `no_show` |
| Encerrou e a consulta continuou "Em andamento" | A outra pessoa nunca entrou | Esperado; a rotina fecha como `no_show` |
| Consulta ficou "Em andamento" | Ninguém concluiu | A rotina fecha 30 min após o fim previsto; conferir `cron.job_run_details` (ficha 21) |
