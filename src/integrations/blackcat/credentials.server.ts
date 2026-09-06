import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type BlackcatCredentials = { apiKey: string };

const TTL_MS = 5 * 60 * 1000;
let cache: { creds: BlackcatCredentials; fetchedAt: number } | null = null;

export async function getBlackcatCredentials(): Promise<BlackcatCredentials | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache.creds;

  try {
    const { data, error } = await supabaseAdmin
      .from("desenrola_api_credentials")
      .select("secret_key")
      .eq("provider", "blackcat")
      .maybeSingle();

    if (!error && data?.secret_key) {
      const creds: BlackcatCredentials = { apiKey: String(data.secret_key) };
      cache = { creds, fetchedAt: now };
      return creds;
    }
    if (error) console.error("[blackcat/credentials] supabase error", error);
  } catch (err) {
    console.error("[blackcat/credentials] fetch failed", err);
  }

  const envKey = process.env.BLACKCAT_API_KEY;
  if (envKey) {
    const creds = { apiKey: envKey };
    cache = { creds, fetchedAt: now };
    return creds;
  }

  return null;
}

export function invalidateBlackcatCredentialsCache() {
  cache = null;
}
