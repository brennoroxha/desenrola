import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const bodySchema = z.object({
  transaction_id: z.string().max(64).optional().nullable(),
  acordo: z.string().max(64).optional().nullable(),
  cpf: z.string().max(20).optional().nullable(),
  nome: z.string().max(200).optional().nullable(),
  filename: z.string().max(200),
  mime: z.string().max(100),
  size_bytes: z.number().int().nonnegative().max(5 * 1024 * 1024),
  data_base64: z.string().min(10),
});

export const Route = createFileRoute("/api/public/comprovante/upload")({
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

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("desenrola_comprovantes").insert({
            transaction_id: parsed.data.transaction_id ?? null,
            acordo: parsed.data.acordo ?? null,
            cpf: parsed.data.cpf ?? null,
            nome: parsed.data.nome ?? null,
            filename: parsed.data.filename,
            mime: parsed.data.mime,
            size_bytes: parsed.data.size_bytes,
            data_base64: parsed.data.data_base64,
            ip,
          });
          if (error) {
            console.error("[comprovante] insert error", error);
            return json({ ok: false }, 500);
          }
          // Notifica no Pushcut como "Aprovado" alternativo? Não - user pediu para sinalizar como desvio no admin.
          return json({ ok: true }, 200);
        } catch (err) {
          console.error("[comprovante] failed", err);
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
