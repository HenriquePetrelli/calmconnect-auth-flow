# 01. Cadastro, login, senha e perfis

> **Status:** Pronto, com pendência externa (SMTP e modelos de e-mail; ajustes de senha no painel do Supabase).
> **Última verificação:** 2026-10-04.
> **Quem usa:** todos.

## Resumo

Existem três perfis: **paciente**, **psicólogo** e **admin**. O paciente se cadastra e já usa o app. O psicólogo se cadastra, envia o documento do CRP e só atende depois que o admin aprova. O admin não tem cadastro pelo app: a conta é criada à mão no Supabase (`docs/creating-an-admin-account.md`).

## Telas

| Rota | Tela |
|---|---|
| `/` | Login |
| `/signup-type` | Escolha entre paciente e psicólogo |
| `/patient-signup` | Cadastro do paciente |
| `/psychologist-signup` | Cadastro do psicólogo (com envio de documento: a conta é criada primeiro e o documento vai para a pasta da pessoa no bucket `documents`) |
| `/reset-password` | Nova senha (link enviado por e-mail) |
| `/profile`, `/account-settings` | Perfil e "Alterar dados da conta" do paciente |
| `/psychologist-profile` | Perfil do psicólogo |

## Como funciona

### Cadastro do paciente
1. Escolhe "Sou paciente" e preenche nome, e-mail, senha, sintomas ("O que você tem sentido?") e, se tiver, o **código da empresa**.
2. Marca "Tenho 18 anos ou mais", aceita Termos e Política e dá o consentimento para dados de saúde.
3. O Supabase cria o login. Um gatilho no banco cria o perfil (`profiles`, `patients`) e grava os aceites em `legal_acceptances`, com versão e data.
4. Se houver código de empresa válido, o paciente já entra no plano da empresa (ficha 10).

### Cadastro do psicólogo
1. Preenche dados profissionais (CRP, CPF, especialidade, cidade, área de atendimento) e envia o documento (PDF, JPG ou PNG).
2. O documento vai para o storage. A função `create_psychologist_profile` cria o cadastro como **pendente**.
3. O admin recebe notificação e analisa em **Painel → Psicólogos** (ficha 19).
4. Se aprovado, o psicólogo passa a entrar no painel. Se recusado, recebe o motivo por e-mail e o cadastro é apagado depois de alguns dias pela rotina `psychologist-cleanup-daily`.

### Login
1. E-mail e senha. O app descobre o tipo de conta **no banco** (admin, psicólogo aprovado ou paciente) e leva à área certa: `/admin-dashboard`, `/psychologist-dashboard` ou `/home`.
2. Conta bloqueada pelo admin vê o motivo e até quando vale o bloqueio.
3. Psicólogo em análise vê "Seu cadastro ainda está sendo analisado"; recusado vê o aviso de recusa.

### Recuperar senha
"Esqueci a senha" manda um e-mail com link para `/reset-password`. Ali a pessoa define a nova senha. Link vencido ou já usado mostra o aviso e permite pedir outro.

O e-mail (e os outros e-mails de login: confirmar cadastro, trocar e-mail, convite, link e código) é do Supabase, com os modelos em português e a logo do Soliv de `supabase/templates/`. A configuração no painel está em `docs/emails-de-autenticacao.md`.

### Sair
Desativa o push daquele aparelho e encerra a sessão em todos os aparelhos. Se o servidor falhar, encerra pelo menos no aparelho atual e sempre volta para o login. O psicólogo fica **offline** na hora, saindo da fila do SOS.

## Regras

- **Senha nova** (cadastro, troca e recuperação): mínimo de 8 caracteres, com letras e números (`src/lib/password.ts`). Quem já tem conta com senha de 6 caracteres continua entrando.
- **O tipo de conta vem só do banco**, nunca de dados que o próprio usuário edita (`user_metadata`).
- **Rotas protegidas**: `RouteGuard` deixa cada tipo de conta ver só as suas telas e manda para o login quem não está logado.
- **Psicólogo não aprovado** não acessa o painel nem a fila do SOS. A fila é bloqueada também no banco (ficha 20).
- **Ninguém muda a própria aprovação, bloqueio ou nota.** O banco ignora essas colunas quando a alteração vem do próprio usuário.
- **CRP e CPF** de psicólogo já aprovado não mudam sem nova análise.

## Onde está no código

