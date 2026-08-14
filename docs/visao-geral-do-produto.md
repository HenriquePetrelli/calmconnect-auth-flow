# Soliv — Visão Geral do Produto

Documento vivo. Descreve funcionalidades e regras de negócio da plataforma. Deve ser atualizado sempre que uma mudança alterar comportamento, fluxo ou regra.

Última atualização: 2026-08-10

---

## 1. Visão geral e stack

Soliv é uma plataforma de saúde mental que conecta pacientes a psicólogos por meio de consultas agendadas, atendimento emergencial (SOS) por vídeo, chat e ferramentas de autocuidado.

- Frontend: React 18 + Vite + TypeScript + Tailwind (design tokens Light/Dark, laranja #F97316 e roxo #7C3AED, raio 14px)
- Backend: Supabase (Postgres com RLS, Realtime, Edge Functions, pg_cron)
- Pagamentos: Stripe (checkout, portal do cliente, verificação de assinatura)
- Comunicação em tempo real: WebRTC (vídeo/áudio + data channel de controle) e Supabase Realtime para sinalização e presença

---

## 2. Perfis e acesso

| Perfil | Como entra | Área principal |
|---|---|---|
| Paciente | Cadastro público (`/patient-signup`) | `/home` |
| Psicólogo | Cadastro público (`/psychologist-signup`), sujeito a aprovação | `/psychologist-dashboard` |
| Admin | Conta criada administrativamente | `/admin-dashboard` |

Regras:
- Psicólogo só atende após aprovação do admin; CRP é único por profissional.
- Cadastros de psicólogo rejeitados são limpos por rotina automática.
- Admin pode bloquear usuários por período determinado, editar dados cadastrais e excluir contas (paciente e psicólogo) via Edge Functions dedicadas.
- Papéis vivem em tabela própria com função `security definer`; nunca no perfil do usuário.
- Ao deslogar, o tema volta sempre para light mode.

---

## 3. Fluxo SOS (atendimento emergencial)

### 3.1 Abertura do chamado
- Paciente inicia em `/sos`; é criado um registro em `emergency_requests` com status `pending`.
- A fila só é exibida para psicólogos com presença online (`psychologist_presence`); psicólogo offline vê aviso com botão para ficar online.
- O contador de profissionais online atualiza em tempo real (realtime de presença + canal broadcast `sos-queue` + polling de 8s). Bloqueios temporários já vencidos não reduzem a disponibilidade.
- A lista de emergências do psicólogo também atualiza em tempo real via `sos-queue` e polling de 10s, garantindo que chamados cancelados sumam mesmo quando o RLS impede o evento do banco.
- Se o paciente sair ou fechar a tela do SOS sem aceite, a solicitação é cancelada automaticamente (`emergency-cleanup` via beacon) e a fila do psicólogo é atualizada.
- O consumo de SOS respeita o limite do plano do paciente (ver seção 5).


### 3.2 Aceite
- Aceite é atômico: apenas um psicólogo consegue assumir o chamado; concorrentes recebem falha controlada.
- Após aceite, ambos são direcionados à sala (`/emergency-call/...`).

### 3.3 Chamada
- WebRTC peer-to-peer com sinalização persistida em `webrtc_sessions` (constraint de unicidade por sessão; `expires_at` renovado ao reentrar, evitando `SESSION_EXPIRED`).
- Data channel de controle transporta:
  - `MEDIA_STATE` (câmera/microfone/nome) com número de sequência monotônico e semântica last-write-wins;
  - `MEDIA_STATE_REQUEST` para re-sincronizar após recuperação;
  - `CALL_ENDED` para encerramento instantâneo dos dois lados.
- Indicador visual quando o estado de mídia remoto está desatualizado, com re-sincronização automática.
- Reconexão automática com backoff exponencial e `iceRestart` (liderado pelo psicólogo), com polling de sinalização como fallback.
- Banner de "conexão instável" / "tentando reconectar"; queda involuntária não encerra a sessão.
- Heartbeat de presença a cada 15s em `participant_presence`.
- Bloqueio de chamadas duplicadas por usuário/sala (heartbeat em localStorage + BroadcastChannel).
- Banner de "chamada em andamento" permite retornar caso o usuário saia sem querer.
- Timer compartilhado persistido: pausa quando alguém cai e retoma exatamente do mesmo ponto.
- Painel de diagnóstico (`?debug=1`) com estado de WebRTC, presença, timers e encerramento, com exportação de snapshot.

### 3.4 Encerramento
- Encerramento explícito exige confirmação; registra `ended_by`, `ended_by_type` e `end_reason` (vocabulário canônico).
- Psicólogo tem fluxo de saída em duas etapas, com `crisis_resolved` e `end_notes`.
- Fechar o app ou dar refresh não encerra a sessão — apenas ação explícita ou timeout server-side.
- Feedback do paciente é idempotente (índice único em `session_feedback`); ao enviar, a sessão finaliza para ambos.

### 3.5 Timeouts server-side (pg_cron, `finalize_stale_emergency_sessions`, execução a cada minuto)

| Situação | Limite |
|---|---|
| Chamado sem aceite | 10 minutos → `expired` |
| Duração máxima da chamada | 20 minutos |
| Inatividade de heartbeat | 10 minutos → `abandoned` |

Encerramentos por sistema são idempotentes e propagados aos dois lados.

### 3.6 Auditoria
- `sos_trace_events` registra o ciclo de vida por `trace_id` (aceite, join, sinais, encerramentos), instrumentado também nas Edge Functions.
- Histórico de SOS disponível para paciente e métricas operacionais no painel admin.
- Painel de contexto do paciente disponível ao psicólogo durante o atendimento.

Status possíveis do chamado: `pending`, `accepted`, `in_progress`, `completed`, `cancelled`, `abandoned`, `expired`. Registros nunca são deletados — apenas mudam de status.

---

## 4. Consultas agendadas

- Paciente agenda a partir da disponibilidade semanal cadastrada pelo psicólogo.
- Psicólogo pode aceitar, recusar ou propor novo horário (reagendamento com date picker).
- Pedidos pendentes expiram automaticamente em 24h (rotina `auto-decline-appointments`).
- Cada psicólogo enxerga somente as próprias consultas.
- "Consultas de hoje" mostra apenas consultas aceitas e ainda válidas; consultas já passadas saem da lista e vão para o histórico.
- Consultas do mesmo dia não se duplicam entre "hoje" e "próximas".
- Entrada na chamada liberada apenas na janela do horário marcado (50 minutos).
- Histórico com paginação e status traduzidos para português.

---

## 5. Modelo de negócio

- Planos pagos (Plus / Premium) via Stripe Checkout; portal do cliente para gestão e cancelamento.
- O plano define o limite de uso de SOS (contabilizado no banco a cada atendimento consumido).
- Bloqueios esperados do SOS (sem assinatura, sem cota ou conta bloqueada) são exibidos como aviso de negócio e não interrompem o app com erro de execução.
- `check-subscription` sincroniza o estado da assinatura com o app.
- Repasses aos psicólogos: admin acompanha atendimentos realizados e o sistema processa o fechamento semanal (segundas, 9h).
- Psicólogo acompanha os próprios ganhos em `/psychologist-payments`.

---

## 6. Funcionalidades clínicas e engajamento (paciente)

- Registro diário de humor e acompanhamento em "Meu progresso" / estatísticas (layout bento, exportação CSV e PDF).
- Metas semanais com reset automático toda segunda-feira (cron semanal).
- Diário privado.
- Conquistas e gamificação.
- Respiração guiada com animação em canvas e transições por fase.
- Biblioteca de sons terapêuticos com player, categorias, playlists e feedback.
- Grupos de apoio com depoimentos moderados.
- Chat com o psicólogo, com retenção limitada: bloqueio de escrita após 1 mês e exclusão após 3 meses.
- Notificações in-app com contador de não lidas sincronizado.
- Histórico de atividades paginado, retido por 3 meses.

Navegação do paciente: menus lateral e inferior persistem entre Home, Chat, Consultas, Meu progresso, Notificações e Perfil (sem recarregar); subpáginas usam `PageHeader` padronizado em cor secundária.

---

## 7. Administração e manutenção

- Painel admin: aprovação de psicólogos, gestão de pacientes, métricas gerais e métricas de SOS.
- Edição, bloqueio e exclusão de usuários via Edge Functions com validação server-side.
- Rotinas automáticas:

| Rotina | Frequência |
|---|---|
| Finalização de sessões SOS travadas | a cada minuto |
| Limpeza de cadastros de psicólogos rejeitados | diária (03h) |
| Fechamento/pagamentos semanais | segundas, 09h |
| Reset de metas semanais | segundas (madrugada) |
| Limpeza de atividades trimestrais | semanal |

---

## 8. Qualidade e testes

- Suíte Vitest cobrindo o ciclo de vida do SOS: aceite atômico, join, refresh/rejoin, perda e restauração de rede, encerramento explícito vs. fechamento do app, timeout server-side, sinais de mídia e trace.
- Testes Playwright de smoke rodando em CI (Chrome e WebKit) via GitHub Actions.
- Checklist de testes manuais multiplataforma em `docs/sos-manual-test-checklist.md`.

---

## Histórico de atualizações

- 2026-08-10 — Criação do documento consolidando todo o produto (perfis, SOS, consultas, assinaturas, engajamento, administração e testes).
