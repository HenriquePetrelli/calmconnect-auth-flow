/**
 * Regras puras da negociação da chamada (oferta/resposta pelo banco).
 *
 * O psicólogo sempre faz a oferta e o paciente sempre responde, então não há
 * "oferta cruzada". O que pode dar errado é cada lado estar falando com uma
 * conexão diferente da que o outro tem agora (alguém recarregou a página, a
 * conexão foi recriada) ou aplicar uma resposta a uma oferta antiga. Estas
 * funções decidem isso a partir do próprio SDP.
 */

/** `o=- <id da sessão> <versão> ...`: o id muda a cada RTCPeerConnection nova. */
const ORIGIN_LINE = /^o=\S+\s+(\d+)\s+(\d+)/m;

export function sdpSessionId(sdp?: string | null): string | null {
  if (!sdp) return null;
  return sdp.match(ORIGIN_LINE)?.[1] ?? null;
}

/** Identifica uma descrição específica: a conexão (id) e a renegociação (versão). */
export function sdpTag(sdp?: string | null): string | null {
  if (!sdp) return null;
  const match = sdp.match(ORIGIN_LINE);
  return match ? `${match[1]}:${match[2]}` : null;
}

/**
 * O outro lado trocou de conexão (recarregou, recriou a conexão). A nossa
 * conexão atual já negociou com a antiga e não serve mais: precisa ser
 * recriada antes de aplicar a descrição nova.
 */
export function isNewRemotePeer(appliedRemoteSdp: string | null | undefined, incomingSdp: string | null | undefined): boolean {
  const applied = sdpSessionId(appliedRemoteSdp);
  const incoming = sdpSessionId(incomingSdp);
  return Boolean(applied && incoming && applied !== incoming);
}

export interface StoredAnswer {
  type?: string;
  sdp?: string;
  /** `sdpTag` da oferta respondida (apps antigos não mandam). */
  forOffer?: string | null;
}

/**
 * A resposta gravada no banco é para a oferta que este lado fez agora?
 * Uma resposta a uma oferta anterior (escrita depois da nova, por atraso de
 * rede) quebraria a conexão se fosse aplicada.
 */
export function answerMatchesOffer(answer: StoredAnswer | null | undefined, localOfferSdp: string | null | undefined): boolean {
  if (!answer?.sdp) return false;
  if (!answer.forOffer) return true;
  return answer.forOffer === sdpTag(localOfferSdp);
}

/**
 * Política de reconexão do psicólogo (quem oferece): primeiro reinicia só o
 * caminho de rede (ICE restart, rápido e sem cortar a mídia); se não voltar,
 * recria a conexão inteira, que resolve também quando o outro lado reiniciou.
 */
export type ReconnectStep = 'ice-restart' | 'rebuild';

export function reconnectStepFor(attempt: number): ReconnectStep {
  return attempt <= 2 ? 'ice-restart' : 'rebuild';
}

/**
 * O paciente não pode oferecer; a partir da 2ª tentativa sem sucesso ele pede
 * ao psicólogo uma conexão nova (pelo banco, que funciona mesmo com a mídia
 * caída).
 */
export function patientShouldRequestRenegotiation(attempt: number): boolean {
  return attempt >= 2;
}

/** Pedido de renegociação ainda não atendido e feito depois que entramos na sala. */
export function isPendingRenegotiation(
  requestedAt: string | null | undefined,
  lastHandledAt: number,
  joinedAt: number
): boolean {
  if (!requestedAt) return false;
  const at = new Date(requestedAt).getTime();
  if (Number.isNaN(at)) return false;
  return at > lastHandledAt && at > joinedAt - 5_000;
}

/** Qualidade da rede pelo `getStats`, para avisar e aliviar o vídeo (como o Meet). */
export type NetworkQuality = 'good' | 'fair' | 'poor';

export function classifyNetworkQuality(input: { rttMs: number | null; lossRatio: number | null }): NetworkQuality {
  const rtt = input.rttMs ?? 0;
  const loss = input.lossRatio ?? 0;
  if (rtt > 600 || loss > 0.1) return 'poor';
  if (rtt > 300 || loss > 0.04) return 'fair';
  return 'good';
}
