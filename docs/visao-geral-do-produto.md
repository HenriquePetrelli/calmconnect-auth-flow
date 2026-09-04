# Soliv — Visão Geral do Produto

Documento vivo. Descreve funcionalidades e regras de negócio da plataforma. Deve ser atualizado sempre que uma mudança alterar comportamento, fluxo ou regra.

Última atualização: 2026-09-04

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

- Modelo (alinhado com Calendly/Cal.com/Acuity: nenhuma dessas ferramentas pede reconfirmação periódica — o padrão recorrente é raro de mudar, e exceções são pontuais, sob demanda): horário-padrão configurado explicitamente e só muda quando o psicólogo decide mudar; exceções por data nunca alteram o padrão.
- Primeiro acesso: se o psicólogo ainda não tem nenhum horário-padrão configurado, o painel abre a `FirstTimeAvailabilityModal` — escolhe dias e horários (vem com segunda a sexta 08h-18h pré-marcado como ponto de partida, ajustável), salva via `set_psychologist_availability` uma única vez. Pode reconfigurar quando quiser em "Minha agenda" (`/psychologist-availability`), dias da semana em que atende com um ou mais blocos de horário por dia (ex.: manhã e tarde separadas). Sem nenhum bloco configurado, o psicólogo não aparece com horários disponíveis para nenhum paciente.
- Confirmação semanal (`WeeklyScheduleModal`): aparece uma vez por semana (e pode ser reaberta a qualquer momento pelo ícone no cabeçalho), só depois que o horário-padrão já existe. Mostra o horário-padrão de cada um dos próximos 7 dias **em modo leitura** — essa modal nunca grava no horário-padrão recorrente, só em exceções por data (correção de um bug real: editar o range aqui chegou a ser salvo como padrão permanente, "vazando" pro mês inteiro). Em cada dia, "Personalizar horários" abre uma grade de meia em meia hora dentro do range do padrão, com os horários disponíveis em verde por padrão — clicar num horário disponível bloqueia os 30 minutos seguintes só nessa data (sai do verde); clicar de novo libera; horários com consulta já marcada aparecem travados. "Adicionar horário extra" cria uma abertura pontual fora do range, também só naquela data (efeito imediato). O botão "Confirmar horários livres da semana" só grava a diferença de bloqueios pontuais (`psychologist_availability_overrides`, em lote via `applyChanges`) — nunca chama a RPC do horário-padrão.
- Férias (`psychologist_vacations`): em "Minha agenda", o psicólogo escolhe um intervalo de datas (início–fim) em que fica totalmente indisponível. Isso não apaga nem altera o horário-padrão nem as exceções pontuais — só marca esse período como fora da agenda para os pacientes (`useAvailableTimeSlots` trata qualquer dia dentro do intervalo como sem horários). Enquanto há férias ativa (hoje dentro do intervalo), a confirmação semanal não é oferecida automaticamente e, se reaberta manualmente, mostra um aviso de férias com opção de encerrar antecipadamente, em vez dos dias da semana. Ao terminar (ou ser cancelada), a confirmação semanal volta a perguntar a disponibilidade normalmente, com o horário-padrão intacto.
- Paciente só vê e consegue marcar horários dentro do horário efetivo do psicólogo (padrão semanal já combinado com bloqueios/aberturas daquela data e excluindo dias de férias), respeitando a duração da consulta (50 min); o calendário desabilita dias sem atendimento; horários que colidem com outra consulta já marcada continuam bloqueados. Essa regra também é validada de novo no backend (`appointments` edge function) contra a agenda real do psicólogo, não só no client — antes a validação server-side era só um piso de 7h, sem checar dia da semana, exceções ou férias.
- Um paciente autenticado só consegue tentar criar até 10 agendamentos por hora (`check_rate_limit`) — limite generoso pra uso normal, só pra evitar flood no endpoint.
- Psicólogo pode aceitar, recusar ou propor novo horário (reagendamento com date picker). A proposta só oferece datas/horários que cabem na agenda real do psicólogo (padrão + exceções + férias, mesma regra do agendamento do paciente); o backend valida de novo antes de salvar. Se o paciente aceitar a proposta, o horário da consulta é atualizado para o novo horário combinado (`scheduled_at` passa a refletir o horário aceito, não o original).
- Pedidos pendentes expiram automaticamente em 24h (rotina `auto-decline-appointments`). Uma consulta Premium (que consome a cota mensal de 1x/mês — ver seção 5) recusada, com reagendamento recusado, ou que expira sem resposta, devolve a cota ao paciente automaticamente — a cota só fica de fato consumida quando a consulta é confirmada.
- Psicólogo recebe notificação in-app (`/psychologist-notifications`, sino no cabeçalho do painel com contador de não lidas) quando o paciente responde a uma proposta de reagendamento — antes só recebia e-mail.
- Cada psicólogo enxerga somente as próprias consultas.
- "Consultas de hoje" mostra apenas consultas aceitas e ainda válidas; consultas já passadas saem da lista e vão para o histórico.
- Consultas do mesmo dia não se duplicam entre "hoje" e "próximas".
- Entrada na chamada liberada apenas na janela do horário marcado (50 minutos).
- Ao entrar na chamada (paciente ou psicólogo), a consulta muda para `in_progress` antes de navegar para a sala.
- Chamada de vídeo da consulta usa uma sessão WebRTC (`webrtc_sessions`) compartilhada por agendamento (`appointments.video_room_id`, criada/reaproveitada via `get_or_create_appointment_webrtc_session`), para que as duas pontas caiam na mesma sala; papel (paciente/psicólogo) é o do usuário logado, não fixo.
- Histórico com paginação e status traduzidos para português.

