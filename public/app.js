"use strict";

/*
 * MegaPalpite - app.js
 * JavaScript puro, sem bibliotecas, APIs, servidor ou backend.
 *
 * Este arquivo espera que o index.html tenha elementos com os IDs
 * abaixo. Se algum deles não existir, o programa continua funcionando
 * sem quebrar a página.
 */

(() => {
  // ============================================================
  // CONFIGURAÇÕES
  // ============================================================

  const CONFIG = {
    MIN_NUMBER: 1,
    MAX_NUMBER: 60,
    NUMBERS_PER_GAME: 6,
    HISTORY_KEY: "megaPalpiteHistorico",
    MAX_HISTORY: 100
  };

  const ELEMENT_IDS = {
    quantity: [
      "quantidade",
      "quantidadeJogos",
      "gameCount",
      "gamesCount",
      "numeroJogos"
    ],
    strategy: [
      "estrategia",
      "strategy"
    ],
    generate: [
      "gerar",
      "gerarJogos",
      "generate",
      "generateGames",
      "btnGerar"
    ],
    regenerate: [
      "gerarNovamente",
      "regenerate",
      "btnGerarNovamente"
    ],
    games: [
      "jogos",
      "resultado",
      "resultados",
      "games",
      "gameResults"
    ],
    history: [
      "historico",
      "historicoJogos",
      "history",
      "savedGames"
    ],
    clearHistory: [
      "apagarHistorico",
      "limparHistorico",
      "clearHistory",
      "btnLimparHistorico"
    ],
    explanation: [
      "explicacaoEstrategia",
      "strategyExplanation",
      "explicacao"
    ],
    message: [
      "mensagem",
      "message",
      "status"
    ]
  };

  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================

  function findElement(names) {
    for (const name of names) {
      const element = document.getElementById(name);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function getElements() {
    return {
      quantity: findElement(ELEMENT_IDS.quantity),
      strategy: findElement(ELEMENT_IDS.strategy),
      generate: findElement(ELEMENT_IDS.generate),
      regenerate: findElement(ELEMENT_IDS.regenerate),
      games: findElement(ELEMENT_IDS.games),
      history: findElement(ELEMENT_IDS.history),
      clearHistory: findElement(ELEMENT_IDS.clearHistory),
      explanation: findElement(ELEMENT_IDS.explanation),
      message: findElement(ELEMENT_IDS.message)
    };
  }

  const elements = getElements();

  function showMessage(text, type = "info") {
    if (!elements.message) {
      return;
    }

    elements.message.textContent = text;
    elements.message.className = `mensagem ${type}`;
  }

  function clearMessage() {
    if (!elements.message) {
      return;
    }

    elements.message.textContent = "";
    elements.message.className = "mensagem";
  }

  function secureRandomInt(min, max) {
    const range = max - min + 1;

    /*
     * crypto.getRandomValues é uma funcionalidade nativa do navegador,
     * não é uma biblioteca externa nem uma API de servidor.
     *
     * Caso não esteja disponível, Math.random() funciona como alternativa.
     */
    if (
      window.crypto &&
      typeof window.crypto.getRandomValues === "function"
    ) {
      const maxUint32 = 0x100000000;
      const limit = maxUint32 - (maxUint32 % range);
      const array = new Uint32Array(1);

      do {
        window.crypto.getRandomValues(array);
      } while (array[0] >= limit);

      return min + (array[0] % range);
    }

    return Math.floor(Math.random() * range) + min;
  }

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = secureRandomInt(0, i);

      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function sortNumbers(numbers) {
    return [...numbers].sort((a, b) => a - b);
  }

  function arraysEqual(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  function gameExists(game, games) {
    return games.some((existingGame) => arraysEqual(existingGame, game));
  }

  // ============================================================
  // VALIDAÇÃO
  // ============================================================

  function getQuantity() {
    if (!elements.quantity) {
      return 1;
    }

    const value = Number(elements.quantity.value);

    if (![1, 5, 10, 20].includes(value)) {
      throw new Error("Escolha uma quantidade válida: 1, 5, 10 ou 20 jogos.");
    }

    return value;
  }

  function getStrategy() {
    if (!elements.strategy) {
      return "aleatoria";
    }

    const value = String(elements.strategy.value || "aleatoria")
      .trim()
      .toLowerCase();

    const aliases = {
      aleatoria: "aleatoria",
      aleatorio: "aleatoria",
      random: "aleatoria",
      equilibrada: "equilibrada",
      equilibrado: "equilibrada",
      balanced: "equilibrada"
    };

    if (!aliases[value]) {
      throw new Error("Escolha uma estratégia válida.");
    }

    return aliases[value];
  }

  function validateGame(game) {
    if (!Array.isArray(game)) {
      return false;
    }

    if (game.length !== CONFIG.NUMBERS_PER_GAME) {
      return false;
    }

    if (!game.every(Number.isInteger)) {
      return false;
    }

    if (
      !game.every(
        (number) =>
          number >= CONFIG.MIN_NUMBER &&
          number <= CONFIG.MAX_NUMBER
      )
    ) {
      return false;
    }

    const uniqueNumbers = new Set(game);

    return uniqueNumbers.size === CONFIG.NUMBERS_PER_GAME;
  }

  // ============================================================
  // GERAÇÃO DA ESTRATÉGIA ALEATÓRIA
  // ============================================================

  function generateRandomGame() {
    const available = [];

    for (
      let number = CONFIG.MIN_NUMBER;
      number <= CONFIG.MAX_NUMBER;
      number++
    ) {
      available.push(number);
    }

    const shuffled = shuffle(available);

    return sortNumbers(
      shuffled.slice(0, CONFIG.NUMBERS_PER_GAME)
    );
  }

  // ============================================================
  // GERAÇÃO DA ESTRATÉGIA EQUILIBRADA
  // ============================================================

  /*
   * A estratégia equilibrada tenta, quando possível, aproximar:
   *
   * - 3 números pares e 3 ímpares;
   * - 3 números baixos (1-30) e 3 números altos (31-60).
   *
   * Isso NÃO aumenta matematicamente a chance de ganhar.
   * É apenas uma forma diferente de distribuir os números.
   */

  function getRandomNumbersFromPool(pool, amount) {
    return shuffle(pool).slice(0, amount);
  }

  function generateBalancedGame() {
    const lowNumbers = [];
    const highNumbers = [];

    const evenNumbers = [];
    const oddNumbers = [];

    for (
      let number = CONFIG.MIN_NUMBER;
      number <= CONFIG.MAX_NUMBER;
      number++
    ) {
      if (number <= 30) {
        lowNumbers.push(number);
      } else {
        highNumbers.push(number);
      }

      if (number % 2 === 0) {
        evenNumbers.push(number);
      } else {
        oddNumbers.push(number);
      }
    }

    /*
     * Tentamos encontrar uma combinação que atenda aos dois
     * critérios ao mesmo tempo.
     */
    for (let attempt = 0; attempt < 100; attempt++) {
      const lowCount = 3;
      const highCount = 3;

      const low = getRandomNumbersFromPool(lowNumbers, lowCount);
      const high = getRandomNumbersFromPool(highNumbers, highCount);

      const game = sortNumbers([...low, ...high]);

      const evenCount = game.filter(
        (number) => number % 2 === 0
      ).length;

      if (evenCount === 3) {
        return game;
      }
    }

    /*
     * Se por algum motivo não encontrarmos uma combinação perfeita
     * nas tentativas acima, fazemos uma seleção por paridade.
     */
    for (let attempt = 0; attempt < 100; attempt++) {
      const evens = getRandomNumbersFromPool(evenNumbers, 3);
      const odds = getRandomNumbersFromPool(oddNumbers, 3);

      const game = sortNumbers([...evens, ...odds]);

      const lowCount = game.filter((number) => number <= 30).length;

      if (lowCount === 3) {
        return game;
      }
    }

    /*
     * Último recurso: gera normalmente.
     * Continua sendo um jogo perfeitamente válido.
     */
    return generateRandomGame();
  }

  // ============================================================
  // GERAÇÃO DE JOGOS
  // ============================================================

  function generateGame(strategy) {
    let game;

    if (strategy === "equilibrada") {
      game = generateBalancedGame();
    } else {
      game = generateRandomGame();
    }

    if (!validateGame(game)) {
      throw new Error("Não foi possível gerar um jogo válido.");
    }

    return game;
  }

  function generateGames(quantity, strategy) {
    const games = [];
    let attempts = 0;

    /*
     * Evita que a mesma combinação apareça duas vezes no mesmo
     * conjunto de geração.
     */
    while (games.length < quantity && attempts < 10000) {
      const game = generateGame(strategy);

      if (!gameExists(game, games)) {
        games.push(game);
      }

      attempts++;
    }

    if (games.length !== quantity) {
      throw new Error(
        "Não foi possível gerar a quantidade solicitada de jogos."
      );
    }

    return games;
  }

  // ============================================================
  // LOCALSTORAGE
  // ============================================================

  function readHistory() {
    try {
      const raw = localStorage.getItem(CONFIG.HISTORY_KEY);

      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item) => {
        if (!Array.isArray(item)) {
          return false;
        }

        return validateGame(item);
      });
    } catch (error) {
      console.warn("Não foi possível ler o histórico.", error);
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(
        CONFIG.HISTORY_KEY,
        JSON.stringify(history)
      );

      return true;
    } catch (error) {
      console.warn("Não foi possível salvar o histórico.", error);
      showMessage(
        "Os jogos foram gerados, mas não foi possível salvar o histórico neste navegador.",
        "warning"
      );

      return false;
    }
  }

  function addGamesToHistory(games) {
    const currentHistory = readHistory();

    /*
     * Colocamos os jogos novos no começo para que os mais recentes
     * apareçam primeiro.
     */
    const combined = [...games, ...currentHistory];

    /*
     * Remove combinações duplicadas do histórico.
     */
    const uniqueHistory = [];

    for (const game of combined) {
      if (!gameExists(game, uniqueHistory)) {
        uniqueHistory.push(game);
      }
    }

    const limitedHistory = uniqueHistory.slice(
      0,
      CONFIG.MAX_HISTORY
    );

    saveHistory(limitedHistory);
    renderHistory();
  }

  function clearHistory() {
    try {
      localStorage.removeItem(CONFIG.HISTORY_KEY);
      renderHistory();

      showMessage("Histórico apagado com sucesso.", "success");
    } catch (error) {
      console.warn("Não foi possível apagar o histórico.", error);

      showMessage(
        "Não foi possível apagar o histórico.",
        "error"
      );
    }
  }

  // ============================================================
  // EXIBIÇÃO
  // ============================================================

  function formatGame(game) {
    return game
      .map((number) => String(number).padStart(2, "0"))
      .join(" - ");
  }

  function createNumberElements(game) {
    const numbers = document.createElement("div");
    numbers.className = "numbers";

    game.forEach((number) => {
      const chip = document.createElement("span");
      chip.className = "number";
      chip.textContent = String(number).padStart(2, "0");
      numbers.appendChild(chip);
    });

    return numbers;
  }

  function createCopyButton(game, label = "Copiar") {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "copy-button";
    button.textContent = label;
    button.setAttribute(
      "aria-label",
      `Copiar jogo ${formatGame(game)}`
    );

    button.addEventListener("click", async () => {
      await copyGame(game, button);
    });

    return button;
  }

  async function copyGame(game, button) {
    const text = formatGame(game);

    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        copyWithFallback(text);
      }

      const originalText = button.textContent;

      button.textContent = "Copiado!";

      window.setTimeout(() => {
        button.textContent = originalText;
      }, 1500);
    } catch (error) {
      console.warn("Não foi possível copiar o jogo.", error);

      showMessage(
        "Não foi possível copiar automaticamente. Selecione e copie os números manualmente.",
        "error"
      );
    }
  }

  function copyWithFallback(text) {
    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";

    document.body.appendChild(textarea);

    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const successful = document.execCommand("copy");

    document.body.removeChild(textarea);

    if (!successful) {
      throw new Error("Cópia não suportada.");
    }
  }

  function createGameElement(game, index) {
    const wrapper = document.createElement("div");

    wrapper.className = "game";
    wrapper.setAttribute("data-game-index", String(index));

    const title = document.createElement("span");

    title.className = "game-number";
    title.textContent = `Jogo ${index + 1}`;

    const numbers = createNumberElements(game);

    const copyButton = createCopyButton(game);

    wrapper.appendChild(title);
    wrapper.appendChild(numbers);
    wrapper.appendChild(copyButton);

    return wrapper;
  }

  function renderGames(games) {
    if (!elements.games) {
      return;
    }

    elements.games.innerHTML = "";

    if (!games || games.length === 0) {
      const empty = document.createElement("p");

      empty.className = "sem-jogos";
      empty.textContent = "Nenhum jogo gerado ainda.";

      elements.games.appendChild(empty);

      return;
    }

    games.forEach((game, index) => {
      elements.games.appendChild(
        createGameElement(game, index)
      );
    });
  }

  function renderHistory() {
    if (!elements.history) {
      return;
    }

    const history = readHistory();

    elements.history.innerHTML = "";

    if (history.length === 0) {
      const empty = document.createElement("p");

      empty.className = "sem-historico";
      empty.textContent = "Nenhum jogo salvo no histórico.";

      elements.history.appendChild(empty);

      return;
    }

    history.forEach((game, index) => {
      const wrapper = document.createElement("div");

      wrapper.className = "game jogo-historico";
      wrapper.setAttribute(
        "data-history-index",
        String(index)
      );

      const numbers = createNumberElements(game);
      numbers.classList.add("historico-numeros");

      const copyButton = createCopyButton(game);

      wrapper.appendChild(numbers);
      wrapper.appendChild(copyButton);

      elements.history.appendChild(wrapper);
    });
  }

  // ============================================================
  // EXPLICAÇÕES
  // ============================================================

  const EXPLANATIONS = {
    aleatoria:
      "Aleatória: escolhe 6 números diferentes entre 1 e 60 de forma aleatória e coloca os números em ordem crescente. Essa estratégia não aumenta nem diminui a chance matemática de uma combinação específica ser sorteada.",

    equilibrada:
      "Equilibrada: tenta montar jogos com uma distribuição razoável entre números pares e ímpares e entre números baixos (1 a 30) e altos (31 a 60). Isso é apenas uma forma de organizar as combinações e não aumenta a chance matemática de ganhar."
  };

  function renderExplanation(strategy) {
    if (!elements.explanation) {
      return;
    }

    elements.explanation.textContent =
      EXPLANATIONS[strategy] || EXPLANATIONS.aleatoria;
  }

  // ============================================================
  // GERAÇÃO PRINCIPAL
  // ============================================================

  let lastGeneratedGames = [];

  function generate() {
    clearMessage();

    try {
      const quantity = getQuantity();
      const strategy = getStrategy();

      const games = generateGames(quantity, strategy);

      lastGeneratedGames = games;

      renderGames(games);
      renderExplanation(strategy);
      addGamesToHistory(games);

      showMessage(
        `${quantity} ${
          quantity === 1 ? "jogo foi gerado" : "jogos foram gerados"
        } com sucesso.`,
        "success"
      );
    } catch (error) {
      console.error(error);

      showMessage(
        error.message ||
          "Ocorreu um erro ao gerar os jogos.",
        "error"
      );
    }
  }

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================

  function setupEvents() {
    if (elements.generate) {
      elements.generate.addEventListener("click", generate);
    }

    if (elements.regenerate) {
      elements.regenerate.addEventListener("click", generate);
    }

    if (elements.clearHistory) {
      elements.clearHistory.addEventListener(
        "click",
        clearHistory
      );
    }

    if (elements.strategy) {
      elements.strategy.addEventListener("change", () => {
        try {
          const strategy = getStrategy();

          renderExplanation(strategy);
          clearMessage();
        } catch (error) {
          showMessage(error.message, "error");
        }
      });
    }

    if (elements.quantity) {
      elements.quantity.addEventListener("change", () => {
        try {
          getQuantity();
          clearMessage();
        } catch (error) {
          showMessage(error.message, "error");
        }
      });
    }
  }

  function initialize() {
    renderHistory();

    const initialStrategy = (() => {
      try {
        return getStrategy();
      } catch {
        return "aleatoria";
      }
    })();

    renderExplanation(initialStrategy);

    setupEvents();
  }

  /*
   * Se o script estiver no <head>, esperamos o DOM.
   * Se estiver no final do <body>, inicializamos imediatamente.
   */
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }

  // ============================================================
  // API OPCIONAL PARA O HTML
  // ============================================================
  /*
   * Não é necessário utilizar estas funções diretamente no HTML.
   * Elas ficam disponíveis apenas para facilitar futuras extensões.
   */

  window.MegaPalpite = {
    gerar: generate,
    gerarJogos: generateGames,
    gerarJogoAleatorio: generateRandomGame,
    gerarJogoEquilibrado: generateBalancedGame,
    lerHistorico: readHistory,
    apagarHistorico: clearHistory,
    copiarJogo: copyGame,
    formatarJogo: formatGame
  };
})();


