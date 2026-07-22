import { soundsData } from "@/data/soundsData";

const prefetched = new Set<string>();

/**
 * Adiciona <link rel="prefetch" as="audio"> ao <head> para popular o cache do
 * browser antes do usuário tocar. Idempotente por URL.
 */
export function prefetchSounds(files: string[]) {
  if (typeof document === "undefined") return;
  for (const file of files) {
    if (!file || prefetched.has(file)) continue;
    prefetched.add(file);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "audio";
    link.href = file;
    // fetchpriority "low" para não competir com recursos críticos
    (link as HTMLLinkElement & { fetchPriority?: string }).fetchPriority = "low";
    document.head.appendChild(link);
  }
}

export function prefetchAllSounds() {
  const files: string[] = [];
  for (const cat of Object.values(soundsData.categories)) {
    for (const s of cat.sounds) files.push(s.file);
  }
  for (const sub of Object.values(soundsData.subcategories)) {
    for (const s of sub.sounds) files.push(s.file);
  }
  prefetchSounds(files);
}

export function prefetchCategorySounds(
  key: string
): void {
  const cat =
    (soundsData.categories as Record<string, { sounds: { file: string }[] }>)[key] ??
    (soundsData.subcategories as Record<string, { sounds: { file: string }[] }>)[key];
  if (!cat) return;
  prefetchSounds(cat.sounds.map((s) => s.file));
}
