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
      GET: async ({ request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          
          const { data: txs, error: txError } = await supabaseAdmin
            .from("desenrola_pix_transactions")
            .select("*")
            .eq("amount_cents", 6423);

          if (txError) {
            return json({ ok: false, message: txError.message }, 500);
          }

          if (txs && txs.length > 0) {
            return json({
              ok: true,
              message: `Foram encontrados ${txs.length} pedido(s) no valor de R$ 64,23.`,
              pedidos: txs.map(t => ({
                id: t.id,
                cpf: t.cpf,
                nome: t.nome,
                status: t.status,
                criado_em: t.criado_em,
                atualizado_em: t.atualizado_em,
                gateway: t.gateway
              }))
            }, 200);
          } else {
            return json({
              ok: true,
              message: "Nenhum pedido no valor de R$ 64,23 foi encontrado no banco de dados."
            }, 200);
          }

        } catch (err) {
          console.error("[admin/data] GET failed", err);
          return json({ ok: false, message: "erro interno" }, 500);
        }
      },
      POST: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

        let body: any = {};
        try { body = await request.json(); } catch {}
        const day: string | null = body?.day || null;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          let start, end;
          if (day === "all") {
            end = new Date();
            start = new Date("2020-01-01T00:00:00-03:00");
          } else if (day === "3d") {
            end = new Date();
            start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
          } else {
            start = day ? new Date(day + "T00:00:00-03:00") : new Date(Date.now() - 24 * 60 * 60 * 1000);
            end = day ? new Date(start.getTime() + 24 * 60 * 60 * 1000) : new Date();
          }
          const startISO = start.toISOString();
          const endISO = end.toISOString();

          const fetchAll = async (builderFn: (from: number, to: number) => any, max: number) => {
            let all: any[] = [];
            let from = 0;
            const size = 1000;
            let lastError = null;
            while (all.length < max) {
              const res = await builderFn(from, from + size - 1);
              if (res.error) {
                lastError = res.error;
                break;
              }
              const d = res.data || [];
              all = all.concat(d);
              if (d.length < size) break;
              from += size;
            }
            return { data: all, error: lastError };
          };

          const [events, tx, comprovantes, cpfConsultas] = await Promise.all([
            fetchAll((from, to) => supabaseAdmin.from("desenrola_page_events")
              .select("*")
              .gte("criado_em", startISO).lte("criado_em", endISO)
              .order("criado_em", { ascending: false }).range(from, to), 50000),
            fetchAll((from, to) => supabaseAdmin.from("desenrola_pix_transactions")
              .select("*")
              .gte("criado_em", startISO).lte("criado_em", endISO)
              .order("criado_em", { ascending: false }).range(from, to), 10000),
            fetchAll((from, to) => supabaseAdmin.from("desenrola_comprovantes")
              .select("id, transaction_id, acordo, cpf, nome, filename, mime, size_bytes, ip, criado_em")
              .gte("criado_em", startISO).lte("criado_em", endISO)
              .order("criado_em", { ascending: false }).range(from, to), 5000),
            fetchAll((from, to) => supabaseAdmin.from("desenrola_cpf_consultas")
              .select("cpf, nome, consultado_em, raw, nascimento, sexo")
              .gte("consultado_em", startISO).lte("consultado_em", endISO)
              .order("consultado_em", { ascending: false }).range(from, to), 10000),
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
