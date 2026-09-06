import { createFileRoute } from "@tanstack/react-router";
import { GATEWAYS, getActiveGateway, setActiveGateway, invalidateGatewaySettingsCache } from "@/integrations/gateway/settings.server";
import { invalidateFreepayCredentialsCache } from "@/integrations/freepay/credentials.server";
import { invalidateBlackcatCredentialsCache } from "@/integrations/blackcat/credentials.server";
import { checkAdminAuth } from "@/lib/admin-auth.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
} as const;

export const Route = createFileRoute("/api/public/admin/gateway")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const [active, creds] = await Promise.all([
            getActiveGateway(),
            supabaseAdmin.from("desenrola_api_credentials").select("provider, public_key, extra, atualizado_em"),
          ]);
          const rows = creds.data || [];
          const providers = GATEWAYS.map((g) => {
            const r = rows.find((x: any) => x.provider === g);
            const extra = (r?.extra && typeof r.extra === "object") ? (r.extra as any) : {};
            return {
              id: g,
              configured: !!r,
              public_key: r?.public_key || null,
              product_hash: extra.product_hash || null,
              atualizado_em: r?.atualizado_em || null,
            };
          });
          return json({ ok: true, active, providers }, 200);
        } catch (err) {
          console.error("[admin/gateway] read failed", err);
          return json({ ok: false, message: "erro" }, 500);
        }
      },
      POST: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);
        let body: any = {};
        try { body = await request.json(); } catch {}
        const action = String(body?.action || "");
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          if (action === "set_active") {
            const value = await setActiveGateway(String(body?.gateway || ""));
            return json({ ok: true, active: value }, 200);
          }
          if (action === "set_credentials") {
            const provider = String(body?.provider || "").toLowerCase();
            if (!(GATEWAYS as string[]).includes(provider)) return json({ ok: false, message: "provider inválido" }, 400);
            const secret_key = String(body?.secret_key || "").trim();
            const public_key = body?.public_key != null ? String(body.public_key).trim() : null;
            if (!secret_key) return json({ ok: false, message: "secret_key obrigatório" }, 400);
            const row: Record<string, unknown> = { provider, secret_key, public_key, atualizado_em: new Date().toISOString() };
            const { error } = await supabaseAdmin
              .from("desenrola_api_credentials")
              .upsert(row as never, { onConflict: "provider" });
            if (error) throw error;
            if (provider === "freepay") invalidateFreepayCredentialsCache();
            if (provider === "blackcat") invalidateBlackcatCredentialsCache();
            invalidateGatewaySettingsCache();
            return json({ ok: true }, 200);
          }
          return json({ ok: false, message: "action inválida" }, 400);
        } catch (err) {
          console.error("[admin/gateway] write failed", err);
          return json({ ok: false, message: "erro" }, 500);
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
