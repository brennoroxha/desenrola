import { createFileRoute } from "@tanstack/react-router";
import { defaultSiteContent, mergeSiteContent, SITE_CONTENT_KEY } from "@/lib/site-content";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
} as const;

export const Route = createFileRoute("/api/public/site-content")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("desenrola_settings")
            .select("value")
            .eq("key", SITE_CONTENT_KEY)
            .maybeSingle();
          let parsed: unknown = null;
          if (data?.value) {
            try { parsed = JSON.parse(data.value); } catch {}
          }
          return json({ ok: true, content: mergeSiteContent(parsed) }, 200);
        } catch (err) {
          console.error("[site-content] read failed", err);
          return json({ ok: true, content: defaultSiteContent }, 200);
        }
      },

      POST: async ({ request }) => {
        const { checkAdminAuth } = await import("@/lib/admin-auth.server");
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

        let body: any = {};
        try { body = await request.json(); } catch {}
        const content = mergeSiteContent(body?.content);

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("desenrola_settings")
            .upsert(
              { key: SITE_CONTENT_KEY, value: JSON.stringify(content), atualizado_em: new Date().toISOString() },
              { onConflict: "key" },
            );
          if (error) throw error;
          return json({ ok: true, content }, 200);
        } catch (err) {
          console.error("[site-content] save failed", err);
          return json({ ok: false, message: "erro ao salvar" }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });
}
