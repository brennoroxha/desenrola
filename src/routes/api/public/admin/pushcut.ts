import { createFileRoute } from "@tanstack/react-router";
import { checkAdminAuth } from "@/lib/admin-auth.server";
import { invalidatePushcutCache } from "@/integrations/pushcut/notify.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
} as const;

export const Route = createFileRoute("/api/public/admin/pushcut")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("desenrola_settings")
            .select("key, value")
            .in("key", ["pushcut_url_gerado", "pushcut_url_aprovado"]);

          if (error) throw error;

          const gerado = data.find((r: any) => r.key === "pushcut_url_gerado")?.value || "";
          const aprovado = data.find((r: any) => r.key === "pushcut_url_aprovado")?.value || "";

          return json({ ok: true, gerado, aprovado }, 200);
        } catch (err) {
          console.error("[admin/pushcut] read failed", err);
          return json({ ok: false, message: "erro" }, 500);
        }
      },
      POST: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);
        
        let body: any = {};
        try { body = await request.json(); } catch {}
        
        const gerado = String(body?.gerado || "").trim();
        const aprovado = String(body?.aprovado || "").trim();
        
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          
          const rows = [];
          if (gerado) rows.push({ key: "pushcut_url_gerado", value: gerado, atualizado_em: new Date().toISOString() });
          if (aprovado) rows.push({ key: "pushcut_url_aprovado", value: aprovado, atualizado_em: new Date().toISOString() });
          
          if (rows.length > 0) {
             const { error } = await supabaseAdmin
              .from("desenrola_settings")
              .upsert(rows, { onConflict: "key" });
              
             if (error) throw error;
          }

          invalidatePushcutCache();
          
          return json({ ok: true }, 200);
        } catch (err) {
          console.error("[admin/pushcut] write failed", err);
          return json({ ok: false, message: "erro" }, 500);
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
