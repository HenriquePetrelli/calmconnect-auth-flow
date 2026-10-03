# 06. Chat entre paciente e psicólogo

> **Status:** Pronto.
> **Última verificação:** 2026-10-04 (ocultar conversa só para quem excluiu).
> **Quem usa:** paciente e psicólogo que tiveram consulta concluída nos últimos 30 dias.

## Resumo

O chat dá continuidade ao cuidado depois de uma consulta. Só nasce de uma consulta realizada, fica aberto para escrita por 1 mês (renovado a cada consulta concluída) e é apagado 3 meses depois de aberto. Aceita texto e foto. O conteúdo nunca aparece para o admin.

## Telas

| Rota | Tela |
|---|---|
| `/chat` | Lista de conversas (com contador de não lidas) e conversa aberta |

## Como funciona

1. **Criar conversa**: o paciente inicia com um psicólogo com quem teve consulta **concluída nos últimos 30 dias** (`abrir_conversa`). O banco confere essa regra (`pode_criar_conversa`) e recusa qualquer outra tentativa. Se já existe conversa com esse psicólogo, ela é reaberta.
2. **Mensagens**: texto (até 5.000 caracteres) ou foto (até 10 MB, imagem). A foto vai para o storage privado e é exibida por link temporário assinado.
3. **Tempo real**: a mensagem nova entra no fim da lista sem recarregar. Se o tempo real caiu (tela apagada, troca de rede), a conversa busca o que faltou quando a internet ou a tela voltam.
4. **Leitura**: ao abrir a conversa, as mensagens do outro lado são marcadas como lidas (`marcar_mensagens_como_lidas`). Mensagens próprias mostram um check (enviada) ou dois (lida).
5. **Notificação**: mensagem nova gera aviso no app e push, sem repetir um aviso por mensagem em sequência curta. Com a aba aberta em segundo plano, o navegador também avisa.
6. **Expiração** (rotina diária `expire-old-conversas`): com 1 mês, a conversa vira **somente leitura**; com 3 meses, é apagada. Cada consulta concluída com o mesmo psicólogo reabre a conversa por mais 30 dias.
7. **Excluir** (paciente): a conversa some **só da lista de quem excluiu** (`ocultar_conversa`). O psicólogo continua com o histórico. Ela volta para a lista se chegar mensagem nova, ou se o paciente reabrir com o mesmo psicólogo.
8. **Falha ao enviar**: o texto digitado fica na caixa e a foto selecionada continua selecionada, para tentar de novo.

## Regras

- O paciente não pode trocar o psicólogo nem o paciente de uma conversa, nem reabrir conversa somente leitura (`guard_conversa_client_update`).
- Limite de 30 mensagens por minuto por pessoa (gatilho `rate_limit_mensagens`).
- Foto só por link assinado; o bucket é privado e aceita só imagem e PDF.
- O admin vê só números e metadados (participantes, status, quantidade, última atividade) e pode arquivar. Nunca vê o texto.

## Onde está no código

- **Telas e componentes**: `src/pages/Chat.tsx`, `ChatContent.tsx`; em `src/components/chat/`: `ListaConversas`, `ChatInterface`, `ChatImage`.
- **Hooks**: `useConversas` (usa `listar_conversas`, com não lidas), `useMensagens` (envio, tempo real, nova sincronização), `useChatModeration` (admin).
- **Regras puras**: `src/lib/chatImage.ts`, `browserNotifications.ts`.
- **Banco**: `conversas`, `mensagens`; bucket `documents` (pasta `chat-images`). Funções: `pode_criar_conversa`, `listar_conversas` (sem as ocultadas), `abrir_conversa`, `ocultar_conversa`, `marcar_mensagens_como_lidas`, `gerenciar_expiracao_conversas`, `get_admin_conversas_overview`.

## Como validar

### Teste manual
1. Paciente **sem** consulta concluída com o psicólogo → não consegue iniciar conversa.
2. Depois de uma consulta concluída → iniciar conversa → mandar "oi" → chega na hora do outro lado, com contador de não lida.
3. O psicólogo abre a conversa → no paciente, a mensagem passa para dois checks.
4. Mandar uma foto (tirar uma no celular, inclusive iPhone) → abre do outro lado.
5. Desligar o Wi-Fi do psicólogo, mandar 2 mensagens do paciente, religar → as mensagens aparecem sem recarregar.
6. Com o app do psicólogo fechado → chega o push "Nova mensagem".
7. Paciente exclui a conversa → some da lista dele; o psicólogo ainda a vê. O psicólogo manda mensagem → a conversa volta para o paciente.

### Testes automáticos
`consultasChatRules`, `chatReadReceipts.render`, `chatBrowserNotifications`, `chatModerationPanel.render`.

### Conferência no banco
```sql
-- Conversas de um paciente e situação
select id, psicologo_id, status, data_inicio from conversas where paciente_id = '<id>';

-- Volume de mensagens por conversa (sem ler conteúdo)
select conversa_id, count(*), max(created_at) from mensagens group by conversa_id order by 3 desc limit 20;
```

## Pendências

Nenhuma. "Excluir conversa" passou a ocultar só para quem excluiu em 2026-10-04 (migration `20261003232116_d6f3adac-0952-4317-8e77-a3a5ec8ff312.sql`).

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Não consigo iniciar conversa | Sem consulta concluída nos últimos 30 dias | `appointments` com `status = 'completed'` |
| "Somente leitura" | Conversa com mais de 1 mês | `conversas.data_inicio`, `status` |
| Foto não abre | Link assinado vencido (tela aberta há muito tempo) | Recarregar a conversa |
| Foto recusada | Arquivo maior que 10 MB ou de outro tipo | Limites do bucket (ficha 20) |
| "Muitas ações em pouco tempo" | Mais de 30 mensagens em 1 minuto | Esperado; aguardar |
