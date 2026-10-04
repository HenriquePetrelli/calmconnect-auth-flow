# 07. Notificações no app e push

> **Status:** Pronto, com pendência externa (conferir a configuração do Firebase e testar num celular).
> **Última verificação:** 2026-10-04.
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
2. **Criar uma notificação**: quase todo aviso nasce como linha em `notifications`, criada por função do banco ou edge function. Quando precisa de push, vai com `push = true` e `link` (a tela que abre ao tocar).
3. **Enviar o push**: a cada minuto, a rotina `notification-push` pega os pendentes (`claim_pending_pushes`, sem enviar duas vezes) e chama a edge function `firebase-notifications`, que fala com o Firebase (API v1).
4. **SOS**: o pedido de emergência manda push direto a todos os psicólogos aprovados, não bloqueados e livres (não só aos online), sem esperar a rotina do minuto.
5. **Hábitos**: a rotina `habit-reminders` (a cada 15 min) decide quem lembrar (ficha 11).
6. **Tocar no push**: abre a tela do `link`. Só são aceitos caminhos do próprio app, nunca outro site.
7. **Tokens mortos** (app desinstalado, permissão revogada) são desativados automaticamente.
8. **Sair da conta** desativa o token daquele aparelho, para outra pessoa não receber os avisos de quem saiu.

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

- **Telas e componentes**: `src/pages/Notifications.tsx`, `src/components/notifications/`, `src/components/PushNotificationToggle.tsx`.
- **Hooks e libs**: `useNotifications`, `usePushNotifications`, `src/lib/pushToken.ts`, `src/lib/firebase.ts`, `src/lib/browserNotifications.ts`.
- **Service worker**: `public/firebase-messaging-sw.js`. Ele recebe a configuração do Firebase pela URL de registro (`firebaseServiceWorkerUrl()`), então não é preciso colar chaves nesse arquivo.
- **Edge functions**: `firebase-notifications` (envio), `notification-push` (fila, a cada minuto), `habit-reminders`, `emergency-sos`.
- **Banco**: `notifications` (`push`, `push_sent_at`, `link`), `fcm_tokens`. Funções: `register_push_token`, `claim_pending_pushes`.

## Como validar

### Teste manual (precisa de celular)
1. No celular, entrar como paciente e ativar **Notificações push** no perfil.
2. **Fechar o app** por completo.
3. De outra conta, mandar uma mensagem no chat → em até 1 minuto chega o push "Nova mensagem".
4. Tocar no push → abre o chat.
5. Psicólogo: ativar push, fechar o app; um paciente abre SOS → push imediato.
6. Sair da conta no celular e mandar nova mensagem → **não** chega push nesse aparelho.

### Testes automáticos
`pushToken`, `chatBrowserNotifications`.

### Conferência no banco
```sql
-- Aparelhos com push ativo de uma pessoa
select token, is_active, updated_at from fcm_tokens where user_id = '<id>';

-- Pushes pendentes ou presos (devem sair em até 1 minuto)
select id, title, created_at, push_sent_at from notifications
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
| Toque no push abre a tela inicial | Notificação sem `link` | Coluna `link` da notificação |
