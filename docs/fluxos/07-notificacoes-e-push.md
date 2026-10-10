# 07. Notificações no app e push

> **Status:** Pronto, com pendência externa (conferir a configuração do Firebase e testar num celular).
> **Última verificação:** 2026-10-10 (varredura de funcionamento: contador do sino, push que não se perde, texto discreto na tela bloqueada, toque no aviso, renovação do token, limpeza dos antigos).
> **Quem usa:** todos.

## Resumo

Há três canais:

| Canal | Quando chega | Precisa de quê |
|---|---|---|
| **No app** (sino, `/notifications`) | Sempre, ao abrir o app | Nada |
| **Navegador** (aviso do sistema com a aba aberta em segundo plano) | Mensagem de chat com a aba aberta | Permissão do navegador |
| **Push** (com o app fechado) | SOS, consultas, chat, lembretes de hábitos, acompanhamento do SOS | Firebase configurado e push ativado pela pessoa no perfil |

## Como funciona

1. **Ativar push**: em Perfil → Configurações → **Notificações push**, o app pede permissão, obtém o token do aparelho no Firebase e grava em `fcm_tokens` (`register_push_token`). No app Android (Capacitor), usa o push nativo.
2. **Token sempre em dia**: a cada abertura do app (com push já ativado naquele aparelho), o token é pedido de novo ao Firebase e regravado. O Firebase troca o token de tempos em tempos; antes, o push parava de chegar sem ninguém perceber.
3. **Criar uma notificação**: todo aviso nasce como linha em `notifications`, criada **só pelo servidor** (funções do banco ou edge functions). Quando precisa de push, vai com `push = true` e `link` (a tela que abre ao tocar). Pelo app, a pessoa só marca como lida/não lida e exclui.
4. **Texto discreto na tela bloqueada** (`push_text`): o push de mensagem diz só "Você tem uma nova mensagem" (sem o nome do psicólogo) e o acompanhamento do SOS não fala do SOS. Dentro do app o aviso continua completo.
5. **Enviar o push**: a cada minuto, a rotina `notification-push` reserva os pendentes da última hora (`claim_pending_pushes`, sem enviar duas vezes) e manda direto ao Firebase (API v1, um acesso ao Google por rodada). Ao fim, `finish_pushes` confirma os que saíram e **devolve à fila os que falharam** por problema passageiro do Firebase (até 3 tentativas). Antes o aviso era dado como enviado antes de ir ao Firebase, e uma falha fazia o push sumir.
6. **SOS**: o pedido de emergência manda push direto a todos os psicólogos aprovados, não bloqueados e livres, com **prioridade alta**, validade de 10 min (depois disso o Firebase descarta, o pedido já expirou) e toque abrindo a fila do SOS (antes o toque no navegador não abria nada).
7. **Hábitos**: a rotina `habit-reminders` (a cada 15 min) decide quem lembrar (ficha 11).
8. **Tocar no push** abre a tela do `link`, **na aba do app que já está aberta** (no navegador) ou no app (Android/iPhone, em qualquer tela; antes só funcionava com o Perfil aberto e só para SOS e hábitos). Só são aceitos caminhos do próprio app, nunca outro site. Mensagens da mesma conversa substituem o aviso anterior no aparelho, em vez de empilhar.
9. **Com o app aberto**, o push aparece como um aviso na tela com "Abrir" (menos se a pessoa já está na tela dele, ex.: na própria conversa).
10. **Tokens mortos** (app desinstalado, permissão revogada) são desativados automaticamente; só quando o Firebase diz que o aparelho não existe mais (antes, um erro no texto do push desativava os aparelhos).
11. **Sair da conta** desativa o token daquele aparelho, para outra pessoa não receber os avisos de quem saiu.
12. **Sino e tela de avisos**: uma fonte só para o app inteiro. O contador vem do servidor (todas as não lidas) e acompanha na hora o que é lido ou excluído em qualquer tela ou aparelho; antes, marcar como lida na tela de avisos não baixava o número do menu. A lista vem em páginas de 30 ("Ver mais antigas") e se atualiza ao voltar para o app ou reconectar. Abrir o aviso marca como lido; excluir tem botão sempre visível no celular; "Excluir todas" pede confirmação.
13. **Limpeza** (rotina diária `purge-old-notifications`): avisos lidos com mais de 90 dias e qualquer aviso com mais de 180 dias; registros técnicos de envio com mais de 30 dias.

## O que gera notificação

