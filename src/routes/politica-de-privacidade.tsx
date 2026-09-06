import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { defaultSiteContent, mergeSiteContent, type SiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — VEJA NEWS" },
      {
        name: "description",
        content:
          "Como a VEJA NEWS coleta, usa e protege seus dados pessoais na verificação por chat, em linguagem simples e conforme a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade — VEJA NEWS" },
      {
        property: "og:description",
        content: "Entenda quais dados coletamos, como usamos e quais são seus direitos (LGPD).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PoliticaPrivacidade,
});

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[17px] font-extrabold leading-snug text-texto-escuro">{titulo}</h2>
      <div className="mt-3 space-y-3 text-[13.5px] leading-[1.7] text-texto-azulado">{children}</div>
    </section>
  );
}

function PoliticaPrivacidade() {
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
          <h1 className="text-[30px] font-extrabold leading-[1.15] tracking-tight">Política de Privacidade</h1>
          <p className="mt-4 text-[13.5px] leading-[1.7] text-texto-azulado">
            Última atualização: agosto de 2026. Esta página explica, em linguagem simples, como a VEJA NEWS trata os seus
            dados pessoais.
          </p>

          <Bloco titulo="1. Quem somos">
            <p>
              Este site é operado por {content.footer_empresa.split(" · ")[0]}, {content.footer_empresa.split(" · ")[1] ?? ""}, com
              endereço na {content.footer_endereco}.
            </p>
            <p>
              Somos uma empresa privada e independente, sem qualquer vínculo com o Governo Federal, Banco Central do
              Brasil, Receita Federal, Serasa, SPC ou instituições financeiras.
            </p>
          </Bloco>

          <Bloco titulo="2. Quais dados coletamos">
            <p>
              Durante a verificação por chat, você pode informar: nome, telefone/WhatsApp e CPF. Também coletamos
              automaticamente dados de navegação (como páginas visitadas e parâmetros de campanha publicitária) por meio
              de ferramentas de medição de tráfego.
            </p>
            <p>
              Não pedimos senhas, códigos de cartão, fotos de documentos ou qualquer outro dado além dos listados acima.
            </p>
          </Bloco>

          <Bloco titulo="3. Como usamos os seus dados">
            <p>
              O nome e o telefone são usados para identificar e conduzir o seu atendimento. O CPF é usado uma única vez
              para localizar o seu cadastro em bases cadastrais parceiras, e a confirmação do nome da mãe serve para
              garantir que as informações sejam mostradas apenas ao próprio titular.
            </p>
            <p>Os dados de navegação são usados para medir a eficácia das nossas campanhas publicitárias.</p>
          </Bloco>

          <Bloco titulo="4. Armazenamento">
            <p>
              As respostas digitadas na verificação não são armazenadas neste site: elas trafegam apenas durante a
              consulta e são descartadas em seguida.
            </p>
            <p>
              Se você decidir contratar o serviço completo após a verificação, os dados necessários à contratação serão
              tratados conforme esta política e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
            </p>
          </Bloco>

          <Bloco titulo="5. Compartilhamento">
            <p>
              Para localizar o seu cadastro, o CPF informado é consultado em provedores de bases cadastrais parceiros,
              exclusivamente para essa finalidade.
            </p>
            <p>Não vendemos, alugamos ou compartilhamos os seus dados pessoais para fins de marketing de terceiros.</p>
          </Bloco>

          <Bloco titulo="6. Cookies e ferramentas de medição">
            <p>
              Utilizamos ferramentas de medição de tráfego e conversão (incluindo o pixel da Utmify) para entender a
              origem dos visitantes e medir campanhas. Essas ferramentas podem usar cookies ou identificadores
              semelhantes.
            </p>
            <p>
              Você pode bloquear cookies nas configurações do seu navegador; a verificação continua funcionando
              normalmente.
            </p>
          </Bloco>

          <Bloco titulo="7. Seus direitos (LGPD)">
            <p>
              Você tem direito a confirmar a existência de tratamento, acessar, corrigir, anonimizar, bloquear ou
              eliminar os seus dados pessoais, além de revogar consentimentos, nos termos do art. 18 da LGPD.
            </p>
            <p>
              Para exercer qualquer desses direitos, escreva para {content.footer_atendimento_email}.{" "}
              {content.footer_atendimento_prazo}
            </p>
          </Bloco>

          <Bloco titulo="8. Segurança">
            <p>
              Adotamos medidas técnicas razoáveis para proteger os dados durante a transmissão, incluindo conexão
              criptografada (HTTPS) e validação das informações antes de cada consulta.
            </p>
          </Bloco>

          <Bloco titulo="9. Alterações desta política">
            <p>
              Esta política pode ser atualizada para refletir mudanças no serviço ou na legislação. A versão vigente é
              sempre a publicada nesta página.
            </p>
          </Bloco>

          <Bloco titulo="10. Contato">
            <p>
              Encarregado de dados / contato: {content.footer_atendimento_email} · Telefone: {content.footer_telefone}.
            </p>
            <p>Endereço: {content.footer_endereco}.</p>
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
