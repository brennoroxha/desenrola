import { createFileRoute } from "@tanstack/react-router";
import { checkAdminAuth } from "@/lib/admin-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
} as const;

// Janela de presença: sessões com evento nos últimos 75s são consideradas online.
const WINDOW_MS = 75_000;

export const Route = createFileRoute("/api/public/admin/online")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const sinceISO = new Date(Date.now() - WINDOW_MS).toISOString();
          const { data, error } = await supabaseAdmin
            .from("desenrola_page_events")
            .select("session_id, page, ip, criado_em")
            .gte("criado_em", sinceISO)
            .order("criado_em", { ascending: false })
            .limit(5000);

          if (error) {
            console.error("[admin/online] query error", error);
            return json({ ok: false, message: "erro" }, 500);
          }

          const rows = data || [];
          const sessions = new Set<string>();
          const ips = new Set<string>();
          const byPage = new Map<string, Set<string>>();
          for (const r of rows) {
            const sid = String((r as any).session_id || "");
            if (!sid) continue;
            sessions.add(sid);
            const ip = String((r as any).ip || "").trim();
            if (ip) ips.add(ip);
            const page = String((r as any).page || "-");
            if (page === "presence") continue;
            if (!byPage.has(page)) byPage.set(page, new Set());
            byPage.get(page)!.add(sid);
          }

          const pages = Array.from(byPage.entries())
            .map(([page, set]) => ({ page, count: set.size }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

          return json({
            ok: true,
            online: sessions.size,
            window_seconds: WINDOW_MS / 1000,
            pages,
            sessions: Array.from(sessions),
            ips: Array.from(ips),
          }, 200);
        } catch (err) {
          console.error("[admin/online] failed", err);
          return json({ ok: false, message: "erro" }, 500);
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
