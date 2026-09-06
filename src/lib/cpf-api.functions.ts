import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { executeCpfLookup } from "./cpf-api.server";

export const consultarCpf = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ cpf: z.string() }).parse(data))
  .handler(async ({ data }) => {
    return executeCpfLookup(data.cpf);
  });
