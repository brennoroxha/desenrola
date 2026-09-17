import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/admin/debug-webhooks")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          
          const { data, error } = await supabaseAdmin
            .from("desenrola_webhook_events")
            .select("*")
            .order("recebido_em", { ascending: false })
            .limit(10);
            
          return new Response(JSON.stringify({ data, error }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (e: any) {
          return new Response(e.message, { status: 500 });
        }
      }
    }
  }
});
