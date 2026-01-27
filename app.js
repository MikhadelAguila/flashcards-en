const ES = document.getElementById("es");
const PRON = document.getElementById("pron");
const EN = document.getElementById("en");
const BACK = document.getElementById("back");
const META = document.getElementById("meta");
const CARD = document.querySelector(".card");
const searchInput = document.getElementById("searchInput");
const suggestions = document.getElementById("suggestions");
const levelButtons = document.querySelectorAll(".level-option");
const jumpInput = document.getElementById("jumpInput");
const jumpBtn = document.getElementById("jumpBtn");

const prevBtn = document.getElementById("prevBtn");
const showBtn = document.getElementById("showBtn");
const nextBtn = document.getElementById("nextBtn");

const studyToggle = document.getElementById("studyToggle");
const modeToggle = document.getElementById("modeToggle");
const shuffleBtn = document.getElementById("shuffleBtn");
const resetBtn = document.getElementById("resetBtn");

const LS_KEY = "de_flashcards_v1";
const LEVELS = {
  basic: ["basic.json"],
  intermediate: ["intermediate.json"],
  advanced: ["advanced.json"],
  all: ["basic.json", "intermediate.json", "advanced.json"]
};

let words = [];
let order = [];     // array de índices
let pos = 0;
let revealed = false;
let searchIndex = [];
let currentLevel = "all";

function saveState() {
  const savedOrder = modeToggle.checked ? [] : order;
  localStorage.setItem(LS_KEY, JSON.stringify({
    pos,
    revealed,
    randomMode: modeToggle.checked,
    order: savedOrder,
    studyMode: studyToggle.checked ? "learn" : "review",
    level: currentLevel
  }));
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (!s) return;
    if (typeof s.pos === "number") pos = s.pos;
    if (typeof s.revealed === "boolean") revealed = s.revealed;
    if (Array.isArray(s.order) && !s.randomMode) order = s.order;
    if (typeof s.level === "string" && LEVELS[s.level]) currentLevel = s.level;
  } catch { /* ignore */ }
  modeToggle.checked = false;
}

function isLearning() {
  return studyToggle.checked;
}

function updateShuffleVisibility() {
  shuffleBtn.classList.toggle("hidden", !modeToggle.checked);
}

function updateShowButtonState() {
  const isLearn = isLearning();
  showBtn.disabled = isLearn;
  showBtn.classList.toggle("disabled", isLearn);
}

function updateSearchVisibility() {
  const isLearn = isLearning();
  searchInput.closest(".search").classList.toggle("hidden", !isLearn);
  if (!isLearn) {
    searchInput.value = "";
    hideSuggestions();
  }
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hideSuggestions() {
  suggestions.classList.remove("show");
  suggestions.innerHTML = "";
}

function setActiveLevel(level) {
  currentLevel = LEVELS[level] ? level : "all";
  levelButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.level === currentLevel);
  });
}

function buildSearchIndex() {
  searchIndex = words.map((w, index) => ({
    index,
    label: w.es || "",
    key: normalizeText(w.es || "")
  }));
}

async function loadWordsForLevel(level) {
  const files = LEVELS[level] || LEVELS.all;
  const responses = await Promise.all(
    files.map((file) => fetch(`./${file}?v=${Date.now()}`))
  );
  const lists = await Promise.all(responses.map((res) => res.json()));
  return lists.flat();
}

async function setLevel(level) {
  setActiveLevel(level);
  words = await loadWordsForLevel(currentLevel);
  buildSearchIndex();
  searchInput.value = "";
  hideSuggestions();
  order = [];
  pos = 0;
  revealed = isLearning();
  buildOrder();
}

function goToWordIndex(wordIndex) {
  const orderPos = order.indexOf(wordIndex);
  if (orderPos === -1) return;
  pos = orderPos;
  revealed = isLearning();
  render();
}

function goToCardNumber(value) {
  if (!order.length) return;
  const target = Number(value);
  if (!Number.isFinite(target) || target < 1 || target > order.length) {
    if (jumpInput) jumpInput.value = "";
    return;
  }
  const nextPos = Math.max(1, Math.min(target, order.length)) - 1;
  pos = nextPos;
  revealed = isLearning();
  render();
}

