// Helpers de autenticação do painel admin.
// - Senha via ADMIN_PASSWORD (fallback: 01parede)
// - Allowlist de IPs via ADMIN_ALLOWED_IPS (lista separada por vírgula).
//   Se não definida ou vazia, o IP não é restringido.

export function getClientIP(request: Request): string {
  const xff = request.headers.get("x-forwarded-for") || "";
  if (xff) return xff.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip") || "";
  if (real) return real.trim();
  const cf = request.headers.get("cf-connecting-ip") || "";
  if (cf) return cf.trim();
  return "";
}



export function isIPAllowed(request: Request): boolean {
  const raw = process.env.ADMIN_ALLOWED_IPS || "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return true; // sem allowlist configurada = sem restrição
  const ip = getClientIP(request);
  if (!ip) return false;
  return list.includes(ip);
}

export function checkAdminPassword(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD || "01parede";
  const url = new URL(request.url);
  const qp = url.searchParams.get("pw") || "";
  const header = request.headers.get("x-admin-password") || "";
  return (qp && qp === expected) || (header.length > 0 && header === expected);
}

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; message: string };

export function checkAdminAuth(request: Request): AdminAuthResult {
  if (!isIPAllowed(request)) return { ok: false, status: 403, message: "ip não autorizado" };


  if (!checkAdminPassword(request)) return { ok: false, status: 401, message: "unauthorized" };
  return { ok: true };
}
