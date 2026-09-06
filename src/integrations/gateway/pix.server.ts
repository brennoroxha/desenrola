import { getFreepayCredentials } from "@/integrations/freepay/credentials.server";
import { getBlackcatCredentials } from "@/integrations/blackcat/credentials.server";
import { getAlphaCredentials } from "@/integrations/alpha/credentials.server";
import { getKlivoCredentials } from "@/integrations/klivo/credentials.server";
import type { GatewayId } from "@/integrations/gateway/settings.server";

export type CreatePixInput = {
  cpf: string;
  nome: string;
  email: string;
  phone: string; // apenas dígitos, 10-11
  amount_cents: number;
  acordo: string;
  postbackUrl: string;
  ip?: string;
};

export type CreatePixResult = {
  ok: true;
  transactionId: string;
  status: string;
  copyPaste: string;
  qrCodeUrl: string;
  expiresAt: string | null;
} | {
  ok: false;
  status: number;
  message: string;
};

export type StatusResult = {
  status: "PAID" | "PENDING" | "REFUNDED" | "REFUSED" | "FAILED" | "EXPIRED" | "CANCELLED" | "ERROR";
  paidAt: string | null;
};

function normalizeStatus(raw: string): StatusResult["status"] {
  const s = String(raw || "PENDING").toUpperCase();
  const allowed: StatusResult["status"][] = ["PAID", "PENDING", "REFUNDED", "REFUSED", "FAILED", "EXPIRED", "CANCELLED", "ERROR"];
  return (allowed as string[]).includes(s) ? (s as StatusResult["status"]) : "PENDING";
}

// ---------- Freepay ----------
async function createPixFreepay(input: CreatePixInput): Promise<CreatePixResult> {
  const creds = await getFreepayCredentials();
  if (!creds) return { ok: false, status: 500, message: "Credenciais Freepay não configuradas." };
  const auth = Buffer.from(`${creds.pub}:${creds.sec}`).toString("base64");
  const payload = {
    amount: input.amount_cents,
    payment_method: "pix" as const,
    postback_url: input.postbackUrl,
    customer: {
      name: input.nome,
      email: input.email,
      phone: `+55${input.phone}`,
      document: { number: input.cpf, type: "cpf" as const },
    },
    items: [{ title: "Apostila Desenrolados", unit_price: input.amount_cents, quantity: 1, tangible: false, external_ref: input.acordo }],
    pix: { expires_in_days: 1 },
    metadata: { acordo: input.acordo, provider_name: "Desenrola Brasil" },
    ip: input.ip,
  };
  let res: Response;
  try {
    res = await fetch("https://api.freepaybrasil.com/v1/payment-transaction/create", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", authorization: `Basic ${auth}` },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[gateway/freepay] fetch failed", err);
    return { ok: false, status: 502, message: "Falha ao conectar ao provedor." };
  }
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const msg = (data && typeof data === "object" && (data.message || data.error)) || `Provedor retornou ${res.status}`;
    return { ok: false, status: res.status, message: String(msg) };
  }
  const inner = Array.isArray(data?.data) ? data.data[0] : data?.data ?? data;
  const pix = Array.isArray(inner?.pix) ? inner.pix[0] : inner?.pix;
  return {
    ok: true,
    transactionId: String(inner?.id ?? ""),
    status: normalizeStatus(inner?.status),
    copyPaste: String(pix?.qr_code || ""),
    qrCodeUrl: String(pix?.url || ""),
    expiresAt: pix?.expiration_date || null,
  };
}

