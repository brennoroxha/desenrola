import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const bodySchema = z.object({
  cpf: z.string().regex(/^\d{11}$/),
  nome: z.string().max(200).optional().nullable(),
  codigo_acordo: z.string().min(1).max(64),
});

export const Route = createFileRoute("/api/public/log/chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let raw: unknown;
        try { raw = await request.json(); } catch { return json({ ok: false }, 400); }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) return json({ ok: false, message: "payload inválido" }, 400);

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("desenrola_chat_sessions").insert({
            cpf: parsed.data.cpf,
            nome: parsed.data.nome ?? null,
            codigo_acordo: parsed.data.codigo_acordo,
          });
          if (error && !String(error.message || "").includes("duplicate")) {
            console.error("[log/chat] insert error", error);
            return json({ ok: false }, 500);
          }
          return json({ ok: true }, 200);
        } catch (err) {
          console.error("[log/chat] failed", err);
          return json({ ok: false }, 500);
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
