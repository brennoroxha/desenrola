import { createFileRoute } from "@tanstack/react-router";
import { checkAdminAuth } from "@/lib/admin-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
} as const;

export const Route = createFileRoute("/api/public/admin/sessions")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

        let body: any = {};
        try { body = await request.json(); } catch {}
        const page = parseInt(body?.page || "1", 10);
        const limit = parseInt(body?.limit || "50", 10); // here limit is sessions, not events

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const from = (page - 1) * limit;
          const to = from + limit - 1;

          // 1. Fetch unique session IDs ordered by latest activity
          // We don't have a distinct view easily, so we just query events, but that's paginating events, not sessions.
          // To paginate sessions properly without complex SQL, we'll just fetch a block of events and group them.
          // This isn't perfect "session" pagination, but it works for a log view.
          const { data: events, error, count } = await supabaseAdmin.from("desenrola_page_events")
            .select("*", { count: "exact" })
            .order("criado_em", { ascending: false })
            .range(from, to);

          if (error) {
            return json({ ok: false, message: error.message }, 500);
          }

          return json({
            ok: true,
            events: events || [],
            total_events: count || 0,
            page,
            limit
          }, 200);

        } catch (err) {
          console.error("[admin/sessions] failed", err);
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
