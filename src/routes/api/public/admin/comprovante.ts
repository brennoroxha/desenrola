import { createFileRoute } from "@tanstack/react-router";
import { checkAdminAuth } from "@/lib/admin-auth.server";

export const Route = createFileRoute("/api/public/admin/comprovante")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = checkAdminAuth(request);
        if (!auth.ok) return new Response(auth.message, { status: auth.status });
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return new Response("id obrigatório", { status: 400 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("desenrola_comprovantes")
            .select("filename, mime, data_base64")
            .eq("id", id)
            .maybeSingle();
          if (error || !data) return new Response("não encontrado", { status: 404 });

          const bin = Buffer.from(data.data_base64, "base64");
          const dl = url.searchParams.get("dl") === "1";
          return new Response(bin, {
            status: 200,
            headers: {
              "Content-Type": data.mime || "application/octet-stream",
              "Content-Disposition": `${dl ? "attachment" : "inline"}; filename="${(data.filename || "comprovante").replace(/[^\w.\-]+/g, "_")}"`,
              "Cache-Control": "private, no-store",
            },
          });
        } catch (err) {
          console.error("[admin/comprovante] failed", err);
          return new Response("erro", { status: 500 });
        }
      },
    },
  },
});
