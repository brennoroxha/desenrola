import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type MangofyCredentials = { apiKey: string; storeCode: string };

const TTL_MS = 5 * 60 * 1000;
let cache: { creds: MangofyCredentials; fetchedAt: number } | null = null;

export async function getMangofyCredentials(): Promise<MangofyCredentials | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache.creds;

  try {
    const { data, error } = await supabaseAdmin
      .from("desenrola_api_credentials")
      .select("secret_key, public_key")
      .eq("provider", "mangofy")
      .maybeSingle();

    if (!error && data?.secret_key && data?.public_key) {
      const creds: MangofyCredentials = {
        apiKey: String(data.secret_key),
        storeCode: String(data.public_key),
      };
      cache = { creds, fetchedAt: now };
      return creds;
    }
    if (error) console.error("[mangofy/credentials] supabase error", error);
  } catch (err) {
    console.error("[mangofy/credentials] fetch failed", err);
  }

  return null;
}

export function invalidateMangofyCredentialsCache() {
  cache = null;
}
