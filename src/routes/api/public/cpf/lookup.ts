import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const TIMEOUT_MS = 6000;

export const Route = createFileRoute("/api/public/cpf/lookup")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const cpf = (url.searchParams.get("cpf") || "").replace(/\D/g, "");
        if (!/^\d{11}$/.test(cpf)) {
          return json({ status: 400, cpf: "", nome: "", nascimento: "", sexo: "", mae: "" }, 400);
        }

        try {
          const { executeCpfLookup } = await import("@/lib/cpf-api.server");
          const result = await executeCpfLookup(cpf);

          if (!result || !result.CPF) {
            console.error("[cpf/lookup] result empty or invalid CPF for:", cpf);
            return json({ status: 404, cpf: "", nome: "", nascimento: "", sexo: "", mae: "" }, 200);
          }

          console.log("[cpf/lookup] successful for:", cpf, result.NOME);
          return json(
            {
              status: 200,
              cpf: result.CPF.replace(/\D/g, ""),
              nome: result.NOME || "",
              nascimento: result.NASC || "",
              sexo: result.SEXO || "",
              mae: result.NOME_MAE || "",
              api_provider: result._provider || "SearchAPI",
            },
            200,
          );
        } catch (err) {
          console.error("[cpf/lookup] direct server-side lookup failed for:", cpf, err);
          return json({ status: 500, cpf: "", nome: "", nascimento: "", sexo: "", mae: "" }, 200);
        }
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