---

## 5. Modelo de negócio

- Planos pagos (Plus R$69,90 / Premium) via Stripe Checkout; portal do cliente para gestão e cancelamento. Preço do Plus é o mesmo em todas as telas (perfil, planos, modal de downgrade) e no fallback de classificação por valor do Stripe.
- O plano define o limite de uso de SOS (contabilizado no banco a cada atendimento consumido) e, para Premium, uma cota mensal de consultas agendadas (`appointments_used_this_month`/`appointments_last_used`, mesma lógica de reset por mês corrido do SOS). A cota é aplicada tanto na UI (aviso antes de abrir o agendamento) quanto no backend (edge function `appointments` recusa o agendamento se o plano não for Premium ou a cota já tiver sido usada no mês — antes só a UI bloqueava, e a função aceitava qualquer chamada autenticada).
- Bloqueios esperados do SOS (sem assinatura, sem cota ou conta bloqueada) são exibidos como aviso de negócio e não interrompem o app com erro de execução.
- `check-subscription` sincroniza o estado da assinatura com o app.
- Repasses aos psicólogos: admin acompanha atendimentos realizados e o sistema processa o fechamento semanal (segundas, 9h).
- Psicólogo acompanha os próprios ganhos em `/psychologist-payments`.

---

## 6. Funcionalidades clínicas e engajamento (paciente)

