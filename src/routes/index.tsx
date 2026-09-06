import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/tracking";
import { defaultSiteContent, mergeSiteContent, type SiteContent } from "@/lib/site-content";
import { EBOOKS, formatBRL } from "@/lib/ebooks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VEJA NEWS — Consulta informativa de CPF e orientação ao consumidor" },
      {
        name: "description",
        content:
          "Consulta informativa gratuita: informe seu CPF para localizar seu cadastro e receber orientação ao consumidor. Serviço privado e independente.",
      },
      { property: "og:title", content: "VEJA NEWS — Consulta informativa de CPF" },
      {
        property: "og:description",
        content:
          "Informe seu CPF para localizar seu cadastro e seguir para o atendimento. Conteúdo educativo e orientação ao consumidor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ETAPAS = [
  {
    n: 1,
    titulo: "Você inicia a verificação",
    texto: "Informe o seu CPF no campo acima. Ele é usado uma única vez, apenas para localizar o seu cadastro.",
  },
  {
    n: 2,
    titulo: "Localizamos seu cadastro",
    texto: "Consultamos o CPF em bases cadastrais parceiras, apenas para localizar o cadastro no seu nome.",
  },
  {
    n: 3,
    titulo: "Confirmamos sua identidade",
    texto:
      "Para proteger seus dados, pedimos que você confirme o nome da sua mãe e a sua data de nascimento antes de qualquer etapa seguinte.",
  },
  {
    n: 4,
    titulo: "Você segue para o atendimento",
    texto: "Com a identidade confirmada, você continua para ver os detalhes do serviço e decidir se quer contratar.",
  },
];


const SOMOS = [
  "Uma empresa privada de consulta e orientação ao consumidor ({empresa}).",
  "Um atendimento que explica, em linguagem simples, se há registros no seu nome.",
  "Um serviço com primeira conversa gratuita e sem compromisso.",
  "Uma empresa com CNPJ, endereço e canais de contato públicos, no rodapé desta página.",
];

const NAO_SOMOS = [
  "Não somos o Governo Federal, Banco Central, Receita Federal, Serasa ou banco.",
  "Não garantimos que existam valores no seu nome nem prometemos recebimento.",
  "Não pedimos senhas, códigos de cartão ou fotos de documentos.",
  "Não armazenamos as respostas digitadas na verificação deste site.",
];

const FAQ = [
  {
    q: "A consulta é gratuita?",
    a: "Sim. A verificação inicial e a primeira conversa são gratuitas e sem compromisso. Qualquer serviço pago é apresentado com o preço antes de você decidir.",
  },
  {
    q: "Por que preciso informar meu CPF?",
    a: "O CPF é o identificador usado para localizar o seu cadastro nas bases cadastrais parceiras. Ele é usado apenas para essa localização.",
  },
  {
    q: "Vocês têm vínculo com o governo?",
    a: "Não. Somos uma empresa privada e independente, sem vínculo com o Governo Federal, Banco Central, Receita Federal, Serasa ou instituições financeiras.",
  },
  {
    q: "Meus dados ficam salvos?",
    a: "Não armazenamos as respostas digitadas na verificação deste site. Os dados são usados apenas durante o atendimento.",
  },
];

function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function isValidCPF(value: string) {
  const d = value.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 1; i <= 9; i++) s += parseInt(d.charAt(i - 1)) * (11 - i);
  let r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d.charAt(9))) return false;
  s = 0;
  for (let i = 1; i <= 10; i++) s += parseInt(d.charAt(i - 1)) * (12 - i);
  r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d.charAt(10));
}

