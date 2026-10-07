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
4. **Conexão**: o psicólogo cria a oferta e o paciente responde (a resposta leva a marca da oferta respondida, `forOffer`; resposta para uma oferta antiga é ignorada). Os candidatos de rede de cada lado são somados no banco numa operação só (`append_webrtc_ice_candidates`), sem um lado apagar os do outro. A sinalização chega pelo realtime e, como garantia, cada lado relê a sala a cada 3 s enquanto não está conectado (6 s quando está): evento ou gravação perdida se corrige sozinha.
5. **Prova de que a chamada aconteceu**: quando áudio/vídeo passa de verdade, cada lado avisa o banco (`report_call_media`). `webrtc_sessions.connected_at` só é preenchido quando **os dois** confirmam; antes bastava o paciente responder à oferta, mesmo sem a mídia nunca chegar. É o que decide se o SOS conta, se a consulta pode ser concluída e se entra no repasse. Enquanto a mídia passa, cada lado repete o aviso a cada 20 s e o banco soma o tempo com os dois conectados (`media_seconds`): a consulta agendada só conta a partir de 5 min.
6. **Canal de controle** (dentro da chamada): estado de câmera e microfone, nome e o aviso "encerrei a chamada", que chega na hora.
7. **Presença**: cada lado avisa "estou na sala" em tempo real (`useCallPresence`) e grava um batimento a cada 15 s em `participant_presence`, junto com se a mídia está passando (`media_connected`). O servidor usa isso para saber se a sala foi abandonada ou se a chamada não está conectando.
8. **Qualidade (como o Meet)**: voz com prioridade sobre o vídeo, teto de 1,5 Mbps no vídeo e, se a rede piorar (atraso alto ou perda de pacotes por alguns segundos), o vídeo reduz a resolução para o áudio continuar limpo; volta ao normal quando a rede melhora.

## Quedas e fluxos alternativos

| Situação | O que acontece |
|---|---|
| Minha internet cai | Faixa "Sem conexão com a internet"; a chamada volta sozinha quando a rede volta |
| Conexão instável | Faixa "Tentando reconectar (tentativa N)". O psicólogo reinicia o caminho de rede (ICE restart) nas 2 primeiras tentativas e, se não voltar, recria a conexão inteira; o paciente, a partir da 2ª, pede ao psicólogo uma conexão nova pelo banco. As tentativas nunca param |
| Os dois na sala, mas áudio/vídeo não passa por 45 s | Painel "A chamada não está conectando". Na consulta: "Tentar de novo" para os dois e "Marcar como interrompida" para o psicólogo. No SOS — paciente: "Tentar de novo", "Chamar outro psicólogo" (sem gastar o SOS) e CVV. Psicólogo: "Tentar de novo" e "Encerrar por falha de conexão" (o SOS volta para o paciente) |
| O outro lado caiu | Faixa "O outro participante perdeu a conexão. A chamada não foi encerrada" |
| O outro lado sumiu por muito tempo | SOS (90 s): paciente pode chamar outro psicólogo. Consulta (2 min após o horário): botão "Avisar" (push) |
| Recarreguei ou fechei o app | Volto para a mesma sala; nada é encerrado. O outro lado percebe a conexão nova (pelo id da oferta/resposta) e recria a sua sozinho |
| Sala não abriu (consulta) | Tela com o motivo, "Tentar de novo" e "Voltar" |
| Atendimento já encerrado | A sala não reabre; aparece como encerrado |
| Abri em duas abas | A segunda é bloqueada (`callLock`) |

O **cronômetro** é compartilhado e pausa quando alguém sai. No SOS, ao zerar, a chamada termina. Na consulta, ao zerar, só avisa.

## Onde está no código

- **Motor**: `src/hooks/useWebRTC.ts` (sessão, oferta/resposta, reconexão, qualidade, encerramento), `src/lib/callNegotiation.ts` (regras puras: conexão nova do outro lado, resposta da oferta certa, passos da reconexão), `src/hooks/useMediaDeviceManager.ts` (câmera, microfone, fallback só áudio). O antigo gerenciador global de conexões (`webrtc-manager`) foi removido: a cada 30 s ele fechava qualquer conexão "desconectada" e desligava câmera e microfone, e uma queda curta virava chamada morta.
- **Telas**: `src/components/EmergencyVideoCall.tsx` (SOS), `src/components/appointments/ConsultationVideoCall.tsx` (consulta), `src/pages/ConsultationCall.tsx`.
- **Apoio**: `useCallPresence`, `useParticipantHeartbeat`, `useSharedCallTimer`, `useRemoteAbsence`; em `src/lib`: `callBanner`, `reconnect`, `callSignals`, `callLock`, `callTermination`, `iceServers`, `remoteAbsence`, `consultationWindow`.
- **Painéis**: `src/components/calls/RemoteAbsentPanel.tsx`, `src/components/sos/ConnectionQuality.tsx`, `CallDiagnosticsPanel.tsx`.
- **Edge function**: `ice-servers` (TURN só para usuário logado).
- **Banco**: `webrtc_sessions` (`patient_media_at`, `psychologist_media_at`, `connected_at`, `renegotiate_requested_at`), `participant_presence` (`media_connected`, `media_changed_at`). Funções `report_call_media`, `append_webrtc_ice_candidates`. Gatilhos `prevent_reopen_finished_call` e `a_guard_webrtc_client_update` (pelo app: só o paciente grava a resposta, só o psicólogo mexe no cronômetro e não consegue aumentá-lo, ninguém troca o outro participante, o SOS ligado à sala ou quem encerrou). As salas são criadas só pelo servidor.

## Como validar

### Teste manual
1. **Vídeo e áudio**: os dois lados se veem e se ouvem; mutar e desligar a câmera aparece do outro lado.
2. **Sem câmera**: negar a câmera no navegador → entra só com áudio, com o aviso "Câmera indisponível".
3. **Queda curta**: desligar o Wi-Fi de um lado por 20 s → faixa de reconexão → volta sozinha.
4. **Recarregar**: dar F5 no meio da chamada → volta para a mesma sala e o cronômetro continua de onde parou.
5. **Rede difícil** (só com TURN configurado): um lado no 4G e outro em rede de empresa → conecta.
6. **Diagnóstico**: abrir com `?debug=1` → painel com estado da conexão, presença e cronômetro.

### Teste no navegador (duas abas)
Roteiro usado na varredura, com câmera falsa do Chromium e banco simulado: conectar; paciente recarregar; psicólogo recarregar; cada um fechar a aba e voltar; "Tentar de novo" de cada lado; conexão de cada lado morrer sem recarregar; realtime parado (só a releitura); resposta antiga gravada por atraso; três quedas seguidas. Todos voltaram sozinhos em 0,5 a 8 s.

### Testes automáticos
`callNegotiation`, `iceServers`, `remoteAbsence`, `callMediaStateSignal`, `callPresenceBanner`, `callDiagnostics`, `webrtcSessionReuse.e2e`, `consultationVideoCallSession`, `consultationWindow`, `consultationCallRouteAccess`, `emergencyNetworkDrop`, `emergencyNetworkRecovery.e2e`, `emergencyRefreshRejoin.e2e`.

### Conferência no banco
```sql
-- Estado de uma sala: cada lado confirmou mídia? conectou (os dois)? quem encerrou?
select id, status, patient_media_at, psychologist_media_at, connected_at, ended_by_type, end_reason, created_at, ended_at
from webrtc_sessions where id = '<id da sala>';

-- Presença e mídia de cada lado agora
select user_type, last_seen, media_connected, media_changed_at from participant_presence where session_id = '<id da sala>';
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
