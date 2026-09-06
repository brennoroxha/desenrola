#!/bin/bash
set -e
cd /www/wwwroot/desenrola/date-date-love

echo "→ Buscando atualizações do GitHub..."
git fetch origin main

echo "→ Sincronizando com o GitHub (descarta mudanças locais em arquivos rastreados, ex: routeTree.gen.ts)..."
git reset --hard origin/main

echo "→ Instalando dependências..."
npm install

echo "→ Buildando..."
rm -rf .output .wrangler
NITRO_PRESET=node-server npm run build

echo "→ Reiniciando processo (delete + start, garante que o .env é recarregado)..."
pm2 delete date-date-love 2>/dev/null || true
pm2 start ecosystem.config.cjs --update-env
pm2 save

echo "✓ Deploy concluído!"
echo "→ Últimas linhas do log:"
sleep 1
pm2 logs date-date-love --lines 10 --nostream