function Index() {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [cpf, setCpf] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [cookies, setCookies] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    track("home", "home_view");
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("cookies_ok")) setCookies(true);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/public/site-content")
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.ok) setContent(mergeSiteContent(j.content));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = cpf.replace(/\D/g, "");
    if (!isValidCPF(raw)) {
      setErro("CPF inválido. Verifique os dígitos.");
      return;
    }
    if (!aceite) {
      setErro("É necessário confirmar a declaração acima.");
      return;
    }
    setErro("");
    track("cpf", "cpf_submit", { cpf: raw });
    setLoading(true);
    setTimeout(() => {
      window.location.href = `/chat2?cpf=${raw}`;
    }, 1800);
  };

  const irParaFormulario = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-verde-suave font-['Open_Sans',sans-serif] text-texto-escuro">
      <div className="mx-auto w-full max-w-[520px] bg-white">
        {/* Faixa de aviso (editável no painel) */}
        <div className="bg-aviso-bg px-4 py-3 text-center text-[11.5px] leading-[1.5] text-texto-escuro">
          {content.banner_text}
        </div>

        {/* Header */}
        <header className="flex items-center justify-center gap-2.5 bg-white px-4 py-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-verde-primario text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
          </span>
          <strong className="text-[19px] font-extrabold tracking-tight">VEJA NEWS</strong>
        </header>

        {/* Hero + formulário */}
        <section className="bg-verde-suave px-4 pb-8 pt-6 text-center">
          <span className="inline-block rounded-full bg-verde-badge px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-verde-primario">
            Consulta informativa
          </span>

          <h1 className="mx-auto mt-4 max-w-[330px] text-[26px] font-extrabold leading-[1.22] tracking-tight">
            <span className="bg-destaque-amarelo px-1.5 py-0.5">Resolva seu nome</span>
            <br />
            agora mesmo, confirme apenas algumas informações abaixo.
          </h1>

          <div
            ref={formRef}
            className="mt-6 rounded-2xl bg-white p-5 text-left shadow-[0_6px_24px_rgba(16,36,29,0.08)]"
          >
            <h2 className="text-center text-[16px] font-bold">Digite seu CPF</h2>

            <form onSubmit={submit} className="mt-4">
              <input
                type="tel"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                aria-label="CPF"
                className="w-full rounded-full border border-[#e3e8e5] bg-[#fafbfa] px-5 py-3.5 text-[15px] text-texto-escuro outline-none placeholder:text-[#9aa5a0] focus:border-verde-primario"
                required
              />

              <label className="mt-4 flex items-start gap-2.5 text-[11.5px] leading-[1.5] text-texto-azulado">
                <input
                  type="checkbox"
                  checked={aceite}
                  onChange={(e) => setAceite(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-verde-primario"
                />
                <span>Declaro que sou o titular do CPF informado e que tenho mais de 18 anos.</span>
              </label>

              <p className="mt-3 text-center text-[11px] leading-[1.55] text-texto-azulado">
                Ao continuar, você concorda com a{" "}
                <a href="#politica" className="font-semibold underline">
                  Política de Privacidade
                </a>{" "}
                e os{" "}
                <a href="#termos" className="font-semibold underline">
                  Termos de Uso
                </a>
                . Atendimento destinado a maiores de 18 anos.
              </p>

              {erro && <p className="mt-3 text-center text-[12px] font-semibold text-red-600">{erro}</p>}

              <button type="submit" disabled={loading} className="btn-verde mt-4">
                {loading ? "Consultando..." : "Consultar meu CPF"}
              </button>
            </form>

            <p className="mt-4 text-center text-[12px] text-texto-azulado">
              <button type="button" onClick={irParaFormulario} className="font-semibold text-texto-escuro underline">
                Veja aqui
              </button>{" "}
              como funciona a sua consulta.
            </p>
          </div>
        </section>

        {/* Como funciona */}
        <section className="bg-white px-4 py-9">
          <h2 className="text-center text-[22px] font-extrabold leading-tight">Como funciona a verificação</h2>
          <p className="mx-auto mt-3 max-w-[330px] text-center text-[13px] leading-[1.55] text-texto-azulado">
            Um processo transparente, em quatro etapas, para você saber exatamente o que acontece com os seus dados.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {ETAPAS.map((e) => (
              <div key={e.n} className="rounded-2xl bg-verde-suave p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-verde-badge text-[12px] font-bold text-verde-primario">
                    {e.n}
                  </span>
                  <strong className="text-[15px] font-bold leading-tight">{e.titulo}</strong>
                </div>
                <p className="mt-2.5 text-[13px] leading-[1.55] text-texto-azulado">{e.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* E-books */}
        <section className="bg-verde-suave px-4 py-9 text-center">
          <span className="inline-block rounded-full bg-verde-badge px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-verde-primario">
            Guias educativos
          </span>
          <h2 className="mx-auto mt-4 max-w-[300px] text-[22px] font-extrabold leading-tight">
            E-books para organizar sua vida financeira
          </h2>
          <p className="mx-auto mt-3 max-w-[320px] text-[13px] leading-[1.55] text-texto-azulado">
            Conteúdo 100% educativo e informativo. Não é assessoria financeira, consultoria de investimento nem promessa
            de recuperação de valores.
          </p>

          <div className="mt-6 flex flex-col gap-4 text-left">
            {EBOOKS.map((b) => (
              <div key={b.titulo} className="rounded-2xl bg-white p-5 shadow-[0_4px_18px_rgba(16,36,29,0.06)]">
                <strong className="block text-[15.5px] font-bold leading-snug">{b.titulo}</strong>
                <p className="mt-2 text-[13px] leading-[1.55] text-texto-azulado">{b.desc}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {b.itens.map((i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-texto-azulado">
                      <span className="text-verde-primario">•</span>
                      {i}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[19px] font-extrabold text-verde-primario">{formatBRL(b.priceCents)}</p>
                <a href={`/checkout?p=${b.slug}`} className="btn-verde mt-3 block text-center">
                  Comprar e-book
                </a>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-5 max-w-[330px] text-[11.5px] leading-[1.55] text-texto-azulado">
            Produtos digitais com entrega por e-mail após a confirmação do pagamento. Preço único e fixo, sem variação
            por origem de acesso.
          </p>
        </section>

        {/* Por que pedimos o CPF */}
        <section className="bg-white px-4 py-9">
          <h2 className="text-center text-[22px] font-extrabold leading-tight">Por que pedimos o seu CPF?</h2>
          <p className="mt-4 text-[13.5px] leading-[1.6] text-texto-azulado">
            O CPF é o identificador usado para localizar o seu cadastro nas bases cadastrais parceiras que consultamos.
            Sem ele, não é possível dizer se existe algum registro vinculado ao seu nome.
          </p>
          <p className="mt-3 text-[13.5px] leading-[1.6] text-texto-azulado">
            Depois da consulta, pedimos que você confirme o nome da sua mãe e a sua data de nascimento. Essa confirmação
            existe para a sua proteção: garante que as informações do cadastro sejam mostradas apenas ao próprio titular.
          </p>

          <div className="mt-6 rounded-2xl bg-verde-suave p-5">
            <strong className="block text-[16px] font-bold">O que a VEJA NEWS é</strong>
            <ul className="mt-3 flex flex-col gap-3">
              {SOMOS.map((raw) => raw.replace("{empresa}", content.company_name)).map((s) => (
                <li key={s} className="flex gap-2.5 text-[13px] leading-[1.55] text-texto-azulado">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-verde-primario" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5l5 5L20 6.5" />
                  </svg>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-2xl bg-verde-suave p-5">
            <strong className="block text-[16px] font-bold">O que a VEJA NEWS não é</strong>
            <ul className="mt-3 flex flex-col gap-3">
              {NAO_SOMOS.map((s) => (
                <li key={s} className="flex gap-2.5 text-[13px] leading-[1.55] text-texto-azulado">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-center text-[12.5px] leading-[1.6] text-texto-azulado">
            Você também pode consultar gratuitamente os canais oficiais, como o sistema Valores a Receber do Banco
            Central (bcb.gov.br) e o site da Receita Federal.
          </p>
        </section>

        {/* FAQ */}
        <section className="bg-verde-suave px-4 py-9">
          <h2 className="text-center text-[22px] font-extrabold leading-tight">Perguntas frequentes</h2>
          <div className="mt-6 flex flex-col gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl bg-white px-4 py-3.5 shadow-[0_3px_14px_rgba(16,36,29,0.05)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-bold">
                  {f.q}
                  <span className="text-verde-primario transition-transform group-open:rotate-180">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-[13px] leading-[1.6] text-texto-azulado">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-[11.5px] text-texto-azulado">
            Atendimento destinado apenas a maiores de 18 anos.
          </p>
        </section>

        {/* Rodapé (editável no painel) */}
        <footer className="bg-rodape px-5 py-9 text-white">
          <strong className="block text-[15px] font-bold leading-snug">{content.footer_title}</strong>
          <p className="mt-3 text-[13px] leading-[1.6] text-white/85">
            Atendimento: <strong className="font-bold text-white">{content.footer_atendimento_email}</strong> ·{" "}
            {content.footer_atendimento_prazo}
          </p>
          <p className="mt-4 text-[12.5px] leading-[1.6] text-white/75">
            {content.footer_empresa}
            <br />
            {content.footer_endereco} · Telefone: {content.footer_telefone}
          </p>
          <p className="mt-4 text-[11.5px] leading-[1.65] text-white/60">{content.footer_disclaimer}</p>
          <div className="mt-5 flex flex-wrap gap-5 text-[12px] font-semibold text-white/85">
            <a href="/politica-de-privacidade">Política de Privacidade</a>
            <a href="/termos-de-uso">Termos de Uso</a>
            <Link to="/contato">Contato</Link>
          </div>
        </footer>
      </div>

      {cookies && (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[520px] rounded-t-2xl bg-white px-5 py-4 shadow-[0_-6px_24px_rgba(16,36,29,0.14)]">
          <p className="text-center text-[11.5px] leading-[1.55] text-texto-azulado">
            Usamos cookies e ferramentas de medição para entender a origem dos visitantes e melhorar o serviço. Ao
            continuar, você concorda conforme a nossa{" "}
            <a href="#politica" className="font-semibold underline">
              Política de Privacidade
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("cookies_ok", "1");
              setCookies(false);
            }}
            className="btn-verde mt-3"
          >
            Entendi e aceito
          </button>
        </div>
      )}
    </div>
  );
}
