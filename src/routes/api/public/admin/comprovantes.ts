import { createFileRoute } from "@tanstack/react-router";
import { checkAdminAuth } from "@/lib/admin-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
} as const;

export const Route = createFileRoute("/api/public/admin/comprovantes")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

        let body: any = {};
        try { body = await request.json(); } catch {}
        const page = parseInt(body?.page || "1", 10);
        const limit = parseInt(body?.limit || "50", 10);

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const from = (page - 1) * limit;
          const to = from + limit - 1;

          const { data: comp, error, count } = await supabaseAdmin.from("desenrola_comprovantes")
            .select("id, transaction_id, acordo, cpf, nome, filename, mime, size_bytes, ip, criado_em", { count: "exact" })
            .order("criado_em", { ascending: false })
            .range(from, to);

          if (error) {
            return json({ ok: false, message: error.message }, 500);
          }

          // Fetch related txs for these comprovantes to get status
          let relatedTxs: any[] = [];
          if (comp && comp.length > 0) {
              const txIds = [...new Set(comp.map(c => c.transaction_id).filter(Boolean))];
              if (txIds.length > 0) {
                  const { data: txs } = await supabaseAdmin.from("desenrola_pix_transactions")
                    .select("transaction_id, status")
                    .in("transaction_id", txIds as string[]);
                  if (txs) {
                      relatedTxs = txs;
                  }
              }
          }

          return json({
            ok: true,
            comprovantes: comp || [],
            transactions: relatedTxs,
            total: count || 0,
            page,
            limit
          }, 200);

        } catch (err) {
          console.error("[admin/comprovantes] failed", err);
          return json({ ok: false, message: "erro interno" }, 500);
        }
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