- "Meu progresso" (`/statistics`, item "Progresso" da navegação): sequência de dias consecutivos, evolução do humor (gráfico dos últimos 30 dias a partir de `patient_mood_logs`, com média e tendência simples de alta/queda/estável), metas da semana com progresso real por meta (`GoalCard`, categoria/ícone/cor), visão geral de atividades (consultas agendadas com % de comparecimento, emergenciais, respiração, sons, anotações no diário privado, participações em grupos de apoio — `usePatientEngagementMetrics`, derivada das tabelas que essas funcionalidades já usam, sem tabela nova), atalhos para conquistas (com contagem real de desbloqueadas) e histórico completo, e lista de atividades recentes.
- Registro diário de humor pela tela inicial (`MoodAccordion`) grava tanto o agregado histórico (usado pra saber se já respondeu hoje) quanto uma entrada por dia em `patient_mood_logs` (usada pelo gráfico de evolução), e conta como atividade para a meta semanal da categoria "humor".
- Metas semanais com reset automático toda segunda-feira (cron semanal).
- Diário privado, limite de 2 anotações por dia calculado no fuso do paciente (America/Sao_Paulo), não em UTC — evita que uma anotação perto da meia-noite conte pro dia errado. Falha ao salvar (ex.: limite atingido) mantém a modal aberta com o texto digitado, em vez de descartá-lo.
- Conquistas e gamificação: títulos em português; além do par de conquistas por tempo de respiração guiada, há um par equivalente por tempo de sons terapêuticos ouvidos (`total_therapeutic_sound_time`), que antes não contava para nada.
- Respiração guiada com animação em canvas e transições por fase; cada técnica listada usa o padrão de tempo (inspirar/segurar/expirar/pausar) que suas próprias instruções prometem.
- Biblioteca de sons terapêuticos com player, categorias, playlists e feedback.
- Grupos de apoio: depoimento pode ser vinculado a um sintoma específico da lista do grupo (texto do sintoma escolhido é salvo, não só a referência ao grupo); moderação é manual pelo admin (ver seção 7) — depoimentos não são mais excluídos automaticamente. Nome do grupo é recuperado do banco se a tela for aberta direto ou recarregada (antes caía para o rótulo genérico "Grupo de Apoio").
- Chat com o psicólogo, com retenção limitada: bloqueio de escrita após 1 mês e exclusão após 3 meses; indicador de entrega/leitura (check simples/duplo) nas mensagens próprias; notificação do navegador quando chega mensagem nova com a aba em segundo plano (sem depender de push externo); nova mensagem e conquista desbloqueada também geram notificação in-app para o destinatário.
- Notificações in-app com contador de não lidas sincronizado; inserção restrita ao próprio usuário (RLS), com notificações que precisam avisar a outra parte (nova mensagem, conquista) geradas por trigger no banco.
- Notificações push (opcional, ativa em Perfil → Configurações): funciona mesmo com o app fechado, diferente do aviso do navegador que só dispara com uma aba aberta. Hoje só o SOS usa de verdade — paciente abre uma emergência, psicólogos online recebem push imediatamente. Depende de configuração externa (projeto Firebase); ver `docs/push-notifications-setup.md`.
- Histórico de atividades paginado, retido por 3 meses.

Navegação do paciente: menus lateral e inferior persistem entre Home, Chat, Consultas, Meu progresso, Notificações e Perfil (sem recarregar); subpáginas usam `PageHeader` padronizado em cor secundária.

---

## 7. Administração e manutenção

