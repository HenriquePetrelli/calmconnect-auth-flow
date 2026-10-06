# 03. Chamada de vídeo (SOS e consulta)

> **Status:** Pronto, com pendência externa (TURN).
> **Última verificação:** 2026-10-04.
> **Quem usa:** paciente e psicólogo, no SOS (ficha 02) e na consulta agendada (ficha 04).

## Resumo

A chamada é de navegador para navegador (WebRTC). O Supabase só faz a "apresentação" entre os dois (sinalização) e guarda o estado da sala. O mesmo motor (`useWebRTC`) serve o SOS e a consulta.

## Como funciona

1. **Sala**: cada atendimento tem uma linha em `webrtc_sessions`.
   - No SOS, ela é criada no aceite (ligada por `emergency_request_id`).
   - Na consulta, é criada ou reaproveitada por `get_or_create_appointment_webrtc_session` (`appointments.video_room_id`). Só abre de 10 min antes até 15 min depois do fim previsto.
2. **Câmera e microfone**: o app pede permissão. Sem câmera (negada, ausente ou ocupada), **entra só com áudio** e avisa. Sem microfone, mostra o erro com "Tentar de novo".
3. **Servidores de conexão**: antes de conectar, o app busca STUN e, se configurado, **TURN** na edge function `ice-servers`. Se ela falhar ou demorar mais de 4 s, segue só com STUN.
4. **Conexão**: o psicólogo cria a oferta e o paciente responde. Quando os dois se conectam, `webrtc_sessions.answer` fica preenchido. Esse campo é a prova de que a chamada aconteceu e é usado para concluir a consulta e para o repasse. Por isso só o paciente consegue gravá-lo (o psicólogo não consegue marcar sozinho uma chamada como conectada).
5. **Canal de controle** (dentro da chamada): estado de câmera e microfone, nome e o aviso "encerrei a chamada", que chega na hora.
6. **Presença**: cada lado avisa "estou na sala" em tempo real (`useCallPresence`) e grava um batimento a cada 15 s em `participant_presence`. O servidor usa esse batimento para saber se a sala foi abandonada.

## Quedas e fluxos alternativos

| Situação | O que acontece |
|---|---|
| Minha internet cai | Faixa "Sem conexão com a internet"; a chamada volta sozinha quando a rede volta |
| Conexão instável | Faixa "Tentando reconectar (tentativa N)", com novas tentativas automáticas e botão "Tentar reconectar" |
| O outro lado caiu | Faixa "O outro participante perdeu a conexão. A chamada não foi encerrada" |
| O outro lado sumiu por muito tempo | SOS (90 s): paciente pode chamar outro psicólogo. Consulta (2 min após o horário): botão "Avisar" (push) |
| Recarreguei ou fechei o app | Volto para a mesma sala; nada é encerrado |
| Sala não abriu (consulta) | Tela com o motivo, "Tentar de novo" e "Voltar" |
| Atendimento já encerrado | A sala não reabre; aparece como encerrado |
| Abri em duas abas | A segunda é bloqueada (`callLock`) |

O **cronômetro** é compartilhado e pausa quando alguém sai. No SOS, ao zerar, a chamada termina. Na consulta, ao zerar, só avisa.

## Onde está no código

- **Motor**: `src/hooks/useWebRTC.ts` (sessão, oferta/resposta, reconexão, encerramento), `src/hooks/useMediaDeviceManager.ts` (câmera, microfone, fallback só áudio).
- **Telas**: `src/components/EmergencyVideoCall.tsx` (SOS), `src/components/appointments/ConsultationVideoCall.tsx` (consulta), `src/pages/ConsultationCall.tsx`.
- **Apoio**: `useCallPresence`, `useParticipantHeartbeat`, `useSharedCallTimer`, `useRemoteAbsence`; em `src/lib`: `callBanner`, `reconnect`, `callSignals`, `callLock`, `callTermination`, `iceServers`, `remoteAbsence`, `consultationWindow`.
- **Painéis**: `src/components/calls/RemoteAbsentPanel.tsx`, `src/components/sos/ConnectionQuality.tsx`, `CallDiagnosticsPanel.tsx`.
- **Edge function**: `ice-servers` (TURN só para usuário logado).
- **Banco**: `webrtc_sessions`, `participant_presence`. Gatilhos `prevent_reopen_finished_call` e `a_guard_webrtc_client_update` (pelo app: só o paciente grava a resposta, só o psicólogo mexe no cronômetro e não consegue aumentá-lo, ninguém troca o outro participante, o SOS ligado à sala ou quem encerrou). As salas são criadas só pelo servidor.

## Como validar

### Teste manual
1. **Vídeo e áudio**: os dois lados se veem e se ouvem; mutar e desligar a câmera aparece do outro lado.
2. **Sem câmera**: negar a câmera no navegador → entra só com áudio, com o aviso "Câmera indisponível".
3. **Queda curta**: desligar o Wi-Fi de um lado por 20 s → faixa de reconexão → volta sozinha.
4. **Recarregar**: dar F5 no meio da chamada → volta para a mesma sala e o cronômetro continua de onde parou.
5. **Rede difícil** (só com TURN configurado): um lado no 4G e outro em rede de empresa → conecta.
6. **Diagnóstico**: abrir com `?debug=1` → painel com estado da conexão, presença e cronômetro.

### Testes automáticos
`iceServers`, `remoteAbsence`, `callMediaStateSignal`, `callPresenceBanner`, `callDiagnostics`, `webrtcSessionReuse.e2e`, `consultationVideoCallSession`, `consultationWindow`, `consultationCallRouteAccess`, `emergencyNetworkDrop`, `emergencyNetworkRecovery.e2e`, `emergencyRefreshRejoin.e2e`.

### Conferência no banco
```sql
-- Estado de uma sala: conectou? (answer preenchido) quem encerrou?
select id, status, (answer is not null) as conectou, ended_by_type, end_reason, created_at, ended_at
from webrtc_sessions where id = '<id da sala>';

-- Últimos sinais de presença na sala
select user_type, last_seen from participant_presence where session_id = '<id da sala>';
```

Para conferir se o TURN está ativo, a resposta de `ice-servers` traz `"turn": true`. Dá para ver na aba Rede do navegador, durante uma chamada.

## Pendências

- **TURN** (pendência 5): configurar `CLOUDFLARE_TURN_KEY_ID` e `CLOUDFLARE_TURN_API_TOKEN` (ou `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL`) nos secrets das edge functions. Sem isso, estima-se que de 10% a 20% das chamadas em redes restritivas não conectem.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Fica em "Conectando" para sempre | Rede bloqueia conexão direta e não há TURN | `?debug=1` (estado ICE `failed`); configurar TURN |
| "Permissão negada" | Navegador bloqueou o microfone | Cadeado na barra de endereço → permitir microfone |
| Vídeo preto do outro lado | Câmera desligada ou ocupada por outro app | Ícone de câmera desligada; fechar o outro app |
| "Não foi possível abrir a sala" (consulta) | Fora do horário ou consulta não confirmada | `appointments.status` e horário; janela de 10 min antes até 15 min depois do fim |
| A chamada encerrou sozinha | Tempo do SOS esgotado ou os dois sem sinal por 10 min | `emergency_requests.end_reason` (`time_limit`, `abandoned`) |
