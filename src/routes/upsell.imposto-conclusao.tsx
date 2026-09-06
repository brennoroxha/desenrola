import { createFileRoute } from "@tanstack/react-router";
import { UpsellPix } from "@/components/UpsellPix";

export const Route = createFileRoute("/upsell/imposto-conclusao")({
  head: () => ({
    meta: [
      { title: "Taxa de Conclusão - Desenrola Brasil" },
      { name: "description", content: "Emissão da taxa federal de conclusão do Programa Desenrola Brasil." },
      { property: "og:title", content: "Taxa de Conclusão - Desenrola Brasil" },
      { property: "og:description", content: "Protocole a baixa definitiva do seu acordo junto à Receita Federal." },
    ],
  }),
  
  component: () => (
    <UpsellPix
      pageKey="upsell_imposto_conclusao"
      etapaLabel="ETAPA 2 DE 3"
      progressPct={50}
      badge={{ text: "EMISSÃO DE DARF - RECEITA FEDERAL", bg: "rgb(19, 81, 180)" }}
      title="Taxa de conclusão do serviço Desenrola Brasil"
      subtitle="Emissão obrigatória para protocolar a baixa definitiva."
      intro={
        <>
          <strong>Prezado(a) Cliente,</strong>
          <br />
          Todo processo do Programa Desenrola Brasil finaliza com a emissão de uma taxa federal de conclusão (DARF-DBR), que remunera o serviço de intermediação prestado pelo Governo Federal junto às instituições credoras. Sem o recolhimento desta taxa, o processo fica na condição de "acordo firmado mas não protocolado", e a baixa não é comunicada aos birôs de crédito.
        </>
      }
      bullets={[
        "Valor fixo estabelecido pela Portaria MF 447/2023 - único e não parcelado.",
        "Comprovante fica arquivado no seu CPF junto à Receita Federal.",
        "Após pagamento, o protocolo é registrado em até 72h úteis nos birôs.",
      ]}
      atencao={
        <>
          ⚠️ <strong>Atenção:</strong> Sem o pagamento desta taxa em até 24h, o acordo firmado NÃO é comunicado ao Serasa/SPC. O status permanece como "negativado com acordo pendente" e o benefício do desconto se perde.
        </>
      }
      amountCents={1743}
      amountLabel="R$ 17,43"
      ctaLabel="Emitir DARF e concluir - R$ 17,43"
      successTitle="DARF confirmado!"
      successMessage="Redirecionando para a próxima etapa..."
      nextHref="/upsell/score-plus"
    />
  ),
});