async function getStatusFreepay(id: string): Promise<StatusResult> {
  const creds = await getFreepayCredentials();
  if (!creds) return { status: "PENDING", paidAt: null };
  const auth = Buffer.from(`${creds.pub}:${creds.sec}`).toString("base64");
  try {
    const res = await fetch(`https://api.freepaybrasil.com/v1/payment-transaction/info/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json", authorization: `Basic ${auth}` },
    });
    const text = await res.text();
    let data: any = null; try { data = JSON.parse(text); } catch {}
    if (!res.ok) return { status: "PENDING", paidAt: null };
    const inner = data?.data ?? data;
    return { status: normalizeStatus(inner?.status), paidAt: inner?.paid_at || null };
  } catch (err) {
    console.error("[gateway/freepay] status failed", err);
    return { status: "PENDING", paidAt: null };
  }
}

// ---------- Blackcat ----------
async function createPixBlackcat(input: CreatePixInput): Promise<CreatePixResult> {
  const creds = await getBlackcatCredentials();
  if (!creds) return { ok: false, status: 500, message: "Credenciais Blackcat não configuradas." };
  const payload = {
    amount: input.amount_cents,
    currency: "BRL",
    paymentMethod: "pix",
    items: [{ title: "Apostila Desenrolados", unitPrice: input.amount_cents, quantity: 1, tangible: false }],
    customer: {
      name: input.nome,
      email: input.email,
      phone: input.phone,
      document: { number: input.cpf, type: "cpf" },
    },
    pix: { expiresInDays: 1 },
    postbackUrl: input.postbackUrl,
    externalRef: input.acordo,
    metadata: JSON.stringify({ acordo: input.acordo, provider_name: "Desenrola Brasil" }),
  };
  let res: Response;
  try {
    res = await fetch("https://api.blackcatoficial.com/api/sales/create-sale", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", "X-API-Key": creds.apiKey },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[gateway/blackcat] fetch failed", err);
    return { ok: false, status: 502, message: "Falha ao conectar ao provedor." };
  }
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = text; }
  // Aceita variações do envelope: { success, data } | { data } | plano.
  const inner = (data && typeof data === "object")
    ? (data.data ?? data.sale ?? data.transaction ?? data)
    : {};
  const pd = (inner && typeof inner === "object")
    ? (inner.paymentData ?? inner.pix ?? inner.payment ?? {})
    : {};
  const txId = inner?.transactionId ?? inner?.id ?? inner?.transaction_id ?? inner?.saleId ?? "";
  const hasPix = !!(pd?.qrCode || pd?.qrCodeBase64 || pd?.copyPaste || pd?.qr_code);
  if (!res.ok || (!txId && !hasPix)) {
    const msg = (data && typeof data === "object" && (data.message || data.error)) || `Provedor retornou ${res.status}`;
    console.error("[gateway/blackcat] resposta inesperada", { status: res.status, body: text.slice(0, 500) });
    return { ok: false, status: res.ok ? 502 : res.status, message: String(msg) };
  }
  const rawImg = String(pd.qrCodeBase64 || pd.qrCode || "").trim();
  let qrImg = "";
  if (rawImg) {
    if (rawImg.startsWith("data:")) qrImg = rawImg;
    else if (/^https?:\/\//i.test(rawImg)) qrImg = rawImg;
    else {
      const b64 = rawImg.replace(/\s/g, "").replace(/^base64,/, "");
      qrImg = `data:image/png;base64,${b64}`;
    }
  }
  return {
    ok: true,
    transactionId: String(txId || ""),
    status: normalizeStatus(inner?.status),
    copyPaste: String(pd.copyPaste || pd.qrCode || pd.qr_code || ""),
    qrCodeUrl: qrImg,
    expiresAt: pd.expiresAt || pd.expires_at || null,
  };
}

async function getStatusBlackcat(id: string): Promise<StatusResult> {
  const creds = await getBlackcatCredentials();
  if (!creds) return { status: "PENDING", paidAt: null };
  try {
    const res = await fetch(`https://api.blackcatoficial.com/api/sales/${encodeURIComponent(id)}/status`, {
      headers: { accept: "application/json", "X-API-Key": creds.apiKey },
    });
    const text = await res.text();
    let data: any = null; try { data = JSON.parse(text); } catch {}
    if (!res.ok) return { status: "PENDING", paidAt: null };
    const inner = (data && typeof data === "object") ? (data.data ?? data) : {};
    return { status: normalizeStatus(inner?.status), paidAt: inner?.paidAt || inner?.paid_at || null };
  } catch (err) {
    console.error("[gateway/blackcat] status failed", err);
    return { status: "PENDING", paidAt: null };
  }
}

// ---------- Alpha (AlphaCashPay) ----------
function mapAlphaStatus(raw: unknown): StatusResult["status"] {
  const s = String(raw || "").toLowerCase();
  if (s === "paid" || s === "approved") return "PAID";
  if (s === "refused") return "REFUSED";
  if (s === "refunded" || s === "chargeback" || s === "in_protest") return "REFUNDED";
  if (s === "cancelled" || s === "canceled") return "CANCELLED";
  if (s === "waiting_payment" || s === "pending" || s === "") return "PENDING";
  return normalizeStatus(s.toUpperCase());
}

