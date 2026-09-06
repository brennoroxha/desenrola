import { z } from "zod";

export const API_TOKENS = [
  "2077", "2733", "3684", "3882", "4097", "4707", "5621", "5717", 
  "6441", "7009", "7499", "7903", "8301", "8356", "8706", "9309"
];

export const cpfSchema = z.string().transform((val) => val.replace(/\D/g, ""));

export const consultaResponseSchema = z.object({
  CPF: z.string().optional(),
  NOME: z.string().optional(),
  NASC: z.string().optional(),
  NOME_MAE: z.string().optional(),
  NOME_PAI: z.string().optional(),
  SEXO: z.string().optional(),
  RENDA: z.string().optional(),
});

export type CpfData = z.infer<typeof consultaResponseSchema>;

export async function executeCpfLookup(cpf: string): Promise<CpfData> {
  const cleanCpf = cpfSchema.parse(cpf);
  
  for (const token of API_TOKENS) {
    try {
      const url = `https://searchapi.it.com/consulta?cpf=${cleanCpf}&token_api=${token}`;
      console.log(`[executeCpfLookup] Trying token ${token} for CPF ${cleanCpf}`);
      
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
      console.log(`[executeCpfLookup] Token ${token} status ${response.status} response prefix:`, responseText.substring(0, 150));

      if (!response.ok) {
        console.error(`[executeCpfLookup] Token ${token} HTTP error ${response.status}`);
        continue;
      }

      let json;
      try {
        json = JSON.parse(responseText);
      } catch (e) {
        console.error(`[executeCpfLookup] Token ${token} JSON parse error`);
        continue;
      }
      
      let item = null;
      if (json && Array.isArray(json.dados) && json.dados.length > 0) {
        item = json.dados[0];
      } else if (json && json.CPF) {
        item = json;
      }

      if (item) {
        console.log(`[executeCpfLookup] Success with token ${token}`);
        return consultaResponseSchema.parse(item);
      }
    } catch (error) {
      console.error(`Error consulting CPF with token ${token}:`, error);
      continue;
    }
  }
  
  throw new Error("Não foi possível consultar o CPF com os tokens disponíveis.");
}
