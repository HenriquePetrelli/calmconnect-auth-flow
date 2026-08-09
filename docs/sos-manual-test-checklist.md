# Checklist de Testes Manuais — Chamada SOS

Versão: 1.0 · Escopo: fluxo emergencial completo (paciente + psicólogo)

## Como usar

- Cada item tem **passo → resultado esperado**. Marque `[x]` só quando o resultado esperado for observado exatamente.
- Rode a suíte inteira em **cada combinação** da matriz abaixo. Anote defeitos com: ambiente, item do checklist, passo, o que aconteceu, print/vídeo e horário (para cruzar com os logs).
- Sempre teste com **duas pessoas/dispositivos reais** (um paciente, um psicólogo). Nunca valide chamada com as duas pontas na mesma máquina sem fones — o eco falseia o resultado.
- Ative o console do navegador: os logs `[SOS]`, `[WEBRTC]`, `[SESSION]`, `[TIMER]`, `[MEDIA]` aparecem apenas em ambiente de desenvolvimento e ajudam no diagnóstico.

## Matriz de ambientes

| # | Paciente | Psicólogo | Rede |
|---|----------|-----------|------|
| A | Chrome desktop | Chrome desktop | Wi-Fi |
| B | Safari macOS | Chrome desktop | Wi-Fi |
| C | Edge desktop | Safari macOS | Wi-Fi |
| D | Safari iOS (iPhone) | Chrome desktop | 4G/5G |
| E | Chrome Android | Safari macOS | 4G/5G |
| F | Chrome Android | Chrome Android | Wi-Fi + 4G |
| G | Safari iOS | Chrome Android | 4G/5G |

Prioridade mínima antes de subir para produção: **A, D, E**. As demais cobrem regressões de compatibilidade.

## Pré-condições

- [ ] Conta de paciente com assinatura ativa e SOS disponível no mês.
- [ ] Conta de psicólogo aprovada, não bloqueada.
- [ ] Nenhuma solicitação em aberto para o paciente (`emergency_requests` sem `pending`/`accepted`/`in_progress`).
- [ ] Permissões de câmera/microfone **resetadas** no navegador antes do item 1 de cada ambiente.
- [ ] Fones de ouvido disponíveis para o teste sem eco.

---

## 1. Permissões e mídia inicial

- [ ] **1.1** Paciente aciona SOS com permissões nunca concedidas → o navegador pede câmera e microfone antes da sala abrir.
- [ ] **1.2** Negar a permissão → mensagem clara em português explicando como reativar; **não** aparece erro técnico nem tela em branco.
- [ ] **1.3** Conceder depois de negar (recarregando a página) → entra na sala normalmente.
- [ ] **1.4** Entrar na sala → vídeo local aparece em até 3s, espelhado, sem congelar.
- [ ] **1.5** O áudio local **não** toca no próprio alto-falante (sem eco/microfonia).
- [ ] **1.6** iOS Safari: o vídeo local inicia sem exigir toque extra; não abre em tela cheia nativa do sistema.
- [ ] **1.7** Android Chrome: rotacionar o aparelho → layout se adapta e o vídeo continua rodando.

## 2. Microfone

- [ ] **2.1** Paciente muta → o ícone muda para estado mutado e o psicólogo **deixa de ouvir** (confirmar falando).
- [ ] **2.2** Paciente desmuta → o psicólogo volta a ouvir imediatamente, sem reconectar.
- [ ] **2.3** Repetir 2.1/2.2 cinco vezes seguidas rápido → estado final do ícone bate com o áudio real.
- [ ] **2.4** Mesmo teste partindo do psicólogo.
- [ ] **2.5** O indicador de "mutado" do outro participante aparece na tela de quem está ouvindo.
- [ ] **2.6** Mutar, sair da aba por 30s, voltar → continua mutado (estado não se perde).

## 3. Câmera

