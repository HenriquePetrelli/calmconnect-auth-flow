# 02. SOS: atendimento de emergência

> **Status:** Pronto, com pendência externa (TURN para redes restritivas; push depende do Firebase).
> **Última verificação:** 2026-10-06 (varredura das regras: um SOS aberto por paciente e por psicólogo, fila só para psicólogo habilitado, aceite só nos 10 min, cota devolvida em todo fim sem conexão, aviso de "Atendimento encaminhado" ao vivo).
> **Quem usa:** paciente com plano (Plus, Premium ou empresa) e psicólogo aprovado.

## Resumo

O paciente aperta SOS, entra numa fila e o primeiro psicólogo online que aceitar atende por vídeo. A chamada usa a mesma tecnologia da consulta (ficha 03). Esta ficha cobre o que é só do SOS: fila, aceite, limites, cota, encerramento, avaliação e pagamento.

## Telas

| Rota | Quem | Tela |
|---|---|---|
| `/sos` | Paciente | Fila de espera: contador, profissionais disponíveis, CVV/SAMU, "Meu plano", "Respirar" |
| `/emergency-call/:sessionId` | Os dois | Sala de vídeo do SOS |
| `/psychologist-dashboard` (Início) | Psicólogo | Status Online/Offline do SOS e a fila de pedidos. Em qualquer outra tela do psicólogo, com ele online, um aviso mostra os pedidos esperando e leva ao Início |

## Como funciona

### 1. Pedido
1. O paciente toca em SOS. A edge function `emergency-sos` confere o login, o plano e a cota do mês (`can_use_sos`), aplica um limite de 5 tentativas em 10 minutos e cria o pedido em `emergency_requests` com status `pending`.
2. Sem SOS disponível (cota do mês usada, sem plano ou conta bloqueada), a tela não fica "buscando": mostra o motivo e as ajudas do momento (CVV em destaque, respirar, plano de segurança, SAMU) e, conforme o caso, "Agendar uma consulta" (Premium) ou "Ver planos" (`SosUnavailable`).
3. Se já existe um pedido aberto do paciente, ele volta para esse pedido em vez de criar outro. O banco garante isso mesmo com dois toques ao mesmo tempo ou duas abas (`guard_sos_concurrency`). Só conta de paciente pede SOS.
3. Os psicólogos online veem o pedido na lista na hora (tempo real e canal `sos-queue`, com consulta a cada 10 s). Todos os psicólogos aprovados, não bloqueados e que não estão em outro SOS recebem um **push**, mesmo com o app fechado.
4. Na fila, o paciente vê quantos psicólogos estão online, o tempo de espera (até 10 min), **Meu plano** (plano de segurança), **Respirar** e as ligações para o CVV 188 e o SAMU 192 (uma vez só, sem repetir). Sem ninguém online, o pedido continua na fila (todos os psicólogos recebem push e podem ficar online). As ligações para o CVV e o SAMU têm sempre o mesmo visual.
5. A fila confere o pedido a cada 5 s e quando a internet ou a tela voltam. Assim o aceite chega mesmo se o tempo real cair.

### 2. Aceite
1. O psicólogo toca em aceitar. O aceite é atômico: só um consegue, e os outros recebem "já foi aceito".
2. O banco só deixa aceitar quem é **psicólogo aprovado e não bloqueado** (`psychologist_can_attend`), que **não esteja em outro SOS** e com o pedido ainda dentro dos 10 min de espera (`guard_sos_concurrency`, também para dois aceites ao mesmo tempo).
3. Os dois vão para a sala. A cota do SOS do mês é marcada como usada **quando a chamada começa** (`mark_sos_used_on_start`), não no pedido.

### 3. Atendimento
Vídeo, reconexão automática, cronômetro compartilhado e painel de contexto do paciente (sintomas, histórico e plano de segurança sob demanda, com registro de cada leitura). Detalhes técnicos na ficha 03.

**Se o psicólogo some por mais de 90 s**, o paciente vê:
- **Chamar outro psicólogo**: encerra este pedido como `psychologist_unavailable`, devolve o SOS do mês e volta para a fila na hora.
- **Continuar esperando.**
- **Ligar para o CVV (188).**

**Se o paciente some**, o psicólogo vê que a sala continua aberta e pode encerrar e registrar o que aconteceu.

