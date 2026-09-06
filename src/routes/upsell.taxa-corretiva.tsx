import { createFileRoute } from "@tanstack/react-router";
import { UpsellPix } from "@/components/UpsellPix";

export const Route = createFileRoute("/upsell/taxa-corretiva")({
  head: () => ({
    meta: [
      { title: "Taxa Corretiva - Desenrola Brasil" },
      { name: "description", content: "Complemento obrigatório para baixa da dívida junto aos birôs de crédito." },
      { property: "og:title", content: "Taxa Corretiva - Desenrola Brasil" },
      { property: "og:description", content: "Regularize o complemento e finalize a baixa da sua dívida." },
    ],
  }),
  
  component: () => (
    <UpsellPix
      pageKey="upsell_taxa_corretiva"
      etapaLabel="ETAPA 1 DE 3"
      progressPct={25}
      badge={{ text: "PENDÊNCIA DETECTADA NO SISTEMA", bg: "rgb(220, 38, 38)" }}
      title="Inconsistência no cálculo do valor negativo"
      subtitle="Complemento obrigatório para prosseguir com a baixa da dívida."
      intro={
        <>
          <strong>Prezado(a) Cliente,</strong>
          <br />
          Ao processarmos a baixa da sua dívida junto aos birôs de crédito (Serasa, SPC e Boa Vista), o sistema identificou uma divergência de R$ 27,43 entre o valor negativado originalmente e o valor pago no acordo. Para que a baixa seja efetivada com validade jurídica, o complemento precisa ser quitado agora, dentro do mesmo protocolo.
        </>
      }
      bullets={[
        "Valor referente à diferença de juros SELIC acumulados entre a data da negativação e a data do acordo.",
        "Sem esta correção, a baixa fica pendente e seu CPF permanece restrito nos birôs.",
        "Pagamento único, não reincide - validado pelo Ministério da Fazenda.",
      ]}
      atencao={
        <>
          ⚠️ <strong>Atenção:</strong> Se este ajuste não for pago em até 30 minutos, o acordo é ANULADO e o CPF retorna à situação de negativação anterior, com acréscimo de multa contratual.
        </>
      }
      amountCents={2743}
      amountLabel="R$ 27,43"
      ctaLabel="Regularizar agora - R$ 27,43"
      successTitle="Pagamento confirmado!"
      successMessage="Redirecionando para a próxima etapa..."
      nextHref="/upsell/imposto-conclusao"
    />
  ),
});