- Painel admin: aprovação de psicólogos, gestão de pacientes, métricas gerais, métricas de SOS, uso/moderação do chat, moderação de depoimentos de grupos de apoio e auditoria de ações administrativas.
- Moderação de chat: admin vê métricas agregadas e metadados das conversas (participantes, status, contagem de mensagens, última atividade) e pode arquivar uma conversa flagrada por outro canal; o conteúdo das mensagens nunca é exposto ao admin.
- Moderação de depoimentos de grupos de apoio (aba "Grupos"): lista todos os depoimentos com métricas de curtidas/não curtidas, destaca os que chegaram a 10 "não curtidas" como prioridade de revisão manual, e permite ao admin editar o texto ou excluir um depoimento diretamente. Substitui a exclusão automática que existia antes ao atingir 10 "não curtidas" — agora é sempre uma decisão manual do admin.
- Edição, bloqueio e exclusão de usuários via Edge Functions com validação server-side.
- Auditoria (aba "Auditoria"): todo bloqueio/desbloqueio, edição ou exclusão de conta feito por um admin fica registrado em `admin_audit_log` — quem fez, quando, em quem e detalhes (motivo/duração do bloqueio, campos editados). Só admin lê (RLS), só as próprias Edge Functions gravam (service role) — não dá pra editar ou apagar o histórico pela aplicação.
- Admin recebe notificação in-app quando um novo cadastro de psicólogo fica pendente de aprovação (sino no cabeçalho do painel, mesma central de notificações do psicólogo) — antes só descobria abrindo a aba "Psicólogos".
- Criação de conta de administrador não existe como fluxo do app (nem tela, nem endpoint) — é sempre manual, direto no painel do Supabase. Ver `docs/creating-an-admin-account.md`.
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
- 2026-08-31 — Redesenhada a `WeeklyScheduleModal` para usabilidade: em vez de listar horários soltos, cada dia agora tem um range único (início/fim) pré-preenchido do padrão salvo, e um botão "Personalizar horários" que abre uma grade de meia em meia hora dentro desse range — clicar num horário bloqueia os 30 min seguintes, com legenda explicando a interação; horários com consulta marcada aparecem travados. Bloqueios/desbloqueios da grade e mudanças no range de cada dia só são gravados ao clicar em "Confirmar horários livres da semana" (diff local vs. salvo, gravado em lote via `applyChanges`); "Adicionar horário extra" continua com efeito imediato. Reutiliza a mesma RPC e tabela de exceções já existentes — nenhuma migração nova. Validado com 11 testes de comportamento (`weeklyScheduleModal.test.tsx`) e 6 testes das funções puras da grade (`psychologistAvailabilityGrid.test.ts`).
- 2026-09-01 — Adicionada a gestão de férias do psicólogo: nova tabela `psychologist_vacations` (início/fim, RLS igual à de exceções pontuais) marca um intervalo de datas como totalmente indisponível sem tocar no horário-padrão nem nas exceções pontuais. `useAvailableTimeSlots` (agendamento do paciente) passa a excluir qualquer dia dentro de um período de férias. A confirmação semanal (`WeeklyScheduleModal`) não é oferecida automaticamente durante férias ativa e, se reaberta manualmente, mostra um aviso com opção de encerrar antecipadamente em vez dos dias da semana; ao terminar, volta a perguntar a disponibilidade normalmente. Gestão de férias (agendar/cancelar) fica em "Minha agenda". Também invertida a semântica de cor da grade de "Personalizar horários": horários disponíveis agora aparecem em verde por padrão, e bloquear tira o verde (antes era o oposto — bloqueado ficava destacado em vermelho). Validado com 6 testes do novo hook (`psychologistVacation.test.ts`), 1 teste novo de exclusão por férias em `availableTimeSlots.test.ts`, e o teste de estado de férias e cor da grade em `weeklyScheduleModal.test.tsx`.
- 2026-09-02 — Corrigido bug real reportado pelo psicólogo: bloqueios feitos em "Personalizar horários" (pensados como só daquela semana) apareciam "vazando" pro mês inteiro ao agendar com o paciente. Causa raiz: a `WeeklyScheduleModal` também editava o range/switch de cada dia e, ao confirmar, gravava isso como horário-padrão recorrente (`set_psychologist_availability`) — uma mudança permanente disfarçada de ação semanal. A grade de bloqueio pontual em si (`psychologist_availability_overrides`) sempre funcionou corretamente por data exata (confirmado com teste de regressão cruzando duas semanas diferentes antes da correção). Alinhado com o padrão usado por Calendly/Cal.com/Acuity (nenhuma dessas ferramentas reconfirma disponibilidade periodicamente — o recorrente é raro de mudar, exceções são pontuais e sob demanda), a `WeeklyScheduleModal` teve a edição de range/switch removida por completo: agora só mostra o horário-padrão em modo leitura e nunca chama a RPC do padrão — só grava exceções por data. Como consequência, o fluxo de "primeira configuração" (que antes vivia dentro da modal semanal) virou uma modal própria, `FirstTimeAvailabilityModal`, mostrada uma única vez quando o psicólogo ainda não tem nenhum horário-padrão salvo. Validado com testes reescritos de `weeklyScheduleModal.test.tsx` e novos testes de `firstTimeAvailabilityModal.test.tsx`.
- 2026-09-02 — Reformulado "Meu progresso" do paciente (`/statistics`) e corrigidos bugs reais na sua base:
  - **Metas semanais nunca progrediam de verdade**: `GoalSelectionModal` só gravava a lista de IDs escolhidos (`patients.weekly_goals`) e nunca criava as linhas de `patient_weekly_goals` que de fato guardam o progresso — a tabela ficava sempre vazia. Mesmo se existisse, `usePatientStatistics.addActivity` comparava nomes de categoria em português (`'Respiração'`, `'Sono'`...) contra as chaves reais salvas em `weekly_goals.category` (`'breathing'`, `'sound'`...), que nunca batiam, e usava igualdade exata contra nomes de atividade que na prática vêm com sufixo (`"Sons Terapêuticos: Chuva"`, `"Grupo de Apoio: Ansiedade"`) ou nome diferente (`"Consulta com Psicólogo"`, não `"Consulta Agendada"`). A tela ainda por cima ignorava os dados reais e mostrava 0%/sem concluída sempre, hardcoded. Corrigido em três camadas: `GoalSelectionModal` agora cria/remove linhas de `patient_weekly_goals` ao salvar a seleção (diff contra a semana atual); `addActivity` casa por prefixo contra as chaves reais de categoria; `Statistics.tsx` usa o progresso de verdade (`useWeeklyGoals().goals`) renderizado com o componente `GoalCard` (que já existia pronto mas nunca era usado).
  - **Novo: evolução do humor.** O check-in de humor da tela inicial (`MoodAccordion`) só gravava um agregado vitalício (`patients.daily_mood_sum/daily_mood_count`) — nenhum histórico por dia era mantido, então não dava pra mostrar uma evolução. Nova tabela `patient_mood_logs` (uma linha por paciente por dia, RLS só para o próprio paciente) grava o histórico real a partir de agora; novo hook `useMoodLog` centraliza a escrita (agregado + histórico + conta como atividade da meta "humor"); novo `MoodTrendChart` mostra os últimos 30 dias com média e tendência (alta/queda/estável).
  - **Limpeza**: removida a página órfã `/progress` (`Progress.tsx`, `ProgressChart.tsx`, `usePatientProgress.ts`, edge function `patient-progress`) — nunca foi linkada de lugar nenhum da navegação (o item "Progresso" sempre apontou para `/statistics`); a tabela `patient_progress` que ela usava nunca recebia uma escrita sequer.
  - Validado com Postgres local (schema/constraint/RLS de `patient_mood_logs`) e 15 novos testes cobrindo o hook de humor, o histórico, o gráfico, a sincronização de metas e o casamento de categoria por prefixo.
