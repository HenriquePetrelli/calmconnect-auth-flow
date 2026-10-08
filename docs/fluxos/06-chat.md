# 06. Chat entre paciente e psicólogo

> **Status:** Pronto.
> **Última verificação:** 2026-10-08 (varredura de funcionamento: envio sem duplicar e sem perder, fila quando a internet cai, ordem garantida, lida só com a tela visível, conversa no endereço, aviso abre a conversa, fotos apagadas junto com a conversa).
> **Quem usa:** paciente e psicólogo que tiveram consulta concluída nos últimos 30 dias.

## Resumo

O chat dá continuidade ao cuidado depois de uma consulta. Só nasce de uma consulta realizada, fica aberto para escrita por 1 mês (renovado a cada consulta concluída) e é apagado 3 meses depois de aberto. Aceita texto e foto. O conteúdo nunca aparece para o admin.

## Telas

| Rota | Tela |
|---|---|
| `/chat` | Lista de conversas (com contador de não lidas) |
| `/chat?c=<id>` | Conversa aberta. O voltar do celular volta para a lista, recarregar mantém a conversa e o aviso de mensagem nova abre direto nela |

## Como funciona

1. **Criar conversa**: o paciente inicia com um psicólogo com quem teve consulta **concluída nos últimos 30 dias** (`abrir_conversa`). O banco confere essa regra (`pode_criar_conversa`) e recusa qualquer outra tentativa. Se já existe conversa com esse psicólogo, ela é reaberta.
2. **Mensagens**: texto (até 5.000 caracteres) ou foto (até 10 MB, imagem). A foto vai para o storage privado, na pasta da conversa (`chat-images/{conversa}/{autor}-{hora}`), e é exibida por link temporário assinado. Só os dois participantes enviam e veem as fotos da conversa (`pode_enviar_imagem_chat`, `pode_ver_imagem_chat`); fotos antigas (sem a pasta da conversa) abrem só para quem participa da conversa onde o autor a mandou.
3. **Envio (como no WhatsApp)**: a mensagem aparece na hora com "Enviando..." e a caixa já fica livre para a próxima. Cada mensagem nasce com um id gerado no aparelho: se a resposta do servidor se perder e o app tentar de novo, o banco recusa a cópia (mesmo id) e a mensagem não duplica. As mensagens saem uma de cada vez, na ordem em que foram escritas.
4. **Sem internet**: a mensagem fica como "Não enviada", com "Tentar de novo" e "Apagar". Ela fica guardada no aparelho (sobrevive a recarregar a página) e é reenviada sozinha quando a internet, a tela ou a conexão em tempo real voltam. Se o banco recusar por regra (conversa somente leitura, limite por minuto), o motivo aparece e o app não fica tentando sozinho.
5. **Tempo real**: a mensagem nova entra no fim da lista sem recarregar. Se o tempo real caiu (tela apagada, troca de rede), a conversa busca o que faltou quando a internet, a tela ou a conexão voltam. Quem está lendo mensagens antigas não é puxado para o fim: aparece o botão "N novas mensagens".
6. **Leitura**: as mensagens do outro lado só são marcadas como lidas com a conversa aberta **e a tela visível** (`marcar_mensagens_como_lidas`); com a aba em segundo plano, o "lida" espera a pessoa voltar. Mensagens próprias mostram um check (enviada) ou dois (lida).
7. **Notificação**: mensagem nova gera aviso no app e push com link para a própria conversa (`/chat?c=<id>`), um aviso por conversa a cada 30 minutos. Com a aba aberta em segundo plano, o navegador também avisa.
8. **Expiração** (rotina diária `expire-old-conversas`): com 1 mês, a conversa vira **somente leitura**; com 3 meses, é apagada. As fotos da conversa apagada saem do storage na rotina diária `chat-photos-cleanup` (função `chat-cleanup`), como diz a política de privacidade. Cada consulta concluída com o mesmo psicólogo reabre a conversa por mais 1 mês (`reopen_conversa_on_completed_appointment`). O banco confere a data a cada mensagem (`guard_mensagem_insert`) e a tela já mostra somente leitura pela data, sem esperar a rotina.
9. **Excluir** (paciente): a conversa some **só da lista de quem excluiu** (`ocultar_conversa`). O psicólogo continua com o histórico. Ela volta para a lista se chegar mensagem nova, ou se o paciente reabrir com o mesmo psicólogo.
10. **Caixa de texto**: Enter envia, Shift+Enter quebra a linha, a caixa cresce até 6 linhas e mostra quantos caracteres faltam perto do limite.

