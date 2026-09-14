const JSON_HEADERS = {
  "content-type": "application/json; charset=UTF-8",
  "cache-control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function corsHeaders(headers = {}) {
  return {
    ...headers,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization"
  };
}

function withCors(response) {
  const h = new Headers(response.headers);
  Object.entries(corsHeaders()).forEach(([k, v]) => h.set(k, v));
  return new Response(response.body, {status: response.status, headers: h});
}

function base64urlToBytes(input) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(base64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function decodePart(input) {
  return JSON.parse(new TextDecoder().decode(base64urlToBytes(input)));
}

let jwksCache = null;
let jwksExpires = 0;

async function getJwks(env) {
  if (jwksCache && Date.now() < jwksExpires) return jwksCache;
  const domain = String(env.ACCESS_TEAM_DOMAIN || "").replace(/\/+$/, "");
  if (!domain || domain.includes("COLOQUE_AQUI")) throw new Error("Cloudflare Access não configurado.");
  const r = await fetch(`https://${domain}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error("Não foi possível obter as chaves do Cloudflare Access.");
  jwksCache = await r.json();
  jwksExpires = Date.now() + 10 * 60 * 1000;
  return jwksCache;
}

async function requireAdmin(request, env) {
  const token = request.headers.get("CF-Access-Jwt-Assertion");
  if (!token) throw new Error("Acesso administrativo não autorizado.");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("JWT inválido.");

  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  const domain = String(env.ACCESS_TEAM_DOMAIN || "").replace(/\/+$/, "");
  const expectedIssuer = `https://${domain}`;

  if (payload.iss !== expectedIssuer) throw new Error("Issuer do JWT inválido.");
  if (env.ACCESS_AUD && !String(env.ACCESS_AUD).includes("COLOQUE_AQUI")) {
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.ACCESS_AUD)) throw new Error("Audience do JWT inválida.");
  }
  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error("JWT expirado.");

  const keys = await getJwks(env);
  const keyData = keys.keys.find(k => k.kid === header.kid);
  if (!keyData) throw new Error("Chave do JWT não encontrada.");

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    keyData,
    {name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"},
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    base64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid) throw new Error("Assinatura do JWT inválida.");

  const email = String(payload.email || "").toLowerCase();
  const allowed = String(env.ADMIN_EMAILS || "")
    .split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(email)) {
    throw new Error("Usuário não autorizado para administração.");
  }

  return payload;
}