- 2026-09-03 — Adicionadas mais métricas em "Meu progresso", todas derivadas de tabelas que outras funcionalidades já usam (sem tabela nova): novo hook `usePatientEngagementMetrics` traz total de anotações do diário privado (`private_journals`), total de depoimentos compartilhados em grupos de apoio (`group_testimonials`) e % de comparecimento nas consultas (`completed` sobre o total de consultas já finalizadas — concluídas, canceladas, recusadas ou falta; ignora as ainda pendentes/agendadas). A grade "Visão geral" ganhou os cards "Anotações no diário" e "Grupos de apoio" (de 4 para 6 cards), e o card de consultas agendadas ganhou a taxa de comparecimento como subtexto. Validado com 3 novos testes do hook (`usePatientEngagementMetrics.test.ts`) e 3 novos testes de integração na tela (`statisticsEngagementCards.test.tsx`); extensão de `count`/`head` no fake do Supabase usado pelos testes.
- 2026-09-03 — Levantamento completo das funcionalidades do paciente em busca de gaps e bugs, com correção de uma rodada extensa de achados:
  - **Moderação de depoimentos de grupos de apoio**: substituída a exclusão automática ao atingir 10 "não curtidas" por uma fila de revisão manual — novo painel admin (aba "Grupos") lista todos os depoimentos, destaca os que bateram o limite como prioridade e permite editar ou excluir. RPCs `get_admin_group_testimonials`/`admin_update_testimonial`/`admin_delete_testimonial` (`SECURITY DEFINER`, checam `is_super_admin`), novo hook `useGroupTestimonialModeration` e componente `GroupTestimonialModerationPanel`.
  - **Preço do Plus divergente**: `Profile.tsx` e o modal de downgrade em `SubscriptionPlans.tsx` mostravam R$69,99 enquanto o card principal e o Stripe já usavam R$69,90. Unificado em R$69,90 em todo o app; conferido também o classificador de valor no Stripe (fallback por `amount`), que já estava correto.
  - **Cota de consultas Premium não era aplicada no backend**: a UI já bloqueava agendamento sem cota, mas a edge function `appointments` aceitava a chamada de qualquer paciente autenticado, sem checar plano nem cota — bypass completo da regra de negócio via chamada direta ao endpoint. Adicionadas colunas `appointments_used_this_month`/`appointments_last_used` em `subscribers` (mesmo padrão de reset mensal do SOS), checagem e marcação de uso tanto em `check-subscription` (informa a UI) quanto na própria `appointments` (autoritativa).
  - **Buraco na política de INSERT de `notifications`**: `WITH CHECK (auth.uid() IS NOT NULL)` permitia a qualquer paciente autenticado inserir notificação para `patient_id` de outra pessoa (spam/spoofing). Restrito a `patient_id = auth.uid()`; nenhum caminho legítimo dependia da permissão ampla.
  - **Notificações de chat e conquista nunca eram criadas**: a tela de notificações já tinha ícone e navegação prontos para "mensagem"/"conquista", mas nada nunca inserira esse tipo de notificação. Adicionados triggers `SECURITY DEFINER` (`notify_new_message` em `mensagens`, `notify_achievement_unlocked` em `patient_achievements`) que criam a notificação para a outra parte sem nunca referenciar o conteúdo da mensagem.
  - **Perda de anotação no diário ao atingir o limite diário**: a modal fechava e creditava a atividade mesmo quando `onSave` falhava (ex.: limite de 2/dia atingido) — texto digitado era perdido. `onSave` agora é aguardado e só fecha/credita em caso de sucesso.
  - **Limite diário do diário calculado em UTC**: uma anotação feita, por exemplo, às 21h de Brasília (00h UTC do dia seguinte) contava para o dia errado. Corrigido para calcular o intervalo do dia no fuso do paciente (`America/Sao_Paulo`) via `date-fns-tz`.
  - **Sintoma selecionado em depoimento de grupo nunca era salvo**: o campo `sintoma_id` referencia a linha do grupo inteiro em `transtornos_sintomas` (que guarda a lista de sintomas), não um sintoma individual — então qualquer opção escolhida no seletor gravava o mesmo id, e o card sempre mostrava o primeiro sintoma da lista do grupo, não o escolhido. Nova coluna `sintoma_texto` guarda o texto do sintoma selecionado.
  - **Nome do grupo sumia ao recarregar/abrir link direto de `SupportGroupDetail`**: o nome só vinha de `location.state`, ausente numa navegação direta ou reload — caía para o rótulo genérico "Grupo de Apoio". Adicionado fallback buscando o nome em `support_groups` pelo id quando o state não vem preenchido.
  - **Padrão de respiração não batia com a instrução exibida**: as técnicas "Respiração Alternada", "Respiração Equilibrada" e "4-7-8 Profundo" mostravam uma instrução (ex. "Inspire por 4, pause por 2, expire por 4") mas praticavam um padrão diferente (5-5-5 ou 4-7-8 padrão), porque o mapeamento reaproveitava padrões genéricos de outras técnicas. Adicionados padrões dedicados para as três, batendo com o que a tela promete.
  - **Títulos de conquista em inglês**: traduzidos para português (ex. "First Step" → "Primeiro Passo"), com migração de backfill renomeando linhas já existentes sem duplicar ou perder o estado de desbloqueada.
  - **Tempo de som terapêutico nunca contava para conquista nenhuma**: `patient_statistics.total_therapeutic_sound_time` já era rastreado, mas só o tempo de respiração entrava nas condições de desbloqueio. Adicionado par de conquistas espelhando o de respiração ("Primeiro Som" / "Ouvinte Dedicado").
  - **Campo "Senha Atual" morto em Alterar Dados da Conta**: o estado existia mas não tinha `<Input>` associado, e a troca de senha chamava `updateUser({password})` direto, sem confirmar que quem está trocando conhece a senha atual — brecha para travar a conta do dono real a partir de uma sessão comprometida/dispositivo compartilhado. Adicionado o campo e uma reautenticação (`signInWithPassword`) antes de trocar.
  - **Exportação CSV do histórico de atividades sem escape**: nome de atividade com vírgula (ex. "Sons Terapêuticos: Chuva, Trovão") quebrava o alinhamento das colunas no CSV exportado. Adicionado escape padrão de CSV (aspas quando o campo contém vírgula/aspas/quebra de linha).
  - **Limpeza de código morto**: removidos `SubscriptionManagement.tsx` (órfão), três componentes não referenciados de `breathing/`, funções não usadas de `soundPrefetch.ts`, e `canUseFeature`/`incrementUsage` mortos em `SubscriptionContext`.
  - Validado com Postgres local para cada migração nova, suíte completa (268 testes) e build de produção.
