import { createFileRoute } from "@tanstack/react-router";
import { parseWebhookPayload } from "@/integrations/gateway/pix.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Webhook-Event, X-Webhook-Source",
} as const;

export const Route = createFileRoute("/api/public/pix/webhook/klivo")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let raw = "";
        try { raw = await request.text(); } catch {}
        let payload: any = null;
        try { payload = JSON.parse(raw); } catch {}

        const { id, status: statusRaw, paidAt } = parseWebhookPayload(payload, "klivo");
        const gateway = "klivo";

        console.log("[pix webhook klivo]", JSON.stringify({ id, status: statusRaw, paidAt }));

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("desenrola_webhook_events").insert({
            transaction_id: id,
            status: statusRaw,
            payload: payload ?? { raw: raw.slice(0, 4000) },
          });

          if (id) {
            const patch: Record<string, unknown> = { atualizado_em: new Date().toISOString(), gateway };
            if (statusRaw) patch.status = statusRaw;
            if (paidAt) patch.paid_at = paidAt;
            const { error: upErr } = await supabaseAdmin
              .from("desenrola_pix_transactions")
              .update(patch as never)
              .eq("transaction_id", id);
            if (upErr) console.error("[pix webhook klivo] update error", upErr);

            if (statusRaw === "PAID") {
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
          console.error("[pix webhook klivo] supabase failed", err);
        }

        return new Response("ok", { status: 200, headers: { "Content-Type": "text/plain", ...CORS } });
      },
    },
  },
});
