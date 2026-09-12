import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { defaultSiteContent, mergeSiteContent, type SiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin - Desenrola" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  ssr: false,
  component: AdminPage,
});

type Ev = { id: string; session_id: string; cpf: string | null; nome: string | null; acordo: string | null; page: string; step: string; meta: any; ip: string | null; user_agent: string | null; criado_em: string };
type Tx = { transaction_id: string; cpf: string; nome: string | null; email: string | null; phone: string | null; amount_cents: number; acordo: string | null; status: string; paid_at: string | null; criado_em: string };
type Comp = { id: string; transaction_id: string | null; acordo: string | null; cpf: string | null; nome: string | null; filename: string | null; mime: string | null; size_bytes: number | null; ip: string | null; criado_em: string };
type Data = { ok: boolean; range: { start: string; end: string; day: string | null }; events: Ev[]; transactions: Tx[]; comprovantes: Comp[]; cpf_consultas: { cpf: string; nome: string | null; consultado_em: string }[] };

const TZ = "America/Sao_Paulo";

type OrigemInfo = { label: string; detail: string };

// Classifica de onde o visitante veio, a partir do meta.origem gravado no track.
function describeOrigem(raw: any): OrigemInfo {
  if (!raw || typeof raw !== "object") return { label: "Desconhecida", detail: "sem dados" };
  const utmSource = str(raw.utm_source);
  const utmMedium = str(raw.utm_medium);
  const utmCampaign = str(raw.utm_campaign);
  const refHost = str(raw.referrer_host);
  const gclid = str(raw.gclid);
  const fbclid = str(raw.fbclid);

  const detailParts: string[] = [];
  if (utmCampaign) detailParts.push(`campanha: ${utmCampaign}`);
  if (utmMedium) detailParts.push(`mídia: ${utmMedium}`);
  if (refHost) detailParts.push(`referrer: ${refHost}`);
  if (raw.landing) detailParts.push(`entrou em: ${str(raw.landing)}`);
  const detail = detailParts.join(" · ") || "—";

  if (gclid) return { label: "Google Ads (gclid)", detail };
  if (fbclid) return { label: "Facebook/Instagram Ads (fbclid)", detail };
  if (utmSource) return { label: `UTM: ${utmSource}`, detail };
  if (refHost) {
    const h = refHost.replace(/^www\./, "");
    if (/google\./.test(h)) return { label: "Google (busca)", detail };
    if (/bing\./.test(h)) return { label: "Bing", detail };
    if (/(facebook|fb\.)/.test(h)) return { label: "Facebook", detail };
    if (/instagram\./.test(h)) return { label: "Instagram", detail };
    if (/(youtube|youtu\.be)/.test(h)) return { label: "YouTube", detail };
    if (/(whatsapp|wa\.me)/.test(h)) return { label: "WhatsApp", detail };
    if (/t\.me|telegram/.test(h)) return { label: "Telegram", detail };
    if (/tiktok\./.test(h)) return { label: "TikTok", detail };
    return { label: `Link externo: ${h}`, detail };
  }
  return { label: "Direto / digitado", detail };
}

function str(v: unknown): string {
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

function todayBR() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return iso; }
}

