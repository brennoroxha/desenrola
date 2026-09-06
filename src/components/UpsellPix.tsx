import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { media } from "@/lib/media";
import { track } from "@/lib/tracking";

export type UpsellQuery = { cpf: string; nome: string; phone: string; acordo: string };

export type UpsellPixProps = {
  pageKey: string;
  etapaLabel: string;
  progressPct: number;
  badge: { text: string; bg: string };
  title: string;
  subtitle: string;
  intro: ReactNode;
  bullets: string[];
  atencao: ReactNode;
  amountCents: number;
  amountLabel: string;
  ctaLabel: string;
  successTitle: string;
  successMessage: string;
  nextHref?: string | null;
  showSkipLink?: boolean;
  onSkip?: () => void;
};

function readQuery(): UpsellQuery {
  if (typeof window === "undefined") return { cpf: "", nome: "Cliente", phone: "", acordo: "" };
  const p = new URLSearchParams(window.location.search);
  return {
    cpf: p.get("cpf") || "",
    nome: p.get("nome") || "Cliente",
    phone: p.get("phone") || "",
    acordo: p.get("acordo") || "",
  };
}

export function buildForwardParams(q: UpsellQuery) {
  return new URLSearchParams({
    cpf: q.cpf || "",
    nome: q.nome || "",
    phone: q.phone || "",
    acordo: q.acordo || "",
  }).toString();
}

