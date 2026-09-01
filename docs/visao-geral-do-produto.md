# Soliv — Visão Geral do Produto

Documento vivo. Descreve funcionalidades e regras de negócio da plataforma. Deve ser atualizado sempre que uma mudança alterar comportamento, fluxo ou regra.

Última atualização: 2026-08-31

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
- Feedback do paciente é idempotente (índice único `session_feedback (session_id, user_id)`); ao enviar, a sessão finaliza para ambos.
- Avaliação do paciente é um fluxo progressivo: (1) resultado do atendimento (`resolution_status`: resolved / partially_resolved / not_resolved), (2) nota obrigatória de 1 a 5 e percepção de acolhimento (`felt_heard`: yes / partially / no), (3) apenas se parcial ou não resolvido, categorias do que aconteceu (`complaint_categories`), (4) apenas em queixas de conduta, relato livre (`complaint_description`).
- Resultado clínico e qualidade do atendimento são métricas separadas: não resolver a crise não configura queixa contra o psicólogo.
- Queixas de conduta (desrespeito, pouco acolhimento, atendimento não acolhedor, encerramento precoce) marcam `requires_admin_review = true` para análise administrativa, sem penalizar automaticamente o psicólogo.
- Relatos e queixas são visíveis apenas ao próprio paciente e a administradores (RLS); o psicólogo não recebe o texto confidencial.

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

- Psicólogo cadastra sua agenda semanal (horário-padrão, recorrente) em "Minha agenda" (`/psychologist-availability`): dias da semana em que atende, com um ou mais blocos de horário por dia (ex.: manhã e tarde separadas). Sem nenhum bloco configurado, o psicólogo não aparece com horários disponíveis para nenhum paciente.
- Confirmação semanal: ao entrar no painel, o psicólogo vê uma vez por semana (e pode reabrir a qualquer momento pelo ícone no cabeçalho) uma modal com o horário efetivo dos próximos 7 dias. Nela, sem mexer no padrão, dá pra bloquear um horário pontual (ex.: uma consulta particular numa terça) ou abrir um horário extra fora do padrão (ex.: atender num sábado que normalmente não atende) — exceções por data, aplicadas só naquela semana.
- Paciente só vê e consegue marcar horários dentro do horário efetivo do psicólogo (padrão semanal já combinado com bloqueios/aberturas daquela data), respeitando a duração da consulta (50 min); o calendário desabilita dias sem atendimento; horários que colidem com outra consulta já marcada continuam bloqueados.
- Psicólogo pode aceitar, recusar ou propor novo horário (reagendamento com date picker).
- Pedidos pendentes expiram automaticamente em 24h (rotina `auto-decline-appointments`).
- Cada psicólogo enxerga somente as próprias consultas.
- "Consultas de hoje" mostra apenas consultas aceitas e ainda válidas; consultas já passadas saem da lista e vão para o histórico.
- Consultas do mesmo dia não se duplicam entre "hoje" e "próximas".
- Entrada na chamada liberada apenas na janela do horário marcado (50 minutos).
- Ao entrar na chamada (paciente ou psicólogo), a consulta muda para `in_progress` antes de navegar para a sala.
- Chamada de vídeo da consulta usa uma sessão WebRTC (`webrtc_sessions`) compartilhada por agendamento (`appointments.video_room_id`, criada/reaproveitada via `get_or_create_appointment_webrtc_session`), para que as duas pontas caiam na mesma sala; papel (paciente/psicólogo) é o do usuário logado, não fixo.
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
- Chat com o psicólogo, com retenção limitada: bloqueio de escrita após 1 mês e exclusão após 3 meses; indicador de entrega/leitura (check simples/duplo) nas mensagens próprias; notificação do navegador quando chega mensagem nova com a aba em segundo plano (sem depender de push externo).
- Notificações in-app com contador de não lidas sincronizado.
- Histórico de atividades paginado, retido por 3 meses.

Navegação do paciente: menus lateral e inferior persistem entre Home, Chat, Consultas, Meu progresso, Notificações e Perfil (sem recarregar); subpáginas usam `PageHeader` padronizado em cor secundária.