- 2026-09-03 — Mesmo levantamento de gaps e bugs, agora do lado do psicólogo, com correção de todos os achados:
  - **Reagendamento aceito não movia o horário real da consulta**: quando o psicólogo propunha um novo horário e o paciente aceitava, só o `status` virava `scheduled` — `scheduled_at` (usado em toda parte: janela de entrada na chamada, "consultas de hoje", agenda do psicólogo) continuava com o horário antigo, já recusado. O app dizia "reagendada com sucesso" mas por trás nada mudava de fato. Corrigido em `psychologist-schedule/index.ts`: ao aceitar, `scheduled_at` passa a receber o valor de `proposed_scheduled_at`.
  - **Cota mensal de consulta Premium não voltava quando a consulta não acontecia**: consequência direta da correção de cota do dia anterior — a cota era marcada usada na criação da solicitação (`pending`), mas recusa (pelo psicólogo ou pelo paciente numa proposta de reagendamento) e expiração automática em 24h (`auto-decline-appointments`) nunca devolviam `appointments_used_this_month` para `false`. Um paciente Premium recusado perdia a única consulta do mês sem ter sido atendido. Corrigido nos dois caminhos (recusa e expiração).
  - **Psicólogo nunca recebia notificação in-app quando o paciente respondia a uma proposta de reagendamento** — só e-mail (`send-appointment-notification` pulava explicitamente o insert em `notifications` para psicólogo). Psicólogo passa a ter uma central de notificações própria (`/psychologist-notifications`, reaproveitando a mesma tela e hook do paciente — a RLS já era genérica por `auth.uid()`), com sino e contador de não lidas no cabeçalho do painel e atalho no perfil.
  - **Proposta de reagendamento do psicólogo ignorava a agenda real configurada**: `RescheduleModal` oferecia horários fixos de 7h às 23h50 de 10 em 10 minutos, podendo propor (sem validação nenhuma no backend) um horário em que o próprio psicólogo não atende ou está de férias. Passou a reaproveitar `useAvailableTimeSlots` (mesmo hook do agendamento do paciente) para só oferecer horários que cabem na agenda real; `psychologist-schedule/index.ts` valida de novo no backend antes de salvar. Modal só fecha em caso de sucesso, preservando a seleção se a proposta for rejeitada.
  - **Limpeza de código morto**: removida `canStartAppointment` de `usePsychologistSchedule` — não era chamada em lugar nenhum, e tinha uma regra (libera 15 min antes) diferente da que o componente realmente usa (só dentro da janela exata). `PendingAppointments.tsx` parou de duplicar `fetchPendingAppointments` e passou a usar a função já exposta pelo hook.
  - Validado com typecheck, suíte completa (268 testes) e build de produção; lógica de disponibilidade do backend espelha fielmente a já testada em `psychologistAvailability.ts`/`useAvailableTimeSlots`.
