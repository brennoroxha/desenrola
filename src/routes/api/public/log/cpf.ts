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
  nascimento: z.string().max(20).optional().nullable(),
  sexo: z.string().max(30).optional().nullable(),
  mae: z.string().max(200).optional().nullable(),
  status_api: z.number().int().optional().nullable(),
  raw: z.record(z.string(), z.any()).optional().nullable(),
});

export const Route = createFileRoute("/api/public/log/cpf")({
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
          const { error } = await supabaseAdmin.from("desenrola_cpf_consultas").insert({
            cpf: parsed.data.cpf,
            nome: parsed.data.nome ?? null,
            nascimento: parsed.data.nascimento ?? null,
            sexo: parsed.data.sexo ?? null,
            mae: parsed.data.mae ?? null,
            status_api: parsed.data.status_api ?? null,
            raw: parsed.data.raw ?? null,
          });
          if (error) {
            console.error("[log/cpf] insert error", error);
            return json({ ok: false }, 500);
          }
          return json({ ok: true }, 200);
        } catch (err) {
          console.error("[log/cpf] failed", err);
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
