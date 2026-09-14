#!/usr/bin/env bash
set -e

echo "== MegaPalpite / D1 =="
echo "Confirme que wrangler.toml está preenchido."
npx wrangler login
npx wrangler d1 execute megapalpite-db --local --file=database.sql
npx wrangler d1 execute megapalpite-db --remote --file=database.sql
npx wrangler d1 execute megapalpite-db --remote --command="SELECT COUNT(*) AS total, MIN(concurso) AS primeiro, MAX(concurso) AS ultimo FROM concursos;"
npx wrangler deploy
