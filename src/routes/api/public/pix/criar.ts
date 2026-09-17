import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getActiveGateway } from "@/integrations/gateway/settings.server";
import { createPix } from "@/integrations/gateway/pix.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { pushcut } from "@/integrations/pushcut/notify.server";

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

        // Idempotency: return existing PENDING pix if created within the last 15 minutes
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { data: existingPix } = await supabaseAdmin
          .from("desenrola_pix_transactions")
          .select("*")
          .eq("cpf", b.cpf)
          .eq("acordo", b.acordo)
          .eq("status", "PENDING")
          .gte("created_at", fifteenMinsAgo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingPix && existingPix.qr_code) {
          return json({
            success: true,
            gateway: existingPix.gateway,
            transactionId: existingPix.transaction_id,
            copyPaste: existingPix.qr_code,
            qrCodeUrl: existingPix.qr_code_url,
            expiresAt: existingPix.expires_at,
            status: existingPix.status,
          }, 200);
        }

        const result = await createPix(gateway, {
          cpf: b.cpf,
          nome: customerName,
          email: customerEmail,
          phone: b.phone,
          amount_cents: b.amount_cents,
          acordo: b.acordo,
          postbackUrl: gateway === "blackcat"
            ? `${origin}/api/public/pix/webhook/blackcat`
            : gateway === "invictus"
            ? `${origin}/api/public/pix/webhook/invictus`
            : `${origin}/api/public/pix/webhook`,
          ip: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || undefined,
        });

        console.log("[pix/criar] createPix concluído", { gateway, ms: Date.now() - t0, ok: result.ok });

        if (!result.ok) {
          // Sempre retorna 400 para o frontend para evitar a tela de "Internal Server Error" no console, mesmo se o gateway retornar 500.
          return json({ success: false, message: result.message, gateway }, 400);
        }

        // Persistência + notificação em paralelo, sem bloquear a resposta.
        // Mover a importação para cima do arquivo otimiza o tempo.
        const sideEffects = (async () => {
          try {
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
            const pushPromise = pushcut("gerado", (b.amount_cents / 100).toFixed(2)).catch(() => {});
            const dbRes = await dbPromise;
            await pushPromise;
            if (dbRes?.error) console.error("[pix/criar] supabase upsert error", dbRes.error);
          } catch (err) {
            console.error("[pix/criar] side effects failed", err);
          }
        })();

        // Precisamos aguardar (await) os sideEffects porque em ambientes serverless (Vercel/Cloudflare) 
        // retornar a resposta interrompe imediatamente qualquer Promise rodando em background.
        await sideEffects;

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
