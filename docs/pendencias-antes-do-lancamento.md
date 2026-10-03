# Pendências antes do lançamento

O que precisa ser resolvido antes de o app ficar pronto. Ao resolver um item, mova-o para "Resolvidas" com a data e o que foi feito.

## Críticas

### 1. Senha do admin exposta no repositório

- **Onde:** `supabase/migrations/20250729171947-8c6e37ba-06ef-4ba2-96e4-260ba4e8a0f3.sql` cria/atualiza a conta de admin com a senha em texto puro.
- **Risco:** qualquer pessoa com acesso ao repositório (ou a um clone antigo dele) consegue entrar como admin, se a senha ainda for a mesma.
- **O que fazer:**
  1. Trocar a senha da conta de admin (e de qualquer outra conta que use a mesma senha).
  2. Ativar a verificação em duas etapas da conta de admin, se disponível.
  3. Opcional: limpar o histórico do Git (por exemplo, com `git filter-repo`) e forçar o push; avisar quem tem clones. Apagar só o arquivo não basta, porque a senha continua no histórico.
- **Registrado em:** 2026-10-03.

## Importantes

### 2. Conferir a configuração do Firebase para o push no celular

- **Onde:** variáveis `VITE_FIREBASE_*` do app (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID e VAPID key) e a conta de serviço do Firebase nos secrets das edge functions.
- **Por quê:** sem elas, nenhum push chega com o app fechado (lembretes de consulta e de hábitos, mensagens do chat, mudanças na consulta). As notificações dentro do app continuam funcionando.
- **O que fazer:** confirmar que as variáveis estão configuradas com os valores do projeto no Firebase e testar num celular: ativar as notificações no perfil, fechar o app e mandar uma mensagem no chat a partir de outra conta.
- **Registrado em:** 2026-10-04.

### 3. Excluir conversa apaga para os dois lados

- **Onde:** lista de conversas do paciente (ícone de lixeira).
- **Problema:** quando o paciente exclui uma conversa, ela some também para o psicólogo, inclusive do histórico dele com aquele paciente.
- **O que fazer:** trocar por "ocultar só para mim", como no WhatsApp: a conversa sai da lista de quem ocultou e continua para o outro lado.
- **Registrado em:** 2026-10-04.

### 4. Decidir sobre SOS atendidos antes da correção do repasse

- **Situação:** até 2026-10-04 o repasse nunca contava os atendimentos de SOS (contava pela tabela de consultas, onde o SOS não aparece), então nenhum psicólogo recebeu por SOS. A correção passa a contar os SOS concluídos daqui para frente; os anteriores foram registrados em `payout_items` (`source_type = 'sos'`, `backfilled = true`) sem somar ao valor a pagar.
- **O que fazer:** decidir se paga os atendimentos antigos. Para ver quanto é por psicólogo:
  `select p.full_name, count(*), sum(i.amount) from payout_items i join psychologists p on p.user_id = i.psychologist_user_id where i.source_type = 'sos' and i.backfilled group by p.full_name;`
- **Registrado em:** 2026-10-04.

### 5. Configurar o TURN das chamadas de vídeo

- **Onde:** secrets das edge functions (função `ice-servers`).
- **Por quê:** sem TURN, a chamada de vídeo (SOS e consulta) não conecta quando um dos lados está em rede que bloqueia conexão direta: muitas redes 4G/5G (NAT da operadora) e redes corporativas. Estimativa comum: 10% a 20% das chamadas. O app já está pronto; falta a conta.
- **O que fazer:** uma das opções:
  1. Cloudflare Realtime TURN (recomendado, tem cota gratuita): criar uma chave TURN no painel da Cloudflare e cadastrar `CLOUDFLARE_TURN_KEY_ID` e `CLOUDFLARE_TURN_API_TOKEN`.
  2. Outro provedor (Twilio, Metered, coturn próprio): cadastrar `TURN_URLS` (separadas por vírgula), `TURN_USERNAME` e `TURN_CREDENTIAL`.
- **Como testar:** fazer uma chamada com um lado no 4G e o outro numa rede corporativa ou de outra operadora e confirmar que o vídeo conecta.
- **Registrado em:** 2026-10-04.

### 6. Ajustes de segurança no painel do Supabase (Authentication)

