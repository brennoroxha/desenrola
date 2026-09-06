import { createFileRoute } from "@tanstack/react-router";
import { checkAdminAuth } from "@/lib/admin-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
} as const;

export const Route = createFileRoute("/api/public/admin/ips")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("desenrola_blocked_ips")
            .select("*")
            .order("criado_em", { ascending: false });

          if (error) {
            console.error("[admin/ips] query error", error);
            // If table doesn't exist yet, return empty list gracefully
            if (error.code === "42P01") {
              return json({ ok: true, ips: [] }, 200);
            }
            return json({ ok: false, message: error.message }, 500);
          }

          return json({ ok: true, ips: data || [] }, 200);
        } catch (err) {
          console.error("[admin/ips] failed", err);
          return json({ ok: false, message: "erro interno" }, 500);
        }
      },
      POST: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

        try {
          const body = await request.json();
          const action = body.action; // "block" | "unblock"
          const ip = body.ip?.trim();
          const motivo = body.motivo?.trim() || null;

          if (!ip) return json({ ok: false, message: "IP é obrigatório" }, 400);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          if (action === "block") {
            const { error } = await supabaseAdmin
              .from("desenrola_blocked_ips")
              .upsert({ ip, motivo });

            if (error) {
              console.error("[admin/ips] block error", error);
              return json({ ok: false, message: error.message }, 500);
            }
            return json({ ok: true, message: "IP bloqueado com sucesso" }, 200);
          } 
          
          if (action === "unblock") {
            const { error } = await supabaseAdmin
              .from("desenrola_blocked_ips")
              .delete()
              .eq("ip", ip);

            if (error) {
              console.error("[admin/ips] unblock error", error);
              return json({ ok: false, message: error.message }, 500);
            }
            return json({ ok: true, message: "IP desbloqueado com sucesso" }, 200);
          }

          return json({ ok: false, message: "Ação inválida" }, 400);
        } catch (err) {
          console.error("[admin/ips] POST failed", err);
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
