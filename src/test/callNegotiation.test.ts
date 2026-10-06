import { describe, expect, it } from 'vitest';
import {
  answerMatchesOffer,
  classifyNetworkQuality,
  isNewRemotePeer,
  isPendingRenegotiation,
  patientShouldRequestRenegotiation,
  reconnectStepFor,
  sdpSessionId,
  sdpTag,
} from '@/lib/callNegotiation';

const sdp = (id: string, version: string) => `v=0\r\no=- ${id} ${version} IN IP4 127.0.0.1\r\ns=-\r\n`;

describe('negociação da chamada', () => {
  it('lê o id da conexão e a versão do SDP', () => {
    expect(sdpSessionId(sdp('123', '2'))).toBe('123');
    expect(sdpTag(sdp('123', '2'))).toBe('123:2');
    expect(sdpSessionId(null)).toBeNull();
    expect(sdpTag('lixo')).toBeNull();
  });

  it('percebe quando o outro lado está numa conexão nova (recarregou)', () => {
    expect(isNewRemotePeer(sdp('1', '2'), sdp('9', '2'))).toBe(true);
    // Mesma conexão renegociando (ICE restart): não precisa recriar.
    expect(isNewRemotePeer(sdp('1', '2'), sdp('1', '3'))).toBe(false);
    expect(isNewRemotePeer(null, sdp('1', '2'))).toBe(false);
  });

  it('só aplica a resposta da oferta atual', () => {
    const offer = sdp('5', '3');
    expect(answerMatchesOffer({ sdp: 'a', forOffer: '5:3' }, offer)).toBe(true);
    expect(answerMatchesOffer({ sdp: 'a', forOffer: '5:2' }, offer)).toBe(false);
    // App antigo (sem forOffer) continua funcionando.
    expect(answerMatchesOffer({ sdp: 'a' }, offer)).toBe(true);
    expect(answerMatchesOffer(null, offer)).toBe(false);
  });

  it('reconexão: primeiro reinicia a rede, depois recria a conexão', () => {
    expect(reconnectStepFor(1)).toBe('ice-restart');
    expect(reconnectStepFor(2)).toBe('ice-restart');
    expect(reconnectStepFor(3)).toBe('rebuild');
    expect(patientShouldRequestRenegotiation(1)).toBe(false);
    expect(patientShouldRequestRenegotiation(2)).toBe(true);
  });

  it('pedido de conexão nova: só os ainda não atendidos e desta entrada na sala', () => {
    const joined = Date.parse('2026-10-06T10:00:00Z');
    expect(isPendingRenegotiation('2026-10-06T10:01:00Z', joined, joined)).toBe(true);
    expect(isPendingRenegotiation('2026-10-06T10:01:00Z', Date.parse('2026-10-06T10:01:00Z'), joined)).toBe(false);
    expect(isPendingRenegotiation('2026-10-06T09:00:00Z', 0, joined)).toBe(false);
    expect(isPendingRenegotiation(null, 0, joined)).toBe(false);
  });

  it('qualidade da rede', () => {
    expect(classifyNetworkQuality({ rttMs: 80, lossRatio: 0 })).toBe('good');
    expect(classifyNetworkQuality({ rttMs: 400, lossRatio: 0.01 })).toBe('fair');
    expect(classifyNetworkQuality({ rttMs: 100, lossRatio: 0.2 })).toBe('poor');
  });
});
