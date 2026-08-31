# Sistema de Chat - Soliv

## Visão Geral

O sistema de chat permite que pacientes conversem diretamente com psicólogos com quem já realizaram consultas. O sistema foi projetado com foco na segurança, privacidade e experiência do usuário.

## Funcionalidades Implementadas

### 📱 Interface do Chat
- ✅ Layout tipo WhatsApp/Telegram com bolhas de mensagens
- ✅ Exibição de horário e timestamp das mensagens
- ✅ Indicadores visuais do status da conversa (Ativa/Somente leitura/Expirada)
- ✅ Interface responsiva para mobile e desktop

### 💬 Funcionalidades de Messaging
- ✅ Envio e recebimento de mensagens em tempo real via Supabase Realtime
- ✅ Suporte para mensagens de texto
- ✅ Envio de imagens (upload para Supabase Storage)
- ✅ Validação de arquivos (apenas imagens, máximo 5MB)
- ✅ Indicador de entrega/leitura: mensagem própria mostra um check (enviada) ou check duplo (lida), como no WhatsApp; ao abrir a conversa, as mensagens recebidas são marcadas como lidas via RPC `marcar_mensagens_como_lidas`. Não há estado "entregue" separado — o chat é apenas realtime, sem fila offline.

### 🔐 Regras de Negócio
- ✅ Pacientes só podem criar conversas com psicólogos que tiveram consultas finalizadas nos últimos 30 dias
- ✅ Conversas ficam ativas por 1 mês para envio de mensagens
- ✅ Após 1 mês, conversas ficam em modo "Somente leitura" por até 3 meses
- ✅ Após 3 meses, conversas são automaticamente excluídas
- ✅ Pacientes podem excluir manualmente suas conversas

### 🗄️ Estrutura do Banco de Dados

#### Tabela `conversas`
```sql
- id: UUID (PK)
- paciente_id: UUID
- psicologo_id: UUID  
- data_inicio: TIMESTAMP
- data_fim: TIMESTAMP (nullable)
- status: ENUM ('ativa', 'somente_leitura', 'expirada')
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- UNIQUE(paciente_id, psicologo_id)
```

#### Tabela `mensagens`
```sql
- id: UUID (PK)
- conversa_id: UUID (FK)
- autor_id: UUID
- conteudo: TEXT (nullable)
- tipo: ENUM ('texto', 'imagem')
- imagem_url: TEXT (nullable)
- lida_em: TIMESTAMPTZ (nullable) — quando o destinatário leu a mensagem
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 🔒 Segurança (RLS - Row Level Security)

#### Políticas de Conversas
- Pacientes podem ver apenas suas próprias conversas
- Psicólogos podem ver apenas suas próprias conversas
- Pacientes podem criar, atualizar e deletar suas conversas
- Psicólogos podem atualizar suas conversas

#### Políticas de Mensagens
- Usuários podem ver mensagens apenas das conversas em que participam
- Usuários podem criar mensagens apenas em conversas ativas onde participam
- Marcar mensagem como lida não passa por policy de UPDATE aberta: usa a RPC `marcar_mensagens_como_lidas` (`SECURITY DEFINER`), que só atualiza `lida_em` de mensagens do outro participante — nenhum usuário pode alterar conteúdo alheio.

### ⚡ Tempo Real
- Suporte completo ao Supabase Realtime
- Novas conversas aparecem automaticamente
- Mensagens chegam instantaneamente
- Status de conversas é atualizado em tempo real

## Componentes Criados

### Hooks
- `useConversas.ts` - Gerenciamento de conversas (listagem, criação, exclusão)
- `useMensagens.ts` - Gerenciamento de mensagens (envio, recebimento, upload de imagens)
- `useChatModeration.ts` - Métricas de uso e visão geral das conversas para o admin (metadados apenas)

### Componentes
- `ListaConversas.tsx` - Lista todas as conversas do usuário
- `ChatInterface.tsx` - Interface principal do chat; também dispara notificação do navegador para mensagens novas com a aba em segundo plano
- `NovoChat.tsx` - Card promocional do sistema de chat
- `admin/ChatModerationPanel.tsx` - Painel admin de uso e moderação do chat

### Utilitários
- `lib/browserNotifications.ts` - Wrapper sobre a Web Notifications API (permissão, disparo, detecção de aba em segundo plano)

### Páginas
- `Chat.tsx` - Página principal que alterna entre lista e chat

### Edge Functions
- `gerenciar-conversas` - Função automatizada para gerenciar expiração de conversas

## Administração

- ✅ Painel admin (`/admin-dashboard`, aba "Chat") com métricas agregadas de uso (conversas por status, mensagens dos últimos 30 dias, média de mensagens por conversa ativa) e listagem de conversas com participantes, contagem de mensagens e última atividade.
- ✅ Ação de moderação: admin pode arquivar (encerrar) uma conversa flagrada por outro canal (denúncia, suporte).
- Por design, o conteúdo das mensagens (`conteudo`, `imagem_url`) nunca é exposto ao admin — apenas metadados. As funções `get_chat_usage_metrics` e `get_admin_conversas_overview` (RPCs `SECURITY DEFINER`, restritas a `is_super_admin`) não selecionam essas colunas.
- [ ] Backup automático de conversas — não implementado.

## Funcionalidades Futuras (Não Implementadas)

### 🔔 Notificações Push
- ✅ Notificação do navegador (Web Notifications API) quando chega mensagem nova do outro participante e a aba está em segundo plano ou sem foco. Não depende de nenhuma credencial externa — não é push real (só funciona com o app aberto em alguma aba) e não chega se o navegador estiver fechado.
- [ ] Integração com Firebase Cloud Messaging (FCM) para push real em background — já existem a tabela `fcm_tokens` e a edge function `firebase-notifications` no projeto, mas nenhuma tela do cliente registra token ou chama essa função; falta um projeto Firebase configurado (`FIREBASE_SERVER_KEY`, dados do app) para ativar.
- [ ] Notificações mobile via Capacitor (pacote `@capacitor/push-notifications` não está instalado)

### 📱 Melhorias Mobile
- [ ] Suporte offline com sincronização
- [ ] Notificações push nativas

## Como Testar

1. **Como Paciente:**
   - Faça login como paciente
   - Certifique-se de ter uma consulta finalizada nos últimos 30 dias
   - Acesse /chat ou clique no card "Chat com Psicólogos" na home
   - Clique em "Nova Conversa" e selecione um psicólogo
   - Envie mensagens de texto e imagens

2. **Como Psicólogo:**
   - Faça login como psicólogo
   - Acesse /chat para ver conversas iniciadas por pacientes
   - Responda às mensagens

3. **Testando Expiração:**
   - Execute manualmente a edge function `gerenciar-conversas`
   - Ou modifique as datas no banco para simular expirações

## Configurações Necessárias

### Supabase Storage
- Bucket `documents` deve estar configurado como público
- Políticas de upload configuradas corretamente

### Supabase Realtime
- Tabelas `conversas` e `mensagens` adicionadas à publicação realtime
- RLS policies configuradas corretamente

### Edge Function
- `gerenciar-conversas` pode ser executada via cron para limpeza automática

## Navegação

O chat está integrado à navegação principal:
- Adicionado ao `BottomNavigation` com ícone de mensagem
- Card promocional na página Home
- Rota `/chat` disponível para pacientes e psicólogos

---

*Sistema desenvolvido com foco na privacidade e segurança das comunicações entre pacientes e profissionais de saúde mental.*