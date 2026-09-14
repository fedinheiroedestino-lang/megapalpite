$ErrorActionPreference = "Stop"

Write-Host "== MegaPalpite / D1 =="
Write-Host "1) Confirme que wrangler.toml está preenchido."
Write-Host "2) Login: npx wrangler login"
Write-Host "3) Teste local: npx wrangler d1 execute megapalpite-db --local --file=database.sql"
Write-Host "4) Carga remota: npx wrangler d1 execute megapalpite-db --remote --file=database.sql"
Write-Host "5) Conferência:"
npx wrangler d1 execute megapalpite-db --remote --command="SELECT COUNT(*) AS total, MIN(concurso) AS primeiro, MAX(concurso) AS ultimo FROM concursos;"
Write-Host "6) Deploy Worker:"
npx wrangler deploy