async function createPixAlpha(input: CreatePixInput): Promise<CreatePixResult> {
  const creds = await getAlphaCredentials();
  if (!creds) return { ok: false, status: 500, message: "Credenciais Alpha não configuradas." };
  const auth = Buffer.from(`${creds.pub}:${creds.sec}`).toString("base64");
  const payload = {
    amount: input.amount_cents,
    paymentMethod: "pix" as const,
    postbackUrl: input.postbackUrl,
    externalRef: input.acordo,
    ip: input.ip,
    metadata: JSON.stringify({ acordo: input.acordo, provider_name: "Desenrola Brasil" }),
    pix: { expiresInDays: 1 },
    customer: {
      name: input.nome,
      email: input.email,
      phone: input.phone,
      document: { number: input.cpf, type: "cpf" as const },
    },
    items: [{ title: "Apostila Desenrolados", unitPrice: input.amount_cents, quantity: 1, tangible: false, externalRef: input.acordo }],
  };
  let res: Response;
  try {
    res = await fetch("https://api.alphacashpay.com.br/v1/transactions", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", authorization: `Basic ${auth}` },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[gateway/alpha] fetch failed", err);
    return { ok: false, status: 502, message: "Falha ao conectar ao provedor." };
  }
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const msg = (data && typeof data === "object" && (data.message || data.error)) || `Provedor retornou ${res.status}`;
    console.error("[gateway/alpha] resposta inesperada", { status: res.status, body: String(text).slice(0, 500) });
    return { ok: false, status: res.status, message: String(msg) };
  }
  const inner = (data && typeof data === "object") ? (data.data ?? data) : {};
  const pix = inner?.pix ?? {};
  const copyPaste = String(pix.qrcode || pix.qrCode || pix.copyPaste || "");
  return {
    ok: true,
    transactionId: String(inner?.id ?? ""),
    status: mapAlphaStatus(inner?.status),
    copyPaste,
    qrCodeUrl: "",
    expiresAt: pix.expirationDate || pix.expires_at || null,
  };
}

