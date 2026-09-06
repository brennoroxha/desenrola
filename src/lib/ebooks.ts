export type Ebook = {
  slug: string;
  titulo: string;
  desc: string;
  itens: string[];
  priceCents: number;
};

export const EBOOK_PRICE_CENTS = 5473;

export const EBOOKS: Ebook[] = [
  {
    slug: "dinheiro-esquecido",
    titulo: "Guia: Onde checar se você tem dinheiro esquecido (2026)",
    desc: "Passo a passo dos canais oficiais e gratuitos para consultar valores no seu nome.",
    itens: [
      "Sistema Valores a Receber do Banco Central",
      "Receita Federal: restituição de Imposto de Renda",
      "PIS/PASEP e títulos de capitalização",
    ],
    priceCents: EBOOK_PRICE_CENTS,
  },
  {
    slug: "limpar-nome",
    titulo: "Como limpar seu nome e sair do Serasa/SPC em 2026",
    desc: "Conteúdo informativo sobre renegociação de dívidas e direitos do consumidor.",
    itens: [
      "Como funcionam os prazos de limpeza automática",
      "Estratégias de renegociação com credores",
      "Seus direitos garantidos pelo CDC",
    ],
    priceCents: EBOOK_PRICE_CENTS,
  },
  {
    slug: "organizacao-financeira",
    titulo: "Organização financeira pessoal: planilha + guia de 30 dias",
    desc: "Método simples de orçamento doméstico com planilha pronta para usar.",
    itens: [
      "Planilha de controle de gastos inclusa",
      "Plano de 30 dias passo a passo",
      "Como montar uma reserva de emergência",
    ],
    priceCents: EBOOK_PRICE_CENTS,
  },
];

export function findEbook(slug: string | null | undefined): Ebook {
  return EBOOKS.find((e) => e.slug === slug) ?? EBOOKS[0];
}

export function formatBRL(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}
