# 15. Autocuidado: respiração, sons, comer com atenção e diário

> **Status:** Funciona, sem varredura recente. Revisado no levantamento do paciente de 2026-09-03; comer com atenção é de 2026-10-03. Faça o teste manual abaixo antes do lançamento.
> **Última verificação:** 2026-10-04 (só os limites de tempo registrado e a proteção das funções de estatística).
> **Quem usa:** paciente.

## Resumo

Ferramentas para usar sozinho, a qualquer hora:

- **Respiração guiada**: 9 técnicas.
- **Biblioteca de sons**: 16 faixas em 3 categorias.
- **Comer com atenção**: exercício de 3 minutos.
- **Diário privado**: até 2 anotações por dia, só o paciente lê.

Tudo conta para as metas da semana, conquistas e Meu progresso (ficha 12).

## Telas

| Rota | Tela |
|---|---|
| `/breathing` | Respiração: escolher técnica, praticar, tela de conclusão; "Outras práticas" |
| `/sounds` | Biblioteca de sons |
| `/sounds/category/:categoryId`, `/sounds/subcategory/:subcategoryId` | Categorias (Dormir, Focar, Meditar) |
| `/sounds/player/:soundId`, `/sounds/player/playlist/:playlistId` | Player, com animação escolhível |
| `/sounds/feedback` | "Como você se sente?" ao terminar |
| `/comer-com-atencao` | Exercício guiado de comer com atenção |
| `/journal` | Diário privado, com filtro por humor |

## Como funciona

### Respiração guiada
1. Escolhe a técnica: 4-7-8, Equilibrada, Box Breathing, Tática, Profunda, de Emergência, Alternada e outras. Cada uma tem os tempos de inspirar, segurar, expirar e pausar que as próprias instruções prometem.
2. Prática com animação e frases por fase.
3. Na conclusão, registra a atividade "Respiração Guiada" e soma o tempo (`update_patient_activity_time`, até 240 min por sessão).
4. A respiração de emergência também está dentro da fila do SOS ("Respirar"), sem sair dela.

### Sons
1. As faixas ficam no próprio app (`public/sounds/`):
   - Dormir: 432 Hz, piano, ruído rosa, chuva, ondas, ruído branco;
   - Focar: 528 Hz, pássaros, ruído marrom, clássica, harpa;
   - Meditar: aum, binaural, gregoriano, tibetano, cachoeira.
2. O catálogo está em `src/data/soundsData.ts`.
3. Ao terminar, a tela "Como você se sente?" registra a atividade e soma o tempo ouvido.

### Comer com atenção
Exercício guiado de cerca de 3 min, em etapas (`src/lib/mindfulEating.ts`). Também aparece em Respiração → Outras práticas.

### Diário privado
- Texto e humor do momento.
- **Limite de 2 anotações por dia**, contado no horário de Brasília. Ao atingir o limite, a janela continua aberta com o texto digitado, para não perder o que foi escrito.
- Só o paciente lê. Nem o psicólogo nem o admin veem.

## Onde está no código

- **Respiração**: `src/pages/GuidedBreathing.tsx`, `src/components/breathing/` (`BreathingPatterns.ts`, `PatternSelector`, `PracticeScreen`, `BreathingOrb`, `CompletionScreen`), `useBreathingPhase`.
- **Sons**: `src/pages/SoundsLibrary.tsx`, `SoundCategory.tsx`, `SoundPlayer.tsx`, `SoundFeedback.tsx`, `src/data/soundsData.ts`, `src/lib/soundPrefetch.ts`, `useAudioAnalyser`.
- **Comer com atenção**: `src/pages/MindfulEating.tsx`, `src/lib/mindfulEating.ts`.
- **Diário**: `src/pages/PrivateJournal.tsx`, `src/components/journal/`, `usePrivateJournal`.
- **Banco**: `private_journals` (só do dono), `patient_statistics` (tempos). Funções: `add_patient_activity`, `update_patient_activity_time`.

## Como validar

### Teste manual
1. Fazer uma respiração 4-7-8 até o fim → tela de conclusão → em Meu progresso, o tempo de respiração aumenta e aparece "Respiração Guiada" no histórico.
2. Tocar um som de cada categoria → o áudio toca. Testar no celular com a tela bloqueada, se fizer parte da expectativa.
3. Terminar um som → "Como você se sente?" → o tempo de sons aumenta.
4. Fazer o exercício de comer com atenção até o fim.
5. Escrever 2 anotações no diário → a 3ª no mesmo dia é recusada com aviso e o texto fica na janela.
6. Logado como psicólogo, confirmar que não existe acesso ao diário do paciente.

### Testes automáticos
Não há testes específicos destas telas. São cobertos indiretamente por `statisticsEngagementCards`, `usePatientEngagementMetrics` e `progressFeedAchievements`.

### Conferência no banco
```sql
select total_guided_breathing_time, total_therapeutic_sound_time from patient_statistics where patient_id = '<id>';
select criado_em, humor from private_journals where user_id = '<id>' order by criado_em desc limit 10;
```

## Pendências

- Sem testes automáticos próprios. Vale o teste manual antes do lançamento.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Som não toca | Navegador bloqueia áudio sem toque do usuário, ou arquivo não carregou | Tocar no play de novo; aba Rede (`/sounds/...mp3`) |
| Tempo não soma | Saiu antes da tela de conclusão ou do feedback | Esperado: só conta ao concluir |
| "Limite diário de 2 anotações" | Regra do diário | Esperado |
