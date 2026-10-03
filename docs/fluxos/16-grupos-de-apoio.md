# 16. Grupos de apoio

> **Status:** Funciona, sem varredura recente, com duas pendências pequenas de privacidade (ver Pendências).
> **Última verificação:** 2026-10-04 (políticas de acesso relidas para esta ficha). Anonimato e moderação revistos em 2026-09-24.
> **Quem usa:** paciente (lê, escreve, curte, denuncia) e admin (modera).

## Resumo

Grupos por tema (ex.: ansiedade, depressão) onde pacientes deixam depoimentos, que podem ser **anônimos** e ligados a um sintoma do grupo. Outros pacientes curtem ("me ajudou" e "não me ajudou") e podem denunciar. A moderação é **manual** pelo admin; nada é apagado automaticamente.

## Telas

| Rota | Tela |
|---|---|
| `/support-groups` | Lista de grupos, com favoritos |
| `/support-group/:groupId` | Depoimentos do grupo, escrever, curtir, denunciar |
| `/admin-dashboard` → Grupos | Moderação (ficha 19) |

## Como funciona

1. O paciente abre um grupo e lê os depoimentos (`get_group_testimonials`). Depoimento anônimo não traz nome nem identificação do autor na resposta.
2. **Escrever**: texto (até 3.000 caracteres), humor e, se quiser, um sintoma da lista do grupo, marcando ou não "Anônimo". O limite é 5 depoimentos por hora.
3. **Curtir**: "me ajudou" ou "não me ajudou", uma vez por depoimento, com limite de 60 por minuto.
4. **Denunciar** (`report_group_testimonial`): motivo e detalhes. Vai para a moderação.
5. **Admin**: lista todos com curtidas e denúncias, destaca os que chegaram a 10 "não me ajudou" e pode editar ou excluir.
6. **Favoritar** um grupo deixa ele no topo da lista.

## Onde está no código

- **Telas e componentes**: `src/pages/SupportGroups.tsx`, `SupportGroupDetail.tsx`, `src/components/support-groups/`.
- **Hooks**: `useSupportGroups`, `useGroupTestimonialModeration` (admin).
- **Banco**: `support_groups`, `group_testimonials`, `group_testimonial_likes`, `group_favorites`, `transtornos_sintomas`. Funções: `get_group_testimonials`, `report_group_testimonial`, `get_admin_group_testimonials`, `admin_update_testimonial`, `admin_delete_testimonial`, `admin_dismiss_testimonial_reports`.

## Como validar

### Teste manual
1. Paciente A escreve um depoimento **anônimo** → paciente B vê "Anônimo", sem nome.
2. Paciente B curte "me ajudou" → o contador sobe; curtir de novo não duplica.
3. Paciente B denuncia → o admin vê a denúncia na aba Grupos.
4. O admin edita o texto → todos veem o texto novo. O admin exclui → some.
5. Paciente A escreve 6 depoimentos seguidos → o 6º é recusado ("Muitas ações em pouco tempo").

### Testes automáticos
`useGroupTestimonials`, `useGroupTestimonialModeration`.

### Conferência no banco
```sql
select id, group_id, anonimo, likes_positivos, likes_negativos, criado_em
from group_testimonials order by criado_em desc limit 20;
```

## Pendências

Registradas também no item 7 de `docs/pendencias-antes-do-lancamento.md`.

- **Curtidas expõem quem curtiu** (achado em 2026-10-04): a tabela `group_testimonial_likes` pode ser lida inteira por qualquer usuário logado, com o ID de quem curtiu. Dá para saber quais pessoas interagem com quais grupos (ex.: depressão), um dado sensível. Correção: limitar a leitura às curtidas da própria pessoa e entregar só os totais pela função `get_group_testimonials`.
- **Contadores editáveis pelo autor** (baixo impacto): a política de edição do próprio depoimento não restringe colunas, então o autor pode alterar `likes_positivos` e `likes_negativos` do próprio texto pela API. Correção: gatilho que preserve esses contadores em alterações vindas do app.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Nome do grupo aparece genérico | Tela aberta direto (corrigido: busca no banco) | Versão publicada |
| Depoimento sumiu | Excluído pelo admin | `admin_audit_log` |
| "Muitas ações em pouco tempo" | Mais de 5 depoimentos por hora | Esperado |
