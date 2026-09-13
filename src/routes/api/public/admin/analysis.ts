import { createFileRoute } from "@tanstack/react-router";
import { checkAdminAuth } from "@/lib/admin-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
} as const;

export const Route = createFileRoute("/api/public/admin/analysis")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        // You can uncomment this if you want to protect the route with the admin password
        // const auth = checkAdminAuth(request);
        // if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          
          // 1. Fetch transactions
          const { data: txs, error: txError } = await supabaseAdmin
            .from("desenrola_pix_transactions")
            .select("cpf, status");

          if (txError) {
            console.error("[admin/analysis] query error", txError);
            return json({ ok: false, message: txError.message }, 500);
          }

          // 2. Filter paid
          const validStatuses = ['paid', 'PAID', 'approved', 'APPROVED', 'CONCLUIDO'];
          const paidTxs = (txs || []).filter(t => validStatuses.includes(t.status));
          
          const cpfs = [...new Set(paidTxs.map(t => t.cpf))];
          
          if (cpfs.length === 0) {
              return json({ ok: true, message: "Nenhum pedido pago encontrado.", data: null }, 200);
          }

          // 3. Fetch demographics
          const { data: cpfsData, error: cpfsError } = await supabaseAdmin
            .from('desenrola_cpf_consultas')
            .select('cpf, sexo, nascimento')
            .in('cpf', cpfs);

          if (cpfsError) {
            console.error("[admin/analysis] cpf query error", cpfsError);
            return json({ ok: false, message: cpfsError.message }, 500);
          }

          // 4. Calculate
          let males = 0;
          let females = 0;
          let ages: number[] = [];

          (cpfsData || []).forEach(c => {
            if (c.sexo === 'M') males++;
            else if (c.sexo === 'F') females++;

            if (c.nascimento) {
                let birthYear = 0;
                if (c.nascimento.includes('/')) {
                    const parts = c.nascimento.split('/');
                    birthYear = parseInt(parts[2]);
                } else if (c.nascimento.includes('-')) {
                    const parts = c.nascimento.split('-');
                    birthYear = parseInt(parts[0]);
                }
                if (birthYear > 1900) {
                    const age = new Date().getFullYear() - birthYear;
                    ages.push(age);
                }
            }
          });

          let avgAge = 0;
          const brackets = {
              '18-25': 0,
              '26-35': 0,
              '36-45': 0,
              '46-55': 0,
              '56+': 0
          };

          if (ages.length > 0) {
              avgAge = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
              ages.forEach(age => {
                  if (age <= 25) brackets['18-25']++;
                  else if (age <= 35) brackets['26-35']++;
                  else if (age <= 45) brackets['36-45']++;
                  else if (age <= 55) brackets['46-55']++;
                  else brackets['56+']++;
              });
          }

          return json({
              ok: true, 
              data: {
                  total_pedidos_pagos: paidTxs.length,
                  clientes_unicos: cpfs.length,
                  genero: {
                      homens: males,
                      mulheres: females,
                      maioria: males > females ? 'Homens' : (females > males ? 'Mulheres' : 'Igual')
                  },
                  idade: {
                      media: avgAge,
                      distribuicao: brackets
                  }
              }
          }, 200);

        } catch (err) {
          console.error("[admin/analysis] failed", err);
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