| Evento | No app | Push |
|---|---|---|
| Pedido de SOS (para psicólogos) | — | Sim |
| Pedido, confirmação, recusa, nova proposta e cancelamento de consulta | Sim | Sim |
| Lembrete de consulta (24 h e 1 h) | Sim | Sim |
| "Estão esperando você na consulta" | Sim | Sim |
| Consulta não realizada / interrompida | Sim | Sim |
| Mensagem de chat | Sim | Sim |
| Acompanhamento 24 h depois do SOS | Sim | Sim |
| SOS redirecionado (para o psicólogo) | Sim | Sim |
| Conquista desbloqueada | Sim | — |
| Novo psicólogo para aprovar (admin) | Sim | — |
| Lembretes de hábitos | — | Sim |

## Onde está no código

- **Telas e componentes**: `src/pages/Notifications.tsx`, `src/components/notifications/`, `src/components/PushNotificationToggle.tsx`, `src/components/PushBridge.tsx` (toque no aviso, aviso com o app aberto, renovação do token).
- **Hooks e libs**: `useNotifications` (uma cópia para o app inteiro), `usePushNotifications`, `src/lib/pushTarget.ts`, `src/lib/pushToken.ts`, `src/lib/firebase.ts`, `src/lib/browserNotifications.ts`.
- **Service worker**: `public/firebase-messaging-sw.js`. Ele recebe a configuração do Firebase pela URL de registro (`firebaseServiceWorkerUrl()`), então não é preciso colar chaves nesse arquivo.
- **Edge functions**: `_shared/fcm.ts` (envio ao Firebase, compartilhado), `firebase-notifications`, `notification-push` (fila, a cada minuto), `habit-reminders`, `emergency-sos`.
- **Banco**: `notifications` (`push`, `push_text`, `push_sent_at`, `push_attempts`, `push_claimed_at`, `link`), `fcm_tokens`, `notification_logs`. Funções: `register_push_token`, `claim_pending_pushes`, `finish_pushes`, `purge_old_notifications`. Gatilhos: `a_guard_notification_client_update` (pelo app só muda lida/não lida), `set_notification_push_text`.

## Como validar

### Teste manual (precisa de celular)
1. No celular, entrar como paciente e ativar **Notificações push** no perfil.
2. **Fechar o app** por completo.
3. De outra conta, mandar uma mensagem no chat → em até 1 minuto chega o push "Nova mensagem".
4. Tocar no push → abre a própria conversa. O texto na tela bloqueada não diz quem mandou.
4a. Com o app aberto em outra tela, chega um aviso → aparece com "Abrir".
4b. Marcar um aviso como lido na tela de avisos → o número do sino baixa na hora.
5. Psicólogo: ativar push, fechar o app; um paciente abre SOS → push imediato.
6. Sair da conta no celular e mandar nova mensagem → **não** chega push nesse aparelho.

### Testes automáticos
`pushToken`, `chatBrowserNotifications`, `notifications` (contador único, tempo real, páginas, excluir), `fcmMessage` (SOS urgente, link só do app, token morto x falha passageira).

### Conferência no banco
```sql
-- Aparelhos com push ativo de uma pessoa
select token, is_active, updated_at from fcm_tokens where user_id = '<id>';

-- Pushes pendentes ou presos (devem sair em até 1 minuto; até 3 tentativas)
select id, title, created_at, push_attempts, push_claimed_at, push_sent_at from notifications
where push and push_sent_at is null order by created_at desc limit 20;

-- A rotina do push está rodando?
select status, start_time, return_message from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'notification-push')
order by start_time desc limit 5;
```

## Pendências

- **Conferir a configuração do Firebase** (pendência 3): variáveis `VITE_FIREBASE_*` do app e a conta de serviço nos secrets (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). Sem isso, o botão de push some e tudo continua só no app. Passo a passo em `docs/push-notifications-setup.md`.
- Ainda não foi testado num celular real com o app fechado.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Botão "Notificações push" não aparece | Firebase não configurado no app, ou navegador sem suporte (iPhone fora do app instalado) | Variáveis `VITE_FIREBASE_*` |
| Ativou, mas não chega nada | Token não gravado, rotina parada ou conta de serviço errada | `fcm_tokens`; pushes presos (SQL acima); logs da edge function `firebase-notifications` |
| Push chega duas vezes | Dois aparelhos ou dois navegadores ativos | `fcm_tokens` da pessoa |
| Push não saiu (3 tentativas) | Firebase fora do ar ou conta de serviço errada | `push_attempts = 3` sem `push_sent_at`; logs de `notification-push` |
| Toque no push abre a tela inicial | Notificação sem `link` | Coluna `link` da notificação |
