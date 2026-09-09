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

  function createCopyButton(game, label = "Copiar") {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "btn-copiar";
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

    wrapper.className = "jogo";
    wrapper.setAttribute("data-game-index", String(index));

    const title = document.createElement("span");

    title.className = "jogo-numero";
    title.textContent = `Jogo ${index + 1}`;

    const numbers = document.createElement("span");

    numbers.className = "jogo-numeros";
    numbers.textContent = formatGame(game);

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

      wrapper.className = "jogo-historico";
      wrapper.setAttribute(
        "data-history-index",
        String(index)
      );

      const numbers = document.createElement("span");

      numbers.className = "historico-numeros";
      numbers.textContent = formatGame(game);

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
