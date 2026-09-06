// ============= Full file contents =============

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { media } from "@/lib/media";
import { track } from "@/lib/tracking";

export const Route = createFileRoute("/inicio")({
  head: () => ({
    meta: [
      { title: "Programa Desenrola Brasil — Acesso à plataforma" },
      { name: "description", content: "Acesse a plataforma do Programa Desenrola Brasil e consulte a situação do seu CPF em poucos passos." },
      { property: "og:title", content: "Programa Desenrola Brasil — Acesso à plataforma" },
      { property: "og:description", content: "Acesse a plataforma do Programa Desenrola Brasil e consulte a situação do seu CPF em poucos passos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "preload",
        as: "image",
        href: media.heroInicio,
        fetchpriority: "high",
      } as any,
    ],
  }),

  component: Index,
});

function Index() {
  useEffect(() => { track("home", "home_view"); }, []);
  return (
    <div className="flex flex-col min-h-screen font-['Open_Sans',sans-serif] bg-cinza-bg">
      <div className="flex-1 w-full max-w-[720px] mx-auto">
        <div className="bg-cinza-bg flex flex-col">
          {/* Hero (LCP) */}
          <div className="w-full bg-white flex items-center justify-center overflow-hidden">
            <img
              className="w-full h-auto max-h-[260px] md:max-h-[310px] object-contain block"
              src={media.heroInicio}
              alt="Programa Desenrola Brasil"
              width={1280}
              height={395}
              fetchPriority="high"
              decoding="async"
            />
          </div>

          {/* Main Card */}
          <section className="relative bg-white mx-4 mt-3 mb-4 pt-[26px] pb-12 px-5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-center">
            <div className="flex flex-col items-center">
              <img
                className="w-full max-w-[84px] h-auto block object-contain"
                src={media.limpeNome}
                alt="Limpe seu nome"
                decoding="async"
              />
            </div>

            <p className="text-[17px] font-bold text-azul-primario leading-[1.42] mt-5 max-w-[340px] mx-auto">
              O Programa Desenrola Brasil<br />
              possibilita a renegociação de dívidas<br />
              com descontos de até 99%
            </p>
            <p className="text-[15px] font-normal text-cinza-texto mt-5 leading-[1.45] max-w-[320px] mx-auto">
              Clique no botão abaixo para<br />
              acessar a plataforma
            </p>

            <a className="btn-primary btn-cta-pill" href="/cpf">
              Acessar agora
            </a>

            <div className="mt-9 flex items-center justify-center gap-4 text-[13px]">
              <a href="/politica-de-privacidade" className="text-blue-600 underline hover:text-blue-800">
                Política de Privacidade
              </a>
              <span className="text-cinza-texto">·</span>
              <a href="/termos-de-uso" className="text-blue-600 underline hover:text-blue-800">
                Termos de Uso
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
