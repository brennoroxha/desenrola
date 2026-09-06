# Remover o rastreamento do Google Ads

O Google Analytics já foi removido. Agora sai também toda a parte de conversão do Google Ads, mantendo apenas a telemetria interna do funil (`/api/public/track`), o fluxo de pagamento PIX e o redirecionamento para o upsell.

## O que muda

- Nenhum script do Google (`gtag.js`) é mais carregado no site.
- Nenhum pixel de conversão é disparado quando o PIX é pago.
- O painel `/admin` deixa de gerenciar pixels do Google Ads (a aba/campos de pixels sai da interface).
- O acompanhamento de pagamentos continua funcionando: o site ainda confere se um PIX pendente virou pago e ainda redireciona o cliente para o upsell.

## Detalhes técnicos

- Excluir `src/lib/ads-pixels-loader.ts` e remover a importação/uso em `src/routes/__root.tsx` (mantendo a lógica do sufixo `#DESENROLA` e a chamada de reconciliação de pagamentos).
- Em `src/lib/tracking.ts`: remover `PIXEL_FALLBACK`, `getLoadedPixels`, `fireGtagConfirmed`, `fireGtagWithRetry`, `fireImageFallback`, `fireBeaconFallback`, `ensureGtagLoaded` e `fireAdsPurchase`; manter `track`, o registro de pendências, `reconcilePendingPurchases`, `startPendingPurchasesWatcher`, `markPaidRedirected` e o redirect de upsell (sem o disparo de conversão).
- Remover os `preconnect`/`dns-prefetch` do Google (googletagmanager, googleadservices, google.com, doubleclick) em `src/routes/__root.tsx`.
- Atualizar quem chama `fireAdsPurchase` (ex.: fluxo de pagamento em `src/routes/pagamento.tsx` e afins) para seguir apenas com o registro interno e o redirect.
- Remover a rota `src/routes/api/public/pixels.ts` e a UI/handlers de pixels no `src/routes/admin.tsx`, além das configurações de pixels no backend de settings, mantendo o restante do painel (gateways, métricas, senha) intacto.
- Se houver tabela/registro de pixels no banco, ela apenas deixa de ser usada; nenhuma migração destrutiva será feita.