- 2026-09-04 — Mesmo levantamento de gaps e bugs, agora do lado do admin, com correção de todos os achados:
  - **`create-admin-account` não verificava absolutamente nada**: sem header de autorização, sem checar usuário, sem checar admin — qualquer requisição HTTP criava uma conta de administrador completa. Não havia tela ligada a nenhuma rota do app chamando essa função (`AdminCreateForm.tsx` e o script `adminSetup.ts` nunca foram roteados), mas isso não protegia nada: a edge function ficava publicada e chamável direto pela URL. Removida por completo — a função, `AdminCreateForm.tsx`, `adminSetup.ts` e `scripts/setupAdmin.ts`. Criação de admin passa a ser sempre manual, direto no painel do Supabase; ver `docs/creating-an-admin-account.md`.
  - **Troca de senha do admin não verificava a senha atual**: `AdminProfile.tsx` só checava se o campo "Senha Atual" não estava vazio, nunca se o valor batia com a senha de verdade — mesma brecha já corrigida no paciente e que o psicólogo nunca teve. Adicionada reautenticação (`signInWithPassword`) antes de trocar, igual aos outros dois perfis.
  - **`payment-sync` sem autenticação nenhuma**: diferente de `confirm-payment` (que corretamente exige admin), o endpoint que recalcula os valores pendentes de pagamento de todos os psicólogos era público. Adicionada a mesma checagem de `is_super_admin`; `verify_jwt` também ligado no `config.toml`.
  - **`is_admin()` travada em `SELECT false` desde uma migração antiga** ("Simplified for now", nunca corrigida) — a única função que a usava (`admin-psychologist-management`, edge function sem nenhuma tela usando ela hoje) ficava permanentemente bloqueada até para admins de verdade. Trocado para `is_super_admin()` (a mesma que todo o resto do código já usa) e removida a função quebrada.
  - **Excluir um psicólogo não limpava `psychologist_availability_overrides` nem `psychologist_vacations`**: as duas tabelas foram criadas sem chave estrangeira nenhuma, então linhas de bloqueios pontuais e férias de um psicólogo excluído ficavam órfãs pra sempre. Adicionada `FOREIGN KEY ... ON DELETE CASCADE` nas duas (mesmo padrão de toda tabela ligada a `auth.users` nesse projeto) e exclusão explícita em `admin-delete-psychologist`, para consistência com o resto da função.
  - Validado com Postgres local para a nova migração de FK, typecheck, suíte completa (268 testes) e build de produção.
