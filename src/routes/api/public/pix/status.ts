import { createFileRoute } from "@tanstack/react-router";
import { getPixStatus } from "@/integrations/gateway/pix.server";
import type { GatewayId } from "@/integrations/gateway/settings.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/public/pix/status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id || !/^[A-Za-z0-9_\-]{1,64}$/.test(id)) {
          return json({ status: "ERROR", message: "id inválido" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Verifica DB primeiro (webhook pode já ter marcado como pago).
        let gateway: GatewayId = "freepay";
        try {
          const { data: row } = await supabaseAdmin
            .from("desenrola_pix_transactions")
            .select("status, paid_at, gateway")
            .eq("transaction_id", id)
            .maybeSingle();
          if (row) {
            if (row.gateway === "blackcat" || row.gateway === "freepay" || row.gateway === "alpha" || row.gateway === "klivo") gateway = row.gateway as GatewayId;
            if (row.status && String(row.status).toUpperCase() === "PAID") {
              return json({ status: "PAID", paidAt: row.paid_at || null }, 200);
            }
          }
        } catch (err) {
          console.error("[pix/status] supabase read failed", err);
        }

        const result = await getPixStatus(gateway, id);

        try {
          await supabaseAdmin
            .from("desenrola_pix_transactions")
            .update({
              status: result.status,
              paid_at: result.paidAt,
              atualizado_em: new Date().toISOString(),
            })
            .eq("transaction_id", id);

          if (result.status === "PAID") {
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
        } catch (err) {
          console.error("[pix/status] supabase update failed", err);
        }

        return json({ status: result.status, paidAt: result.paidAt }, 200);
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
