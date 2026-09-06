import { createFileRoute } from "@tanstack/react-router";
import { UpsellPix } from "@/components/UpsellPix";

export const Route = createFileRoute("/upsell/score-plus")({
  head: () => ({
    meta: [
      { title: "Score+ - Desenrola Brasil" },
      { name: "description", content: "Recálculo prioritário do seu score e liberação de crédito pré-aprovado." },
      { property: "og:title", content: "Score+ - Desenrola Brasil" },
      { property: "og:description", content: "Ative o Score+ e libere até R$ 3.000 em crédito imediato." },
    ],
  }),
  
  component: () => (
    <UpsellPix
      pageKey="upsell_score_plus"
      etapaLabel="ETAPA 3 DE 3"
      progressPct={75}
      badge={{ text: "OFERTA EXCLUSIVA PÓS-DESENROLA", bg: "rgb(5, 150, 105)" }}
      title="Ative o Score+ e libere até R$ 3.000 em crédito imediato"
      subtitle="Bônus oficial para quem concluiu o Desenrola Brasil."
      intro={
        <>
          <strong>Prezado(a) Cliente,</strong>
          <br />
          Com o seu nome limpo pelo Programa Desenrola Brasil, você agora é elegível ao Score+ - um recálculo prioritário do seu score de crédito junto ao Serasa, SPC e Boa Vista. A ativação eleva sua pontuação em até 380 pontos em 48h e libera uma linha de crédito pré-aprovada de até R$ 3.000,00 em bancos parceiros (Caixa, Banco do Brasil, Nubank e Mercado Pago).
        </>
      }
      bullets={[
        "Recálculo prioritário do score em até 48h - fura a fila padrão de 90 dias.",
        "Crédito pré-aprovado liberado direto no app do banco de sua preferência.",
        "Taxa de ativação única de R$ 9,73 - sem mensalidade e sem fidelidade.",
      ]}
      atencao={
        <>
          ⚠️ <strong>Atenção:</strong> A elegibilidade ao Score+ dura apenas 24h após a conclusão do Desenrola. Se não ativar hoje, o próximo recálculo prioritário só estará disponível em 12 meses.
        </>
      }
      amountCents={973}
      amountLabel="R$ 9,73"
      ctaLabel="Ativar Score+ agora - R$ 9,73"
      successTitle="Score+ ativado!"
      successMessage="Seu recálculo prioritário foi protocolado. Acompanhe seu score no Serasa em até 48h."
      nextHref={null}
      showSkipLink
      onSkip={() => { window.location.href = "/"; }}
    />
  ),
});
