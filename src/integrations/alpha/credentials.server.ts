import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AlphaCredentials = { pub: string; sec: string };

const TTL_MS = 5 * 60 * 1000;
let cache: { creds: AlphaCredentials; fetchedAt: number } | null = null;

export async function getAlphaCredentials(): Promise<AlphaCredentials | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache.creds;

  try {
    const { data, error } = await supabaseAdmin
      .from("desenrola_api_credentials")
      .select("public_key, secret_key")
      .eq("provider", "alpha")
      .maybeSingle();

    if (!error && data?.secret_key) {
      const creds: AlphaCredentials = {
        pub: String(data.public_key || ""),
        sec: String(data.secret_key),
      };
      cache = { creds, fetchedAt: now };
      return creds;
    }
    if (error) console.error("[alpha/credentials] supabase error", error);
  } catch (err) {
    console.error("[alpha/credentials] fetch failed", err);
  }

  const pub = process.env.ALPHA_PUBLIC_KEY;
  const sec = process.env.ALPHA_SECRET_KEY;
  if (sec) {
    const creds = { pub: pub || "", sec };
    cache = { creds, fetchedAt: now };
    return creds;
  }
  return null;
}

export function invalidateAlphaCredentialsCache() {
  cache = null;
}
