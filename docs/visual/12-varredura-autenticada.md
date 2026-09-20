# Varredura pós-plano — tentativa de verificação autenticada

Feito em 2026-09-20, depois da sincronização com a revisão do Lovable (ver `plano.md`, seção "Revisão pós-plano via Lovable").

## 1. Bloqueio de rede — achado, não contornado

Com as credenciais fornecidas pelo Henrique (`paciente01@gmail.com`, `psicologo01@gmail.com`, `admin@admin.com`), tentei login real via Playwright contra o Supabase de produção do projeto. O login falha sempre com `ERR_TUNNEL_CONNECTION_FAILED` / `TypeError: Failed to fetch`.

Causa raiz confirmada em `curl http://127.0.0.1:38217/__agentproxy/status` (`recentRelayFailures`): o proxy de saída deste ambiente **recusa (403) a conexão `CONNECT` para `ihrrgmmsfuvlasmzdmwf.supabase.co:443`** — é uma negação de política de rede do sandbox, não um bug de código nem de configuração do navegador. Pelas próprias regras deste ambiente, uma negação 403 do proxy deve ser reportada, não contornada (não se tenta rotear por fora, nem desabilitar verificação TLS).

**Consequência prática:** nenhuma sessão neste sandbox consegue completar um login real contra o backend do Soliv, independente das credenciais usadas. A verificação das telas autenticadas (Home, SOS, Consultas, Chat, dashboards de psicólogo/admin etc.) por screenshot real, logado, **não é possível a partir daqui**. Precisaria rodar num ambiente sem essa restrição de egress (ex. localmente na máquina do Henrique, ou um ambiente com o host do Supabase liberado na política).

## 2. O que foi possível verificar

As 4 telas públicas (não exigem rede além do próprio dev server) foram varridas em claro e escuro, 390px:

- `/` (Login)
- `/signup-type`
- `/patient-signup`
- `/psychologist-signup`

Screenshots em `docs/visual/screenshots/sweep-2026-09-20/`. Nenhum problema visual encontrado: roxo consistente como `--primary` em ambos os temas, sem laranja fora do SOS, contraste bom em claro e escuro, sem quebra de layout. O toast "Erro ao carregar estados" nos formulários de cadastro é o mesmo bloqueio de rede da seção 1 (a lista de estados vem de uma function/API), não um bug do formulário.

## 3. Pendência

A verificação das telas autenticadas (a mais relevante: modo escuro nelas, fileiras de ícones densas em `PsychologistDashboard.tsx`/`AdminDashboard.tsx`, e o botão de SOS ausente em `SoundPlayer.tsx` — já listados em `11-verificacao.md` §5) continua pendente, agora por uma razão nova e específica: bloqueio de rede do ambiente, não falta de credenciais. `scripts/sweep.mjs` fica no repositório pronto para rodar assim que houver acesso de rede ao Supabase (local, ou outro ambiente).
