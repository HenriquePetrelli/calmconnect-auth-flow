import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { isTrustedCaller } from "../_shared/guards.ts";

// Apaga do armazenamento as fotos de conversas que não existem mais.
//
// A rotina diária `gerenciar_expiracao_conversas` apaga a conversa (e as
// mensagens) 3 meses depois de aberta, mas o banco não apaga arquivos: as
// fotos ficavam em `documents/chat-images/<conversa>/...` para sempre. Cada
// conversa tem a sua pasta, então basta olhar as pastas sem conversa.
// Chamada pelo pg_cron uma vez por dia.

const BUCKET = "documents";
const ROOT = "chat-images";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null);
  // Só o pg_cron (x-cron-secret) ou outra função (service role).
  if (!(await isTrustedCaller(req))) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    // 1. Pastas de conversa (as entradas sem id são "pastas").
    const folders: string[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase.storage.from(BUCKET).list(ROOT, { limit: PAGE, offset });
      if (error) throw error;
      for (const entry of data ?? []) if (!entry.id && UUID.test(entry.name)) folders.push(entry.name);
      if (!data || data.length < PAGE) break;
    }

    // 2. Quais dessas conversas ainda existem.
    const existing = new Set<string>();
    for (let i = 0; i < folders.length; i += 200) {
      const chunk = folders.slice(i, i + 200);
      const { data, error } = await supabase.from("conversas").select("id").in("id", chunk);
      if (error) throw error;
      for (const row of data ?? []) existing.add(row.id as string);
    }
    const orphans = folders.filter((id) => !existing.has(id));

    // 3. Apaga os arquivos das pastas sem conversa.
    let removed = 0;
    for (const folder of orphans) {
      const paths: string[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await supabase.storage.from(BUCKET).list(`${ROOT}/${folder}`, { limit: PAGE, offset });
        if (error) throw error;
        for (const entry of data ?? []) if (entry.id) paths.push(`${ROOT}/${folder}/${entry.name}`);
        if (!data || data.length < PAGE) break;
      }
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100));
        if (error) throw error;
        removed += Math.min(100, paths.length - i);
      }
    }

    return json({ folders: folders.length, orphanFolders: orphans.length, removedFiles: removed });
  } catch (error) {
    console.error("chat-cleanup failed:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
