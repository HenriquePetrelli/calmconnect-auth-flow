-- create_admin_account era SECURITY DEFINER e executável por qualquer
-- usuário autenticado (padrão do Postgres: EXECUTE para PUBLIC), sem
-- nenhuma checagem de quem chama — qualquer conta podia inserir linhas em
-- admin_users. Nada no app chama essa função: criar admin é um passo
-- manual no painel do Supabase (docs/creating-an-admin-account.md).
DROP FUNCTION IF EXISTS public.create_admin_account(text, text, text);