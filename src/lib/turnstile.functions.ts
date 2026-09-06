import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const verifyTurnstile = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const secret = process.env["TURNSTILE_SECRET_KEY"];
    if (!secret) {
      return { success: false, error: "config" as const };
    }

    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", data.token);

    try {
      const res = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        },
      );
      const json = (await res.json()) as {
        success?: boolean;
        "error-codes"?: string[];
      };
      return {
        success: json.success === true,
        error: json.success === true ? null : (json["error-codes"]?.[0] ?? "invalid"),
      };
    } catch {
      return { success: false, error: "network" as const };
    }
  });