- **Telas**: `src/pages/Index.tsx`, `SignupType.tsx`, `PatientSignUp.tsx`, `PsychologistSignUpPublic.tsx`, `ResetPassword.tsx`, `AccountSettings.tsx`, `Profile.tsx`, `PsychologistProfile.tsx`.
- **Componentes**: `src/components/LoginForm.tsx`, `SignUpForm.tsx`, `RouteGuard.tsx`, `legal/LegalAcceptanceGate.tsx`.
- **Sessão e tipo de conta**: `src/contexts/AuthContext.tsx` (`getUserType`, `signOut`).
- **Cadastro do psicólogo**: `src/services/psychologist.service.ts`.
- **Banco**: `profiles`, `patients`, `psychologists`, `psychologist_registrations`, `legal_acceptances`, `admin_users`. Funções: `is_super_admin`, `get_psychologist_rejection_status`, `create_psychologist_profile`, `psychologist_can_attend`.
- **Gatilhos de proteção**: `a_guard_psychologist_client_write`, `a_guard_patient_client_write`, `prevent_user_type_change`.

## Como validar

### Teste manual
1. **Cadastro de paciente** com senha `abc123` → recusa ("precisa ter pelo menos 8 caracteres"). Com `calma2024` → cria a conta e entra na Home.
2. **Login com senha errada** → "Email ou senha incorretos".
3. **Recuperar senha**: pedir o link, abrir, definir a nova senha, entrar com ela.
4. **Sair** → volta para o login; voltar no navegador não reabre a área logada.
5. **Cadastro de psicólogo** → tentar entrar → "em análise". Aprovar no admin → entrar → painel do psicólogo.
6. **Documento do psicólogo**: cadastrar com um PNG ou PDF → cadastro concluído e o admin abre o documento. Escolher um arquivo `.docx` ou de 6 MB → o campo fica vermelho com o motivo e o cadastro não é enviado.
7. **Bloqueio**: o admin bloqueia um paciente por 1 dia → o paciente vê o motivo ao entrar. Desbloquear → entra normalmente.
8. **Rotas**: logado como paciente, abrir `/admin-dashboard` → é redirecionado.

### Testes automáticos
`loginForm`, `signOut`, `resetPassword`, `password`, `legal`, `sintomas`, `psychologistOfflineOnSignOut`, `adminNav`. Rodar com `npx vitest run src/test/loginForm.test.tsx` (e os demais).

### Conferência no banco
```sql
-- Tipo de conta e aprovação de um e-mail
select u.email, p.user_type, ps.approved, ps.approval_status, ps.is_blocked
from auth.users u
left join profiles p on p.user_id = u.id
left join psychologists ps on ps.user_id = u.id
where u.email = 'pessoa@exemplo.com';

-- Aceites legais gravados no cadastro
select document, version, accepted_at from legal_acceptances
where user_id = (select id from auth.users where email = 'pessoa@exemplo.com');
```

## Pendências

- **No painel do Supabase** (Authentication), item 6 de `docs/pendencias-antes-do-lancamento.md`: senha mínima 8, "Leaked password protection", "Confirm email" ligado e verificação em duas etapas para admin. Enquanto isso não for feito, alguém que chame a API direto, sem passar pelo app, consegue criar conta com senha de 6 caracteres.
- **Senha do admin exposta** numa migração antiga (pendência crítica 1). É preciso trocar a senha.
- **E-mails de login** (pendência crítica 2): o Soliv ainda não tem domínio; sem ele não há SMTP próprio e o e-mail de redefinir senha só chega para a equipe do projeto, em inglês. Passo a passo em `docs/emails-de-autenticacao.md`.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| "Confirme seu email antes de fazer login" | Conta criada, e-mail não confirmado | Caixa de spam; em Authentication → Users, a coluna "confirmed" |
| Psicólogo aprovado continua vendo "em análise" | `psychologists.approved`/`approval_status` ou `psychologist_registrations.status` não atualizados | SQL acima; reaprovar pelo painel |
| Depois de sair, volta logado | Sessão local não apagada (corrigido em 2026-10-03) | Limpar os dados do site; conferir se a versão publicada é a atual |
| Admin vê a Home de paciente | Conta sem linha ativa em `admin_users` | `select * from admin_users where user_id = ...` |
| Tela pede o aceite dos Termos de novo | A versão de um documento legal mudou | Esperado; `src/lib/legal.ts` |
