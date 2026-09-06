import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type FreepayCredentials = { pub: string; sec: string };

const TTL_MS = 5 * 60 * 1000;
let cache: { creds: FreepayCredentials; fetchedAt: number } | null = null;

export async function getFreepayCredentials(): Promise<FreepayCredentials | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache.creds;

  try {
    const { data, error } = await supabaseAdmin
      .from("desenrola_api_credentials")
      .select("public_key, secret_key")
      .eq("provider", "freepay")
      .maybeSingle();

    if (!error && data?.secret_key) {
      const creds: FreepayCredentials = {
        pub: String(data.public_key || ""),
        sec: String(data.secret_key),
      };
      cache = { creds, fetchedAt: now };
      return creds;
    }
    if (error) console.error("[freepay/credentials] supabase error", error);
  } catch (err) {
    console.error("[freepay/credentials] fetch failed", err);
  }

  // Fallback temporário: env vars, se ainda existirem.
  const pub = process.env.FREEPAY_PUBLIC_KEY;
  const sec = process.env.FREEPAY_SECRET_KEY;
  if (pub && sec) {
    const creds = { pub, sec };
    cache = { creds, fetchedAt: now };
    return creds;
  }

  return null;
}

export function invalidateFreepayCredentialsCache() {
  cache = null;
}
