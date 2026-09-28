import termsPatientMd from "../../docs/lgpd/termos-de-uso-paciente.md?raw";
import termsPsychologistMd from "../../docs/lgpd/termos-de-uso-psicologo.md?raw";
import privacyPolicyMd from "../../docs/lgpd/politica-de-privacidade.md?raw";
import { supabase } from "@/integrations/supabase/client";

// Documentos que o usuário aceita (tabela legal_acceptances). Os textos dos
// Termos e da Política vêm direto de docs/lgpd, e a versão é a do campo
// "**Versão:**" de cada arquivo: ao publicar uma versão nova do texto, basta
// mudar esse número para o app pedir o aceite de novo.
export type LegalDocumentId =
  | "terms_patient"
  | "terms_psychologist"
  | "privacy_policy"
  | "health_data_consent"
  | "age_18";

export type LegalUserType = "patient" | "psychologist";

export interface LegalPage {
  id: Extract<LegalDocumentId, "terms_patient" | "terms_psychologist" | "privacy_policy">;
  title: string;
  path: string;
  markdown: string;
}

const readVersion = (markdown: string): string => {
  const match = markdown.match(/\*\*Versão:\*\*\s*([\w.-]+)/);
  return match ? match[1] : "1.0";
};

export const LEGAL_PAGES: Record<LegalPage["id"], LegalPage> = {
  terms_patient: {
    id: "terms_patient",
    title: "Termos de Uso — Pacientes",
    path: "/termos",
    markdown: termsPatientMd,
  },
  terms_psychologist: {
    id: "terms_psychologist",
    title: "Termos de Uso — Psicólogos",
    path: "/termos-psicologo",
    markdown: termsPsychologistMd,
  },
  privacy_policy: {
    id: "privacy_policy",
    title: "Política de Privacidade",
    path: "/privacidade",
    markdown: privacyPolicyMd,
  },
};

// Textos curtos que ficam no próprio app. Mudou o texto? Aumente a versão.
export const HEALTH_DATA_CONSENT_TEXT =
  "Autorizo o Soliv a tratar os meus dados de saúde (sintomas, humor, diário, planos de segurança e depoimentos) para oferecer as funções do app e os atendimentos com psicólogos, como descrito na Política de Privacidade. Posso revogar esse consentimento a qualquer momento, o que encerra a conta.";
export const AGE_18_TEXT = "Tenho 18 anos ou mais.";

export const LEGAL_VERSIONS: Record<LegalDocumentId, string> = {
  terms_patient: readVersion(termsPatientMd),
  terms_psychologist: readVersion(termsPsychologistMd),
  privacy_policy: readVersion(privacyPolicyMd),
  health_data_consent: "1.0",
  age_18: "1.0",
};

export const REQUIRED_DOCUMENTS: Record<LegalUserType, LegalDocumentId[]> = {
  patient: ["age_18", "terms_patient", "privacy_policy", "health_data_consent"],
  psychologist: ["age_18", "terms_psychologist", "privacy_policy"],
};

export const termsPageFor = (userType: LegalUserType): LegalPage =>
  userType === "patient" ? LEGAL_PAGES.terms_patient : LEGAL_PAGES.terms_psychologist;

export interface LegalAcceptanceItem {
  document: LegalDocumentId;
  version: string;
}

export const currentAcceptances = (userType: LegalUserType): LegalAcceptanceItem[] =>
  REQUIRED_DOCUMENTS[userType].map((document) => ({ document, version: LEGAL_VERSIONS[document] }));

// Vai nos metadados do signUp; o trigger on_auth_user_legal_acceptances grava
// o aceite com a hora do servidor.
export const signupAcceptanceMetadata = (userType: LegalUserType) => ({
  legal_acceptances: currentAcceptances(userType),
  legal_user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : undefined,
});

export const fetchMissingAcceptances = async (
  userId: string,
  userType: LegalUserType,
): Promise<LegalDocumentId[]> => {
  const { data, error } = await supabase
    .from("legal_acceptances")
    .select("document, version")
    .eq("user_id", userId);
  if (error) throw error;
  const accepted = new Set((data ?? []).map((row) => `${row.document}@${row.version}`));
  return REQUIRED_DOCUMENTS[userType].filter(
    (document) => !accepted.has(`${document}@${LEGAL_VERSIONS[document]}`),
  );
};

export const recordAcceptances = async (userId: string, documents: LegalDocumentId[]): Promise<void> => {
  if (documents.length === 0) return;
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null;
  const { error } = await supabase.from("legal_acceptances").upsert(
    documents.map((document) => ({
      user_id: userId,
      document,
      version: LEGAL_VERSIONS[document],
      user_agent: userAgent,
    })),
    { onConflict: "user_id,document,version", ignoreDuplicates: true },
  );
  if (error) throw error;
};

// Enquanto houver campos "[...]" sem preencher, o texto ainda está em revisão.
// (Colchetes seguidos de "(" são links do Markdown, não campos.)
export const hasPendingPlaceholders = (markdown: string): boolean => /\[[^\]\n]+\](?!\()/.test(markdown);