- [ ] **3.1** Desligar a câmera → o outro lado vê avatar/placeholder, nunca tela preta sem explicação.
- [ ] **3.2** Ligar a câmera de novo → o vídeo **volta a transmitir** (falha clássica: só volta o preview local).
- [ ] **3.3** Alternar câmera on/off cinco vezes → sempre volta; a luz do dispositivo acompanha o estado.
- [ ] **3.4** Mobile: trocar entre câmera frontal e traseira → o outro lado vê a troca sem queda de chamada.
- [ ] **3.5** Desligar câmera dos dois lados → áudio continua funcionando normalmente.

## 4. Alto-falante e saída de áudio

- [ ] **4.1** Desktop Chrome/Edge: trocar a saída de áudio nas configurações da chamada → o som passa para o dispositivo escolhido.
- [ ] **4.2** Safari: se a troca de saída não for suportada, a opção aparece desabilitada com explicação — nunca um erro.
- [ ] **4.3** Mobile: conectar fone Bluetooth durante a chamada → o áudio migra e continua audível.
- [ ] **4.4** Remover o fone durante a chamada → áudio volta ao alto-falante sem derrubar a chamada.
- [ ] **4.5** Volume do sistema em 0 e depois restaurado → áudio retorna sem reconectar.

## 5. Troca de dispositivo (hot-swap)

- [ ] **5.1** Desktop: com a chamada ativa, trocar o microfone nas configurações → o outro lado continua ouvindo, agora pelo novo microfone.
- [ ] **5.2** Trocar a câmera nas configurações → o outro lado vê a nova imagem, **sem** reconexão visível nem tela preta.
- [ ] **5.3** Desconectar fisicamente a webcam USB em uso → aviso amigável e possibilidade de escolher outro dispositivo.
- [ ] **5.4** Reconectar a webcam → aparece na lista e pode ser selecionada.
- [ ] **5.5** As preferências escolhidas persistem ao entrar em uma nova chamada.

## 6. Reconexão e queda de rede

- [ ] **6.1** Paciente ativa modo avião por 10s e desativa → aparece "Reconectando"/"conexão instável", e a chamada **volta sozinha**.
- [ ] **6.2** Durante a queda, o psicólogo vê aviso de instabilidade — e **não** vê "chamada encerrada".
- [ ] **6.3** Após reconectar, áudio e vídeo voltam nos dois sentidos.
- [ ] **6.4** Queda de 60s → ainda reconecta; se estourar o limite, a mensagem explica o que houve e oferece voltar à chamada.
- [ ] **6.5** Alternar Wi-Fi → 4G no meio da chamada → reconecta sem encerrar a sessão.
- [ ] **6.6** Queda do lado do psicólogo → mesmo comportamento simétrico.
- [ ] **6.7** Em nenhum caso a reconexão fica em loop infinito (observar por 2 minutos).
- [ ] **6.8** Após reconectar, o mute/câmera desligada que estavam ativos continuam respeitados.

## 7. Refresh, navegação e app fechado

- [ ] **7.1** Paciente dá F5 no meio da chamada → volta para a **mesma** chamada, não cria sessão nova.
- [ ] **7.2** O psicólogo não recebe aviso de encerramento durante esse refresh.
- [ ] **7.3** Paciente navega para outra página do app → aparece o banner "chamada em andamento" com botão para retornar.
- [ ] **7.4** Clicar em retornar → volta para a chamada ativa, com áudio e vídeo funcionando.
- [ ] **7.5** Fechar a aba e reabrir o app em até 1 min → o banner de chamada ativa aparece e permite voltar.
- [ ] **7.6** Mobile: minimizar o app por 30s e voltar → chamada continua ou reconecta; nunca encerra sozinha.
- [ ] **7.7** iOS: bloquear a tela por 30s e desbloquear → áudio retorna; se o vídeo pausar, retoma ao voltar ao app.
- [ ] **7.8** Abrir a mesma chamada em uma segunda aba → é bloqueado com aviso de sessão única; a primeira aba continua intacta.
- [ ] **7.9** Paciente tenta acionar um novo SOS com chamada em andamento → é redirecionado para a chamada existente, sem duplicar a solicitação.

## 8. Encerramento

