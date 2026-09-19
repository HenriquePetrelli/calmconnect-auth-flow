# Fase 8 — Microcopy proposto (🛑 aguardando aprovação)

Nenhuma destas mudanças foi aplicada ainda — o plano pede para apresentar a tabela e aplicar só depois da aprovação do Henrique. Achados a partir de uma varredura das telas principais, com atenção especial às áreas que o plano pede (metas, conquistas/sequências, erros, espera do SOS, "ninguém atendeu", encerramento de chamada).

**Confirmado de novo nesta fase:** não há texto de culpa/pressão em metas semanais, conquistas ou sequências — a Fase 0 já não tinha achado nada, e a varredura desta fase (incluindo o conteúdo das conquistas/metas, que vem do banco) confirma. `GoalCompletionModal.tsx` e `AchievementModal.tsx` já são bem escritos (ver `08-tom-de-voz.md`). As oportunidades abaixo são pontuais, concentradas em telas de erro técnico e na tela de espera do SOS.

## Tabela

| # | Onde | Texto atual | Texto proposto | Arquivo |
|---|---|---|---|---|
| 1 | Chamada — sessão não encontrada (título) | "Sessão Não Encontrada" | "Não encontramos essa chamada" | `src/components/EmergencyVideoCall.tsx` |
| 2 | Chamada — sessão não encontrada (descrição) | "ID da sessão não foi fornecido ou é inválido." | "O link que você usou pode estar incompleto. Volte para o início e tente novamente." | `src/components/EmergencyVideoCall.tsx` |
| 3 | Chamada — falha ao iniciar (título) | "Não conseguimos iniciar a chamada" | mantém — já está bom | `src/components/EmergencyVideoCall.tsx` |
| 4 | Chamada — falha ao iniciar (descrição) | "Verifique se o navegador liberou o acesso à câmera e ao microfone e se nenhum outro aplicativo está usando esses dispositivos." | "Verifique se o navegador tem permissão para usar sua câmera e microfone, e feche outros apps que possam estar usando esses dispositivos." | `src/components/EmergencyVideoCall.tsx` |
| 5 | Chamada — toast de erro de inicialização (título) | "Erro na Inicialização" | "Não foi possível conectar" | `src/components/EmergencyVideoCall.tsx` |
| 6 | SOS — ninguém atendeu (título) | "Nenhum profissional pôde atender" | "Ainda não encontramos um profissional livre" | `src/pages/SOS.tsx` |
| 7 | SOS — ninguém atendeu (descrição) | "Sua solicitação expirou após o tempo máximo de espera. Você pode tentar novamente ou usar os recursos de apoio abaixo." | "Você não está sozinho. Tente de novo ou use uma das opções abaixo enquanto isso." | `src/pages/SOS.tsx` |
| 8 | SOS — cancelar busca (descrição) | "Você será redirecionado para a tela inicial." | "Você volta para a tela inicial." | `src/components/sos/CancelConfirmationModal.tsx` |
| 9 | Conquistas — erro ao carregar (toast) | "Erro ao carregar conquistas" / "Tente novamente mais tarde" | "Não foi possível carregar suas conquistas" / "Tente de novo em instantes" | `src/hooks/useAchievements.ts` |

## Fora do escopo de edição de arquivo — requer nova migration

Os títulos/descrições das metas semanais padrão vêm do banco (`default_weekly_goals`, seed em `supabase/migrations/20251009045716_...sql`), não de um arquivo `.tsx`. Já são neutros e sem cobrança, mas escritos no imperativo ("Respirar conscientemente...", "Concluir minha consulta...") em vez de em primeira/segunda pessoa mais pessoal. Oportunidade menor, opcional — incluída aqui para registro, mas só faz sentido aplicar junto com qualquer outra mudança de dados que a Fase 8 aprovar, já que exige uma migration nova, não uma edição de código:

| Categoria | Atual | Proposto |
|---|---|---|
| breathing | "Respirar conscientemente 5x nesta semana" | "Respire conscientemente 5 vezes esta semana" |
| sound | "Ouvir sons relaxantes 15 minutos por dia" | "Ouça sons relaxantes por 15 minutos ao dia" |
| support_group | "Participar de 1 grupo de apoio esta semana" | "Participe de 1 grupo de apoio esta semana" |
| journal | "Registrar 3 pensamentos positivos durante a semana" | "Registre 3 pensamentos positivos esta semana" |
| mood | "Registrar meu humor todos os dias desta semana" | "Registre seu humor todos os dias desta semana" |
| appointment | "Concluir minha consulta agendada" | "Compareça à sua consulta agendada" |

## Testes a ajustar se a tabela principal for aprovada

Nenhum dos 9 arquivos de teste que comparam texto exato (`docs/visual/00-inventario.md` §11) referencia os textos acima — conferido antes de propor. Nenhum ajuste de teste necessário para os itens 1-9.
