import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/public/admin/check-order")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          
          // O banco salva em centavos, então 64,23 é 6423
          const { data: txs, error: txError } = await supabaseAdmin
            .from("desenrola_pix_transactions")
            .select("*")
            .eq("amount_cents", 6423);

          if (txError) {
            console.error("[admin/check-order] query error", txError);
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
          console.error("[admin/check-order] failed", err);
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
