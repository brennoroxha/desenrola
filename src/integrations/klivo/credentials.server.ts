import { supabaseAdmin } from "@/integrations/supabase/client.server";

// KlivoPay: secret_key = api_token, public_key = offer_hash, extra.product_hash = código do produto.
export type KlivoCredentials = { apiToken: string; offerHash: string; productHash: string };

const TTL_MS = 5 * 60 * 1000;
let cache: { creds: KlivoCredentials; fetchedAt: number } | null = null;

export async function getKlivoCredentials(): Promise<KlivoCredentials | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache.creds;

  try {
    const { data, error } = await supabaseAdmin
      .from("desenrola_api_credentials")
      .select("public_key, secret_key, extra")
      .eq("provider", "klivo")
      .maybeSingle();

    if (!error && data?.secret_key) {
      const extra = (data.extra && typeof data.extra === "object") ? (data.extra as any) : {};
      const creds: KlivoCredentials = {
        apiToken: String(data.secret_key),
        offerHash: String(data.public_key || ""),
        productHash: String(extra.product_hash || ""),
      };
      cache = { creds, fetchedAt: now };
      return creds;
    }
    if (error) console.error("[klivo/credentials] supabase error", error);
  } catch (err) {
    console.error("[klivo/credentials] fetch failed", err);
  }

  const apiToken = process.env.KLIVO_API_TOKEN;
  const offerHash = process.env.KLIVO_OFFER_HASH || "";
  const productHash = process.env.KLIVO_PRODUCT_HASH || "";
  if (apiToken) {
    const creds = { apiToken, offerHash, productHash };
    cache = { creds, fetchedAt: now };
    return creds;
  }
  return null;
}

export function invalidateKlivoCredentialsCache() {
  cache = null;
}
