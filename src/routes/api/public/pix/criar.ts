import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getActiveGateway } from "@/integrations/gateway/settings.server";
import { createPix } from "@/integrations/gateway/pix.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const CHECKOUT_EMAIL = "cliente@gmail.com";

const bodySchema = z.object({
  cpf: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().regex(/^\d{11}$/, "CPF inválido")),
  nome: z.string().min(2).max(120),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().regex(/^\d{10,11}$/, "Telefone inválido")),
  amount_cents: z.number().int().positive().max(10_000_00),
  acordo: z.string().min(1).max(64),
});

export const Route = createFileRoute("/api/public/pix/criar")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const t0 = Date.now();
        let raw: any;
        try { raw = await request.json(); } catch { return json({ success: false, message: "JSON inválido." }, 400); }

        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return json({ success: false, message: parsed.error.issues.map((i) => i.message).join("; ") }, 400);
        }
        const b = parsed.data;
        const origin = new URL(request.url).origin;
        const gateway = await getActiveGateway();
        const customerName = normalizeName(b.nome);

        const customerEmail = b.email && b.email.includes("@") ? b.email : CHECKOUT_EMAIL;

        const result = await createPix(gateway, {
          cpf: b.cpf,
          nome: customerName,
          email: customerEmail,
          phone: b.phone,
          amount_cents: b.amount_cents,
          acordo: b.acordo,
          postbackUrl: gateway === "blackcat"
            ? `${origin}/api/public/pix/webhook/blackcat`
            : `${origin}/api/public/pix/webhook`,
          ip: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || undefined,
        });

        console.log("[pix/criar] createPix concluído", { gateway, ms: Date.now() - t0, ok: result.ok });

        if (!result.ok) {
          return json({ success: false, message: result.message, gateway }, result.status);
        }

        // Persistência + notificação em paralelo, sem bloquear a resposta.
        // Usamos Promise.all mas com timeout curto para não segurar a resposta em caso de lentidão do Supabase/Pushcut.
        const sideEffects = (async () => {
          try {
            const [{ supabaseAdmin }, { pushcut }] = await Promise.all([
              import("@/integrations/supabase/client.server"),
              import("@/integrations/pushcut/notify.server"),
            ]);
            const dbPromise = supabaseAdmin
              .from("desenrola_pix_transactions")
              .upsert(
                {
                  transaction_id: result.transactionId,
                  cpf: b.cpf,
                  nome: customerName,
                  email: CHECKOUT_EMAIL,
                  phone: b.phone,
                  amount_cents: b.amount_cents,
                  acordo: b.acordo,
                  status: result.status,
                  gateway,
                  qr_code: result.copyPaste || null,
                  qr_code_url: result.qrCodeUrl || null,
                  expires_at: result.expiresAt,
                  notified_gerado: true,
                  atualizado_em: new Date().toISOString(),
                },
                { onConflict: "transaction_id" },
              );
            const pushPromise = pushcut("gerado", (b.amount_cents / 100).toFixed(2));
            const [dbRes] = await Promise.all([dbPromise, pushPromise]);
            if (dbRes?.error) console.error("[pix/criar] supabase upsert error", dbRes.error);
          } catch (err) {
            console.error("[pix/criar] side effects failed", err);
          }
        })();

        // Limite duro: só espera até 400 ms pelas gravações; o resto continua em background.
        await Promise.race([sideEffects, new Promise((r) => setTimeout(r, 400))]);

        console.log("[pix/criar] response enviada", { ms: Date.now() - t0 });

        return json({
          success: true,
          gateway,
          transactionId: result.transactionId,
          copyPaste: result.copyPaste,
          qrCodeUrl: result.qrCodeUrl,
          expiresAt: result.expiresAt,
          status: result.status,
        }, 200);
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

function normalizeName(value: unknown) {
  return String(value || "Cliente").trim().replace(/\s+/g, " ").slice(0, 120) || "Cliente";
}