function AdminPage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [day, setDay] = useState(todayBR());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"funnel" | "sessions" | "origem" | "tx" | "comp" | "gateway" | "ips" | "pushcut">("funnel");
  const [pushcutUrls, setPushcutUrls] = useState({ gerado: "", aprovado: "" });
  const [pushcutMsg, setPushcutMsg] = useState("");
  const [pushcutSaving, setPushcutSaving] = useState(false);
  const [expandedSid, setExpandedSid] = useState<string | null>(null);
  const [gwState, setGwState] = useState<{ active: string; providers: { id: string; configured: boolean; public_key: string | null; product_hash?: string | null; atualizado_em: string | null }[] } | null>(null);
  const [gwSaving, setGwSaving] = useState(false);
  const [gwMsg, setGwMsg] = useState("");
  const [credForm, setCredForm] = useState<Record<string, { public_key: string; secret_key: string }>>({
    freepay: { public_key: "", secret_key: "" },
    blackcat: { public_key: "", secret_key: "" },
  });
  const [ips, setIps] = useState<{ ip: string; motivo: string | null; criado_em: string }[]>([]);
  const [newIp, setNewIp] = useState("");

  const txTotals = useMemo(() => {
    if (!data) return { gerado: 0, pago: 0, pendente: 0 };
    let gerado = 0, pago = 0, pendente = 0;
    for (const t of data.transactions) {
      gerado += t.amount_cents;
      if (t.status === "PAID") pago += t.amount_cents;
      else if (t.status === "PENDING") pendente += t.amount_cents;
    }
    return { gerado, pago, pendente };
  }, [data]);

  const loadIps = async (password: string) => {
    try {
      const res = await fetch("/api/public/admin/ips", { headers: { "X-Admin-Password": password } });
      const j = await res.json();
      if (j.ok) setIps(j.ips);
    } catch {}
  };

  useEffect(() => {
    if (authed && pw && tab === "ips") loadIps(pw);
  }, [authed, pw, tab]);

  const loadPushcut = async (password: string) => {
    try {
      const res = await fetch("/api/public/admin/pushcut", { headers: { "X-Admin-Password": password } });
      const j = await res.json();
      if (j.ok) setPushcutUrls({ gerado: j.gerado || "", aprovado: j.aprovado || "" });
    } catch {}
  };

  useEffect(() => {
    if (authed && pw && tab === "pushcut") loadPushcut(pw);
  }, [authed, pw, tab]);

  const savePushcut = async () => {
    setPushcutSaving(true); setPushcutMsg("");
    try {
      const res = await fetch("/api/public/admin/pushcut", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": pw },
        body: JSON.stringify(pushcutUrls),
      });
      const j = await res.json();
      if (j.ok) { setPushcutMsg("URLs do Pushcut salvas."); }
      else setPushcutMsg(j.message || "Erro ao salvar.");
    } catch { setPushcutMsg("Falha de rede."); }
    finally { setPushcutSaving(false); }
  };

  useEffect(() => {
    const saved = localStorage.getItem("admin_pw");
    if (saved) { setPw(saved); setAuthed(true); }
  }, []);

  const load = async (password: string, d: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/public/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ day: d }),
      });
      if (res.status === 401) { setError("Senha inválida."); setAuthed(false); localStorage.removeItem("admin_pw"); setData(null); return; }
      const j = await res.json();
      if (!j.ok) { setError(j.message || "Erro"); return; }
      setError(j.db_error ? `Banco de dados indisponível: ${j.db_error}` : "");
      setData(j);

      localStorage.setItem("admin_pw", password);
      setAuthed(true);
    } catch (err) {
      setError("Falha de rede.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed && pw) load(pw, day);
  }, [authed, day]);


  const loadGateway = async (password: string) => {
    try {
      const res = await fetch("/api/public/admin/gateway", { headers: { "X-Admin-Password": password } });
      const j = await res.json();
      if (j.ok) setGwState({ active: j.active, providers: j.providers });
    } catch {}
  };

  useEffect(() => {
    if (authed && pw && tab === "gateway") loadGateway(pw);
  }, [authed, tab]);


  const saveActive = async (next: string) => {
    setGwSaving(true); setGwMsg("");
    try {
      const res = await fetch("/api/public/admin/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": pw },
        body: JSON.stringify({ action: "set_active", gateway: next }),
      });
      const j = await res.json();
      if (j.ok) { setGwMsg("Gateway ativo atualizado."); await loadGateway(pw); }
      else setGwMsg(j.message || "Erro");
    } catch { setGwMsg("Falha de rede."); }
    finally { setGwSaving(false); }
  };

  const saveCreds = async (provider: string) => {
    const form = credForm[provider];
    if (!form?.secret_key.trim()) { setGwMsg("Informe a chave secreta."); return; }
    setGwSaving(true); setGwMsg("");
    try {
      const payload: any = {
        action: "set_credentials",
        provider,
        secret_key: form.secret_key.trim(),
        public_key: form.public_key.trim() || null,
      };
      
      const res = await fetch("/api/public/admin/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": pw },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (j.ok) {
        setGwMsg(`Credenciais ${provider} salvas.`);
        setCredForm((prev) => ({ ...prev, [provider]: { public_key: "", secret_key: "" } }));
        await loadGateway(pw);
      } else setGwMsg(j.message || "Erro");
    } catch { setGwMsg("Falha de rede."); }
    finally { setGwSaving(false); }
  };


  const sessions = useMemo(() => {
    if (!data) return [] as { sid: string; events: Ev[]; cpf: string | null; nome: string | null; acordo: string | null; ip: string | null; origem: OrigemInfo; first: string; last: string; steps: string[] }[];
    const map = new Map<string, Ev[]>();
    for (const e of data.events) {
      const arr = map.get(e.session_id) || [];
      arr.push(e);
      map.set(e.session_id, arr);
    }
    const list = Array.from(map.entries()).map(([sid, evs]) => {
      const sorted = [...evs].sort((a, b) => a.criado_em.localeCompare(b.criado_em));
      const withCpf = sorted.find((e) => e.cpf) || sorted[0];
      const withAcordo = [...sorted].reverse().find((e) => e.acordo);
      const rawOrigem = sorted.find((e) => e.meta && (e.meta as any).origem)?.meta?.origem || null;
      return {
        sid,
        events: sorted,
        cpf: withCpf?.cpf || null,
        nome: withCpf?.nome || null,
        acordo: withAcordo?.acordo || null,
        ip: sorted[0]?.ip || null,
        origem: describeOrigem(rawOrigem),
        first: sorted[0]?.criado_em || "",
        last: sorted[sorted.length - 1]?.criado_em || "",
        steps: sorted.map((e) => `${e.page}:${e.step}`),
      };
    });
    return list.sort((a, b) => b.last.localeCompare(a.last));
  }, [data]);

  const origens = useMemo(() => {
    const map = new Map<string, { label: string; detail: string; sessions: Set<string>; last: string }>();
    for (const s of sessions) {
      const key = `${s.origem.label}|${s.origem.detail}`;
      const cur = map.get(key) || { label: s.origem.label, detail: s.origem.detail, sessions: new Set<string>(), last: "" };
      cur.sessions.add(s.sid);
      if (s.last > cur.last) cur.last = s.last;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .map((o) => ({ label: o.label, detail: o.detail, count: o.sessions.size, last: o.last }))
      .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));
  }, [sessions]);

  const funnel = useMemo(() => {
    if (!data) return null;
    const cnt = (step: string) => new Set(data.events.filter((e) => e.step === step).map((e) => e.session_id)).size;
    return {
      home: cnt("home_view"),
      cpf: cnt("cpf_view"),
      cpfSubmit: cnt("cpf_submit"),
      chat: cnt("chat_view"),
      acordo: cnt("chat_acordo_gerado"),
      pagamento: cnt("pagamento_view"),
      pixGerado: cnt("pagamento_pix_gerado"),
      pixPago: cnt("pagamento_pix_pago"),
      comprovante: cnt("pagamento_comprovante_upload"),
    };
  }, [data]);


  const desvios = useMemo(() => {
    if (!data) return [] as { comp: Comp; tx: Tx | null }[];
    const txMap = new Map(data.transactions.map((t) => [t.transaction_id, t]));
    return data.comprovantes
      .map((c) => ({ comp: c, tx: c.transaction_id ? txMap.get(c.transaction_id) || null : null }))
      .filter((x) => !x.tx || x.tx.status !== "PAID");
  }, [data]);

  const onlineCount = useMemo(() => {
    if (!data || day !== todayBR()) return 0;
    const limit = new Date(Date.now() - 3 * 60000).toISOString();
    const active = new Set(data.events.filter(e => e.criado_em >= limit).map(e => e.session_id));
    return active.size;
  }, [data, day]);

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", color: "#0f172a", fontFamily: "Inter, system-ui, sans-serif" }}>
        <form onSubmit={(e) => { e.preventDefault(); load(pw, day); }} style={{ background: "#ffffff", padding: 32, borderRadius: 16, width: 340, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h1 style={{ margin: 0, marginBottom: 16, fontSize: 20, fontWeight: 700 }}>Admin</h1>
          <input autoFocus type="password" placeholder="Senha" value={pw} onChange={(e) => setPw(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a", fontSize: 14, outline: "none" }} />
          {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 16, padding: 12, background: "#0f172a", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", display: "flex", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{ width: 260, background: "#ffffff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", padding: "24px 0" }}>
        <h1 style={{ margin: "0 24px 24px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Painel Admin</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 12px" }}>
          {[
            ["funnel", "Funil de Conversão"],
            ["sessions", `Sessões (${sessions.length})`],
            ["origem", `Origem de Tráfego (${origens.length})`],
            ["tx", `Pedidos (${data?.transactions.length || 0})`],
            ["comp", `Comprovantes (${data?.comprovantes.length || 0})`],
            ["gateway", `Gateway de Pagamento`],
            ["ips", "Segurança (Bloqueio IP)"],
            ["pushcut", "Notificações (Pushcut)"]
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)}
              style={{ textAlign: "left", padding: "10px 16px", background: tab === id ? "#f1f5f9" : "transparent", color: tab === id ? "#0f172a" : "#64748b", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: tab === id ? 600 : 500, transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: "auto", padding: "0 24px" }}>
          <button onClick={() => { localStorage.removeItem("admin_pw"); setAuthed(false); }}
            style={{ width: "100%", padding: "10px", background: "#f1f5f9", color: "#475569", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: 32, height: "100vh", overflow: "auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: "#0f172a", fontWeight: 700, display: "flex", alignItems: "center", gap: 12 }}>
            {tab === "funnel" ? "Funil de Conversão" :
             tab === "sessions" ? "Sessões e Visitantes" :
             tab === "origem" ? "Origem de Tráfego" :
             tab === "tx" ? "Pedidos e Transações" :
             tab === "comp" ? "Comprovantes Enviados" :
             tab === "gateway" ? "Gateway de Pagamento" :
             tab === "ips" ? "Segurança (Bloqueio IP)" : "Notificações (Pushcut)"}
             
             {data && day === todayBR() && (
               <span style={{ fontSize: 12, padding: "4px 10px", background: "#22c55e20", color: "#22c55e", borderRadius: 20, border: "1px solid #22c55e40", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                 <div style={{ width: 8, height: 8, background: "#22c55e", borderRadius: "50%", boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
                 {onlineCount} online agora
               </span>
             )}
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Data base:</label>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
              style={{ padding: "8px 12px", background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: 8, outline: "none", fontSize: 13 }} />
            <button onClick={() => load(pw, day)} disabled={loading}
              style={{ padding: "8px 16px", background: "#0f172a", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
              {loading ? "..." : "Atualizar"}
            </button>
          </div>
        </header>

        {data && funnel && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              ["Home", funnel.home], ["CPF view", funnel.cpf], ["CPF submit", funnel.cpfSubmit],
              ["Chat", funnel.chat], ["Acordo gerado", funnel.acordo],
              ["Pagamento", funnel.pagamento], ["PIX gerado", funnel.pixGerado],
              ["PIX pago", funnel.pixPago], ["Comprovante", funnel.comprovante],
            ].map(([label, v]) => (
              <div key={label as string} style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: 16, borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{v as number}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "funnel" && data && (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Consultas de CPF hoje ({data.cpf_consultas.length})</h3>
            <div style={{ maxHeight: 400, overflow: "auto", fontSize: 13 }}>
              {data.cpf_consultas.map((c, i) => (
                <div key={i} style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontWeight: 500, color: "#334155" }}>{c.cpf}</span> - {c.nome || "?"} <span style={{ color: "#94a3b8", marginLeft: 8 }}>{fmtDate(c.consultado_em)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "sessions" && (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            {sessions.map((s) => {
              const chegou = (step: string) => s.steps.some((k) => k.endsWith(":" + step));
              const badges = [
                chegou("home_view") && "Home",
                chegou("cpf_view") && "CPF",
                chegou("chat_view") && "Chat",
                chegou("chat_acordo_gerado") && "Acordo",
                chegou("pagamento_view") && "Pagamento",
                chegou("pagamento_pix_gerado") && "PIX Gerado",
                chegou("pagamento_pix_pago") && "PAGO",
                chegou("pagamento_comprovante_upload") && "Comprovante",
              ].filter(Boolean) as string[];
              
              return (
                <div key={s.sid} style={{ padding: 16, borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    onClick={() => setExpandedSid(expandedSid === s.sid ? null : s.sid)}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{s.nome || "—"} <span style={{ color: "#64748b", fontWeight: 400 }}>{s.cpf || ""}</span></div>
                      <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                        <span>IP {s.ip || "—"} · {fmtDate(s.first)} → {fmtDate(s.last)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#0ea5e9", marginTop: 4 }}>Origem: {s.origem.label} <span style={{ color: "#94a3b8" }}>({s.origem.detail})</span></div>
                      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {badges.map((b) => (
                          <span key={b} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, fontWeight: 500, background: b === "PAGO" ? "#dcfce7" : b === "Comprovante" ? "#fef3c7" : "#f1f5f9", color: b === "PAGO" ? "#166534" : b === "Comprovante" ? "#92400e" : "#475569" }}>{b}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 20 }}>{expandedSid === s.sid ? "▾" : "▸"}</div>
                  </div>
                  {expandedSid === s.sid && (
                    <div style={{ marginTop: 12, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", color: "#334155" }}>
                      {s.events.map((e) => (
                        <div key={e.id} style={{ padding: "3px 0" }}>
                          <span style={{ color: "#94a3b8" }}>{fmtDate(e.criado_em)}</span> · <strong>{e.page}</strong>:{e.step} {e.meta ? <span style={{ color: "#cbd5e1" }}>{JSON.stringify(e.meta)}</span> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {sessions.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Sem sessões neste dia.</div>}
          </div>
        )}

        {tab === "origem" && (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={th}>Origem</th><th style={th}>Visitantes</th><th style={th}>Detalhes</th><th style={th}>Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {origens.map((o) => (
                  <tr key={o.label + o.detail} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={td}><strong style={{ color: "#0f172a" }}>{o.label}</strong></td>
                    <td style={{ ...td, color: "#0f172a", fontWeight: 500 }}>{o.count}</td>
                    <td style={{ ...td, color: "#64748b" }}>{o.detail}</td>
                    <td style={{ ...td, color: "#94a3b8" }}>{o.last ? fmtDate(o.last) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {origens.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Sem dados de origem neste dia.</div>}
            <div style={{ padding: 16, fontSize: 12, color: "#94a3b8", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
              A origem é capturada na primeira visita da sessão (referrer, UTMs, gclid/fbclid). Sessões antigas aparecem como "Desconhecida".
            </div>
          </div>
        )}

        {tab === "tx" && data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: 20, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Total Gerado (PIX)</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#3b82f6", marginTop: 4 }}>{fmtBRL(txTotals.gerado)}</div>
              </div>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: 20, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Total Pago</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#10b981", marginTop: 4 }}>{fmtBRL(txTotals.pago)}</div>
              </div>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: 20, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Total Pendente</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#f59e0b", marginTop: 4 }}>{fmtBRL(txTotals.pendente)}</div>
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={th}>Ação</th>
                    <th style={th}>Status</th><th style={th}>Nome</th><th style={th}>CPF</th><th style={th}>Valor</th>
                    <th style={th}>Criado</th><th style={th}>Pago em</th><th style={th}>Acordo</th><th style={th}>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.transaction_id} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={td}>
                        <button
                          onClick={async () => {
                            if (!confirm(`Marcar transação de ${t.nome || t.cpf} (${fmtBRL(t.amount_cents)}) como PAGA?`)) return;
                            try {
                              const res = await fetch("/api/public/admin/mark-paid", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", "X-Admin-Password": pw },
                                body: JSON.stringify({ transaction_id: t.transaction_id }),
                              });
                              const j = await res.json();
                              if (!j.ok) { alert(j.message || "Erro"); return; }
                              await load(pw, day);
                            } catch { alert("Falha de rede."); }
                          }}
                          style={{ padding: "6px 12px", background: t.status === "PAID" ? "#f1f5f9" : "#10b981", color: t.status === "PAID" ? "#94a3b8" : "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                          {t.status === "PAID" ? "Re-marcar pago" : "✓ Marcar pago"}
                        </button>
                      </td>
                      <td style={td}><span style={{ padding: "4px 10px", borderRadius: 12, fontWeight: 500, background: t.status === "PAID" ? "#dcfce7" : "#f1f5f9", color: t.status === "PAID" ? "#166534" : "#475569", fontSize: 11 }}>{t.status}</span></td>
                      <td style={{ ...td, color: "#0f172a", fontWeight: 500 }}>{t.nome || "—"}</td>
                      <td style={{ ...td, color: "#475569" }}>{t.cpf}</td>
                      <td style={{ ...td, color: "#0f172a", fontWeight: 600 }}>{fmtBRL(t.amount_cents)}</td>
                      <td style={{ ...td, color: "#64748b" }}>{fmtDate(t.criado_em)}</td>
                      <td style={{ ...td, color: "#64748b" }}>{t.paid_at ? fmtDate(t.paid_at) : "—"}</td>
                      <td style={{ ...td, color: "#475569" }}>{t.acordo || "—"}</td>
                      <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 11, color: "#94a3b8" }}>{t.transaction_id.slice(0, 12)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.transactions.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Sem pedidos.</div>}
            </div>
          </>
        )}

        {tab === "comp" && data && (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            {data.comprovantes.map((c) => {
              const tx = c.transaction_id ? data.transactions.find((t) => t.transaction_id === c.transaction_id) : null;
              const desvio = !tx || tx.status !== "PAID";
              return (
                <div key={c.id} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                      {c.nome || "—"} <span style={{ color: "#64748b", fontWeight: 400 }}>{c.cpf || ""}</span>
                      {desvio && <span style={{ marginLeft: 8, fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontWeight: 500 }}>DESVIO</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      {c.filename} · {c.mime} · {(c.size_bytes || 0) / 1024 | 0} KB · IP {c.ip || "—"} · {fmtDate(c.criado_em)}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Acordo: {c.acordo || "—"} · TX: {c.transaction_id || "—"} · Status TX: {tx?.status || "SEM TX"}</div>
                  </div>
                  <a href={`/api/public/admin/comprovante?id=${c.id}&pw=${encodeURIComponent(pw)}`} target="_blank" rel="noreferrer"
                    style={{ padding: "8px 16px", background: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                    Abrir
                  </a>
                </div>
              );
            })}
            {data.comprovantes.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Sem comprovantes.</div>}
          </div>
        )}

        {tab === "gateway" && (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Gateway ativo</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              {(["freepay", "blackcat"] as const).map((g) => {
                const isActive = gwState?.active === g;
                const p = gwState?.providers.find((x) => x.id === g);
                return (
                  <button key={g} onClick={() => saveActive(g)} disabled={gwSaving || isActive}
                    style={{ padding: "12px 20px", background: isActive ? "#dcfce7" : "#f8fafc", color: isActive ? "#166534" : "#334155", border: isActive ? "1px solid #bbf7d0" : "1px solid #cbd5e1", borderRadius: 8, cursor: isActive ? "default" : "pointer", fontWeight: 600, textTransform: "capitalize", transition: "all 0.2s" }}>
                    {g} {isActive ? "· ATIVO" : ""} {p && !p.configured ? "· sem chave" : ""}
                  </button>
                );
              })}
            </div>
            {gwMsg && <div style={{ padding: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 8, marginBottom: 24, fontSize: 13 }}>{gwMsg}</div>}

            <h3 style={{ color: "#0f172a" }}>Credenciais</h3>
            {(["freepay", "blackcat"] as const).map((g) => {
              const p = gwState?.providers.find((x) => x.id === g);
              const form = credForm[g] || { public_key: "", secret_key: "" };
              const usesPublicKey = true;
              const publicPh = g === "blackcat"
                ? "Public Key (Blackcat)"
                : "Public Key (Freepay)";
              const secretPh = g === "blackcat"
                ? "Secret / API Key (Blackcat)"
                : "Secret Key (Freepay)";
              return (
                <div key={g} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 16, borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, textTransform: "capitalize", color: "#0f172a" }}>{g}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {p?.configured ? `Configurado${p.atualizado_em ? ` · ${fmtDate(p.atualizado_em)}` : ""}` : "Não configurado"}
                    </div>
                  </div>
                  <input type="text" placeholder={publicPh} value={form.public_key}
                    onChange={(e) => setCredForm((prev) => ({ ...prev, [g]: { ...form, public_key: e.target.value } }))}
                    style={{ width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: 13, outline: "none" }} />
                  <input type="password" placeholder={secretPh} value={form.secret_key}
                    onChange={(e) => setCredForm((prev) => ({ ...prev, [g]: { ...form, secret_key: e.target.value } }))}
                    style={{ width: "100%", padding: 10, marginBottom: 12, borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: 13, outline: "none" }} />

                  <button onClick={() => saveCreds(g)} disabled={gwSaving}
                    style={{ padding: "8px 16px", background: "#0f172a", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    {gwSaving ? "Salvando..." : "Salvar credenciais"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "ips" && (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>IPs Bloqueados</h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <input type="text" placeholder="Adicionar IP (ex: 192.168.0.1)" value={newIp} onChange={(e) => setNewIp(e.target.value)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: 14, outline: "none" }} />
              <button 
                onClick={async () => {
                  if (!newIp.trim()) return;
                  await fetch("/api/public/admin/ips", {
                    method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Password": pw },
                    body: JSON.stringify({ action: "block", ip: newIp })
                  });
                  setNewIp("");
                  loadIps(pw);
                }}
                style={{ padding: "10px 20px", background: "#ef4444", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                Bloquear IP
              </button>
            </div>
            
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={th}>Endereço IP</th><th style={th}>Bloqueado em</th><th style={th}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {ips.map((ip) => (
                    <tr key={ip.ip} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ ...td, fontWeight: 600, color: "#0f172a" }}>{ip.ip}</td>
                      <td style={{ ...td, color: "#64748b" }}>{fmtDate(ip.criado_em)}</td>
                      <td style={td}>
                        <button onClick={async () => {
                            await fetch("/api/public/admin/ips", {
                              method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Password": pw },
                              body: JSON.stringify({ action: "unblock", ip: ip.ip })
                            });
                            loadIps(pw);
                          }}
                          style={{ padding: "6px 12px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                          Desbloquear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ips.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Nenhum IP bloqueado.</div>}
            </div>
          </div>
        )}

        {tab === "pushcut" && (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>URLs do Pushcut</h3>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
              Configure as URLs de webhook do Pushcut para receber notificações em tempo real.
            </div>

            {pushcutMsg && <div style={{ padding: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, marginBottom: 24, fontSize: 13, color: "#166534" }}>{pushcutMsg}</div>}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#475569" }}>URL Pedido Gerado</label>
              <input type="text" placeholder="https://api.pushcut.io/..." value={pushcutUrls.gerado}
                onChange={(e) => setPushcutUrls(prev => ({ ...prev, gerado: e.target.value }))}
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: 13, outline: "none" }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#475569" }}>URL Pedido Aprovado</label>
              <input type="text" placeholder="https://api.pushcut.io/..." value={pushcutUrls.aprovado}
                onChange={(e) => setPushcutUrls(prev => ({ ...prev, aprovado: e.target.value }))}
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: 13, outline: "none" }} />
            </div>

            <button onClick={savePushcut} disabled={pushcutSaving}
              style={{ padding: "12px 24px", background: "#0f172a", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
              {pushcutSaving ? "Salvando..." : "Salvar Notificações"}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "#64748b", fontWeight: 600, letterSpacing: "0.05em" };
const td: React.CSSProperties = { padding: "12px 16px" };
