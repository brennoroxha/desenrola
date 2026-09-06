import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { defaultSiteContent, mergeSiteContent, type SiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — VEJA NEWS" },
      {
        name: "description",
        content:
          "Fale com a VEJA NEWS por e-mail ou telefone: dúvidas sobre a verificação, sobre os seus dados pessoais ou sobre o serviço.",
      },
      { property: "og:title", content: "Contato — VEJA NEWS" },
      { property: "og:description", content: "Canais oficiais de atendimento da VEJA NEWS: e-mail, telefone e endereço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: Contato,
});

function Card({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl bg-white px-5 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <span className="block text-[11px] font-bold uppercase tracking-[0.09em] text-texto-azulado">{rotulo}</span>
      {children}
    </div>
  );
}

function Contato() {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);

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
          <span className="text-[19px] font-extrabold tracking-tight cursor-default">
            VEJA NEWS
          </span>
        </header>

        <main className="bg-verde-suave px-5 py-8">
          <h1 className="text-[30px] font-extrabold leading-[1.15] tracking-tight">{content.contato_titulo}</h1>
          <p className="mt-4 text-[13.5px] leading-[1.7] text-texto-azulado">{content.contato_intro}</p>

          <Card rotulo="E-mail">
            <a
              href={`mailto:${content.footer_atendimento_email}`}
              className="mt-2 block break-all text-[15px] font-bold text-texto-escuro"
            >
              {content.footer_atendimento_email}
            </a>
            <p className="mt-2 text-[12.5px] leading-[1.6] text-texto-azulado">{content.contato_email_nota}</p>
          </Card>

          <Card rotulo="Telefone">
            <p className="mt-2 text-[15px] font-bold text-texto-escuro">{content.footer_telefone}</p>
            <p className="mt-2 text-[12.5px] leading-[1.6] text-texto-azulado">{content.contato_telefone_nota}</p>
          </Card>

          <Card rotulo="Endereço comercial">
            <p className="mt-2 text-[13.5px] leading-[1.7] text-texto-escuro">
              {content.company_name}
              <br />
              CNPJ <span className="underline">{content.company_cnpj}</span>
              <br />
              {content.company_address}
            </p>
          </Card>

          <p className="mt-6 text-[12.5px] leading-[1.7] text-texto-azulado">{content.contato_rodape_nota}</p>
        </main>

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
            <Link to="/politica-de-privacidade">Política de Privacidade</Link>
            <Link to="/termos-de-uso">Termos de Uso</Link>
            <Link to="/contato">Contato</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