---

## 7. Administração e manutenção

- Painel admin: aprovação de psicólogos, gestão de pacientes, métricas gerais, métricas de SOS e uso/moderação do chat.
- Moderação de chat: admin vê métricas agregadas e metadados das conversas (participantes, status, contagem de mensagens, última atividade) e pode arquivar uma conversa flagrada por outro canal; o conteúdo das mensagens nunca é exposto ao admin.
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
- 2026-08-15 — Novo fluxo estruturado de avaliação do paciente no SOS (resultado, nota, acolhimento, categorias de queixa e sinalização de revisão administrativa).
- 2026-08-31 — Painel admin de métricas de SOS passa a exibir também taxa de aceite, taxa de resolução de crise, avaliação média e total de solicitações concluídas (já calculados por `get_sos_metrics`, mas não exibidos até então).
- 2026-08-31 — Novo painel admin de uso e moderação do chat (aba "Chat"): métricas agregadas, listagem de conversas com metadados (sem conteúdo de mensagens) e ação de arquivar conversa flagrada.
- 2026-08-31 — Chat paciente-psicólogo passa a ter indicador de entrega/leitura (check simples/duplo), com marcação automática ao abrir a conversa.
- 2026-08-31 — Chat passa a notificar via navegador (Web Notifications API, sem push externo) quando chega mensagem nova com a aba em segundo plano.
- 2026-08-31 — Corrigido: psicólogo clicando em "Entrar na chamada" (painel de consultas) agora também transiciona a consulta para `in_progress` antes de navegar para a sala, igual ao fluxo do paciente (antes só o paciente disparava essa transição).
- 2026-08-31 — Corrigido bug estrutural na chamada de vídeo de consultas agendadas: (1) a rota `/consultation-call/:id` bloqueava psicólogos completamente (RouteGuard só permitia `patient`); (2) mesmo paciente e psicólogo acessando, cada um criava sua própria sessão WebRTC desconectada — não existia elo entre a consulta e uma sessão compartilhada. Agora ambos os papéis acessam a rota e reaproveitam a mesma sessão via `appointments.video_room_id` / `get_or_create_appointment_webrtc_session`, e os campos antes fixos como `'patient'` (mute, câmera, quem encerrou, avaliação) refletem o papel real de quem está na chamada. Validado com Postgres local (paciente e psicólogo convergindo na mesma sessão; terceiro usuário bloqueado).
- 2026-08-31 — Corrigido `get_admin_conversas_overview` (aba "Chat" do admin): erro `column reference "created_at" is ambiguous` (42702) causado por nomes de coluna do `RETURNS TABLE` colidindo com colunas de `mensagens` dentro de uma subquery LATERAL sem alias. Corrigido qualificando todas as referências; validado contra Postgres local antes de reaplicar.
- 2026-08-31 — Implementada a agenda semanal do psicólogo (`/psychologist-availability`), que até então era só um schema de banco órfão (`psychologist_availability` existia desde jul/2025 com RLS correta, mas nenhuma UI ou consulta real de agendamento usava a tabela — o agendamento do paciente aceitava qualquer horário entre 7h e 23h50, todo dia, para qualquer psicólogo). Psicólogo define blocos de horário por dia da semana em "Minha agenda"; `useAvailableTimeSlots` e `AppointmentForm` passam a consultar a tabela de verdade, desabilitando dias sem atendimento e horários fora dos blocos configurados. Escrita via RPC `set_psychologist_availability` (substituição atômica, validada contra Postgres local).
- 2026-08-31 — Adicionadas exceções pontuais à agenda semanal (`psychologist_availability_overrides`): psicólogo pode bloquear um horário específico ou abrir um horário extra numa data, sem alterar o padrão recorrente. Nova modal de confirmação semanal no painel do psicólogo (`WeeklyScheduleModal`, uma vez por semana ou sob demanda pelo ícone no cabeçalho) mostra o horário efetivo dos próximos 7 dias e permite editar direto ali. `useAvailableTimeSlots` combina padrão + exceções (`applyOverridesToDayBlocks`, testado exaustivamente) para o que o paciente efetivamente vê.