### 4. Encerramento
- O psicólogo encerra em duas etapas: a crise foi resolvida? (com motivo se não foi) e anotações.
- O paciente também pode encerrar (com confirmação).
- Fechar o app ou recarregar **não** encerra: dá para voltar à mesma sala.
- Ao terminar, o paciente vê a **avaliação obrigatória**: resultado, nota de 1 a 5, se se sentiu acolhido e, se houve problema, categorias e relato. Queixa de conduta vai para revisão do admin.

### 5. Depois
- Acompanhamento: 24 h depois, o paciente recebe uma mensagem de cuidado (`queue_sos_followups`).
- O psicólogo recebe R$ 50 por SOS concluído no repasse semanal (ficha 09).

## Regras

| Regra | Valor |
|---|---|
| SOS por mês | 1 (Plus, Premium e empresa). Sem plano: sem SOS |
| Espera máxima na fila | 10 min; depois vira `expired` e a tela oferece o CVV e "Tentar de novo" |
| Duração máxima da chamada | 25 min em todos os planos (gravada no pedido pelo gatilho `set_emergency_time_limit`). A consulta agendada continua com 50 min |
| Os dois sem sinal | 10 min → `abandoned` (cota devolvida) |
| Psicólogo ausente | 90 s → o paciente pode chamar outro (cota devolvida) |
| Os dois na sala, mas a chamada não conecta | 45 s → painel com "Tentar de novo"; o paciente pode chamar outro psicólogo (o servidor aceita depois de 30 s sem mídia do lado dele) e o psicólogo pode encerrar por falha de conexão (`connection_failure`); nos dois casos a cota é devolvida |
| "Conectou" | Só quando os dois lados confirmam áudio/vídeo passando (`connected_at`); a resposta à oferta sozinha não conta mais |
| Limite de tempo pelo servidor | Pelo cronômetro da sala, que pausa nas quedas (antes era pelo relógio desde o início e cortava chamadas com tempo sobrando). Teto absoluto: limite + 30 min |
| Encerrado sem a chamada conectar os dois lados | Cota devolvida, qualquer que seja o motivo do fim (ex.: paciente cancelou depois do aceite); não entra no repasse do psicólogo (ficha 09) |
| Limite de pedidos | 5 a cada 10 min por paciente |
| Quem vê a fila | Só psicólogo aprovado, não bloqueado e online (vale também para a lista da edge function, com nome e sintomas) |
| SOS ao mesmo tempo | Um aberto por paciente e um por psicólogo |
| Sair da fila antes do aceite | Cancela o pedido (ao fechar a aba, via `emergency-cleanup`, só com o login do próprio paciente) |
| Sala de SOS encerrado | Não reabre |

Status do pedido: `pending` → `accepted` → `in_progress` → `completed`, ou `cancelled`. O motivo fica em `end_reason` (`expired`, `abandoned`, `psychologist_unavailable`, `connection_failure`, `cancelled_by_patient` etc.). Pedidos nunca são apagados.

## Onde está no código

- **Telas**: `src/pages/SOS.tsx`, `src/pages/EmergencyCall.tsx`, `src/components/EmergencyVideoCall.tsx`, `src/pages/PsychologistDashboard.tsx`.
- **Componentes SOS**: `src/components/sos/` (`SosBreathingDialog`, `SosSafetyPlanDialog`, `PatientContextPanel`, `FeedbackModal`, `PendingFeedbackGate`, `CallDiagnosticsPanel`).
- **Hooks**: `useEmergencySOS`, `useEmergencySession`, `usePsychologistEmergency`, `usePsychologistPresence`, `useSosPatientContext`, `useSosHistory`, `usePendingCallFeedback`.
- **Regras puras**: `src/lib/emergencyEndReasons.ts`, `callTermination.ts`, `endEmergencySession.ts`, `emergencyCallGuard.ts`, `sosQueueChannel.ts`, `sosTrace.ts`, `remoteAbsence.ts`.
- **Edge functions**: `emergency-sos`, `psychologist-emergency`, `emergency-cleanup`, `mark-sos-used`, `firebase-notifications`.
- **Banco**: `emergency_requests`, `webrtc_sessions`, `participant_presence`, `psychologist_presence`, `session_feedback`, `sos_trace_events`, `subscribers` (cota), `payout_items`.
- **Funções e gatilhos**: `can_use_sos`, `count_available_psychologists`, `psychologist_can_attend`, `guard_sos_concurrency`, `mark_sos_used_on_start`, `refund_sos_on_failed_call`, `sos_request_other_psychologist`, `get_sos_patient_context`, `get_sos_safety_plan`, `protect_emergency_request_columns`, `prevent_reopen_finished_call`.
- **Rotinas**: `finalize-stale-emergency-sessions` (a cada minuto), `prune-stale-psychologist-presence` (2 min), `sos-followups` (de hora em hora).