- [ ] **8.1** Paciente clica em encerrar → aparece confirmação; **cancelar** mantém a chamada rodando normalmente.
- [ ] **8.2** Confirmar → a chamada encerra para os dois lados em poucos segundos.
- [ ] **8.3** Psicólogo encerra → etapa 1 confirmação, etapa 2 "a crise foi resolvida?" (Sim/Não + motivo + observações).
- [ ] **8.4** Responder "Não" exige motivo e permite observações; ambos são salvos.
- [ ] **8.5** Após encerrar, **a luz da câmera apaga** e o microfone é liberado no sistema operacional (verificar no indicador do SO/navegador).
- [ ] **8.6** Encerrar em ambiente mobile também libera câmera e microfone.
- [ ] **8.7** Os dois lados são redirecionados: paciente para a home, psicólogo para o painel.
- [ ] **8.8** Tentar voltar para a URL da chamada encerrada → mensagem de "chamada já finalizada", sem sala reaberta.
- [ ] **8.9** O atendimento aparece no histórico com status "Concluída" e quem encerrou.

## 9. Timeout de sessão

- [ ] **9.1** O contador aparece para os dois lados e mostra o **mesmo** tempo restante (tolerância de poucos segundos).
- [ ] **9.2** Refresh no meio → o contador retoma do tempo correto, não reinicia.
- [ ] **9.3** Durante uma queda de rede, o contador pausa e retoma do mesmo ponto após reconectar.
- [ ] **9.4** Aviso visível quando faltam poucos minutos.
- [ ] **9.5** Ao zerar → a chamada encerra automaticamente para os dois, com mensagem de tempo esgotado (não erro).
- [ ] **9.6** No histórico, o encerramento por tempo aparece com o motivo correto.

## 10. Feedback pós-chamada

- [ ] **10.1** Paciente vê a avaliação logo após o encerramento.
- [ ] **10.2** Enviar sem escolher estrelas → é impedido com mensagem clara.
- [ ] **10.3** Enviar com estrelas + "Sim/Parcialmente/Não" + comentário opcional → confirmação de sucesso.
- [ ] **10.4** Recarregar e tentar avaliar a mesma sessão de novo → **não** duplica nem mostra erro técnico.
- [ ] **10.5** Fechar a avaliação sem enviar → não trava o app; o paciente consegue navegar normalmente.
- [ ] **10.6** Psicólogo também consegue registrar sua avaliação da sessão.
- [ ] **10.7** Ficar offline e enviar a avaliação → mensagem amigável de falha, com possibilidade de tentar de novo.

## 11. Fila e concorrência (dois psicólogos)

- [ ] **11.1** Dois psicólogos online veem a mesma solicitação em tempo real.
- [ ] **11.2** Ambos clicam em aceitar quase juntos → apenas um entra; o outro vê "já foi aceita por outro profissional", sem erro técnico.
- [ ] **11.3** A solicitação aceita some da lista dos demais imediatamente.
- [ ] **11.4** Psicólogo offline não recebe solicitações; ao ficar online, passa a receber.
- [ ] **11.5** Paciente cancela antes do aceite → a solicitação some da fila dos psicólogos.
- [ ] **11.6** Solicitação sem aceite expira e sai da fila, com o paciente informado.

## 12. Acessibilidade e resiliência de interface

- [ ] **12.1** Todos os botões da chamada são alcançáveis por teclado (Tab) com foco visível.
- [ ] **12.2** Botões de mutar/câmera/encerrar têm rótulo acessível.
- [ ] **12.3** Nenhuma mensagem exibida ao usuário contém texto técnico (código de erro, nome de tabela, stack).
- [ ] **12.4** Modo escuro e claro: contraste adequado em todos os controles e avisos.
- [ ] **12.5** Telas pequenas (≤360px de largura): controles não se sobrepõem ao vídeo.

---

## Registro de execução

| Ambiente | Data | Testador | Itens falhos | Observações |
|----------|------|----------|--------------|-------------|
| A | | | | |
| B | | | | |
| C | | | | |
| D | | | | |
| E | | | | |
| F | | | | |
| G | | | | |

**Critério de liberação:** zero falhas nas seções 2, 3, 6, 7, 8 e 9 nos ambientes A, D e E.
