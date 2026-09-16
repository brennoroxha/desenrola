import { createFileRoute } from "@tanstack/react-router";
import { parseWebhookPayload } from "@/integrations/gateway/pix.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Webhook-Event, X-Webhook-Source, X-API-Key",
} as const;

export const Route = createFileRoute("/api/public/pix/webhook/invictus")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let raw = "";
        try { raw = await request.text(); } catch {}
        let payload: any = null;
        try { payload = JSON.parse(raw); } catch {}

        const sourceHeader = request.headers.get("x-webhook-source") || "invictus";
        const { id, status: statusRaw, paidAt, gateway } = parseWebhookPayload(payload, sourceHeader);
        const event = request.headers.get("x-webhook-event") || payload?.event || null;

        console.log("[invictus webhook]", JSON.stringify({ event, id, status: statusRaw, paidAt }));

        let status = statusRaw;
        if (status === "PAID" || status === "APPROVED") status = "PAID";
        else if (status === "REFUSED") status = "REFUSED";
        else if (status === "REFUNDED") status = "REFUNDED";
        else if (status === "CANCELLED" || status === "CANCELED") status = "CANCELLED";
        else if (status === "EXPIRED") status = "EXPIRED";
        else if (status === "PENDING" || status === "PROCESSING" || status === "ANTIFRAUD") status = "PENDING";
        else if (status === "FAILED") status = "FAILED";

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
              gateway: "invictus",
            };
            if (status) patch.status = status;
            if (paidAt) patch.paid_at = paidAt;

            const { data: existing } = await supabaseAdmin
              .from("desenrola_pix_transactions")
              .select("transaction_id")
              .eq("transaction_id", id)
              .maybeSingle();
            
            if (!existing) {
              console.warn("[invictus webhook] ignorado: transaction_id não pertence a este checkout", { id });
              return new Response("ignored", { status: 200, headers: { "Content-Type": "text/plain", ...CORS } });
            }

            const { error: upErr } = await supabaseAdmin
              .from("desenrola_pix_transactions")
              .update(patch as never)
              .eq("transaction_id", id);
            
            if (upErr) console.error("[invictus webhook] update error", upErr);

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
                pushcut("aprovado", cents ? (cents / 100).toFixed(2) : null).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.error("[invictus webhook] supabase failed", err);
        }

        return new Response("ok", { status: 200, headers: { "Content-Type": "text/plain", ...CORS } });
      },
    },
  },
});
