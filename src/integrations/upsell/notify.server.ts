import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function notifyUpsell(transactionId: string) {
  try {
    const { data: tx } = await supabaseAdmin
      .from("desenrola_pix_transactions")
      .select("*")
      .eq("transaction_id", transactionId)
      .single();

    if (!tx) return;

    const { data: settings } = await supabaseAdmin
      .from("desenrola_settings")
      .select("value")
      .eq("key", "upsell_webhook_url")
      .maybeSingle();

    const targetUrl = settings?.value;
    if (!targetUrl) return;

    await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tx),
    }).catch(() => {});
  } catch (err) {
    console.error("[upsell notify] error", err);
  }
}
