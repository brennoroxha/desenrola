// Conteúdo editável da home do usuário (faixa de aviso + rodapé).
// Editável pelo painel /admin na aba "Início usuário".

export type SiteContent = {
  banner_text: string;
  footer_title: string;
  footer_atendimento_email: string;
  footer_atendimento_prazo: string;
  /** Razão social / nome fantasia da empresa (editável no painel). */
  company_name: string;
  /** CNPJ da empresa (somente o número, editável no painel). */
  company_cnpj: string;
  /** Endereço completo da empresa (editável no painel). */
  company_address: string;
  /** Derivado de company_name + company_cnpj (não editar direto). */
  footer_empresa: string;
  /** Derivado de company_address (não editar direto). */
  footer_endereco: string;
  footer_telefone: string;
  footer_disclaimer: string;
  /** Página /contato */
  contato_titulo: string;
  contato_intro: string;
  contato_email_nota: string;
  contato_telefone_nota: string;
  contato_rodape_nota: string;
};

export const SITE_CONTENT_KEY = "site_content";

export const defaultSiteContent: SiteContent = {
  banner_text:
    "Serviço privado e independente. Sem vínculo com o Governo Federal, Banco Central, Receita Federal, Serasa ou instituições financeiras.",
  footer_title: "VEJA NEWS — Consultas e Orientação ao Consumidor",
  footer_atendimento_email: "consulteagoravalores@gmail.com",
  footer_atendimento_prazo: "Resposta em até 2 dias úteis.",
  company_name: "ML&S CONSULTORIA LTDA (nome fantasia VEJA NEWS)",
  company_cnpj: "64.703.249/0001-46",
  company_address: "Rua Judith Alves, 13, Sala Sobrado, Aquarius - Tamoios, Cabo Frio/RJ, CEP 28925-822",
  footer_empresa: "ML&S CONSULTORIA LTDA (nome fantasia VEJA NEWS) · CNPJ 64.703.249/0001-46",
  footer_endereco: "Rua Judith Alves, 13, Sala Sobrado, Aquarius - Tamoios, Cabo Frio/RJ, CEP 28925-822",
  footer_telefone: "(22) 2644-3556",
  footer_disclaimer:
    "Serviço privado e independente, sem qualquer vínculo com o Governo Federal, Banco Central do Brasil, Receita Federal, Serasa, SPC ou instituições financeiras. As informações apresentadas têm caráter meramente informativo e não constituem consultoria jurídica, financeira ou garantia de recebimento de qualquer valor. Existem alternativas oficiais e gratuitas para os assuntos sobre os quais orientamos. Direito de arrependimento em até 7 dias, nos termos do art. 49 do Código de Defesa do Consumidor. Atendimento destinado apenas a maiores de 18 anos.",
  contato_titulo: "Fale com a VEJA NEWS",
  contato_intro:
    "Dúvidas sobre a verificação, sobre os seus dados ou sobre o serviço? Fale conosco por um dos canais abaixo.",
  contato_email_nota: "Principal canal de atendimento. Resposta em até 2 dias úteis.",
  contato_telefone_nota: "Atendimento em horário comercial, de segunda a sexta.",
  contato_rodape_nota:
    "Para exercer os seus direitos de titular de dados (acesso, correção ou exclusão), escreva para o nosso e-mail informando o seu nome completo. Tratamos as solicitações conforme a Lei Geral de Proteção de Dados (LGPD).",
};

function derive(c: SiteContent): SiteContent {
  return {
    ...c,
    footer_empresa: `${c.company_name} · CNPJ ${c.company_cnpj}`,
    footer_endereco: c.company_address,
  };
}

export function mergeSiteContent(raw: unknown): SiteContent {
  if (!raw || typeof raw !== "object") return derive(defaultSiteContent);
  const out: any = { ...defaultSiteContent };
  for (const k of Object.keys(defaultSiteContent) as (keyof SiteContent)[]) {
    const v = (raw as any)[k];
    if (typeof v === "string" && v.trim()) out[k] = v;
  }
  return derive(out as SiteContent);
}
