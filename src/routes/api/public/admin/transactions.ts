import { createFileRoute } from "@tanstack/react-router";
import { checkAdminAuth } from "@/lib/admin-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
} as const;

export const Route = createFileRoute("/api/public/admin/transactions")({
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

          const { data: tx, error, count } = await supabaseAdmin.from("desenrola_pix_transactions")
            .select("*", { count: "exact" })
            .order("criado_em", { ascending: false })
            .range(from, to);

          if (error) {
            return json({ ok: false, message: error.message }, 500);
          }

          // Fetch related cpf_consultas for the listed transactions to get age and gender
          let cpfConsultas: any[] = [];
          if (tx && tx.length > 0) {
              const cpfs = [...new Set(tx.map(t => t.cpf))];
              const { data: consultas } = await supabaseAdmin.from("desenrola_cpf_consultas")
                .select("cpf, nascimento, sexo, raw")
                .in("cpf", cpfs);
              if (consultas) {
                  cpfConsultas = consultas;
              }
          }

          return json({
            ok: true,
            transactions: tx || [],
            cpf_consultas: cpfConsultas,
            total: count || 0,
            page,
            limit
          }, 200);

        } catch (err) {
          console.error("[admin/transactions] failed", err);
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
