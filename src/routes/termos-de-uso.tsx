import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { defaultSiteContent, mergeSiteContent, type SiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — VEJA NEWS" },
      {
        name: "description",
        content:
          "Termos que regem o uso do site e do serviço de consulta e orientação ao consumidor da VEJA NEWS.",
      },
      { property: "og:title", content: "Termos de Uso — VEJA NEWS" },
      {
        property: "og:description",
        content: "Aceitação, limitações do serviço, responsabilidades do usuário e direito de arrependimento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: TermosDeUso,
});

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[17px] font-extrabold leading-snug text-texto-escuro">{titulo}</h2>
      <div className="mt-3 space-y-3 text-[13.5px] leading-[1.7] text-texto-azulado">{children}</div>
    </section>
  );
}

function TermosDeUso() {
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
          <h1 className="text-[30px] font-extrabold leading-[1.15] tracking-tight">Termos de Uso</h1>
          <p className="mt-4 text-[13.5px] leading-[1.7] text-texto-azulado">
            Última atualização: agosto de 2026. Estes termos regem o uso do site e do serviço de consulta e orientação
            da VEJA NEWS.
          </p>

          <Bloco titulo="1. Aceitação dos termos">
            <p>
              Ao utilizar este site, você declara que leu, compreendeu e concorda com estes Termos de Uso e com a nossa{" "}
              <Link to="/politica-de-privacidade" className="font-semibold text-verde-primario underline">
                Política de Privacidade
              </Link>
              . Se não concordar, interrompa o uso imediatamente.
            </p>
            <p>O atendimento é destinado exclusivamente a maiores de 18 anos.</p>
          </Bloco>

          <Bloco titulo="2. Descrição do serviço">
            <p>
              A VEJA NEWS ({content.footer_empresa}) é uma empresa privada de consulta e orientação ao consumidor. O
              serviço consiste em verificar cadastros em bases parceiras e orientar o usuário, em linguagem simples,
              sobre registros eventualmente vinculados ao seu CPF.
            </p>
            <p>
              A VEJA NEWS não é o Governo Federal, o Banco Central, a Receita Federal, a Serasa, o SPC ou qualquer
              instituição financeira, e não possui vínculo com esses órgãos. Existem canais oficiais e gratuitos, como o
              sistema Valores a Receber do Banco Central (bcb.gov.br), que podem ser consultados diretamente pelo
              cidadão.
            </p>
          </Bloco>

          <Bloco titulo="3. Limitações do serviço">
            <p>
              A verificação inicial realizada neste site é gratuita e tem caráter meramente informativo. Não garantimos a
              existência de valores no seu nome, nem o recebimento de qualquer quantia.
            </p>
            <p>As informações apresentadas não constituem consultoria jurídica, contábil ou financeira.</p>
          </Bloco>

          <Bloco titulo="4. Responsabilidades do usuário">
            <p>
              Você se compromete a informar apenas os seus próprios dados (nome, telefone e CPF) e a utilizar o site de
              forma lícita. É vedado consultar dados de terceiros sem autorização.
            </p>
            <p>O uso de automações, robôs ou tentativas de sobrecarregar o serviço é proibido.</p>
          </Bloco>

          <Bloco titulo="5. Propriedade intelectual">
            <p>
              Todo o conteúdo deste site — textos, marca VEJA NEWS, layout e elementos visuais — é protegido por
              direitos autorais e não pode ser reproduzido sem autorização prévia e por escrito.
            </p>
          </Bloco>

          <Bloco titulo="6. Limitação de responsabilidade">
            <p>
              Empregamos esforços razoáveis para manter o site disponível e as informações corretas, mas não nos
              responsabilizamos por indisponibilidades temporárias, falhas de terceiros (incluindo as bases cadastrais
              parceiras) ou decisões tomadas com base nas orientações informativas prestadas.
            </p>
          </Bloco>

          <Bloco titulo="7. Direito de arrependimento">
            <p>
              Contratações realizadas fora do estabelecimento comercial podem ser canceladas em até 7 dias, com
              devolução integral de valores eventualmente pagos, nos termos do art. 49 do Código de Defesa do
              Consumidor.
            </p>
          </Bloco>

          <Bloco titulo="8. Alterações dos termos">
            <p>
              Estes termos podem ser atualizados a qualquer momento. A versão vigente é sempre a publicada nesta página,
              e o uso continuado do site implica aceitação das alterações.
            </p>
          </Bloco>

          <Bloco titulo="9. Contato e foro">
            <p>
              Dúvidas sobre estes termos: {content.footer_atendimento_email} · Telefone: {content.footer_telefone}.
            </p>
            <p>
              Fica eleito o foro da comarca de Cabo Frio/RJ para dirimir eventuais controvérsias, sem prejuízo dos
              direitos do consumidor previstos em lei.
            </p>
          </Bloco>
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
