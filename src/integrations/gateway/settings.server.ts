import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type GatewayId = "freepay" | "blackcat";
export const GATEWAYS: GatewayId[] = ["freepay", "blackcat"];

const TTL_MS = 60 * 1000;
let cache: { value: GatewayId; fetchedAt: number } | null = null;

function normalize(v: unknown): GatewayId {
  const s = String(v || "").toLowerCase();
  return (GATEWAYS as string[]).includes(s) ? (s as GatewayId) : "freepay";
}

export async function getActiveGateway(): Promise<GatewayId> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache.value;
  try {
    const { data } = await supabaseAdmin
      .from("desenrola_settings")
      .select("value")
      .eq("key", "active_gateway")
      .maybeSingle();
    const value = normalize(data?.value);
    cache = { value, fetchedAt: now };
    return value;
  } catch (err) {
    console.error("[gateway/settings] read failed", err);
    return "freepay";
  }
}

export async function setActiveGateway(next: string): Promise<GatewayId> {
  const value = normalize(next);
  const { error } = await supabaseAdmin
    .from("desenrola_settings")
    .upsert({ key: "active_gateway", value, atualizado_em: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
  cache = { value, fetchedAt: Date.now() };
  return value;
}

export function invalidateGatewaySettingsCache() {
  cache = null;
}