- 2026-09-04 — Rodada de melhorias sugeridas após as três análises de gaps (paciente, psicólogo, admin), pedidas explicitamente:
  - **Validação de horário do agendamento ainda usava janela fixa**: a edge function `appointments` checava só `hour < 7` (o `hour >= 24` nunca podia ser verdadeiro, era morto) — aceitava qualquer horário de 7h em diante, todo dia, pra qualquer psicólogo, sem checar a agenda real dele. Client já usava `useAvailableTimeSlots` corretamente; agora o backend valida de novo contra padrão + exceções + férias, mesmo código já usado no reagendamento do psicólogo.
  - **Rate limiting**: nenhuma edge function tinha limite de requisições. Nova tabela `rate_limits` + RPC `check_rate_limit` (janela fixa, atômico via UPSERT) aplicado em `emergency-sos` (5/10min), `appointments` (10/hora), `send-support-request` e `send-psychologist-support-request` (3/hora — cada envio dispara e-mail de verdade via Resend).
  - **Trilha de auditoria do admin**: nova tabela `admin_audit_log` + RPC `get_admin_audit_log`, nova aba "Auditoria" no painel. Toda chamada de `admin-block-*`, `admin-delete-*` e `admin-update-*` grava quem fez, quando, em quem e detalhes — antes só existia isso (de forma restrita) para confirmação de pagamento.
  - **Admin não sabia de cadastro de psicólogo pendente**: trigger `notify_admins_new_psychologist_registration` cria notificação in-app pra todo admin ativo quando um registro vira `pending` (novo cadastro ou reenvio após rejeição). Painel do admin ganhou sino de notificações no cabeçalho, reaproveitando a mesma tela/hook do psicólogo (nova rota `/admin-notifications`).
  - **Histórico clínico do psicólogo entre sessões**: antes só dava pra ver o resumo de uma consulta isolada, ou vasculhar a tabela geral de histórico buscando pelo nome do paciente. Novo botão "Histórico" em cada card de consulta (`UpcomingConsultations`) abre os resumos de todas as sessões concluídas anteriores com aquele paciente específico.
  - **Notificações push**: infraestrutura completa (Firebase Cloud Messaging, API v1 — a legada usada antes foi desativada pelo Google em 2024) pronta e testada; falta só a configuração externa (projeto Firebase) descrita em `docs/push-notifications-setup.md`. Toggle opt-in em Perfil → Configurações (paciente e psicólogo); hoje só o SOS dispara push de verdade (psicólogos online avisados mesmo com o painel fechado) — os demais tipos de notificação continuam só in-app/Web Notifications, como já era.
  - **Não entregue nesta rodada**: testes automatizados para a lógica das edge functions (Deno) — o ambiente onde essas mudanças foram feitas não tem o runtime Deno disponível nem acesso de rede pra instalá-lo, então não dava pra escrever testes e efetivamente rodá-los antes de entregar. A lógica nova mais sensível (validação de agenda) é uma cópia fiel do algoritmo já coberto pela suíte Vitest em `psychologistAvailability.ts`/`useAvailableTimeSlots`.
  - Validado com Postgres local para cada migração nova (incluindo simulação de RLS trocando de role), typecheck, suíte completa (268 testes) e build de produção.