- **Onde:** Supabase → Authentication → Policies/Settings (não dá para configurar pelo código).
- **O que fazer:**
  1. Tamanho mínimo de senha: 8 (o app já exige 8 com letras e números nas contas novas; o servidor ainda aceita 6 de quem chamar a API direto).
  2. Ativar "Leaked password protection" (recusa senhas que já vazaram na internet).
  3. Confirmar que "Confirm email" está ligado.
  4. Ativar a verificação em duas etapas (MFA) para as contas de admin.
- **Registrado em:** 2026-10-04.

### 7. Dois ajustes pequenos de privacidade achados ao documentar

- **Grupos de apoio, curtidas:** qualquer usuário logado lê a tabela `group_testimonial_likes` inteira, com o ID de quem curtiu, e assim descobre quem interage com quais grupos (ex.: depressão). Corrigir: limitar a leitura às curtidas da própria pessoa e entregar só os totais. Detalhes em `docs/fluxos/16-grupos-de-apoio.md`.
- **Questionários:** o próprio paciente consegue alterar pela API a pontuação já gravada, sem mudar as respostas. Corrigir: o gatilho de pontuação rodar em qualquer alteração. Também os contadores de curtidas, editáveis pelo autor do depoimento. Detalhes em `docs/fluxos/13-questionarios.md`.
- **Registrado em:** 2026-10-04.

## Melhorias sugeridas

### 8. SOS por mensagem de texto

- Apps como Crisis Text Line e o chat do CVV atendem por texto: muita gente em crise não consegue falar (está em casa com outras pessoas, no trabalho, sem voz). Hoje o SOS do Soliv é só por vídeo (dá para desligar a câmera, mas não para falar sem voz).
- **Registrado em:** 2026-10-04.

### 9. Triagem rápida de risco no SOS

- Antes de entrar na fila, 1 ou 2 perguntas (ex.: "Você está pensando em se machucar agora?"). Se sim: mostrar CVV 188 e SAMU 192 em destaque e marcar o pedido como prioritário para o psicólogo. É o que fazem serviços como o 988 e o Wysa.
- **Registrado em:** 2026-10-04.

### 10. Plano pós-crise para o paciente

- Ao fim do SOS, o psicólogo registra notas só para ele. Serviços de crise costumam deixar com a pessoa um resumo curto e combinados ("o que fazer nas próximas 24h", "procure atendimento se..."), que poderiam virar parte do plano de segurança.
- **Registrado em:** 2026-10-04.

## Resolvidas

### Avaliação da consulta agendada (registrada em 2026-10-04, resolvida em 2026-10-04)

- O fim da chamada já pedia a avaliação; faltava o resto. Agora: se o paciente fechar o app ou a chamada cair antes da tela de avaliação, o app convida a avaliar ao abrir de novo (sem bloquear, dá para pular); o histórico de consultas mostra a nota de cada consulta ou o botão "Avaliar" (até 30 dias depois); a avaliação fica ligada à consulta e ao psicólogo e entra na média dele.
- Achados no caminho e corrigidos: o histórico de consultas do paciente aparecia sempre vazio (usava a lista de próximas consultas), e qualquer usuário podia gravar avaliação para uma sessão da qual não participou, mexendo na média de qualquer psicólogo.

### Varredura de segurança (resolvida em 2026-10-04)

- Corrigido (migrations `20261003210511_25be134c-176c-4bfc-8b28-4715f7b98a8f.sql` e `20261004220000_storage_upload_limits.sql` e edge functions): rotinas agendadas que qualquer pessoa podia disparar com a chave pública do app; psicólogo não aprovado lendo e aceitando pedidos de SOS (com nome e sintomas do paciente); Premium grátis inserindo a própria assinatura; psicólogo se aprovando e paciente se desbloqueando direto na tabela; CPF, Pix, e-mail e documentos de todos os psicólogos visíveis para qualquer usuário; funções que gravavam dados de outros usuários; limite de requisições que dava para esgotar no nome de outra pessoa (bloquear o SOS dela); cancelamento do SOS de outra pessoa; injeção de HTML nos e-mails de suporte; papel do usuário (admin/psicólogo) lido de um campo que o próprio usuário edita; força bruta de código de empresa; uploads sem limite de tipo e tamanho no servidor.
- Verificado sem problema: SQL injection (todas as consultas usam parâmetros; o SQL dinâmico só existe em migrations, com identificadores escapados), XSS (o React escapa o texto; o único HTML cru é o CSS do gráfico), webhook do Stripe (assinatura conferida), prompt injection (o app não usa IA).
