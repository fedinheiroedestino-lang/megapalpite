# MegaPalpite — pacote de deploy Cloudflare

## 1. Pré-requisitos

No computador:
- Node.js LTS
- Wrangler (`npx wrangler`)
- uma conta Cloudflare com o domínio/Worker do MegaPalpite

Faça login:

```bash
npx wrangler login
```

## 2. Criar o banco D1

Dentro desta pasta:

```bash
npx wrangler d1 create megapalpite-db
```

O comando mostrará um `database_id`.

Copie esse ID para `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "megapalpite-db"
database_id = "SEU_DATABASE_ID"
```

## 3. Carregar os 3.056 concursos

Primeiro, teste localmente:

```bash
npx wrangler d1 execute megapalpite-db --local --file=database.sql
```

Depois carregue no banco remoto:

```bash
npx wrangler d1 execute megapalpite-db --remote --file=database.sql
```

Conferência:

```bash
npx wrangler d1 execute megapalpite-db --remote --command="SELECT COUNT(*) AS total, MIN(concurso) AS primeiro, MAX(concurso) AS ultimo FROM concursos;"
```

O resultado esperado é:

```text
total = 3056
primeiro = 1
ultimo = 3056
```

## 4. Cloudflare Access para /admin

Crie uma aplicação de Access para proteger:

```text
https://SEU-DOMINIO/admin.html
```

Também é recomendável proteger:

```text
https://SEU-DOMINIO/api/admin/*
```

Configure o domínio do seu Access no `wrangler.toml`:

```toml
ACCESS_TEAM_DOMAIN = "sua-equipe.cloudflareaccess.com"
ACCESS_AUD = "AUDIENCE_ID_DA_APLICACAO"
ADMIN_EMAILS = "seu-email@exemplo.com"
```

O Worker aceita o JWT emitido pelo Cloudflare Access e ainda pode restringir o acesso por e-mail.

## 5. Deploy do Worker

Depois de preencher o `wrangler.toml`:

```bash
npx wrangler deploy
```

Verifique:

```text
/api/status
/api/ultimo-concurso
/api/resultados?limit=10
```

## 6. Importante sobre os arquivos HTML

Este pacote mantém o site atual em `public/`.

A publicação dos arquivos estáticos deve ser feita conforme o método de hospedagem escolhido para o seu Worker/site. Não substitua o site atual antes de testar a API.

O objetivo final é:

```text
MegaPalpite
├── páginas públicas
├── /admin.html protegido
│
└── Worker
    └── D1
        ├── concursos
        └── historico_alteracoes
```

## 7. Fluxo para cadastrar o próximo concurso

Depois que o banco estiver carregado:

1. Acesse `/admin.html`.
2. Informe o concurso.
3. Informe a data.
4. Informe as seis dezenas.
5. Clique em `Validar e salvar`.
6. O sistema verifica:
   - número inteiro;
   - data;
   - exatamente 6 dezenas;
   - faixa 1–60;
   - ausência de repetição;
   - duplicidade do concurso;
   - sequência do número do concurso.
7. Confirme o salvamento.

O registro é gravado no D1 e a operação é registrada em `historico_alteracoes`.

## 8. API pública

### Status

```http
GET /api/status
```

### Último concurso

```http
GET /api/ultimo-concurso
```

### Resultados

```http
GET /api/resultados?limit=100
GET /api/resultados?from=1&to=3056&limit=3056
```

## 9. API administrativa

### Criar

```http
POST /api/admin/concursos
Content-Type: application/json

{
  "concurso": 3057,
  "data_sorteio": "AAAA-MM-DD",
  "dezenas": [1, 2, 3, 4, 5, 6]
}
```

### Atualizar

```http
PUT /api/admin/concursos/3057
Content-Type: application/json

{
  "data_sorteio": "AAAA-MM-DD",
  "dezenas": [1, 2, 3, 4, 5, 6]
}
```

### Auditar

```http
POST /api/admin/auditar
```

## 10. Regra de segurança

Não coloque:
- senha de administrador;
- token secreto;
- credenciais Cloudflare;
- API keys

em `admin.html`, `app.js` ou qualquer arquivo público.

Use Cloudflare Access e variáveis/configuração do Worker.

## 11. Backup

O arquivo `database.sql` é a carga inicial dos 3.056 concursos. Guarde-o como backup da base inicial.

Depois de colocar o sistema em produção, faça exportações periódicas do D1 antes de alterações estruturais.

## 12. O que NÃO fazer

Não publique `admin.html` aberto na internet sem Cloudflare Access.

Não altere manualmente o `database.sql` para cadastrar concursos futuros. O cadastro normal deve ser feito pelo painel administrativo.

Não dependa da API externa para o funcionamento público do MegaPalpite.
