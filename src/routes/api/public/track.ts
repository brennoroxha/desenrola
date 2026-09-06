import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const bodySchema = z.object({
  session_id: z.string().min(4).max(64),
  page: z.string().min(1).max(64),
  step: z.string().min(1).max(64),
  cpf: z.string().max(20).optional().nullable(),
  nome: z.string().max(200).optional().nullable(),
  acordo: z.string().max(64).optional().nullable(),
  meta: z.record(z.string(), z.any()).optional().nullable(),
});

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let raw: unknown;
        try { raw = await request.json(); } catch { return json({ ok: false }, 400); }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) return json({ ok: false, message: "payload inválido" }, 400);

        const ip = request.headers.get("cf-connecting-ip")
          || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          || null;
        const ua = request.headers.get("user-agent") || null;
        const referer = request.headers.get("referer") || null;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("desenrola_page_events").insert({
            session_id: parsed.data.session_id,
            page: parsed.data.page,
            step: parsed.data.step,
            cpf: parsed.data.cpf ?? null,
            nome: parsed.data.nome ?? null,
            acordo: parsed.data.acordo ?? null,
            meta: parsed.data.meta ?? null,
            ip,
            user_agent: ua,
            referer,
          });
          if (error) {
            console.error("[track] insert error", error);
            // Fail-soft: don't break the client funnel if tracking storage is unavailable.
            return json({ ok: false, skipped: true }, 200);
          }
          return json({ ok: true }, 200);
        } catch (err) {
          console.error("[track] failed", err);
          return json({ ok: false, skipped: true }, 200);
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
