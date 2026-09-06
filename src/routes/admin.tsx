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
  const [tab, setTab] = useState<"funnel" | "sessions" | "origem" | "tx" | "comp" | "gateway" | "home">("funnel");
  const [expandedSid, setExpandedSid] = useState<string | null>(null);
  const [gwState, setGwState] = useState<{ active: string; providers: { id: string; configured: boolean; public_key: string | null; product_hash?: string | null; atualizado_em: string | null }[] } | null>(null);
  const [gwSaving, setGwSaving] = useState(false);
  const [home, setHome] = useState<SiteContent>(defaultSiteContent);
  const [homeSaving, setHomeSaving] = useState(false);
  const [homeMsg, setHomeMsg] = useState("");
  const [gwMsg, setGwMsg] = useState("");
  const [credForm, setCredForm] = useState<Record<string, { public_key: string; secret_key: string }>>({
    freepay: { public_key: "", secret_key: "" },
    blackcat: { public_key: "", secret_key: "" },
  });


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

      sessionStorage.setItem("admin_pw", password);
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

  // Pessoas online agora (atualiza a cada 5s)
  const [online, setOnline] = useState<{ online: number; pages: { page: string; count: number }[]; sessions: string[]; ips: string[] } | null>(null);
  useEffect(() => {
    if (!authed || !pw) return;
    let alive = true;
    const fetchOnline = async () => {
      try {
        const res = await fetch("/api/public/admin/online", {
          headers: { "X-Admin-Password": pw },
          cache: "no-store",
        });
        const j = await res.json();
        if (alive && j?.ok) setOnline({ online: j.online, pages: j.pages || [], sessions: j.sessions || [], ips: j.ips || [] });
      } catch {}
    };
    fetchOnline();
    const id = window.setInterval(fetchOnline, 5000);
    return () => { alive = false; window.clearInterval(id); };
  }, [authed, pw]);


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

  useEffect(() => {
    if (!authed || tab !== "home") return;
    fetch("/api/public/site-content")
      .then((r) => r.json())
      .then((j) => { if (j?.ok) setHome(mergeSiteContent(j.content)); })
      .catch(() => {});
  }, [authed, tab]);

  const saveHome = async () => {
    setHomeSaving(true); setHomeMsg("");
    try {
      const res = await fetch("/api/public/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": pw },
        body: JSON.stringify({ content: home }),
      });
      const j = await res.json();
      if (j.ok) { setHome(mergeSiteContent(j.content)); setHomeMsg("Conteúdo salvo."); }
      else setHomeMsg(j.message || "Erro ao salvar.");
    } catch { setHomeMsg("Falha de rede."); }
    finally { setHomeSaving(false); }
  };

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





  const onlineSids = useMemo(() => new Set(online?.sessions || []), [online]);
  const onlineIps = useMemo(() => new Set(online?.ips || []), [online]);

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
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f172a", color: "#e2e8f0", fontFamily: "system-ui" }}>
        <form onSubmit={(e) => { e.preventDefault(); load(pw, day); }} style={{ background: "#1e293b", padding: 24, borderRadius: 12, width: 320 }}>
          <h1 style={{ margin: 0, marginBottom: 12, fontSize: 18 }}>Admin Desenrola</h1>
          <input autoFocus type="password" placeholder="Senha" value={pw} onChange={(e) => setPw(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: 14 }} />
          {error && <div style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 12, padding: 10, background: "#3b82f6", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", fontFamily: "system-ui", padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Painel Desenrola</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              title={online?.pages?.length ? online.pages.map((p) => `${p.page}: ${p.count}`).join(" · ") : "Sessões ativas nos últimos 75s"}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "#052e1b", border: "1px solid #15803d", borderRadius: 999, fontSize: 13 }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 999, background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,.2)", animation: "adminPulse 1.6s ease-in-out infinite" }} />
              <strong style={{ color: "#4ade80" }}>{online ? online.online : "–"}</strong>
              <span style={{ color: "#86efac" }}>online agora</span>
            </div>
            <label style={{ fontSize: 13, color: "#94a3b8" }}>Dia:</label>

            <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
              style={{ padding: 6, background: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: 6 }} />
            <button onClick={() => load(pw, day)} disabled={loading}
              style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer" }}>
              {loading ? "..." : "Atualizar"}
            </button>
            <button onClick={() => { sessionStorage.removeItem("admin_pw"); setAuthed(false); }}
              style={{ padding: "6px 12px", background: "#334155", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer" }}>
              Sair
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
              <div key={label as string} style={{ background: "#1e293b", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{v as number}</div>
              </div>
            ))}
          </div>
        )}

        {desvios.length > 0 && (
          <div style={{ background: "#7f1d1d", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <strong>⚠ {desvios.length} desvio(s) de pagamento do gateway</strong>
            <div style={{ fontSize: 12, marginTop: 4 }}>Comprovantes enviados sem pagamento confirmado no gateway.</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
          {[["funnel", "Funil"], ["sessions", `Sessões (${sessions.length})`], ["origem", `Origem do tráfego (${origens.length})`], ["tx", `Transações (${data?.transactions.length || 0})`], ["comp", `Comprovantes (${data?.comprovantes.length || 0})`], ["gateway", `Gateway${gwState ? ` (${gwState.active})` : ""}`], ["home", "Início usuário"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)}
              style={{ padding: "8px 14px", background: tab === id ? "#3b82f6" : "#1e293b", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "funnel" && data && (
          <div style={{ background: "#1e293b", padding: 16, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Consultas de CPF hoje ({data.cpf_consultas.length})</h3>
            <div style={{ maxHeight: 400, overflow: "auto", fontSize: 13 }}>
              {data.cpf_consultas.map((c, i) => (
                <div key={i} style={{ padding: 6, borderBottom: "1px solid #334155" }}>
                  {c.cpf} - {c.nome || "?"} <span style={{ color: "#64748b" }}>{fmtDate(c.consultado_em)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "sessions" && (
          <div style={{ background: "#1e293b", borderRadius: 8, overflow: "hidden" }}>
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
              const isOnline = onlineSids.has(s.sid) || (!!s.ip && onlineIps.has(s.ip));
              return (
                <div key={s.sid} style={{ padding: 12, borderBottom: "1px solid #334155" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    onClick={() => setExpandedSid(expandedSid === s.sid ? null : s.sid)}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.nome || "—"} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{s.cpf || ""}</span></div>
                      <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "1px 8px", borderRadius: 999, fontSize: 11, background: isOnline ? "#052e1b" : "#1f2937", border: `1px solid ${isOnline ? "#15803d" : "#374151"}`, color: isOnline ? "#4ade80" : "#94a3b8" }}>
                          <span style={{ width: 7, height: 7, borderRadius: 999, background: isOnline ? "#22c55e" : "#6b7280" }} />
                          {isOnline ? "online" : "offline"}
                        </span>
                        <span>IP {s.ip || "—"} · {fmtDate(s.first)} → {fmtDate(s.last)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#7dd3fc" }}>Origem: {s.origem.label} <span style={{ color: "#64748b" }}>({s.origem.detail})</span></div>
                      <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {badges.map((b) => (
                          <span key={b} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: b === "PAGO" ? "#059669" : b === "Comprovante" ? "#f59e0b" : "#334155" }}>{b}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 20 }}>{expandedSid === s.sid ? "▾" : "▸"}</div>
                  </div>
                  {expandedSid === s.sid && (
                    <div style={{ marginTop: 10, background: "#0f172a", padding: 10, borderRadius: 6, fontSize: 12, fontFamily: "monospace" }}>
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
          <div style={{ background: "#1e293b", borderRadius: 8, overflow: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  <th style={th}>Origem</th><th style={th}>Visitantes</th><th style={th}>Detalhes</th><th style={th}>Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {origens.map((o) => (
                  <tr key={o.label + o.detail} style={{ borderTop: "1px solid #334155" }}>
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
          <div style={{ background: "#1e293b", borderRadius: 8, overflow: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  <th style={th}>Ação</th>
                  <th style={th}>Status</th><th style={th}>Nome</th><th style={th}>CPF</th><th style={th}>Valor</th>
                  <th style={th}>Criado</th><th style={th}>Pago em</th><th style={th}>Acordo</th><th style={th}>ID</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.transaction_id} style={{ borderTop: "1px solid #334155" }}>
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
                        style={{ padding: "6px 12px", background: t.status === "PAID" ? "#334155" : "#10b981", color: t.status === "PAID" ? "#94a3b8" : "#000", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        {t.status === "PAID" ? "Re-marcar pago" : "✓ Marcar pago"}
                      </button>
                    </td>
                    <td style={td}><span style={{ padding: "2px 8px", borderRadius: 10, background: t.status === "PAID" ? "#059669" : "#334155", fontSize: 11 }}>{t.status}</span></td>
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
            {data.transactions.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Sem transações.</div>}
          </div>
        )}

        {tab === "comp" && data && (
          <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
            {data.comprovantes.map((c) => {
              const tx = c.transaction_id ? data.transactions.find((t) => t.transaction_id === c.transaction_id) : null;
              const desvio = !tx || tx.status !== "PAID";
              return (
                <div key={c.id} style={{ padding: 10, borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
          <div style={{ background: "#1e293b", borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Gateway ativo</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {(["freepay", "blackcat", "alpha", "klivo"] as const).map((g) => {
                const isActive = gwState?.active === g;
                const p = gwState?.providers.find((x) => x.id === g);
                return (
                  <button key={g} onClick={() => saveActive(g)} disabled={gwSaving || isActive}
                    style={{ padding: "10px 18px", background: isActive ? "#059669" : "#334155", color: "#fff", border: 0, borderRadius: 6, cursor: isActive ? "default" : "pointer", fontWeight: 600, textTransform: "capitalize" }}>
                    {g} {isActive ? "· ATIVO" : ""} {p && !p.configured ? "· sem chave" : ""}
                  </button>
                );
              })}
            </div>
            {gwMsg && <div style={{ padding: 8, background: "#0f172a", borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{gwMsg}</div>}

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
                <div key={g} style={{ background: "#0f172a", padding: 12, borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{g}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {p?.configured ? `Configurado${p.atualizado_em ? ` · ${fmtDate(p.atualizado_em)}` : ""}` : "Não configurado"}
                    </div>
                  </div>
                  <input type="text" placeholder={publicPh} value={form.public_key}
                    onChange={(e) => setCredForm((prev) => ({ ...prev, [g]: { ...form, public_key: e.target.value } }))}
                    style={{ width: "100%", padding: 8, marginBottom: 6, borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#fff", fontSize: 13 }} />
                  <input type="password" placeholder={secretPh} value={form.secret_key}
                    onChange={(e) => setCredForm((prev) => ({ ...prev, [g]: { ...form, secret_key: e.target.value } }))}
                    style={{ width: "100%", padding: 8, marginBottom: 8, borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#fff", fontSize: 13 }} />

                  <button onClick={() => saveCreds(g)} disabled={gwSaving}
                    style={{ padding: "8px 14px", background: "#3b82f6", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                    {gwSaving ? "Salvando..." : "Salvar credenciais"}
                  </button>
                </div>
              );
            })}
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 12 }}>
              As chaves ficam no Supabase (tabela desenrola_api_credentials) e são lidas só no servidor.
              Freepay e Blackcat usam Public + Secret. Blackcat também pode usar apenas API Key no campo Secret.
            </div>
          </div>
        )}

        {tab === "home" && (
          <div style={{ background: "#1e293b", borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Início do usuário (home)</h3>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 0 }}>
              Edite a faixa de aviso do topo e os dados do rodapé exibidos na página inicial.
            </p>

            {([
              ["banner_text", "Faixa de aviso (topo da home)", true],
              ["footer_title", "Rodapé · título", false],
              ["footer_atendimento_email", "Rodapé · e-mail de atendimento", false],
              ["footer_atendimento_prazo", "Rodapé · prazo de resposta", false],
              ["company_name", "Empresa · razão social / nome fantasia", true],
              ["company_cnpj", "Empresa · CNPJ", false],
              ["company_address", "Empresa · endereço completo", true],
              ["footer_telefone", "Rodapé · telefone", false],
              ["footer_disclaimer", "Rodapé · aviso legal", true],
              ["contato_titulo", "Contato · título", false],
              ["contato_intro", "Contato · texto de introdução", true],
              ["contato_email_nota", "Contato · observação do e-mail", true],
              ["contato_telefone_nota", "Contato · observação do telefone", true],
              ["contato_rodape_nota", "Contato · observação final (LGPD)", true],
            ] as [keyof SiteContent, string, boolean][]).map(([key, label, multiline]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>{label}</label>
                {multiline ? (
                  <textarea
                    value={home[key]}
                    onChange={(e) => setHome((prev) => ({ ...prev, [key]: e.target.value }))}
                    rows={key === "footer_disclaimer" ? 6 : 3}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
                  />
                ) : (
                  <input
                    type="text"
                    value={home[key]}
                    onChange={(e) => setHome((prev) => ({ ...prev, [key]: e.target.value }))}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: 13 }}
                  />
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={saveHome} disabled={homeSaving}
                style={{ padding: "9px 16px", background: "#3b82f6", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                {homeSaving ? "Salvando..." : "Salvar conteúdo"}
              </button>
              <button onClick={() => setHome(defaultSiteContent)} disabled={homeSaving}
                style={{ padding: "9px 16px", background: "#334155", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer" }}>
                Restaurar padrão
              </button>
              {homeMsg && <span style={{ fontSize: 13, color: "#94a3b8" }}>{homeMsg}</span>}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: 8, fontSize: 11, textTransform: "uppercase", color: "#94a3b8" };
const td: React.CSSProperties = { padding: 8 };
