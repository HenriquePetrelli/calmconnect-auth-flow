import { supabase } from '@/integrations/supabase/client';

/** Usado se a edge function não responder: só STUN (conecta na maioria das redes). */
export const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

let cache: { servers: RTCIceServer[]; expiresAt: number } | null = null;

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

/**
 * Servidores ICE (STUN + TURN quando configurado) para as chamadas. O TURN faz
 * a chamada conectar em redes que bloqueiam a conexão direta (4G/5G com NAT da
 * operadora, redes corporativas). Nunca bloqueia a chamada: se falhar ou
 * demorar mais de 4s, segue só com STUN.
 */
export const getIceServers = async (): Promise<RTCIceServer[]> => {
  if (cache && cache.expiresAt > Date.now()) return cache.servers;
  try {
    const { data, error } = await withTimeout(supabase.functions.invoke('ice-servers', { method: 'GET' }), 4000);
    if (error) throw error;
    const servers = (data as { iceServers?: RTCIceServer[]; ttl?: number } | null)?.iceServers;
    if (!servers?.length) throw new Error('sem servidores');
    const ttlMs = Math.max(60, ((data as { ttl?: number }).ttl ?? 3600) - 600) * 1000;
    cache = { servers, expiresAt: Date.now() + ttlMs };
    return servers;
  } catch (error) {
    console.warn('ICE servers indisponíveis, usando só STUN:', error);
    return FALLBACK_ICE_SERVERS;
  }
};

/** Só para testes. */
export const resetIceServersCache = () => {
  cache = null;
};