async function getStatusAlpha(id: string): Promise<StatusResult> {
  const creds = await getAlphaCredentials();
  if (!creds) return { status: "PENDING", paidAt: null };
  const auth = Buffer.from(`${creds.pub}:${creds.sec}`).toString("base64");
  try {
    const res = await fetch(`https://api.alphacashpay.com.br/v1/transactions/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json", authorization: `Basic ${auth}` },
    });
    const text = await res.text();
    let data: any = null; try { data = JSON.parse(text); } catch {}
    if (!res.ok) return { status: "PENDING", paidAt: null };
    const inner = (data && typeof data === "object") ? (data.data ?? data) : {};
    return { status: mapAlphaStatus(inner?.status), paidAt: inner?.paidAt || null };
  } catch (err) {
    console.error("[gateway/alpha] status failed", err);
    return { status: "PENDING", paidAt: null };
  }
}

// ---------- Klivo (KlivoPay) ----------
function mapKlivoStatus(raw: unknown): StatusResult["status"] {
  const s = String(raw || "").toLowerCase();
  if (s === "paid" || s === "approved") return "PAID";
  if (s === "refused") return "REFUSED";
  if (s === "refunded" || s === "chargeback") return "REFUNDED";
  if (s === "cancelled" || s === "canceled") return "CANCELLED";
  if (s === "expired") return "EXPIRED";
  if (s === "pending" || s === "waiting_payment" || s === "") return "PENDING";
  return normalizeStatus(s.toUpperCase());
}

async function createPixKlivo(input: CreatePixInput): Promise<CreatePixResult> {
  const creds = await getKlivoCredentials();
  if (!creds) return { ok: false, status: 500, message: "Credenciais Klivo não configuradas." };
  if (!creds.offerHash) return { ok: false, status: 500, message: "offer_hash da Klivo não configurado." };
  const payload = {
    api_token: creds.apiToken,
    amount: input.amount_cents,
    offer_hash: creds.offerHash,
    payment_method: "pix" as const,
    postback_url: input.postbackUrl,
    customer: {
      name: input.nome,
      email: input.email,
      phone_number: input.phone,
      document: input.cpf,
    },
    cart: [{
      name: "Apostila Desenrolados",
      title: "Apostila Desenrolados",
      quantity: 1,
      price: input.amount_cents,
      unit_price: input.amount_cents,
      tangible: false,
      operation_type: 1,
      ...(creds.productHash ? { product_hash: creds.productHash } : {}),
    }],
    ...(creds.productHash ? { product_hash: creds.productHash } : {}),
  };
  let res: Response;
  try {
    res = await fetch("https://api.klivopay.com.br/api/public/v1/transactions", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[gateway/klivo] fetch failed", err);
    return { ok: false, status: 502, message: "Falha ao conectar ao provedor." };
  }
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const msg = (data && typeof data === "object" && (data.message || data.error)) || `Provedor retornou ${res.status}`;
    console.error("[gateway/klivo] resposta inesperada", { status: res.status, body: String(text).slice(0, 500) });
    return { ok: false, status: res.status, message: String(msg) };
  }
  const inner = (data && typeof data === "object") ? (data.data ?? data) : {};
  // Klivo aninha os dados do pix em `pix`: { pix: { pix_qr_code, pix_url } }.
  // `pix_qr_code` é o EMV string (copia-e-cola). `pix_url` pode ser imagem.
  const pixNode = (inner && typeof inner === "object" && inner.pix && typeof inner.pix === "object") ? inner.pix : {};
  const copyPaste = String(
    pixNode.pix_qr_code ||
    pixNode.qr_code ||
    pixNode.copy_paste ||
    inner.pix_copy_paste ||
    inner.pix_qr_code ||
    inner.copy_paste ||
    ""
  );
  const qrRaw = String(
    pixNode.pix_url ||
    pixNode.pix_qr_code_image ||
    pixNode.qr_code_image ||
    inner.pix_qr_code_image ||
    inner.qr_code_image ||
    ""
  );
  let qrImg = "";
  if (qrRaw) {
    if (qrRaw.startsWith("data:") || /^https?:\/\//i.test(qrRaw)) qrImg = qrRaw;
    else qrImg = `data:image/png;base64,${qrRaw.replace(/\s/g, "")}`;
  }
  if (!copyPaste) {
    console.error("[gateway/klivo] resposta sem pix_qr_code", { keys: Object.keys(inner || {}), pixKeys: Object.keys(pixNode || {}), body: String(text).slice(0, 800) });
  }
  return {
    ok: true,
    transactionId: String(inner.hash ?? inner.id ?? ""),
    status: mapKlivoStatus(inner.status),
    copyPaste,
    qrCodeUrl: qrImg,
    expiresAt: inner.expires_at || null,
  };
}

async function getStatusKlivo(id: string): Promise<StatusResult> {
  const creds = await getKlivoCredentials();
  if (!creds) return { status: "PENDING", paidAt: null };
  try {
    const url = new URL(`https://api.klivopay.com.br/api/public/v1/transactions/${encodeURIComponent(id)}`);
    url.searchParams.set("api_token", creds.apiToken);
    const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
    const text = await res.text();
    let data: any = null; try { data = JSON.parse(text); } catch {}
    if (!res.ok) return { status: "PENDING", paidAt: null };
    const inner = (data && typeof data === "object") ? (data.data ?? data) : {};
    return { status: mapKlivoStatus(inner?.status), paidAt: inner?.paid_at || null };
  } catch (err) {
    console.error("[gateway/klivo] status failed", err);
    return { status: "PENDING", paidAt: null };
  }
}

// ---------- Dispatcher ----------
export async function createPix(gateway: GatewayId, input: CreatePixInput): Promise<CreatePixResult> {
  if (process.env.VITE_USE_MOCKS === "true") {
    console.log(`[mock] createPix via ${gateway} interceptado. Dados:`, input);
    return {
      ok: true,
      transactionId: `mock_${Date.now()}`,
      status: "PENDING",
      copyPaste: "00020101021226580014br.gov.bcb.pix0136mock-pix-copy-paste-code-here5204000053039865802BR5915Mocked Gateway6009Sao Paulo62070503***6304E2B4",
      qrCodeUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
  }

  if (gateway === "blackcat") return createPixBlackcat(input);
  return createPixFreepay(input);
}

export async function getPixStatus(gateway: GatewayId, id: string): Promise<StatusResult> {
  if (process.env.VITE_USE_MOCKS === "true") {
    console.log(`[mock] getPixStatus via ${gateway} para id ${id}`);
    return { status: "PAID", paidAt: new Date().toISOString() };
  }

  if (gateway === "blackcat") return getStatusBlackcat(id);
  return getStatusFreepay(id);
}

// Extrai { id, status, paidAt } dos formatos de webhook.
export function parseWebhookPayload(payload: any, sourceHeader: string | null): { id: string | null; status: string | null; paidAt: string | null; gateway: GatewayId | null } {
  if (!payload || typeof payload !== "object") return { id: null, status: null, paidAt: null, gateway: null };
  const src = (sourceHeader || "").toLowerCase();


  const isBlackcat = src.includes("blackcat") || typeof payload.event === "string" || typeof payload.transactionId === "string";
  if (isBlackcat) {
    return {
      id: String(payload.transactionId ?? payload.id ?? "") || null,
      status: String(payload.status ?? "").toUpperCase() || null,
      paidAt: payload.paidAt ?? null,
      gateway: "blackcat",
    };
  }
  return {
    id: String(payload.Id ?? payload.id ?? payload.transaction_id ?? "") || null,
    status: String(payload.Status ?? payload.status ?? "").toUpperCase() || null,
    paidAt: payload.PaidAt ?? payload.paid_at ?? null,
    gateway: "freepay",
  };
}

