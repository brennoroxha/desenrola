import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Cache simples em memória para evitar queries no banco o tempo todo
let cachedUrls: { gerado: string | null; aprovado: string | null; lastFetch: number } = {
  gerado: null,
  aprovado: null,
  lastFetch: 0,
};

async function getPushcutUrls() {
  const now = Date.now();
  if (now - cachedUrls.lastFetch < 60000) {
    return cachedUrls;
  }
  
  try {
    const { data } = await supabaseAdmin
      .from("desenrola_settings")
      .select("key, value")
      .in("key", ["pushcut_url_gerado", "pushcut_url_aprovado"]);

    if (data) {
      cachedUrls.gerado = data.find((r: any) => r.key === "pushcut_url_gerado")?.value || null;
      cachedUrls.aprovado = data.find((r: any) => r.key === "pushcut_url_aprovado")?.value || null;
      cachedUrls.lastFetch = now;
    }
  } catch (err) {
    console.error("[pushcut] error fetching urls", err);
  }
  return cachedUrls;
}

export function invalidatePushcutCache() {
  cachedUrls.lastFetch = 0;
}

export async function pushcut(kind: "gerado" | "aprovado", valor?: string | number | null) {
  if (process.env.VITE_USE_MOCKS === "true") {
    console.log(`[mock] pushcut interceptado: ${kind}`, valor);
    return;
  }

  try {
    const urls = await getPushcutUrls();
    const targetUrl = urls[kind];

    if (!targetUrl) {
      console.log(`[pushcut] Nenhuma URL configurada para o evento: ${kind}`);
      return;
    }

    const label = kind === "aprovado" ? "Aprovado Desenrola" : "Gerado Desenrola";
    const valorFmt = valor ? `R$ ${valor}` : "";
    
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: label, text: valorFmt }),
    });
    
    if (!res.ok) console.error("[pushcut]", kind, res.status, await res.text().catch(() => ""));
  } catch (err) {
    console.error("[pushcut] failed", kind, err);
  }
}
