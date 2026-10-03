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

## Melhorias sugeridas

### 4. Avaliação da consulta agendada

- **Situação:** o atendimento de SOS pede avaliação (estrelas) ao final; a consulta agendada não. A tela já tem o componente de estrelas, mas ele não está ligado a nada, e a tabela de consultas não guarda avaliação.
- **O que fazer:** pedir a avaliação ao paciente ao fim da consulta (ou ao abrir o app depois dela), guardar a nota e considerá-la na média do psicólogo.
- **Registrado em:** 2026-10-04.

## Resolvidas

_(nenhuma ainda)_
