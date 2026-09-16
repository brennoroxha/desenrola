import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type InvictusCredentials = {
  apiKey: string;
};

let cache: { data: InvictusCredentials | null; fetchedAt: number } | null = null;
const TTL_MS = 60 * 1000;

export async function getInvictusCredentials(): Promise<InvictusCredentials | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache.data;

  try {
    const { data } = await supabaseAdmin
      .from("desenrola_api_credentials")
      .select("secret_key")
      .eq("provider", "invictus")
      .maybeSingle();

    if (!data?.secret_key) {
      cache = { data: null, fetchedAt: now };
      return null;
    }

    const creds: InvictusCredentials = {
      apiKey: data.secret_key,
    };
    cache = { data: creds, fetchedAt: now };
    return creds;
  } catch (err) {
    console.error("[invictus/credentials] failed to fetch", err);
    return null;
  }
}

export function invalidateInvictusCredentialsCache() {
  cache = null;
}
