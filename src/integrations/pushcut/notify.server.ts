export function invalidatePushcutCache() {
  // Mantida apenas por compatibilidade (não faz nada agora que usamos API Key direta)
}

export async function pushcut(kind: "gerado" | "aprovado", valor?: string | number | null) {
  if (process.env.VITE_USE_MOCKS === "true") {
    console.log(`[mock] pushcut interceptado: ${kind}`, valor);
    return;
  }

  try {
    const apiKey = (typeof process !== "undefined" && process.env.PUSHCUT_API_KEY) ? process.env.PUSHCUT_API_KEY : '';
    if (!apiKey) {
      console.log(`[pushcut] Nenhuma API Key configurada para o Pushcut (adicione PUSHCUT_API_KEY no .env)`);
      return;
    }

    const label = kind === "aprovado" ? "Pagamento Aprovado 💰\nDesenrola" : "Desenrola Gerado ✨";
    const valorFmt = valor ? `R$ ${valor}` : "";
    
    const targetUrl = `https://api.pushcut.io/v1/notifications/${kind}`;
    
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "API-Key": apiKey
      },
      body: JSON.stringify({ title: label, text: valorFmt }),
    });
    
    if (!res.ok) {
      console.error("[pushcut]", kind, res.status, await res.text().catch(() => ""));
    } else {
      console.log(`[pushcut] Notificação ${kind} enviada com sucesso via API.`);
    }
  } catch (err) {
    console.error("[pushcut] failed", kind, err);
  }
}