export function UpsellPix(props: UpsellPixProps) {
  const [q, setQ] = useState<UpsellQuery | null>(null);
  const [stage, setStage] = useState<"intro" | "loading" | "pix" | "paid" | "expired">("intro");
  const [copyPaste, setCopyPaste] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [seconds, setSeconds] = useState(15 * 60);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const parsed = readQuery();
    setQ(parsed);
    track(props.pageKey, "upsell_view", { cpf: parsed.cpf, nome: parsed.nome, acordo: parsed.acordo });
  }, [props.pageKey]);

  const stopAll = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    tickRef.current = null;
    pollRef.current = null;
  };
  useEffect(() => () => stopAll(), []);

  const timeStr = useMemo(() => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [seconds]);

  const gerarPix = async () => {
    if (!q) return;
    const raw = String(q.phone || "").replace(/\D/g, "");
    const cpfDigits = String(q.cpf || "").replace(/\D/g, "");
    if (!/^\d{11}$/.test(cpfDigits)) { setErrorMsg("CPF ausente. Volte e refaça a consulta."); return; }
    if (raw.length < 10) { setErrorMsg("Telefone ausente. Volte e refaça a consulta."); return; }
    setErrorMsg("");
    setStage("loading");
    try {
      const res = await fetch("/api/public/pix/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: cpfDigits,
          nome: q.nome || "Cliente",
          email: "cliente@gmail.com",
          phone: raw,
          amount_cents: props.amountCents,
          acordo: q.acordo || props.pageKey.toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data?.message || `Erro ${res.status} ao gerar PIX.`);
        setStage("intro");
        return;
      }
      // Não registra pending purchase: upsells não disparam evento de conversão.
      const cp = data.copyPaste || "";
      setCopyPaste(cp);
      if (cp) {
        try {
          const dataUrl = await QRCode.toDataURL(cp, { margin: 1, width: 320, errorCorrectionLevel: "M" });
          setQrCodeUrl(dataUrl);
        } catch { setQrCodeUrl(""); }
      }
      setStage("pix");
      track(props.pageKey, "upsell_pix_gerado", { cpf: q.cpf, nome: q.nome, acordo: q.acordo, meta: { transactionId: data.transactionId, amount_cents: props.amountCents } });

      tickRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            if (tickRef.current) clearInterval(tickRef.current);
            tickRef.current = null;
            setStage((cur) => (cur === "paid" ? cur : "expired"));
            return 0;
          }
          return s - 1;
        });
      }, 1000);

      if (data.transactionId) {
        const startedAt = Date.now();
        pollRef.current = setInterval(async () => {
          try {
            const r = await fetch(`/api/public/pix/status?id=${encodeURIComponent(data.transactionId)}`, { cache: "no-store" });
            const j = await r.json();
            if (j.status === "PAID") {
              stopAll();
              setStage("paid");
              track(props.pageKey, "upsell_pix_pago", { cpf: q.cpf, nome: q.nome, acordo: q.acordo, meta: { transactionId: data.transactionId } });
              // Sem rastreamento externo: segue direto no fluxo.
              if (props.nextHref) {
                const params = buildForwardParams(q);
                setTimeout(() => { window.location.href = `${props.nextHref}?${params}`; }, 1500);
              }
            } else if (["FAILED", "REFUSED"].includes(j.status)) {
              stopAll();
              setStage("expired");
            } else if (Date.now() - startedAt > 25 * 60 * 1000) {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
            }
          } catch {}
        }, 3000);
      }
    } catch {
      setErrorMsg("Não foi possível conectar. Verifique sua conexão.");
      setStage("intro");
    }
  };

  const copiar = async () => {
    if (!copyPaste) return;
    try {
      await navigator.clipboard.writeText(copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "rgb(240, 242, 245)", minHeight: "100vh" }}>
      <div style={{ height: 4, background: "rgb(229, 231, 235)" }}>
        <div style={{ width: stage === "paid" ? "100%" : `${props.progressPct}%`, height: "100%", background: "rgb(19, 81, 180)", transition: "width 0.4s" }} />
      </div>
      <div style={{ position: "absolute", top: 8, left: 14 }}>
        <img src={media.iconeGov} alt="gov.br" style={{ height: 22 }} />
      </div>
      <div style={{ position: "absolute", top: 12, right: 14, fontSize: 12, color: "rgb(19, 81, 180)", fontWeight: 700 }}>
        {props.etapaLabel}
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 14px 40px" }}>
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "rgba(0,0,0,0.08) 0px 4px 20px", padding: 20, marginBottom: 16 }}>
          <div style={{ display: "inline-block", background: props.badge.bg, color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 4, letterSpacing: 0.6 }}>
            {props.badge.text}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "rgb(26, 26, 26)", marginTop: 12, marginBottom: 8, lineHeight: 1.25 }}>{props.title}</h1>
          <div style={{ fontSize: 14, color: "rgb(220, 38, 38)", fontWeight: 700, marginBottom: 16 }}>{props.subtitle}</div>

          <div style={{ background: "rgb(254, 243, 199)", border: "1px solid rgb(253, 230, 138)", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13, color: "rgb(120, 53, 15)", lineHeight: 1.55 }}>
            {props.intro}
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", fontSize: 13, color: "rgb(51, 51, 51)" }}>
            {props.bullets.map((t, i) => (
              <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: i < props.bullets.length - 1 ? "1px dashed rgb(238, 238, 238)" : "none" }}>
                <span style={{ color: "rgb(19, 81, 180)", fontWeight: 800, flexShrink: 0 }}>✓</span>
                <span style={{ lineHeight: 1.5 }}>{t}</span>
              </li>
            ))}
          </ul>

          <div style={{ background: "rgb(243, 244, 246)", borderLeft: "3px solid rgb(220, 38, 38)", padding: "10px 12px", marginBottom: 16, fontSize: 12, color: "rgb(127, 29, 29)", lineHeight: 1.5 }}>
            {props.atencao}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", background: "rgb(239, 246, 255)", border: "1px solid rgb(219, 234, 254)", padding: "12px 14px", borderRadius: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "rgb(30, 64, 175)", fontWeight: 600 }}>Valor a pagar via PIX:</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "rgb(19, 81, 180)" }}>{props.amountLabel}</div>
          </div>

          {stage === "intro" && (
            <>
              <button onClick={gerarPix} style={{ width: "100%", padding: 15, background: "rgb(19, 81, 180)", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                {props.ctaLabel}
              </button>
              {props.showSkipLink && (
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); props.onSkip?.(); }}
                    style={{ fontSize: 12, color: "rgb(107, 114, 128)", textDecoration: "underline" }}
                  >
                    Não desejo prosseguir com esta etapa
                  </a>
                </div>
              )}
            </>
          )}

          {stage === "loading" && (
            <div style={{ textAlign: "center", padding: 20, color: "rgb(19, 81, 180)", fontWeight: 700 }}>Gerando PIX...</div>
          )}

          {stage === "pix" && (
            <div style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
              <div style={{ textAlign: "center", fontSize: 13, color: "#333", marginBottom: 10 }}>
                Escaneie o QR Code ou copie o código PIX. Expira em <strong>{timeStr}</strong>.
              </div>
              {qrCodeUrl && (
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <img src={qrCodeUrl} alt="QR Code PIX" style={{ width: 220, height: 220 }} />
                </div>
              )}
              {copyPaste && (
                <>
                  <textarea readOnly value={copyPaste} style={{ width: "100%", minHeight: 80, padding: 10, fontSize: 12, fontFamily: "monospace", border: "1px solid #ddd", borderRadius: 6, resize: "none", marginBottom: 8 }} />
                  <button onClick={copiar} style={{ width: "100%", padding: 13, background: copied ? "rgb(22, 163, 74)" : "rgb(19, 81, 180)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    {copied ? "Copiado!" : "Copiar código PIX"}
                  </button>
                </>
              )}
              <div style={{ textAlign: "center", fontSize: 12, color: "#666", marginTop: 12 }}>Aguardando confirmação do pagamento...</div>
            </div>
          )}

          {stage === "paid" && (
            <div style={{ textAlign: "center", padding: 20, background: "rgb(220, 252, 231)", border: "1px solid rgb(134, 239, 172)", borderRadius: 8, color: "rgb(20, 83, 45)" }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{props.successTitle}</div>
              <div style={{ fontSize: 13 }}>{props.successMessage}</div>
            </div>
          )}

          {stage === "expired" && (
            <div style={{ textAlign: "center", padding: 16, background: "rgb(254, 226, 226)", border: "1px solid rgb(252, 165, 165)", borderRadius: 8, color: "rgb(127, 29, 29)", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>PIX expirado ou falhou</div>
              <div style={{ fontSize: 13 }}>{errorMsg || "Gere um novo código para continuar."}</div>
              <button onClick={() => { setSeconds(15 * 60); setStage("intro"); }} style={{ marginTop: 10, padding: "10px 16px", background: "rgb(19, 81, 180)", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>
                Gerar novo PIX
              </button>
            </div>
          )}

          {errorMsg && stage === "intro" && (
            <div style={{ marginTop: 10, fontSize: 12, color: "rgb(220, 38, 38)" }}>{errorMsg}</div>
          )}
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: "rgb(156, 163, 175)", lineHeight: 1.7 }}>
          <img src={media.iconeGov} alt="gov.br" style={{ height: 18, marginBottom: 4, opacity: 0.5 }} />
          <br />
          Programa Desenrola Brasil - Ministério da Fazenda
          <br />
          Processamento seguro via PIX
        </div>
      </div>
    </div>
  );
}