## Regras

- O paciente não pode trocar o psicólogo nem o paciente de uma conversa, nem reabrir conversa somente leitura; cada um só oculta a conversa na própria lista (`guard_conversa_client_update`).
- Mensagem com foto só aponta para a pasta da própria conversa e do próprio autor; "lida" só é marcada quando o outro abre (`guard_mensagem_insert`).
- `pode_criar_conversa` só responde sobre a própria pessoa.
- Limite de 30 mensagens por minuto por pessoa (gatilho `rate_limit_mensagens`).
- Foto só por link assinado; o bucket é privado e aceita só imagem e PDF. Antes de 2026-10-06 qualquer usuário logado conseguia ler e listar a pasta `chat-images`.
- O admin vê só números e metadados (participantes, status, quantidade, última atividade) e pode arquivar. Nunca vê o texto.

## Onde está no código

- **Telas e componentes**: `src/pages/Chat.tsx`, `ChatContent.tsx`; em `src/components/chat/`: `ListaConversas`, `ChatInterface`, `ChatImage`.
- **Hooks**: `useConversas` (usa `listar_conversas`, com não lidas; atualização em segundo plano não mostra erro), `useMensagens` (fila de envio com id do aparelho, pendentes guardadas em `chat:pendentes:<conversa>`, reenvio automático, tempo real, nova sincronização), `useChatModeration` (admin).
- **Edge function**: `chat-cleanup` (apaga fotos de conversas que não existem mais; só a rotina chama).
- **Regras puras**: `src/lib/chatImage.ts`, `browserNotifications.ts`.
- **Banco**: `conversas`, `mensagens`; bucket `documents` (pasta `chat-images`). Funções: `notify_new_message` (aviso com link da conversa), `pode_criar_conversa`, `listar_conversas` (sem as ocultadas), `abrir_conversa`, `ocultar_conversa`, `marcar_mensagens_como_lidas`, `gerenciar_expiracao_conversas`, `get_admin_conversas_overview`.

## Como validar

### Teste manual
1. Paciente **sem** consulta concluída com o psicólogo → não consegue iniciar conversa.
2. Depois de uma consulta concluída → iniciar conversa → mandar "oi" → chega na hora do outro lado, com contador de não lida.
3. O psicólogo abre a conversa → no paciente, a mensagem passa para dois checks.
4. Mandar uma foto (tirar uma no celular, inclusive iPhone) → abre do outro lado.
5. Desligar o Wi-Fi do psicólogo, mandar 2 mensagens do paciente, religar → as mensagens aparecem sem recarregar.
5a. Desligar o Wi-Fi do **paciente** e mandar "um", "dois" → aparecem como "Não enviada". Religar → saem sozinhas, uma vez cada, na ordem.
5b. Sem internet, mandar uma mensagem e recarregar a página → ela continua lá como "Não enviada" e sai quando a internet volta.
5c. Com a conversa aberta numa aba em segundo plano, receber mensagem → do outro lado continua um check; ao voltar para a aba, vira dois.
5d. Rolar para mensagens antigas e receber mensagem → a tela não pula; aparece "1 nova mensagem".
5e. Abrir uma conversa e usar o voltar do celular → volta para a lista (não sai do chat). Recarregar com a conversa aberta → continua nela.
6. Com o app do psicólogo fechado → chega o push "Nova mensagem"; tocar nele abre a conversa certa.
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

Nenhuma. Varredura de 2026-10-08: migration `20261008090000_chat_link_e_limpeza_de_fotos.sql` e edge function `chat-cleanup`. "Excluir conversa" passou a ocultar só para quem excluiu em 2026-10-04 (migration `20261003232116_d6f3adac-0952-4317-8e77-a3a5ec8ff312.sql`).

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Não consigo iniciar conversa | Sem consulta concluída nos últimos 30 dias | `appointments` com `status = 'completed'` |
| "Somente leitura" | Conversa com mais de 1 mês | `conversas.data_inicio`, `status` |
| Foto não abre | Link assinado vencido (tela aberta há muito tempo) | Recarregar a conversa |
| Foto recusada | Arquivo maior que 10 MB ou de outro tipo | Limites do bucket (ficha 20) |
| Mensagem "Não enviada" | Sem internet; ou o banco recusou (motivo aparece no aviso) | Esperar a internet voltar ou tocar "Tentar de novo" |
| "Muitas ações em pouco tempo" | Mais de 30 mensagens em 1 minuto | Esperado; aguardar |
