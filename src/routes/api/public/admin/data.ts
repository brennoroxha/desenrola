import { createFileRoute } from "@tanstack/react-router";
import { checkAdminAuth } from "@/lib/admin-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
} as const;

export const Route = createFileRoute("/api/public/admin/data")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

        let body: any = {};
        try { body = await request.json(); } catch {}
        const day: string | null = body?.day || null;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const start = day ? new Date(day + "T00:00:00-03:00") : new Date(Date.now() - 24 * 60 * 60 * 1000);
          const end = day ? new Date(start.getTime() + 24 * 60 * 60 * 1000) : new Date();
          const startISO = start.toISOString();
          const endISO = end.toISOString();

          const [events, tx, comprovantes, cpfConsultas] = await Promise.all([
            supabaseAdmin.from("desenrola_page_events")
              .select("*")
              .gte("criado_em", startISO).lte("criado_em", endISO)
              .order("criado_em", { ascending: false }).limit(50000),
            supabaseAdmin.from("desenrola_pix_transactions")
              .select("*")
              .gte("criado_em", startISO).lte("criado_em", endISO)
              .order("criado_em", { ascending: false }).limit(10000),
            supabaseAdmin.from("desenrola_comprovantes")
              .select("id, transaction_id, acordo, cpf, nome, filename, mime, size_bytes, ip, criado_em")
              .gte("criado_em", startISO).lte("criado_em", endISO)
              .order("criado_em", { ascending: false }).limit(5000),
            supabaseAdmin.from("desenrola_cpf_consultas")
              .select("cpf, nome, consultado_em")
              .gte("consultado_em", startISO).lte("consultado_em", endISO)
              .order("consultado_em", { ascending: false }).limit(10000),
          ]);

          const dbError =
            events.error?.message ||
            tx.error?.message ||
            comprovantes.error?.message ||
            cpfConsultas.error?.message ||
            null;

          return json({
            ok: true,
            db_error: dbError,
            range: { start: startISO, end: endISO, day },
            events: events.data || [],
            transactions: tx.data || [],
            comprovantes: comprovantes.data || [],
            cpf_consultas: cpfConsultas.data || [],
          }, 200);

        } catch (err) {
          console.error("[admin/data] failed", err);
          return json({ ok: false, message: "erro" }, 500);
        }
      },
    },
  },
});

export const _routeApiComprovanteDownload = null;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
