import { z } from "zod";

export function getApiTokens(): string[] {
  if (typeof process !== "undefined" && process.env.SEARCHAPI_TOKEN) {
    return process.env.SEARCHAPI_TOKEN.split(",").map((t) => t.trim());
  }
  return ["2077"]; // Fallback de segurança local
}

export const cpfSchema = z.string().transform((val) => val.replace(/\D/g, ""));

export const consultaResponseSchema = z.object({
  CPF: z.string().optional(),
  NOME: z.string().optional(),
  NASC: z.string().optional(),
  NOME_MAE: z.string().optional(),
  NOME_PAI: z.string().optional(),
  SEXO: z.string().optional(),
  RENDA: z.string().optional(),
  _provider: z.string().optional(),
});

export type CpfData = z.infer<typeof consultaResponseSchema>;

export async function executeCpfLookup(cpf: string): Promise<CpfData> {
  // Ignora verificação SSL (útil caso o certificado do site expire ou seja marcado como inválido localmente)
  // @ts-ignore
  if (typeof process !== "undefined" && process.env) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const cleanCpf = cpfSchema.parse(cpf);
  // 1. TENTA PRIMEIRO A API ATHENAS BUSCAS
  const athenasKey = (typeof process !== "undefined" && process.env.ATHENAS_API_KEY) ? process.env.ATHENAS_API_KEY : '';
  
  try {
    const athenasUrl = `https://api.athenasbuscas.com/api/ext/v1/cadsus/${cleanCpf}`;
    console.log(`[executeCpfLookup] Trying PRIMARY API Athenas for CPF ${cleanCpf}`);
    const athenasResponse = await fetch(athenasUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': athenasKey
      },
      // @ts-ignore
      signal: AbortSignal.timeout(10000)
    });

    if (athenasResponse.ok) {
      const athenasJson = await athenasResponse.json();
      if (athenasJson && athenasJson.data) {
        console.log(`[executeCpfLookup] Success with PRIMARY API Athenas`);
        const item = {
          CPF: athenasJson.data.cpf,
          NOME: athenasJson.data.nome,
          NASC: athenasJson.data.dataNascimento,
          NOME_MAE: athenasJson.data.nomeMae,
          NOME_PAI: athenasJson.data.nomePai,
          SEXO: athenasJson.data.sexo,
          _provider: "Athenas Buscas"
        };
        return consultaResponseSchema.parse(item);
      }
    } else {
      console.error(`[executeCpfLookup] PRIMARY API Athenas HTTP error ${athenasResponse.status}, falling back to SearchAPI`);
    }
  } catch (error) {
    console.error(`Error consulting CPF with PRIMARY API Athenas:`, error);
  }

  // 2. SE ATHENAS FALHAR, TENTA A SEARCH API COMO FALLBACK
  const tokens = getApiTokens();
  
  for (const token of tokens) {
    try {
      const url = `https://searchapi.it.com/consulta?cpf=${cleanCpf}&token_api=${token}`;
      console.log(`[executeCpfLookup] Trying fallback token ${token} for CPF ${cleanCpf}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        // @ts-ignore
        signal: AbortSignal.timeout(10000) 
      });
      
      const responseText = await response.text();
      console.log(`[executeCpfLookup] Fallback Token ${token} status ${response.status} response prefix:`, responseText.substring(0, 150));

      if (!response.ok) {
        console.error(`[executeCpfLookup] Fallback Token ${token} HTTP error ${response.status}`);
        continue;
      }

      let json;
      try {
        json = JSON.parse(responseText);
      } catch (e) {
        console.error(`[executeCpfLookup] Fallback Token ${token} JSON parse error`);
        continue;
      }
      
      let item = null;
      if (json && Array.isArray(json.dados) && json.dados.length > 0) {
        item = json.dados[0];
      } else if (json && json.CPF) {
        item = json;
      }

      if (item) {
        item._provider = "SearchAPI";
        console.log(`[executeCpfLookup] Success with fallback token ${token}`);
        return consultaResponseSchema.parse(item);
      } else {
        console.log(`[executeCpfLookup] Fallback Token ${token} returned no data for CPF, breaking loop.`);
        break; // Nao tenta outros tokens, já que respondeu 200 e nao encontrou dados
      }
    } catch (error) {
      console.error(`Error consulting CPF with fallback token ${token}:`, error);
      continue;
    }
  }

  throw new Error("Não foi possível consultar o CPF com as APIs disponíveis.");
}
