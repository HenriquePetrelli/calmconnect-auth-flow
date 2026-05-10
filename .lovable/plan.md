# Refatoração da Chamada SOS — Padrão Google Meet

Vou refatorar o fluxo SOS em camadas, do mais crítico (eco/áudio, estabilidade) ao mais cosmético (UX/feedback). Antes de codar, preciso confirmar alguns pontos para não retrabalhar.

---

## Perguntas antes de começar

1. **Modal "crise resolvida" e motivo do encerramento** — só aparece quando o **psicólogo** encerra antes dos 20 min, certo? Quando o **paciente** encerra, pula direto para a tela de feedback (estrelas)?

2. **Tabela `emergency_call_feedback`** — vou criar nova tabela (paciente e psicólogo gravam linhas separadas, ligadas a `emergency_request_id`). Confirma?

3. **Aviso de 5 min e 1 min** — toast discreto no canto, ou banner no topo da chamada? Eu sugiro **banner no topo** (estilo Meet).

4. **Eco/loopback** — o `<video>` local já tem `muted`? Vou confirmar no código, mas se houver um `<audio>` extra tocando o stream local, removerei.

---

## Escopo da refatoração

### Fase 1 — Áudio & Eco (CRÍTICO)
- `getUserMedia` com `echoCancellation`, `noiseSuppression`, `autoGainControl` sempre `true`.
- `<video>` local sempre `muted playsInline autoPlay`.
- Remover qualquer `<audio>` que reproduza stream local.
- Garantir uma única `RTCPeerConnection` por sessão (guard via ref).
- Auditar `EmergencyVideoCall.tsx` e `useWebRTC.ts` por srcObjects duplicados e listeners repetidos.

### Fase 2 — Estabilidade WebRTC
- Lifecycle único do `RTCPeerConnection` (criar/fechar em pontos controlados).
- Monitorar `connectionState` e `iceConnectionState`:
  - `connected` → ocultar avisos.
  - `disconnected` → banner "Conexão instável" + tentar `restartIce()`.
  - `failed` → exponential backoff (2s, 4s, 8s, máx 3 tentativas) e então encerrar com "Conexão perdida".
- Distinguir saída manual (flag `remoteEndedManually` via Realtime broadcast/update em `webrtc_sessions.status`) de queda real.
- Cleanup centralizado em uma única função `endCall(reason)`.

### Fase 3 — Duração de 20 minutos
- Ao iniciar: gravar `started_at` (já existe) e calcular `expires_at = started_at + 20min`.
- Cronômetro regressivo visível no topo (ex: `19:42 restantes`).
- Banner aos 5 min: "A chamada será encerrada em 5 minutos".
- Highlight aos 1 min.
- Aos 0: chamar `endCall('time_expired')` automaticamente, atualizando `emergency_requests.status='completed'` e `ended_at`.

### Fase 4 — Encerramento profissional (psicólogo)
Sequência de modais (componente novo `EndCallFlow.tsx`):
1. **Confirmação**: "Deseja finalizar a chamada?" → [Cancelar] [Finalizar]
2. **Crise resolvida?**: [Sim] [Não]
3. Se **Não** → motivos (checkbox múltiplo) + textarea opcional:
   - Problemas de conexão
   - Paciente desconectou
   - Tempo insuficiente
   - Paciente ainda precisava de suporte
   - Psicólogo não conseguiu concluir atendimento
   - Paciente apresentou melhora parcial
   - Falha técnica
   - Outro motivo
4. Persistir em `emergency_call_feedback` e encerrar para ambos via Realtime.

### Fase 5 — Feedback pós-chamada
- **Paciente**: estrelas 1–5 + "O psicólogo conseguiu ajudar você?" (Sim/Parcialmente/Não) + textarea opcional.
- **Psicólogo**: estrelas 1–5 + comportamento + colaboração + observações.
- Salvar em `emergency_call_feedback`.

### Fase 6 — Cleanup completo
Função `cleanupCall()` centralizada:
```
localStream.getTracks().forEach(t => t.stop())
remoteStream?.getTracks().forEach(t => t.stop())
peerConnection.close()
supabase.removeChannel(channel)
clearInterval(timerRef.current)
clearTimeout(reconnectTimeoutRef.current)
```
Chamada em todos os caminhos de saída (timeout, manual, falha, unmount).

### Fase 7 — UX Meet-like
- Controles inferiores arredondados, ícones limpos.
- Estados visuais: muted, camera off, reconectando, conexão ruim.
- Transições fade.
- Banner superior para avisos de tempo.
- Mobile: ajustar layout, `playsInline`, resume on focus.

---

## Mudanças de banco (Fase 4/5)

Nova tabela `emergency_call_feedback`:
- `emergency_request_id` (FK lógica)
- `user_id`, `user_type` ('patient'|'psychologist')
- `rating` (1–5)
- `helped` ('yes'|'partial'|'no') — paciente
- `crisis_resolved` (bool) — psicólogo
- `finish_reasons` (text[]) — psicólogo
- `comments` (text)
- timestamps

RLS: usuário cria/lê apenas seus próprios registros; super_admin vê tudo.

---

## Arquivos afetados

- `src/hooks/useWebRTC.ts` — reescrita do lifecycle, monitoring, reconnect.
- `src/components/EmergencyVideoCall.tsx` — UI Meet-like, timer, banners, fluxo de encerramento.
- `src/components/sos/EndCallFlow.tsx` — **novo**, modais de confirmação/motivo.
- `src/components/sos/PostCallFeedback.tsx` — **novo**, tela de feedback pós-chamada.
- `src/pages/EmergencyCall.tsx` — orquestração do timer/expires_at e roteamento para feedback.
- Migration: tabela `emergency_call_feedback`.

---

## Plano de entrega

Por ser uma refatoração grande (~3.3k linhas tocadas + nova tabela + 2 novos componentes), proponho entregar em **2 PRs lógicos dentro desta conversa**:

- **Bloco A** (estabilidade): Fases 1, 2, 3, 6 — áudio sem eco, estabilidade, timer de 20 min, cleanup.
- **Bloco B** (fluxo clínico): Fases 4, 5, 7 — modais de encerramento, feedback, polish Meet-like + migration.

Confirme as 4 perguntas acima e eu começo pelo **Bloco A** imediatamente.