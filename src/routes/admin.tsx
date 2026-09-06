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
  const [tab, setTab] = useState<"funnel" | "sessions" | "origem" | "tx" | "comp" | "gateway" | "ips">("funnel");
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

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
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
      if (res.status === 401) { setError("Senha inválida."); setAuthed(false); sessionStorage.removeItem("admin_pw"); setData(null); return; }
      const j = await res.json();
      if (!j.ok) { setError(j.message || "Erro"); return; }
      setError(j.db_error ? `Banco de dados indisponível: ${j.db_error}` : "");
      setData(j);

      // Usando o estado de memória em vez de sessionStorage para evitar vazamento local a pedido do usuário,
      // mas vamos manter no sessionStorage mascarado? Na verdade o ideal é não usar sessionStorage.
      // Vou manter só na memória. (Comentando sessionStorage.setItem)
      // sessionStorage.setItem("admin_pw", password);
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

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#000000", color: "#e2e8f0", fontFamily: "system-ui" }}>
        <form onSubmit={(e) => { e.preventDefault(); load(pw, day); }} style={{ background: "#111111", padding: 24, borderRadius: 12, width: 320, border: "1px solid #333" }}>
          <h1 style={{ margin: 0, marginBottom: 12, fontSize: 18 }}>Admin Desenrola</h1>
          <input autoFocus type="password" placeholder="Senha" value={pw} onChange={(e) => setPw(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #333", background: "#000", color: "#fff", fontSize: 14 }} />
          {error && <div style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 12, padding: 10, background: "#3b82f6", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000000", color: "#e2e8f0", fontFamily: "system-ui", display: "flex", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{ width: 260, background: "#111111", borderRight: "1px solid #333", display: "flex", flexDirection: "column", padding: "20px 0" }}>
        <h1 style={{ margin: "0 20px 24px", fontSize: 20 }}>Painel Admin</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 10px" }}>
          {[
            ["funnel", "Funil de Conversão"],
            ["sessions", `Sessões (${sessions.length})`],
            ["origem", `Origem de Tráfego (${origens.length})`],
            ["tx", `Pedidos (${data?.transactions.length || 0})`],
            ["comp", `Comprovantes (${data?.comprovantes.length || 0})`],
            ["gateway", `Gateway de Pagamento`],
            ["ips", "Segurança (Bloqueio IP)"]
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)}
              style={{ textAlign: "left", padding: "10px 14px", background: tab === id ? "#3b82f6" : "transparent", color: tab === id ? "#fff" : "#94a3b8", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: tab === id ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: "auto", padding: "0 20px" }}>
          <button onClick={() => { sessionStorage.removeItem("admin_pw"); setAuthed(false); }}
            style={{ width: "100%", padding: "10px", background: "#333", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: 24, height: "100vh", overflow: "auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>
            {tab === "funnel" ? "Funil de Conversão" :
             tab === "sessions" ? "Sessões e Visitantes" :
             tab === "origem" ? "Origem de Tráfego" :
             tab === "tx" ? "Pedidos e Transações" :
             tab === "comp" ? "Comprovantes Enviados" :
             tab === "gateway" ? "Gateway de Pagamento" : "Segurança (Bloqueio IP)"}
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "#94a3b8" }}>Data base:</label>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
              style={{ padding: 6, background: "#111", color: "#fff", border: "1px solid #333", borderRadius: 6 }} />
            <button onClick={() => load(pw, day)} disabled={loading}
              style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer" }}>
              {loading ? "..." : "Atualizar"}
            </button>
          </div>
        </header>

        {data && funnel && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            {[
              ["Home", funnel.home], ["CPF view", funnel.cpf], ["CPF submit", funnel.cpfSubmit],
              ["Chat", funnel.chat], ["Acordo gerado", funnel.acordo],
              ["Pagamento", funnel.pagamento], ["PIX gerado", funnel.pixGerado],
              ["PIX pago", funnel.pixPago], ["Comprovante", funnel.comprovante],
            ].map(([label, v]) => (
              <div key={label as string} style={{ background: "#111111", border: "1px solid #333", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{v as number}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "funnel" && data && (
          <div style={{ background: "#111111", border: "1px solid #333", padding: 16, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Consultas de CPF hoje ({data.cpf_consultas.length})</h3>
            <div style={{ maxHeight: 400, overflow: "auto", fontSize: 13 }}>
              {data.cpf_consultas.map((c, i) => (
                <div key={i} style={{ padding: 6, borderBottom: "1px solid #333" }}>
                  {c.cpf} - {c.nome || "?"} <span style={{ color: "#64748b" }}>{fmtDate(c.consultado_em)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "sessions" && (
          <div style={{ background: "#111111", border: "1px solid #333", borderRadius: 8, overflow: "hidden" }}>
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
                <div key={s.sid} style={{ padding: 12, borderBottom: "1px solid #333" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    onClick={() => setExpandedSid(expandedSid === s.sid ? null : s.sid)}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.nome || "—"} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{s.cpf || ""}</span></div>
                      <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span>IP {s.ip || "—"} · {fmtDate(s.first)} → {fmtDate(s.last)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#7dd3fc" }}>Origem: {s.origem.label} <span style={{ color: "#64748b" }}>({s.origem.detail})</span></div>
                      <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {badges.map((b) => (
                          <span key={b} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: b === "PAGO" ? "#059669" : b === "Comprovante" ? "#f59e0b" : "#333" }}>{b}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 20 }}>{expandedSid === s.sid ? "▾" : "▸"}</div>
                  </div>
                  {expandedSid === s.sid && (
                    <div style={{ marginTop: 10, background: "#000", padding: 10, borderRadius: 6, fontSize: 12, fontFamily: "monospace" }}>
                      {s.events.map((e) => (
                        <div key={e.id} style={{ padding: "2px 0" }}>
                          <span style={{ color: "#64748b" }}>{fmtDate(e.criado_em)}</span> · <strong>{e.page}</strong>:{e.step} {e.meta ? <span style={{ color: "#94a3b8" }}>{JSON.stringify(e.meta)}</span> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {sessions.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Sem sessões neste dia.</div>}
          </div>
        )}

        {tab === "origem" && (
          <div style={{ background: "#111111", border: "1px solid #333", borderRadius: 8, overflow: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#000" }}>
                  <th style={th}>Origem</th><th style={th}>Visitantes</th><th style={th}>Detalhes</th><th style={th}>Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {origens.map((o) => (
                  <tr key={o.label + o.detail} style={{ borderTop: "1px solid #333" }}>
                    <td style={td}><strong>{o.label}</strong></td>
                    <td style={td}>{o.count}</td>
                    <td style={{ ...td, color: "#94a3b8" }}>{o.detail}</td>
                    <td style={{ ...td, color: "#64748b" }}>{o.last ? fmtDate(o.last) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {origens.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Sem dados de origem neste dia.</div>}
            <div style={{ padding: 12, fontSize: 12, color: "#64748b" }}>
              A origem é capturada na primeira visita da sessão (referrer, UTMs, gclid/fbclid). Sessões antigas aparecem como "Desconhecida".
            </div>
          </div>
        )}

        {tab === "tx" && data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
              <div style={{ background: "#111111", border: "1px solid #333", padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase" }}>Total Gerado (PIX)</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>{fmtBRL(txTotals.gerado)}</div>
              </div>
              <div style={{ background: "#111111", border: "1px solid #333", padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase" }}>Total Pago</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>{fmtBRL(txTotals.pago)}</div>
              </div>
              <div style={{ background: "#111111", border: "1px solid #333", padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase" }}>Total Pendente</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{fmtBRL(txTotals.pendente)}</div>
              </div>
            </div>

            <div style={{ background: "#111111", border: "1px solid #333", borderRadius: 8, overflow: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#000" }}>
                    <th style={th}>Ação</th>
                    <th style={th}>Status</th><th style={th}>Nome</th><th style={th}>CPF</th><th style={th}>Valor</th>
                    <th style={th}>Criado</th><th style={th}>Pago em</th><th style={th}>Acordo</th><th style={th}>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.transaction_id} style={{ borderTop: "1px solid #333" }}>
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
                          style={{ padding: "6px 12px", background: t.status === "PAID" ? "#333" : "#10b981", color: t.status === "PAID" ? "#94a3b8" : "#000", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}
                        >
                          {t.status === "PAID" ? "Re-marcar pago" : "✓ Marcar pago"}
                        </button>
                      </td>
                      <td style={td}><span style={{ padding: "2px 8px", borderRadius: 10, background: t.status === "PAID" ? "#059669" : "#333", fontSize: 11 }}>{t.status}</span></td>
                      <td style={td}>{t.nome || "—"}</td>
                      <td style={td}>{t.cpf}</td>
                      <td style={td}>{fmtBRL(t.amount_cents)}</td>
                      <td style={td}>{fmtDate(t.criado_em)}</td>
                      <td style={td}>{t.paid_at ? fmtDate(t.paid_at) : "—"}</td>
                      <td style={td}>{t.acordo || "—"}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{t.transaction_id.slice(0, 12)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.transactions.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Sem pedidos.</div>}
            </div>
          </>
        )}

        {tab === "comp" && data && (
          <div style={{ background: "#111111", border: "1px solid #333", borderRadius: 8, padding: 12 }}>
            {data.comprovantes.map((c) => {
              const tx = c.transaction_id ? data.transactions.find((t) => t.transaction_id === c.transaction_id) : null;
              const desvio = !tx || tx.status !== "PAID";
              return (
                <div key={c.id} style={{ padding: 10, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {c.nome || "—"} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{c.cpf || ""}</span>
                      {desvio && <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#dc2626" }}>DESVIO</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {c.filename} · {c.mime} · {(c.size_bytes || 0) / 1024 | 0} KB · IP {c.ip || "—"} · {fmtDate(c.criado_em)}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>Acordo: {c.acordo || "—"} · TX: {c.transaction_id || "—"} · Status TX: {tx?.status || "SEM TX"}</div>
                  </div>
                  <a href={`/api/public/admin/comprovante?id=${c.id}&pw=${encodeURIComponent(pw)}`} target="_blank" rel="noreferrer"
                    style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 13 }}>
                    Abrir
                  </a>
                </div>
              );
            })}
            {data.comprovantes.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Sem comprovantes.</div>}
          </div>
        )}

        {tab === "gateway" && (
          <div style={{ background: "#111111", border: "1px solid #333", borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Gateway ativo</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {(["freepay", "blackcat", "alpha", "klivo"] as const).map((g) => {
                const isActive = gwState?.active === g;
                const p = gwState?.providers.find((x) => x.id === g);
                return (
                  <button key={g} onClick={() => saveActive(g)} disabled={gwSaving || isActive}
                    style={{ padding: "10px 18px", background: isActive ? "#059669" : "#333", color: "#fff", border: "1px solid #444", borderRadius: 6, cursor: isActive ? "default" : "pointer", fontWeight: 600, textTransform: "capitalize" }}>
                    {g} {isActive ? "· ATIVO" : ""} {p && !p.configured ? "· sem chave" : ""}
                  </button>
                );
              })}
            </div>
            {gwMsg && <div style={{ padding: 8, background: "#000", border: "1px solid #333", borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{gwMsg}</div>}

            <h3>Credenciais</h3>
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
                <div key={g} style={{ background: "#000", border: "1px solid #333", padding: 12, borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{g}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {p?.configured ? `Configurado${p.atualizado_em ? ` · ${fmtDate(p.atualizado_em)}` : ""}` : "Não configurado"}
                    </div>
                  </div>
                  <input type="text" placeholder={publicPh} value={form.public_key}
                    onChange={(e) => setCredForm((prev) => ({ ...prev, [g]: { ...form, public_key: e.target.value } }))}
                    style={{ width: "100%", padding: 8, marginBottom: 6, borderRadius: 6, border: "1px solid #333", background: "#111", color: "#fff", fontSize: 13 }} />
                  <input type="password" placeholder={secretPh} value={form.secret_key}
                    onChange={(e) => setCredForm((prev) => ({ ...prev, [g]: { ...form, secret_key: e.target.value } }))}
                    style={{ width: "100%", padding: 8, marginBottom: 8, borderRadius: 6, border: "1px solid #333", background: "#111", color: "#fff", fontSize: 13 }} />

                  <button onClick={() => saveCreds(g)} disabled={gwSaving}
                    style={{ padding: "8px 14px", background: "#3b82f6", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                    {gwSaving ? "Salvando..." : "Salvar credenciais"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "ips" && (
          <div style={{ background: "#111111", border: "1px solid #333", borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>IPs Bloqueados</h3>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input type="text" placeholder="Adicionar IP (ex: 192.168.0.1)" value={newIp} onChange={(e) => setNewIp(e.target.value)}
                style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #333", background: "#000", color: "#fff", fontSize: 14 }} />
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
                style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                Bloquear IP
              </button>
            </div>
            
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#000" }}>
                  <th style={th}>Endereço IP</th><th style={th}>Bloqueado em</th><th style={th}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {ips.map((ip) => (
                  <tr key={ip.ip} style={{ borderTop: "1px solid #333" }}>
                    <td style={{ ...td, fontWeight: 600 }}>{ip.ip}</td>
                    <td style={{ ...td, color: "#94a3b8" }}>{fmtDate(ip.criado_em)}</td>
                    <td style={td}>
                      <button onClick={async () => {
                          await fetch("/api/public/admin/ips", {
                            method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Password": pw },
                            body: JSON.stringify({ action: "unblock", ip: ip.ip })
                          });
                          loadIps(pw);
                        }}
                        style={{ padding: "4px 8px", background: "#333", color: "#fff", border: "1px solid #444", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                        Desbloquear
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ips.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Nenhum IP bloqueado.</div>}
          </div>
        )}

      </main>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: 8, fontSize: 11, textTransform: "uppercase", color: "#94a3b8" };
const td: React.CSSProperties = { padding: 8 };