function renderSuggestions(matches) {
  if (!matches.length) {
    hideSuggestions();
    return;
  }
  suggestions.innerHTML = matches
    .map((m) => `<button class="suggestion" type="button" data-index="${m.index}">${m.label}</button>`)
    .join("");
  suggestions.classList.add("show");
}

function setRevealed(v) {
  revealed = v;
  BACK.classList.toggle("hidden", !revealed);
  CARD.classList.toggle("revealed", revealed);
  showBtn.textContent = revealed ? "Ocultar" : "Mostrar";
  saveState();
}

function currentIndex() {
  if (!order.length) return 0;
  return order[pos] ?? 0;
}

function render() {
  if (!words.length) return;
  pos = Math.max(0, Math.min(pos, order.length - 1));
  const w = words[currentIndex()];
  ES.textContent = w.es;
  PRON.textContent = w.pron || "—";
  EN.textContent = w.en || "—";
  META.textContent = `Tarjeta ${pos + 1} / ${order.length} · ${modeToggle.checked ? "Aleatorio" : "Orden"}`;
  setRevealed(revealed);
}

function buildOrder() {
  const n = words.length;
  order = Array.from({ length: n }, (_, i) => i);

  if (modeToggle.checked) {
    // shuffle Fisher-Yates
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  pos = 0;
  revealed = isLearning();
  saveState();
  render();
}

function next() {
  if (!words.length) return;
  pos = (pos + 1) % order.length;
  revealed = isLearning();
  render();
}

function prev() {
  if (!words.length) return;
  pos = (pos - 1 + order.length) % order.length;
  revealed = isLearning();
  render();
}

async function init() {
  loadState();
  setActiveLevel(currentLevel);
  words = await loadWordsForLevel(currentLevel);
  buildSearchIndex();
  if (isLearning()) revealed = true;
  updateShuffleVisibility();
  updateShowButtonState();
  updateSearchVisibility();

  // Si el order guardado no cuadra con tamaño, reconstruimos
  if (!order.length || order.length !== words.length) {
    buildOrder();
  } else {
    render();
  }

  // UI events
  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);
  showBtn.addEventListener("click", () => {
    if (showBtn.disabled) return;
    setRevealed(!revealed);
  });

  levelButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.level === currentLevel) return;
      setLevel(btn.dataset.level).catch((err) => {
        META.textContent = "Error cargando nivel";
        console.error(err);
      });
    });
  });

  studyToggle.addEventListener("change", () => {
    updateShowButtonState();
    modeToggle.checked = false;
    updateShuffleVisibility();
    updateSearchVisibility();
    setRevealed(isLearning());
  });
  modeToggle.addEventListener("change", () => {
    updateShuffleVisibility();
    buildOrder();
  });

  searchInput.addEventListener("input", () => {
    const query = normalizeText(searchInput.value.trim());
    if (!query) {
      hideSuggestions();
      return;
    }
    const matches = searchIndex
      .filter((item) => item.key.includes(query))
      .slice(0, 8);
    renderSuggestions(matches);
  });

  suggestions.addEventListener("click", (e) => {
    const btn = e.target.closest(".suggestion");
    if (!btn) return;
    const index = Number(btn.dataset.index);
    goToWordIndex(index);
    hideSuggestions();
    searchInput.value = "";
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const query = normalizeText(searchInput.value.trim());
    if (!query) return;
    const match = searchIndex.find((item) => item.key.includes(query));
    if (match) goToWordIndex(match.index);
    hideSuggestions();
    searchInput.value = "";
  });

  shuffleBtn.addEventListener("click", () => {
    if (!modeToggle.checked) return; // solo aleatorio
    buildOrder();
  });

  jumpBtn.addEventListener("click", () => {
    goToCardNumber(jumpInput.value);
  });

  jumpInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    goToCardNumber(jumpInput.value);
  });

  resetBtn.addEventListener("click", () => {
    localStorage.removeItem(LS_KEY);
    pos = 0; revealed = false;
    buildOrder();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
    if (e.key === " ") {
      if (showBtn.disabled) return;
      e.preventDefault();
      setRevealed(!revealed);
    }
  });
}

init().catch(err => {
  META.textContent = "Error cargando palabras";
  console.error(err);
});
