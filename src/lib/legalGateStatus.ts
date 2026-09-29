import { useSyncExternalStore } from "react";

// Situação do aceite dos documentos legais, publicada pelo
// LegalAcceptanceGate. Outras janelas automáticas (como a das metas) esperam
// o "clear" para não abrir por cima do pedido de aceite.
export type LegalGateStatus = "checking" | "pending" | "clear";

let status: LegalGateStatus = "checking";
const listeners = new Set<() => void>();

export const setLegalGateStatus = (next: LegalGateStatus) => {
  if (next === status) return;
  status = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useLegalGateStatus = () => useSyncExternalStore(subscribe, () => status);