function validateContest(body) {
  const concurso = Number(body.concurso);
  const data = String(body.data_sorteio || body.data || "").trim();
  const dezenas = Array.isArray(body.dezenas)
    ? body.dezenas.map(Number)
    : [body.bola1, body.bola2, body.bola3, body.bola4, body.bola5, body.bola6].map(Number);

  if (!Number.isInteger(concurso) || concurso < 1) throw new Error("Número do concurso inválido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error("Data inválida. Use AAAA-MM-DD.");
  if (dezenas.length !== 6 || dezenas.some(n => !Number.isInteger(n) || n < 1 || n > 60)) {
    throw new Error("Informe exatamente 6 dezenas entre 1 e 60.");
  }
  const sorted = [...dezenas].sort((a,b) => a-b);
  if (new Set(sorted).size !== 6) throw new Error("As seis dezenas devem ser diferentes.");
  return {concurso, data_sorteio: data, dezenas: sorted};
}

async function getContest(env, concurso) {
  return await env.DB.prepare(`
    SELECT concurso, data_sorteio, bola1, bola2, bola3, bola4, bola5, bola6
    FROM concursos WHERE concurso = ?
  `).bind(concurso).first();
}

async function logChange(env, concurso, acao, antes, depois) {
  await env.DB.prepare(`
    INSERT INTO historico_alteracoes (concurso, acao, dados_antes, dados_depois)
    VALUES (?, ?, ?, ?)
  `).bind(
    concurso ?? null,
    acao,
    antes ? JSON.stringify(antes) : null,
    depois ? JSON.stringify(depois) : null
  ).run();
}

async function publicRoutes(request, env, url) {
  if (url.pathname === "/api/status") {
    const row = await env.DB.prepare("SELECT COUNT(*) AS total, MAX(concurso) AS ultimo FROM concursos").first();
    return json({ok: true, concursos: row?.total || 0, ultimo_concurso: row?.ultimo || null});
  }

  if (url.pathname === "/api/ultimo-concurso") {
    const row = await env.DB.prepare(`
      SELECT concurso, data_sorteio, bola1, bola2, bola3, bola4, bola5, bola6
      FROM concursos ORDER BY concurso DESC LIMIT 1
    `).first();
    if (!row) return json({ok: false, message: "Nenhum concurso cadastrado."}, 404);
    return json({
      ok: true,
      concurso: row.concurso,
      data: row.data_sorteio,
      dezenas: [row.bola1,row.bola2,row.bola3,row.bola4,row.bola5,row.bola6]
    });
  }

  if (url.pathname === "/api/resultados") {
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 3056);
    const from = Number(url.searchParams.get("from") || 1);
    const to = Number(url.searchParams.get("to") || 999999);
    const result = await env.DB.prepare(`
      SELECT concurso, data_sorteio, bola1, bola2, bola3, bola4, bola5, bola6
      FROM concursos
      WHERE concurso BETWEEN ? AND ?
      ORDER BY concurso DESC
      LIMIT ?
    `).bind(from, to, limit).all();
    return json({
      ok: true,
      total: result.results.length,
      dados: result.results.map(r => ({
        concurso: r.concurso,
        data: r.data_sorteio,
        dezenas: [r.bola1,r.bola2,r.bola3,r.bola4,r.bola5,r.bola6]
      }))
    });
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {status: 204, headers: corsHeaders()});
    }

    try {
      if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/admin/")) {
        const response = await publicRoutes(request, env, url);
        if (response) return withCors(response);
      }

      if (url.pathname === "/api/admin/concursos" && request.method === "POST") {
        await requireAdmin(request, env);
        const body = await request.json();
        const c = validateContest(body);
        const existing = await getContest(env, c.concurso);
        if (existing) return json({ok:false, message:"Este concurso já existe."}, 409);

        const prev = await getContest(env, c.concurso - 1);
        if (prev && c.concurso !== prev.concurso + 1) {
          return json({ok:false, message:"O número informado não é o próximo concurso esperado."}, 422);
        }

        const [a,b,d,e,f,g] = c.dezenas;
        await env.DB.prepare(`
          INSERT INTO concursos (concurso,data_sorteio,bola1,bola2,bola3,bola4,bola5,bola6)
          VALUES (?,?,?,?,?,?,?,?)
        `).bind(c.concurso,c.data_sorteio,a,b,d,e,f,g).run();
        await logChange(env, c.concurso, "INSERT", null, c);
        return json({ok:true, message:"Concurso salvo com sucesso.", concurso:c}, 201);
      }

      const editMatch = url.pathname.match(/^\/api\/admin\/concursos\/(\d+)$/);
      if (editMatch && request.method === "PUT") {
        await requireAdmin(request, env);
        const numero = Number(editMatch[1]);
        const antes = await getContest(env, numero);
        if (!antes) return json({ok:false,message:"Concurso não encontrado."},404);
        const body = await request.json();
        const c = validateContest({...body, concurso: numero});
        const [a,b,d,e,f,g] = c.dezenas;
        await env.DB.prepare(`
          UPDATE concursos
          SET data_sorteio=?, bola1=?, bola2=?, bola3=?, bola4=?, bola5=?, bola6=?, atualizado_em=CURRENT_TIMESTAMP
          WHERE concurso=?
        `).bind(c.data_sorteio,a,b,d,e,f,g,numero).run();
        await logChange(env, numero, "UPDATE", antes, c);
        return json({ok:true,message:"Concurso atualizado.",concurso:c});
      }

      if (url.pathname === "/api/admin/auditar" && request.method === "POST") {
        await requireAdmin(request, env);
        const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM concursos").first();
        const minmax = await env.DB.prepare("SELECT MIN(concurso) AS minimo, MAX(concurso) AS maximo FROM concursos").first();
        const invalid = await env.DB.prepare(`
          SELECT COUNT(*) AS n FROM concursos
          WHERE bola1 NOT BETWEEN 1 AND 60 OR bola2 NOT BETWEEN 1 AND 60
             OR bola3 NOT BETWEEN 1 AND 60 OR bola4 NOT BETWEEN 1 AND 60
             OR bola5 NOT BETWEEN 1 AND 60 OR bola6 NOT BETWEEN 1 AND 60
        `).first();
        return json({
          ok:true,
          total: total?.n || 0,
          minimo: minmax?.minimo ?? null,
          maximo: minmax?.maximo ?? null,
          dezenas_invalidas: invalid?.n || 0
        });
      }

      // Static files from public/ via Cloudflare Workers Assets.
      if (request.method === "GET" && env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      if (request.method === "GET") {
        return new Response("MegaPalpite Worker ativo.", {
          status: 200,
          headers: {"content-type":"text/plain; charset=UTF-8"}
        });
      }

      return json({ok:false,message:"Rota não encontrada."},404);
    } catch (err) {
      const status = /não autorizado|não autorizad|JWT|Assinatura|Chave do JWT|Issuer|Audience|expirado/i.test(err.message) ? 401 : 400;
      return json({ok:false,message:err.message || "Erro interno."},status);
    }
  }
};
