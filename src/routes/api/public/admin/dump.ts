import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/admin/dump")({
  server: {
    handlers: {
      GET: async () => {
        const { data } = await supabaseAdmin.from("desenrola_settings").select("key, value");
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }
});
