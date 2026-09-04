# Como ativar notificações push

O código já está todo pronto — falta só criar um projeto Firebase gratuito e colar as credenciais em dois lugares. Sem isso, o toggle "Notificações push" simplesmente não aparece nas telas de perfil (o app detecta que não está configurado e some com o botão, não quebra nada).

## Passo 1 — Criar o projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e crie um projeto novo (pode ser o plano gratuito Spark).
2. Dentro do projeto, vá em **Build → Cloud Messaging** e confirme que está habilitado (já vem habilitado por padrão).
3. Em **Configurações do projeto (ícone de engrenagem) → Geral**, role até "Seus apps" e clique em "Adicionar app" → ícone `</>` (Web). Dê um nome qualquer e registre — não precisa do Firebase Hosting.
4. Copie o objeto `firebaseConfig` que aparece (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
5. Ainda em Configurações do projeto, aba **Cloud Messaging**, role até "Certificados push da Web" e gere um par de chaves — essa é a `VITE_FIREBASE_VAPID_KEY`.

## Passo 2 — Configurar o frontend (2 arquivos)

**`.env`** (na raiz do repo) — preencha os 7 valores que já estão lá como placeholder:

```
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
VITE_FIREBASE_VAPID_KEY="..."
```

**`public/firebase-messaging-sw.js`** — cole os mesmos 6 valores do `firebaseConfig` (sem o VAPID key, esse só vai no `.env`) no bloco `firebase.initializeApp({...})` no topo do arquivo. É obrigatório duplicar: um service worker não consegue ler variáveis de ambiente do Vite.

Nenhum desses 7 valores é secreto — são os mesmos que qualquer app Firebase Web expõe no navegador de qualquer usuário. Não tem problema esse arquivo estar versionado.

## Passo 3 — Configurar o backend (Supabase)

A edge function `firebase-notifications` é quem realmente envia o push, e para isso precisa de uma **service account** (essa sim é secreta — nunca vai para o frontend):

1. No console do Firebase: **Configurações do projeto → Contas de serviço → Gerar nova chave privada**. Baixa um arquivo `.json`.
2. No painel do Supabase: **Edge Functions → Secrets**, adicione três segredos a partir desse JSON:
   - `FIREBASE_PROJECT_ID` → campo `project_id` do JSON
   - `FIREBASE_CLIENT_EMAIL` → campo `client_email` do JSON
   - `FIREBASE_PRIVATE_KEY` → campo `private_key` do JSON (cole exatamente como está, com os `\n` — o código já trata isso)
3. Apague o `FIREBASE_SERVER_KEY` antigo se ainda existir como secret — não é mais usado (a API legada dele foi desativada pelo Google em 2024; a função foi reescrita para a API v1, que usa a service account).

## O que já está ligado a push hoje

- **SOS**: quando um paciente abre uma nova solicitação de emergência, os psicólogos que estão online (`psychologist_presence`, últimos 3 minutos) recebem um push imediatamente — mesmo com o painel fechado. É o único caso com uso real hoje; os outros tipos de notificação (mensagem, consulta, conquista) continuam só em app aberto/Web Notifications, como já funcionavam.
- Cada usuário ativa em **Perfil → Configurações → Notificações push** (paciente e psicólogo). O toggle pede a permissão do navegador, registra o token no Supabase (`fcm_tokens`) e a partir daí a Edge Function consegue te achar.
- Tokens que o Firebase reporta como inválidos (app desinstalado, permissão revogada) são desativados automaticamente na tabela — nada de repetir envio pra um token morto.

## Para ligar push em outros eventos

Qualquer edge function que já cria uma notificação in-app pode adicionar o mesmo padrão usado em `emergency-sos/index.ts`: buscar os tokens ativos do destinatário em `fcm_tokens` e chamar `supabase.functions.invoke('firebase-notifications', { body: { title, body, tokens, data } })` — best-effort, nunca deve derrubar o fluxo principal se o push falhar.
