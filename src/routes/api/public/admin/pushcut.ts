import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { invalidatePushcutCache } from "@/integrations/pushcut/notify.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
};

export const Route = createFileRoute("/api/public/admin/pushcut")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const pw = request.headers.get("X-Admin-Password");
        if (pw !== process.env.ADMIN_PASSWORD) {
          return json({ ok: false, message: "Não autorizado" }, 401);
        }

        try {
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
          return json({ ok: false, message: "Erro ao ler do banco" }, 500);
        }
      },
      POST: async ({ request }) => {
        const pw = request.headers.get("X-Admin-Password");
        if (pw !== process.env.ADMIN_PASSWORD) {
          return json({ ok: false, message: "Não autorizado" }, 401);
        }

        try {
          const body = await request.json();
          const gerado = body.gerado;
          const aprovado = body.aprovado;

          const rows = [];
          if (gerado !== undefined) rows.push({ key: "pushcut_url_gerado", value: gerado, atualizado_em: new Date().toISOString() });
          if (aprovado !== undefined) rows.push({ key: "pushcut_url_aprovado", value: aprovado, atualizado_em: new Date().toISOString() });

          if (rows.length > 0) {
            const { error } = await supabaseAdmin.from("desenrola_settings").upsert(rows);
            if (error) throw error;
          }

          invalidatePushcutCache();
          return json({ ok: true }, 200);
        } catch (err) {
          console.error("[admin/pushcut] write failed", err);
          return json({ ok: false, message: "Erro interno" }, 500);
        }
      }
    }
  }
});

function json(body: any, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
