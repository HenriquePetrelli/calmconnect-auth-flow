# SOS — estado atual e próximos passos

Atualização do plano do fluxo de chamada emergencial, refletindo tudo que já foi entregue desde o plano anterior (que tratava apenas de cancelamento e limpeza de estados).

## O que já está entregue

- **Máquina de estados** explícita: `pending → accepted → in_progress → completed`, com `cancelled` (paciente, abandono ou expiração). Estados legados `waiting`/`rejected` removidos.
- **Aceite atômico** no backend, sem corrida entre psicólogos, e deduplicação de solicitações abertas por paciente.
- **Encerramento único** via `endEmergencySession` (sinal CALL_ENDED pelo data channel, persistência, trace e liberação de câmera/microfone), idempotente dos dois lados.
- **Gerenciador de sessão** (`useEmergencySession`) separando resolução de sala, trava de chamada única e ciclo de vida da UI.
- **Presença persistida** (`participant_presence`) com heartbeat de 15s e banner de conexão instável.
- **Timer compartilhado** persistido, que pausa em queda e retoma no mesmo ponto após reconexão/refresh.
- **Encerramento server-side** por `pg_cron`: pendência sem aceite, limite de duração e abandono por heartbeat.
- **Reconexão automática** com backoff e `iceRestart` conduzido pelo psicólogo, sem duplicar peers.
- **Auditoria** com `trace_id` por sessão e eventos persistidos em `sos_trace_events`.
- **Modo diagnóstico** na tela de chamada (`?debug=1` ou Ctrl/Cmd+Shift+D) com estado de WebRTC, mídia, presença, timers e eventos, além de cópia do snapshot.
- **RLS endurecida** nas tabelas de SOS e feedback idempotente por sessão.
- **Testes**: 139 testes automatizados + smoke Playwright (Chromium e WebKit) rodando no CI, e checklist de teste manual em `docs/sos-manual-test-checklist.md`.

## Próximos passos propostos

1. **Painel de contexto do paciente na chamada** — durante o atendimento, o psicólogo vê um resumo lateral (humor recente, sintomas, últimas anotações, histórico de SOS) para triagem rápida.
2. **Histórico de SOS para o paciente e para o admin** — listagem das solicitações passadas com status, duração, quem encerrou e motivo, reaproveitando os campos já gravados.
3. **Métricas operacionais de SOS** — tempo médio até o aceite, taxa de solicitações não atendidas, duração média e distribuição de motivos de encerramento, para acompanhar a operação.
4. **Alerta de fila sem psicólogo online** — quando não há profissional disponível, avisar o paciente de forma clara e oferecer alternativas (respiração guiada, canais de emergência) em vez de esperar indefinidamente.
5. **Execução do checklist manual** — rodada em Chrome/Edge/Safari e Android/iOS, com correção dos desvios encontrados.

## Detalhes técnicos

- Painel de contexto: novo componente em `src/components/sos/` alimentado por um hook de leitura agregada, exibido apenas para `userType === 'psychologist'` dentro de `EmergencyVideoCall`, com políticas de leitura restritas ao psicólogo da chamada em andamento.
- Histórico e métricas: consultas sobre `emergency_requests` (`status`, `ended_at`, `end_reason`, `ended_by_type`) e `webrtc_sessions`, sem novas colunas; agregações em view ou função no banco para evitar cálculo pesado no cliente.
- Alerta de fila: usa a contagem de `psychologist_presence` já assinada em tempo real por `SOS.tsx`.
- Cada item novo entra com testes no padrão atual em `src/test/`.

Diga quais desses itens quer priorizar (ou se prefere outra ordem) e eu sigo por eles.
