# 15. Autocuidado: respiração, sons, comer com atenção e diário

> **Status:** Pronto.
> **Última verificação:** 2026-10-14 (varredura de funcionamento: tempo pelo relógio real com a tela bloqueada, sons param no tempo escolhido, terminar antes conta, registro único, diário sem duplicar e com rascunho). Antes: 2026-10-04.
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
3. O tempo corre pelo **relógio de verdade** (horário de término): com a tela apagada ou o app em segundo plano, a sessão não atrasa; ao voltar, já mostra o tempo certo (antes uma sessão de 5 min podia durar muito mais).
4. Durante a prática a **tela fica acesa** (Wake Lock, nos navegadores que permitem).
5. **"Terminar agora"** (botão quadrado): encerra e conta os minutos feitos (a partir de 1).
6. Na conclusão, registra a atividade "Respiração Guiada" e soma o tempo (`update_patient_activity_time`, até 240 min por sessão), **uma vez só** e só com 1 minuto ou mais.
7. A respiração de emergência também está dentro da fila do SOS ("Respirar"), sem sair dela.

### Sons
1. As faixas ficam no próprio app (`public/sounds/`):
   - Dormir: 432 Hz, piano, ruído rosa, chuva, ondas, ruído branco;
   - Focar: 528 Hz, pássaros, ruído marrom, clássica, harpa;
   - Meditar: aum, binaural, gregoriano, tibetano, cachoeira.
2. O catálogo está em `src/data/soundsData.ts`.
3. O tempo da sessão corre também com a **tela bloqueada**: o som para na hora escolhida (antes o tempo congelava em segundo plano e o som de "Dormir" tocava a noite inteira).
4. Ao terminar, a tela "Como você se sente?" registra a atividade e soma o tempo ouvido, **uma vez por sessão** (voltar ou recarregar a tela não soma de novo). Na playlist, conta o tempo de todas as faixas ouvidas.
5. **Sair antes** com 1 minuto ou mais ouvido também leva a "Como você se sente?" e conta o tempo ouvido.

### Comer com atenção
Exercício guiado de cerca de 3 min, em etapas (`src/lib/mindfulEating.ts`). Também aparece em Respiração → Outras práticas.

### Diário privado
- Texto e humor do momento.
- **Limite de 2 anotações por dia**, contado no horário de Brasília e conferido também no banco (gatilho `enforce_journal_daily_limit`, que também impede data retroativa). Ao atingir o limite, aparece um aviso só, e a janela continua aberta com o texto digitado.
- Só o paciente lê. Nem o psicólogo nem o admin veem.
- **Rascunho**: o texto de uma anotação nova fica guardado no aparelho; fechar a janela sem querer ou falhar o envio não perde nada. Sai ao salvar ou ao sair da conta.
- **Sem duplicar**: a anotação nova leva um id gerado no aparelho; salvar de novo depois de uma resposta perdida não cria outra (nem gasta o limite do dia).

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
`privateJournal` (limite do dia, aviso único, mensagem do servidor, mesmo id sem duplicar), `selfCareReliability` (respiração pelo relógio real com a tela apagada, "Terminar agora", registro único; sons sem somar de novo). Respiração e sons são cobertos indiretamente por `statisticsEngagementCards`, `usePatientEngagementMetrics` e `progressFeedAchievements`.

### Conferência no banco
```sql
select total_guided_breathing_time, total_therapeutic_sound_time from patient_statistics where patient_id = '<id>';
select criado_em, humor from private_journals where user_id = '<id>' order by criado_em desc limit 10;
```

## Pendências

Nenhuma conhecida.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Som não toca | Navegador bloqueia áudio sem toque do usuário, ou arquivo não carregou | Tocar no play de novo; aba Rede (`/sounds/...mp3`) |
| Tempo não soma | Saiu com menos de 1 minuto | Esperado: conta a partir de 1 minuto (concluindo, terminando antes ou saindo do som) |
| Tela apaga na respiração | Navegador sem Wake Lock (iPhone antigo) ou modo economia | Ajustar o bloqueio automático do celular |
| "Limite diário de 2 anotações" | Regra do diário | Esperado |
