// Fire-and-forget notification via Pushcut.
const URLS = {
  gerado: "https://api.pushcut.io/kXDRvo3PGVEtZP-rSrB8Q/notifications/Gerado%20desenrola",
  aprovado: "https://api.pushcut.io/kXDRvo3PGVEtZP-rSrB8Q/notifications/Aprovado%20Desenrola",
} as const;

export async function pushcut(kind: keyof typeof URLS, valor?: string | number | null) {
  try {
    const label = kind === "aprovado" ? "Aprovado Desenrola" : "Gerado Desenrola";
    const valorFmt = valor ? `R$ ${valor}` : "";
    const res = await fetch(URLS[kind], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: label, text: valorFmt }),
    });
    if (!res.ok) console.error("[pushcut]", kind, res.status, await res.text().catch(() => ""));
  } catch (err) {
    console.error("[pushcut] failed", kind, err);
  }
}
