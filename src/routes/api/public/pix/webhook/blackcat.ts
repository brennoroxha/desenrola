import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Webhook-Event, X-Webhook-Source, X-API-Key",
} as const;

function pick(obj: any, keys: string[]): any {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return null;
}

function parseBlackcat(payload: any): { id: string | null; status: string | null; paidAt: string | null } {
  if (!payload || typeof payload !== "object") return { id: null, status: null, paidAt: null };
  const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
  const id = pick(data, ["transactionId", "id", "transaction_id"]);
  const status = pick(data, ["status", "state"]);
  const paidAt = pick(data, ["paidAt", "paid_at", "paidAtDate"]);
  return {
    id: id != null ? String(id) : null,
    status: status != null ? String(status).toUpperCase() : null,
    paidAt: paidAt != null ? String(paidAt) : null,
  };
}

export const Route = createFileRoute("/api/public/pix/webhook/blackcat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let raw = "";
        try { raw = await request.text(); } catch {}
        let payload: any = null;
        try { payload = JSON.parse(raw); } catch {}

        const { id, status, paidAt } = parseBlackcat(payload);
        const event = request.headers.get("x-webhook-event") || payload?.event || null;

        console.log("[blackcat webhook]", JSON.stringify({ event, id, status, paidAt }));

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("desenrola_webhook_events").insert({
            transaction_id: id,
            status,
            payload: payload ?? { raw: raw.slice(0, 4000) },
          });

          if (id) {
            const patch: Record<string, unknown> = {
              transaction_id: id,
              atualizado_em: new Date().toISOString(),
              gateway: "blackcat",
            };
            if (status) patch.status = status;
            if (paidAt) patch.paid_at = paidAt;
            // Só atualiza pedidos que existem no nosso checkout. Se não existe,
            // é webhook de origem desconhecida (clone, conta antiga) e ignoramos.
            const { data: existing } = await supabaseAdmin
              .from("desenrola_pix_transactions")
              .select("transaction_id")
              .eq("transaction_id", id)
              .maybeSingle();
            if (!existing) {
              console.warn("[blackcat webhook] ignorado: transaction_id não pertence a este checkout", { id });
              return new Response("ignored", { status: 200, headers: { "Content-Type": "text/plain", ...CORS } });
            }
            const { error: upErr } = await supabaseAdmin
              .from("desenrola_pix_transactions")
              .update(patch as never)
              .eq("transaction_id", id);
            if (upErr) console.error("[blackcat webhook] update error", upErr);

            if (status === "PAID") {
              const { data: claimed } = await supabaseAdmin
                .from("desenrola_pix_transactions")
                .update({ notified_aprovado: true })
                .eq("transaction_id", id)
                .or("notified_aprovado.is.null,notified_aprovado.eq.false")
                .select("amount_cents");
              if (claimed && claimed.length > 0) {
                const { pushcut } = await import("@/integrations/pushcut/notify.server");
                const cents = claimed[0].amount_cents;
                await pushcut("aprovado", cents ? (cents / 100).toFixed(2) : null);
              }
            }
          }
        } catch (err) {
          console.error("[blackcat webhook] supabase failed", err);
        }

        return new Response("ok", { status: 200, headers: { "Content-Type": "text/plain", ...CORS } });
      },
    },
  },
});
