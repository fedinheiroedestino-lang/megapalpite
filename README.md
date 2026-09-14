# MegaPalpite — pacote GitHub/Cloudflare

Pacote do MegaPalpite com gerador recreativo, resultados, Centro de Estudos, Central de Probabilidades, estatísticas, gráficos básicos e conferidor de jogos.

## Estrutura
- `public/` — site público e banco JSON inicial.
- `src/worker.js` — API e entrega de Assets.
- `database.sql` — banco D1 com os concursos preparados.
- `wrangler.toml` — configuração Cloudflare.

## Publicação
1. Crie/configure o D1 conforme o `DEPLOY-CLOUDFLARE.md`.
2. Preencha o `database_id` no `wrangler.toml`.
3. Configure Cloudflare Access para `/admin.html` e `/api/admin/*`.
4. Faça login: `npx wrangler login`.
5. Teste localmente com `npx wrangler dev`.
6. Publique com `npx wrangler deploy`.

O site também possui `public/data/megasena_3056.json`, usado pelo front-end para a primeira versão das análises. O JSON não substitui o D1; ele permite que as ferramentas públicas funcionem mesmo durante a configuração inicial da API.

## Aviso
O MegaPalpite é uma ferramenta independente e recreativa. Estatísticas históricas descrevem dados passados e não constituem previsão de resultados.
