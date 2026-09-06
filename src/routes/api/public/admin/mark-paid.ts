import { createFileRoute } from "@tanstack/react-router";
import { checkAdminAuth } from "@/lib/admin-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
} as const;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/admin/mark-paid")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

        let body: any = {};
        try { body = await request.json(); } catch {}
        const transactionId: string | null = body?.transaction_id || null;
        if (!transactionId) return json({ ok: false, message: "transaction_id obrigatório" }, 400);

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const nowISO = new Date().toISOString();

          const { data: existing, error: selErr } = await supabaseAdmin
            .from("desenrola_pix_transactions")
            .select("transaction_id, status, notified_aprovado, amount_cents, paid_at")
            .eq("transaction_id", transactionId)
            .maybeSingle();
          if (selErr) return json({ ok: false, message: selErr.message }, 500);
          if (!existing) return json({ ok: false, message: "transação não encontrada" }, 404);

          const patch: Record<string, unknown> = {
            status: "PAID",
            atualizado_em: nowISO,
          };
          if (!existing.paid_at) patch.paid_at = nowISO;

          const { error: upErr } = await supabaseAdmin
            .from("desenrola_pix_transactions")
            .update(patch as never)
            .eq("transaction_id", transactionId);
          if (upErr) return json({ ok: false, message: upErr.message }, 500);

          await supabaseAdmin.from("desenrola_webhook_events").insert({
            transaction_id: transactionId,
            status: "PAID",
            payload: { source: "admin_manual", at: nowISO },
          });

          const { data: claimed } = await supabaseAdmin
            .from("desenrola_pix_transactions")
            .update({ notified_aprovado: true })
            .eq("transaction_id", transactionId)
            .or("notified_aprovado.is.null,notified_aprovado.eq.false")
            .select("amount_cents");
          if (claimed && claimed.length > 0) {
            try {
              const { pushcut } = await import("@/integrations/pushcut/notify.server");
              const cents = claimed[0].amount_cents ?? existing.amount_cents;
              await pushcut("aprovado", cents ? (cents / 100).toFixed(2) : null);
            } catch (err) {
              console.error("[admin/mark-paid] pushcut failed", err);
            }
          }

          return json({ ok: true }, 200);
        } catch (err: any) {
          console.error("[admin/mark-paid] failed", err);
          return json({ ok: false, message: err?.message || "erro" }, 500);
        }
      },
    },
  },
});