/* =========================================================
   MegaPalpite — módulos estatísticos integrados
   ========================================================= */
(() => {
  const DATA_URL = "data/megasena_3056.json";
  let concursos = [];

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => new Intl.NumberFormat("pt-BR").format(n);

  async function carregarDados() {
    try {
      const local = await fetch(DATA_URL, { cache: "no-store" });
      if (!local.ok) throw new Error("Banco local indisponível.");
      concursos = await local.json();
      concursos = concursos.filter(c => Array.isArray(c.dezenas) && c.dezenas.length === 6);
      return concursos;
    } catch (e) {
      console.error(e);
      const box = $("resultadoDestaque");
      if (box) box.textContent = "Não foi possível carregar o banco histórico local.";
      return [];
    }
  }

  function combinacao(n,k) {
    if (k<0 || k>n) return 0;
    let r=1;
    for(let i=1;i<=k;i++) r=r*(n-k+i)/i;
    return Math.round(r);
  }

  function calcularProb() {
    const select=$("probNumeros"); if(!select) return;
    const n=Number(select.value), c=combinacao(n,6), total=combinacao(60,6);
    if($("probCombinacoes")) $("probCombinacoes").textContent=fmt(c);
    if($("probSena")) $("probSena").textContent="1 em "+fmt(total);
    if($("probFormula")) $("probFormula").textContent=`C(${n}, 6)`;
    if($("probExplicacao")) $("probExplicacao").textContent = n===6
      ? "Uma seleção de 6 números corresponde a uma única combinação simples."
      : `Uma seleção de ${n} números contém ${fmt(c)} combinações diferentes de 6 números. Isso descreve a matemática das combinações; não é uma previsão de resultado.`;
  }

  function concursoPorNumero(n) { return concursos.find(c=>Number(c.concurso)===Number(n)); }
  function dezenasHtml(ds) { return ds.map(n=>`<span class="number">${String(n).padStart(2,"0")}</span>`).join(""); }

  function renderResultados(lista) {
    const box=$("tabelaResultados"); if(!box) return;
    if(!lista.length){box.innerHTML='<p class="empty-state">Nenhum concurso encontrado.</p>';return;}
    box.innerHTML=`<table class="data-table"><thead><tr><th>Concurso</th><th>Data</th><th>Dezenas</th></tr></thead><tbody>${lista.map(c=>`<tr><td><strong>${c.concurso}</strong></td><td>${c.data||"—"}</td><td>${c.dezenas.map(n=>String(n).padStart(2,"0")).join(" · ")}</td></tr>`).join("")}</tbody></table>`;
  }

  function mostrarUltimo() {
    const c=concursos[concursos.length-1], box=$("resultadoDestaque"); if(!c||!box)return;
    box.innerHTML=`<strong>Concurso ${c.concurso}</strong> · ${c.data||"data não informada"}<div class="numbers" style="margin-top:10px">${dezenasHtml(c.dezenas)}</div>`;
    renderResultados([...concursos].slice(-10).reverse());
  }

  function buscarResultado() {
    const n=Number($("resultadoBusca")?.value); const c=concursoPorNumero(n);
    if(!c){ if($("resultadoDestaque")) $("resultadoDestaque").textContent="Concurso não encontrado no banco local."; renderResultados([]); return; }
    $("resultadoDestaque").innerHTML=`<strong>Concurso ${c.concurso}</strong> · ${c.data||"data não informada"}<div class="numbers" style="margin-top:10px">${dezenasHtml(c.dezenas)}</div>`;
    renderResultados([c]);
  }

  function renderBars(container, data, max, formatter=(x)=>x) {
    const el=$(container); if(!el)return;
    el.innerHTML=data.map(([label,value])=>`<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${max?Math.max(2,value/max*100):0}%"></div></div><span class="bar-value">${formatter(value)}</span></div>`).join("");
  }

  function obterPeriodo() {
    const val=$("statsPeriodo")?.value||"all";
    return val==="all"?[...concursos]:concursos.slice(-Number(val));
  }

  function atualizarStats() {
    const dados=obterPeriodo(); if(!dados.length)return;
    const freq=Array(61).fill(0), pares=[0,0], faixas=Array(6).fill(0);
    dados.forEach(c=>c.dezenas.forEach(n=>{freq[n]++; n%2===0?pares[0]++:pares[1]++; faixas[Math.min(5,Math.floor((n-1)/10))]++;}));
    const top=[...Array.from({length:60},(_,i)=>[i+1,freq[i+1]])].sort((a,b)=>b[1]-a[1]).slice(0,15).sort((a,b)=>a[0]-b[0]);
    renderBars("chartFrequencia",top,Math.max(...top.map(x=>x[1])),fmt);
    renderBars("chartPares",[["Pares",pares[0]],["Ímpares",pares[1]]],Math.max(...pares),fmt);
    renderBars("chartFaixas",faixas.map((v,i)=>[`${i*10+1}-${i*10+10}`,v]),Math.max(...faixas),fmt);
    const resumo=$("statsResumo"); if(resumo) resumo.innerHTML=`<div class="stat-pill"><span>Concursos analisados</span><strong>${fmt(dados.length)}</strong></div><div class="stat-pill"><span>Dezenas observadas</span><strong>${fmt(dados.length*6)}</strong></div><div class="stat-pill"><span>Dezena mais frequente no recorte</span><strong>${String([...Array.from({length:60},(_,i)=>i+1)].sort((a,b)=>freq[b]-freq[a])[0]).padStart(2,"0")}</strong></div>`;
  }

  function conferir() {
    const concurso=concursoPorNumero(Number($("conferirConcurso")?.value));
    const nums=[...document.querySelectorAll(".check-dezena")].map(x=>Number(x.value));
    const out=$("resultadoConferencia"); if(!out)return;
    if(!concurso){out.textContent="Informe um concurso existente no banco local.";return;}
    if(nums.length!==6 || nums.some(n=>!Number.isInteger(n)||n<1||n>60)||new Set(nums).size!==6){out.textContent="Informe exatamente 6 dezenas diferentes entre 1 e 60.";return;}
    const acertos=nums.filter(n=>concurso.dezenas.includes(n)).sort((a,b)=>a-b);
    out.innerHTML=`Concurso <strong>${concurso.concurso}</strong>: você acertou <strong>${acertos.length}</strong> dezena(s).${acertos.length?` <br>Acertos: <strong>${acertos.map(n=>String(n).padStart(2,"0")).join(" · ")}</strong>`:""}`;
  }

  function init() {
    $("btnCalcularProbabilidade")?.addEventListener("click",calcularProb);
    $("probNumeros")?.addEventListener("change",calcularProb);
    $("btnBuscarResultado")?.addEventListener("click",buscarResultado);
    $("btnUltimosResultados")?.addEventListener("click",mostrarUltimo);
    $("resultadoBusca")?.addEventListener("keydown",e=>{if(e.key==="Enter")buscarResultado();});
    $("btnAtualizarStats")?.addEventListener("click",atualizarStats);
    $("statsPeriodo")?.addEventListener("change",atualizarStats);
    $("btnConferir")?.addEventListener("click",conferir);
    calcularProb();
    carregarDados().then(()=>{mostrarUltimo();atualizarStats();});
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