## Como validar

### Teste manual (dois aparelhos)
1. **Sem psicólogo online**: o paciente abre o SOS → "Nenhum psicólogo online agora" e o pedido continua na fila.
2. **Fluxo feliz**: o psicólogo fica Online → o paciente aperta SOS → o pedido aparece na hora (aviso em tempo real; a checagem a cada 10 s é só a garantia) → aceitar → os dois na sala, com vídeo → o psicólogo encerra (resolvida: sim) → o paciente avalia → os dois voltam para o início.
3. **Cota**: com o mesmo paciente, tentar um 2º SOS no mesmo mês → aviso de cota usada.
4. **Desistência**: o paciente aperta SOS e fecha o app antes do aceite → o pedido some da lista do psicólogo.
5. **Expiração**: deixar o pedido 10 min sem aceite → "Ninguém atendeu", com CVV em destaque.
6. **Psicólogo some**: com a chamada ativa, fechar o app do psicólogo → depois de 90 s, o paciente vê "Chamar outro psicólogo" → tocar → volta à fila. O psicólogo, ao voltar, vê "Atendimento encaminhado".
7. **Queda de rede**: ver ficha 03.
8. **Respirar e Meu plano na fila**: abrir os dois → o pedido continua na fila.

### Testes automáticos
`emergencySosFlow.e2e`, `emergencySosLifecycle.e2e`, `emergencyNetworkDrop`, `emergencyNetworkRecovery.e2e`, `emergencyRefreshRejoin.e2e`, `emergencyServerTimeout.e2e`, `emergencyCallTermination`, `emergencyExplicitTermination`, `emergencyCancellation`, `emergencySessionOutcome`, `endEmergencySession`, `patientFeedbackFlow`, `sosHistory`, `sosTrace`, `remoteAbsence`, `callPresenceBanner`. No GitHub: `.github/workflows/sos-e2e.yml` e `e2e/sos.smoke.spec.ts`. Roteiro manual detalhado: `docs/sos-manual-test-checklist.md`.

### Conferência no banco
```sql
-- Últimos pedidos e como terminaram
select id, status, end_reason, ended_by_type, created_at, accepted_at, started_at, ended_at
from emergency_requests order by created_at desc limit 20;

-- Linha do tempo de um pedido
select created_at, event_type, actor_type, message
from sos_trace_events where emergency_request_id = '<id>' order by created_at;

-- Psicólogos online agora (o que o paciente vê)
select public.count_available_psychologists();

-- Cota de SOS de um paciente
select sos_used_this_month, sos_last_used, subscription_tier
from subscribers where user_id = '<id do paciente>';
```

## Pendências

- **TURN não configurado** (pendência 5): sem ele, parte das chamadas não conecta em 4G e em redes de empresa. O app funciona, só sem o retransmissor.
- **Push**: depende da configuração do Firebase (pendência 3). Sem ele, o psicólogo só vê o pedido com o painel aberto.
- **SOS de antes de 2026-10-04 sem repasse**: decisão de pagamento pendente (pendência 4).
- **Sugestões de produto** (não são defeitos): SOS por texto, triagem de risco e plano pós-crise (pendências 8 a 10).

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Paciente vê "0 disponíveis" com psicólogo online | Psicólogo não aprovado, bloqueado ou sem presença recente (mais de 7 min) | `select * from psychologist_presence`; `psychologist_can_attend('<id>')` |
| Pedido não aparece para o psicólogo | Psicólogo offline ou pedido já expirado | Status do pedido; o painel consulta a cada 10 s mesmo sem tempo real |
| "Você já usou o SOS deste mês" sem ter usado | Cota marcada e não devolvida | `subscribers.sos_used_this_month`; a cota volta em `abandoned`/`psychologist_unavailable` e em SOS concluído sem conexão (`webrtc_sessions.connected_at` vazio) |
| Chamada não conecta (fica em "Conectando") | Rede bloqueia conexão direta, sem TURN | Ficha 03; painel de diagnóstico (`?debug=1`) |
| Avaliação pede de novo a cada abertura | Avaliação não gravada | `session_feedback` do `session_id` |
