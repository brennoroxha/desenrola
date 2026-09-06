import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { EBOOKS, findEbook, formatBRL, type Ebook } from "@/lib/ebooks";
import { track, registerPendingPurchase } from "@/lib/tracking";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout do e-book — VEJA NEWS" },
      {
        name: "description",
        content:
          "Finalize a compra do seu e-book educativo da VEJA NEWS via PIX. Preencha seus dados e receba o material por e-mail.",
      },
      { property: "og:title", content: "Checkout do e-book — VEJA NEWS" },
      {
        property: "og:description",
        content: "Pagamento via PIX para os guias educativos da VEJA NEWS. Entrega por e-mail após a confirmação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: CheckoutPage,
});

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

function isValidCPF(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());
}

type Stage = "form" | "loading" | "pix" | "paid" | "erro";

function CheckoutPage() {
  const [produto, setProduto] = useState<Ebook>(EBOOKS[0]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [copyPaste, setCopyPaste] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [seconds, setSeconds] = useState(15 * 60);
  const [transactionId, setTransactionId] = useState("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const item = findEbook(p.get("p") || p.get("produto"));
    setProduto(item);
    const cpfParam = (p.get("cpf") || "").replace(/\D/g, "");
    if (cpfParam.length === 11) setCpf(formatCPF(cpfParam));
    track("checkout", "checkout_view", { acordo: `EBOOK-${item.slug}` });
  }, []);

  const stopAll = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    tickRef.current = null;
    pollRef.current = null;
  };

  useEffect(() => () => stopAll(), []);

  const tempo = useMemo(() => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [seconds]);

  const startTimers = (id: string) => {
    stopAll();
    setSeconds(15 * 60);
    tickRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          stopAll();
          setStage("erro");
          setErro("O tempo para pagamento expirou. Gere um novo PIX.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/pix/status?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (data?.status === "PAID") {
          stopAll();
          setStage("paid");
          track("checkout", "checkout_paid", { acordo: `EBOOK-${produto.slug}`, meta: { transactionId: id } });
        }
      } catch {
        /* silencioso */
      }
    }, 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawPhone = phone.replace(/\D/g, "");
    if (nome.trim().split(/\s+/).length < 2) return setErro("Informe seu nome completo.");
    if (!isValidEmail(email)) return setErro("Informe um e-mail válido.");
    if (rawPhone.length < 10) return setErro("Informe um telefone válido com DDD.");
    if (!isValidCPF(cpf)) return setErro("Informe um CPF válido.");
    setErro("");
    setStage("loading");
    track("checkout", "checkout_submit", { acordo: `EBOOK-${produto.slug}`, nome: nome.trim(), cpf: cpf.replace(/\D/g, "") });
    try {
      const res = await fetch("/api/public/pix/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: cpf.replace(/\D/g, ""),
          nome: nome.trim(),
          email: email.trim(),
          phone: rawPhone,
          amount_cents: produto.priceCents,
          acordo: `EBOOK-${produto.slug}`.slice(0, 64),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErro(data?.message || `Não foi possível gerar o PIX (erro ${res.status}).`);
        setStage("erro");
        return;
      }
      const cp: string = data.copyPaste || "";
      setCopyPaste(cp);
      setTransactionId(data.transactionId || "");
      if (data.transactionId) {
        registerPendingPurchase(data.transactionId, produto.priceCents / 100, {
          cpf: cpf.replace(/\D/g, ""),
          nome: nome.trim(),
          phone: rawPhone,
          acordo: `EBOOK-${produto.slug}`,
        });
      }
      if (cp) {
        try {
          setQrCodeUrl(await QRCode.toDataURL(cp, { margin: 1, width: 320, errorCorrectionLevel: "M" }));
        } catch {
          setQrCodeUrl("");
        }
      }
      setStage("pix");
      if (data.transactionId) startTimers(data.transactionId);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setStage("erro");
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setErro("Não foi possível copiar. Selecione o código manualmente.");
    }
  };

  return (
    <div className="min-h-screen bg-verde-suave font-['Open_Sans',sans-serif] text-texto-escuro">
      <div className="mx-auto w-full max-w-[520px] bg-white">
        <div className="bg-aviso-bg px-4 py-3 text-center text-[11.5px] leading-[1.5]">
          Produto digital educativo. Serviço privado e independente, sem vínculo com órgãos públicos.
        </div>

        <header className="border-b border-black/5 px-4 py-4 text-center">
          <strong className="text-[17px] font-extrabold">Finalizar compra</strong>
          <p className="mt-1 text-[12px] text-texto-azulado">Pagamento via PIX com liberação imediata</p>
        </header>

        <main className="px-4 py-6">
          {/* Resumo */}
          <div className="rounded-2xl bg-verde-suave p-4">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-verde-primario">E-book</span>
            <strong className="mt-1.5 block text-[15px] font-bold leading-snug">{produto.titulo}</strong>
            <p className="mt-2 text-[12.5px] leading-[1.55] text-texto-azulado">{produto.desc}</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-[12.5px] text-texto-azulado">Total</span>
              <span className="text-[22px] font-extrabold text-verde-primario">{formatBRL(produto.priceCents)}</span>
            </div>
          </div>

          {stage === "form" || stage === "erro" ? (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold">Nome completo</span>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={120}
                  placeholder="Seu nome completo"
                  className="h-12 rounded-xl border border-black/10 px-3.5 text-[14px] outline-none focus:border-verde-primario"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold">E-mail (entrega do e-book)</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  maxLength={200}
                  placeholder="voce@email.com"
                  className="h-12 rounded-xl border border-black/10 px-3.5 text-[14px] outline-none focus:border-verde-primario"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold">Telefone com DDD</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  inputMode="numeric"
                  placeholder="(11) 90000-0000"
                  className="h-12 rounded-xl border border-black/10 px-3.5 text-[14px] outline-none focus:border-verde-primario"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold">CPF</span>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className="h-12 rounded-xl border border-black/10 px-3.5 text-[14px] outline-none focus:border-verde-primario"
                />
              </label>

              {erro ? <p className="text-[12.5px] font-semibold text-red-600">{erro}</p> : null}

              <button type="submit" className="btn-verde mt-1">
                Gerar PIX de {formatBRL(produto.priceCents)}
              </button>
              <p className="text-[11.5px] leading-[1.55] text-texto-azulado">
                Seus dados são usados apenas para emitir a cobrança e entregar o material digital por e-mail.
              </p>
            </form>
          ) : null}

          {stage === "loading" ? (
            <div className="mt-8 flex flex-col items-center gap-3 py-6">
              <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-verde-primario border-t-transparent" />
              <p className="text-[13px] text-texto-azulado">Gerando seu PIX com segurança...</p>
            </div>
          ) : null}

          {stage === "pix" ? (
            <div className="mt-6 flex flex-col items-center text-center">
              <p className="text-[13px] font-semibold">Escaneie o QR Code ou copie o código PIX</p>
              <p className="mt-1 text-[12px] text-texto-azulado">Expira em {tempo}</p>
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code do pagamento PIX" className="mt-4 h-56 w-56 rounded-xl border border-black/10" />
              ) : null}
              <div className="mt-4 w-full break-all rounded-xl bg-verde-suave p-3 text-left text-[11px] leading-[1.5] text-texto-azulado">
                {copyPaste}
              </div>
              <button type="button" onClick={copiar} className="btn-verde mt-3">
                {copied ? "Código copiado!" : "Copiar código PIX"}
              </button>
              <p className="mt-3 text-[11.5px] text-texto-azulado">
                Após o pagamento, a confirmação aparece automaticamente nesta tela.
              </p>
            </div>
          ) : null}

          {stage === "paid" ? (
            <div className="mt-6 rounded-2xl bg-verde-suave p-6 text-center">
              <strong className="block text-[18px] font-extrabold text-verde-primario">Pagamento confirmado!</strong>
              <p className="mt-2 text-[13px] leading-[1.6] text-texto-azulado">
                Seu e-book <strong>{produto.titulo}</strong> será enviado para <strong>{email}</strong> em instantes.
              </p>
              {transactionId ? (
                <p className="mt-3 text-[11px] text-texto-azulado">Código da transação: {transactionId}</p>
              ) : null}
              <a href="/" className="btn-verde mt-4 inline-block">
                Voltar ao início
              </a>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
