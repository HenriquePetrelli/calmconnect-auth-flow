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

## Resolvidas

_(nenhuma ainda)_
