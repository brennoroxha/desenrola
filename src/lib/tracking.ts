// Simple client-side tracker to log user funnel steps.
const SESSION_KEY = "desenrola_sid";

function ensureSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let sid = window.sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9\-]/g, "");
      window.sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "nostore-" + Math.random().toString(36).slice(2);
  }
}

export type TrackContext = {
  cpf?: string | null;
  nome?: string | null;
  acordo?: string | null;
  meta?: Record<string, unknown>;
};

const ORIGIN_KEY = "desenrola_origem";

type Origem = {
  referrer: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  landing: string | null;
};

// Captura (uma vez por sessão) de onde o visitante veio: referrer externo,
// parâmetros UTM e IDs de clique de anúncio.
function captureOrigem(): Origem | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.sessionStorage.getItem(ORIGIN_KEY);
    if (saved) return JSON.parse(saved) as Origem;
  } catch {}
  try {
    const qs = new URLSearchParams(window.location.search);
    const ref = document.referrer || "";
    let refHost: string | null = null;
    if (ref) {
      try {
        const h = new URL(ref).hostname;
        refHost = h && h !== window.location.hostname ? h : null;
      } catch {}
    }
    const origem: Origem = {
      referrer: ref || null,
      referrer_host: refHost,
      utm_source: qs.get("utm_source"),
      utm_medium: qs.get("utm_medium"),
      utm_campaign: qs.get("utm_campaign"),
      utm_content: qs.get("utm_content"),
      utm_term: qs.get("utm_term"),
      gclid: qs.get("gclid"),
      fbclid: qs.get("fbclid"),
      landing: window.location.pathname || null,
    };
    try { window.sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(origem)); } catch {}
    return origem;
  } catch {
    return null;
  }
}

export function track(page: string, step: string, ctx: TrackContext = {}) {
  if (typeof window === "undefined") return;
  const origem = captureOrigem();
  const body = {
    session_id: ensureSessionId(),
    page,
    step,
    cpf: ctx.cpf ?? null,
    nome: ctx.nome ?? null,
    acordo: ctx.acordo ?? null,
    meta: { ...(ctx.meta || {}), ...(origem ? { origem } : {}) },
  };
  try {
    fetch("/api/public/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

let heartbeatStarted = false;
// Marca presença do visitante a cada 30s (só com a aba visível), para o painel
// admin poder contar quantas pessoas estão online agora.
export function startPresenceHeartbeat() {
  if (typeof window === "undefined" || heartbeatStarted) return;
  if (/^\/admin(\/|$)/.test(window.location.pathname)) return;
  heartbeatStarted = true;

  const beat = () => {
    if (document.visibilityState === "hidden") return;
    track("presence", "heartbeat", {
      meta: { path: window.location.pathname },
    });
  };

  beat();
  window.setInterval(beat, 30_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") beat();
  });
}


const PENDING_KEY = "desenrola_pending_purchases";
const REDIRECTED_KEY = "desenrola_paid_redirects";

function readSet(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}
function writeSet(key: string, set: Set<string>) {
  try { window.localStorage.setItem(key, JSON.stringify(Array.from(set).slice(-200))); } catch {}
}

type PurchaseContext = {
  cpf?: string | null;
  nome?: string | null;
  phone?: string | null;
  acordo?: string | null;
  redirectPath?: string | null;
};

type PendingTx = PurchaseContext & {
  transactionId: string;
  valueBRL: number;
  createdAt: number;
};

function readPending(): PendingTx[] {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writePending(list: PendingTx[]) {
  try { window.localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-50))); } catch {}
}

export function registerPendingPurchase(transactionId: string, valueBRL: number, ctx: PurchaseContext = {}) {
  if (typeof window === "undefined" || !transactionId) return;
  const previous = readPending().find((t) => t.transactionId === transactionId);
  const list = readPending().filter((t) => t.transactionId !== transactionId);
  list.push({
    ...previous,
    ...ctx,
    transactionId,
    valueBRL,
    createdAt: previous?.createdAt || Date.now(),
  });
  writePending(list);
}

export function markPaidRedirected(transactionId: string) {
  if (typeof window === "undefined" || !transactionId) return;
  const redirected = readSet(REDIRECTED_KEY);
  redirected.add(transactionId);
  writeSet(REDIRECTED_KEY, redirected);
}

function buildUpsellUrl(tx: PendingTx) {
  const params = new URLSearchParams({
    cpf: tx.cpf || "",
    nome: tx.nome || "",
    phone: tx.phone || "",
    acordo: tx.acordo || "",
  });
  return `${tx.redirectPath || "/upsell/taxa-corretiva"}?${params.toString()}`;
}

function redirectPaidUserToUpsell(tx: PendingTx) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (/^\/admin(\/|$)/.test(path) || /^\/upsell(\/|$)/.test(path)) return;

  const redirected = readSet(REDIRECTED_KEY);
  if (redirected.has(tx.transactionId)) return;
  markPaidRedirected(tx.transactionId);

  track("pagamento", "pagamento_redirect_upsell_recuperado", {
    cpf: tx.cpf,
    nome: tx.nome,
    acordo: tx.acordo,
    meta: { transactionId: tx.transactionId, source: "pending_reconcile" },
  });
  window.setTimeout(() => {
    window.location.assign(buildUpsellUrl(tx));
  }, 500);
}

// Reconcilia txs pendentes: confere status e redireciona se PAID.
// Descarta txs > 14 dias.
export async function reconcilePendingPurchases() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const MAX_AGE = 14 * 24 * 60 * 60 * 1000;
  const pending = readPending().filter((t) => now - t.createdAt < MAX_AGE);
  writePending(pending);
  if (pending.length === 0) return;

  for (const tx of pending) {
    try {
      const r = await fetch(`/api/public/pix/status?id=${encodeURIComponent(tx.transactionId)}`, { cache: "no-store" });
      const j = await r.json();
      if (j?.status === "PAID") {
        track("pagamento", "pagamento_pix_pago_recuperado", {
          cpf: tx.cpf,
          nome: tx.nome,
          acordo: tx.acordo,
          meta: { transactionId: tx.transactionId },
        });
        redirectPaidUserToUpsell(tx);
        writePending(readPending().filter((t) => t.transactionId !== tx.transactionId));
      } else if (["FAILED", "REFUSED", "EXPIRED"].includes(String(j?.status || ""))) {
        writePending(readPending().filter((t) => t.transactionId !== tx.transactionId));
      }
    } catch {}
  }
}

let watcherStarted = false;
// Watcher em background: enquanto o usuário estiver com a aba do site aberta
// (em qualquer rota fora de /admin), a cada 30s e sempre que a aba voltar ao
// foco, verifica se algum PIX pendente virou PAID via webhook.
export function startPendingPurchasesWatcher() {
  if (typeof window === "undefined" || watcherStarted) return;
  watcherStarted = true;

  const shouldRun = () => !/^\/admin(\/|$)/.test(window.location.pathname);

  const tick = () => {
    if (!shouldRun()) return;
    if (readPending().length === 0) return;
    if (document.visibilityState === "hidden") return;
    reconcilePendingPurchases().catch(() => {});
  };

  window.setInterval(tick, 30_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tick();
  });
  window.addEventListener("pageshow", tick);
  window.addEventListener("focus", tick);
}
