
console.log("APP VERSION: story mode");

// Global state
let ui = null;
let chapters = [];
let currentChapter = null;
let challenges = [];

const state = {
  currentIndex: 0,
  streak: 6,
  wrongCount: 0,
  canProceed: false,
  storySteps: [],
  stepIndex: 0
};

// Typewriter effect state
let isTyping = false;
let typingTimer = null;
let typingTarget = null;
let typingFullText = "";
let typingIndex = 0;
let pendingEnd = false;
let currentDisplayedType = null;
let keepInputBarVisible = false;

// TTS state
let ttsEnabled = true;
const tts = {
  voices: [],
  voiceSystem: null,
  voiceUser: null,
  loadVoices() {
    if (!("speechSynthesis" in window)) return;
    this.voices = window.speechSynthesis.getVoices();
    if (!this.voices.length) {
      this.voiceSystem = null;
      this.voiceUser = null;
      return;
    }
    const enUsVoices = this.voices.filter((voice) => voice.lang === "en-US");
    const pool = enUsVoices.length ? enUsVoices : this.voices;
    const first = pool[0];
    const second = pool.find((voice) => voice.name !== first.name) || first;
    this.voiceSystem = first;
    this.voiceUser = second;
  },
  cancel() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  },
  speak(text, role = "system") {
    if (!ttsEnabled) return;
    if (!("speechSynthesis" in window)) {
      setStatus(
        "Text-to-speech is not supported in this browser.",
        "\u6b64\u700f\u89bd\u5668\u4e0d\u652f\u63f4\u6717\u8b80\u3002"
      );
      return;
    }
    const content = (text || "").trim();
    if (!content) return;
    this.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    const voice = role === "user" ? this.voiceUser : this.voiceSystem;
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  }
};
let thinkingHints = [];
let thinkingHintIndex = 0;
let currentThinkingLine = null;

// Learning / progress state
let currentKeywords = [];
let wrongQueue = [];
let completedSet = new Set();
let totalWrongCount = 0;
let correctCount = 0;
let pendingNext = null;
let sceneImageToken = 0;
let lastValidationWarning = "";

const SCENE_GRADIENT =
  "linear-gradient(160deg, rgba(31, 95, 90, 0.16), rgba(229, 106, 58, 0.12))";

// DOM cache
const elements = {
  answerLine: document.getElementById("answer-line"),
  sentenceEn: document.getElementById("sentence-en"),
  sentenceZh: document.getElementById("sentence-zh"),
  dialogueBefore: document.getElementById("dialogue-before"),
  dialogueAfter: document.getElementById("dialogue-after"),
  sceneVisual: document.getElementById("scene-visual"),
  scenePlaceholder: document.getElementById("scene-placeholder"),
  interlude: document.getElementById("interlude"),
  interludeEn: document.getElementById("interlude-en"),
  interludeZh: document.getElementById("interlude-zh"),
  vnIndicator: document.getElementById("vn-indicator"),
  blank: document.getElementById("blank-slot"),
  sceneTitleEn: document.getElementById("scene-title-en"),
  sceneTitleZh: document.getElementById("scene-title-zh"),
  npcEn: document.getElementById("npc-en"),
  npcZh: document.getElementById("npc-zh"),
  contextEn: document.getElementById("context-en"),
  contextZh: document.getElementById("context-zh"),
  pos: document.getElementById("pos-chip"),
  morphList: document.getElementById("morph-list"),
  grammarList: document.getElementById("grammar-list"),
  originBox: document.getElementById("origin-box"),
  originTextEn: document.getElementById("origin-text-en"),
  originTextZh: document.getElementById("origin-text-zh"),
  familyBox: document.getElementById("family-box"),
  familyTextEn: document.getElementById("family-text-en"),
  familyTextZh: document.getElementById("family-text-zh"),
  completionScreen: document.getElementById("completion-screen"),
  completionBadges: document.getElementById("completion-badges"),
  restart: document.getElementById("restart-game"),
  inputBar: document.getElementById("input-bar"),
  ttsToggle: document.getElementById("tts-toggle"),
  answer: document.getElementById("answer-input"),
  status: document.getElementById("status-line"),
  streak: document.getElementById("streak-label"),
  revealHint: document.getElementById("reveal-hint"),
  next: document.getElementById("next-challenge"),
  submit: document.getElementById("submit-answer"),
  erase: document.getElementById("erase-answer"),
  handwriting: document.getElementById("toggle-handwriting"),
  refresh: document.getElementById("refresh-pattern"),
  chapterSelect: document.getElementById("chapter-select"),
  chapterButton: document.getElementById("chapter-button"),
  chapterCurrent: document.getElementById("chapter-current"),
  chapterPanel: document.getElementById("chapter-panel"),
  chapterCards: document.getElementById("chapter-cards")
};

if (elements.ttsToggle) {
  ttsEnabled = elements.ttsToggle.checked;
}

// UI text nodes
const uiElements = {
  brandTitle: document.getElementById("brand-title"),
  taglineEn: document.getElementById("tagline-en"),
  taglineZh: document.getElementById("tagline-zh"),
  statChapterEn: document.getElementById("stat-chapter-en"),
  statChapterZh: document.getElementById("stat-chapter-zh"),
  statChapterValue: document.getElementById("chapter-label"),
  statHpEn: document.getElementById("stat-hp-en"),
  statHpZh: document.getElementById("stat-hp-zh"),
  statHpValue: document.getElementById("hp-label"),
  statStreakEn: document.getElementById("stat-streak-en"),
  statStreakZh: document.getElementById("stat-streak-zh"),
  tabMorphEn: document.getElementById("tab-morph-en"),
  tabMorphZh: document.getElementById("tab-morph-zh"),
  tabGrammarEn: document.getElementById("tab-grammar-en"),
  tabGrammarZh: document.getElementById("tab-grammar-zh"),
  panelMorphEn: document.getElementById("panel-morph-en"),
  panelMorphZh: document.getElementById("panel-morph-zh"),
  panelGrammarEn: document.getElementById("panel-grammar-en"),
  panelGrammarZh: document.getElementById("panel-grammar-zh"),
  btnRevealEn: document.getElementById("btn-reveal-en"),
  btnRevealZh: document.getElementById("btn-reveal-zh"),
  btnNextEn: document.getElementById("btn-next-en"),
  btnNextZh: document.getElementById("btn-next-zh"),
  btnShuffleEn: document.getElementById("btn-shuffle-en"),
  btnShuffleZh: document.getElementById("btn-shuffle-zh"),
  btnHandwritingEn: document.getElementById("btn-handwriting-en"),
  btnHandwritingZh: document.getElementById("btn-handwriting-zh"),
  btnSubmitEn: document.getElementById("btn-submit-en"),
  btnSubmitZh: document.getElementById("btn-submit-zh"),
  btnEraseEn: document.getElementById("btn-erase-en"),
  btnEraseZh: document.getElementById("btn-erase-zh"),
  answerSpeakerEn: document.getElementById("answer-speaker-en"),
  answerSpeakerZh: document.getElementById("answer-speaker-zh"),
  originTitleEn: document.getElementById("origin-title-en"),
  originTitleZh: document.getElementById("origin-title-zh")
};

function setText(element, value) {
  if (element && value != null) {
    element.textContent = value;
  }
}

function formatTemplate(template, vars) {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? vars[key] : ""));
}

function getMessage(key) {
  if (ui && ui.messages && ui.messages[key]) {
    return ui.messages[key];
  }
  return { en: "", zh: "" };
}

function setStatus(english, chinese) {
  const en = english || "";
  const zh = chinese || "";
  elements.status.innerHTML = `<span>${en}</span><span class="zh">${zh}</span>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyKeywordHighlight(element) {
  if (!element) return;
  const raw = element.dataset.raw || "";
  const keywords = element.dataset.keywords ? JSON.parse(element.dataset.keywords) : [];
  if (!raw || !keywords.length) {
    element.textContent = raw;
    return;
  }
  const pattern = keywords.map(escapeRegex).join("|");
  const regex = new RegExp(`\\b(${pattern})\\b`, "gi");
  let result = "";
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    result += escapeHtml(raw.slice(lastIndex, match.index));
    result += `<mark class="keyword">${escapeHtml(match[0])}</mark>`;
    lastIndex = match.index + match[0].length;
  }
  result += escapeHtml(raw.slice(lastIndex));
  element.innerHTML = result;
}

function buildKeywordList(challenge) {
  const keywords = new Set();
  if (challenge.answer) {
    keywords.add(String(challenge.answer).trim());
  }
  const wordFamily = (challenge.hints || []).find((hint) => hint.label === "word family");
  if (wordFamily && wordFamily.value) {
    String(wordFamily.value)
      .split(/[\/,]/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 3)
      .forEach((word) => keywords.add(word));
  }
  return Array.from(keywords).filter(Boolean);
}

function getPosFromGrammar(challenge) {
  const grammar = Array.isArray(challenge.grammar) ? challenge.grammar : [];
  const posItem = grammar.find((item) => item.label === "POS");
  if (posItem && (posItem.value || posItem.valueZh)) {
    return {
      en: posItem.value || "",
      zh: posItem.valueZh || ""
    };
  }
  return {
    en: challenge.pos || "",
    zh: challenge.posZh || ""
  };
}

function buildHintLadder(challenge) {
  const ladder = [];
  let maxTier = 1;
  const pos = getPosFromGrammar(challenge);
  if (pos.en || pos.zh) {
    ladder.push({
      label: "POS",
      labelZh: "\u8a5e\u6027",
      value: pos.en,
      valueZh: pos.zh,
      hidden: true,
      tier: 1
    });
  }
  if (challenge.category || challenge.categoryZh) {
    ladder.push({
      label: "Category",
      labelZh: "\u985e\u5225",
      value: challenge.category || "",
      valueZh: challenge.categoryZh || "",
      hidden: true,
      tier: 1
    });
  }
  if (challenge.scene || challenge.sceneZh) {
    ladder.push({
      label: "Scene",
      labelZh: "\u60c5\u5883",
      value: challenge.scene || "",
      valueZh: challenge.sceneZh || "",
      hidden: true,
      tier: 1
    });
  }
  const baseHints = Array.isArray(challenge.hints) ? challenge.hints : [];
  baseHints.forEach((hint) => {
    const tier = hint.tier != null ? hint.tier : 2;
    maxTier = Math.max(maxTier, tier);
    ladder.push({
      label: hint.label,
      labelZh: hint.labelZh || "",
      value: hint.value,
      valueZh: hint.valueZh || "",
      hidden: !!hint.hidden,
      tier
    });
  });
  if (challenge.answer || challenge.answerZh) {
    ladder.push({
      label: "Answer",
      labelZh: "\u7b54\u6848",
      value: challenge.answer || "",
      valueZh: challenge.answerZh || "",
      hidden: true,
      tier: maxTier + 1
    });
  }
  return ladder;
}

function buildThinkingHints(challenge) {
  if (Array.isArray(challenge.thinkingHints)) {
    return challenge.thinkingHints
      .filter((hint) => hint && (hint.en || hint.zh))
      .map((hint) => ({
        tier: hint.tier,
        en: hint.en || "",
        zh: hint.zh || ""
      }));
  }
  return [];
}

function getCurrentThinkingHint() {
  if (!thinkingHints.length) return null;
  const index = Math.min(Math.max(thinkingHintIndex, 0), thinkingHints.length - 1);
  return thinkingHints[index];
}

function isThinkingLine(line) {
  if (!line || !line.speaker) return false;
  return String(line.speaker).toLowerCase().includes("thinking");
}

function formatThinkingText(hint) {
  if (!hint) return { en: "", zh: "" };
  const en = hint.en ? `\ud83e\udde0 ${hint.en}` : "";
  const zh = hint.zh ? `\ud83e\udde0 ${hint.zh}` : "";
  return { en, zh };
}

function updateThinkingBubble() {
  if (!currentThinkingLine) return;
  const hint = getCurrentThinkingHint();
  const text = formatThinkingText(hint);
  currentThinkingLine.textEl.textContent = text.en;
  currentThinkingLine.textEl.dataset.raw = text.en;
  currentThinkingLine.textEl.dataset.keywords = JSON.stringify([]);
  currentThinkingLine.zhEl.textContent = text.zh;
}

function revealNextThinkingHint() {
  if (!thinkingHints.length) return false;
  if (thinkingHintIndex >= thinkingHints.length - 1) return false;
  thinkingHintIndex += 1;
  updateThinkingBubble();
  return true;
}

function getRenderedLineData(step) {
  if (!step || step.type !== "line") return step?.data || null;
  if (!step.isThinking) return step.data;
  const hint = getCurrentThinkingHint();
  if (!hint || (!hint.en && !hint.zh)) {
    return step.data;
  }
  const formatted = formatThinkingText(hint);
  return {
    ...step.data,
    speakerZh: "",
    text: formatted.en,
    textZh: formatted.zh
  };
}

function setSceneBackground(sceneImage) {
  const token = ++sceneImageToken;
  if (!sceneImage) {
    elements.sceneVisual.style.backgroundImage = SCENE_GRADIENT;
    if (elements.scenePlaceholder) elements.scenePlaceholder.hidden = false;
    return;
  }
  const img = new Image();
  img.onload = () => {
    if (token !== sceneImageToken) return;
    elements.sceneVisual.style.backgroundImage = `${SCENE_GRADIENT}, url("${sceneImage}")`;
    if (elements.scenePlaceholder) elements.scenePlaceholder.hidden = true;
  };
  img.onerror = () => {
    if (token !== sceneImageToken) return;
    elements.sceneVisual.style.backgroundImage = SCENE_GRADIENT;
    if (elements.scenePlaceholder) elements.scenePlaceholder.hidden = false;
    console.warn(`[scene] image failed to load: ${sceneImage}`);
  };
  img.src = sceneImage;
}

const REQUIRED_CHALLENGE_FIELDS = [
  "scene",
  "sceneZh",
  "npc",
  "npcZh",
  "dialogue",
  "followUp",
  "sentence",
  "sentenceZh",
  "answer",
  "answerZh",
  "hints",
  "grammar"
];

function validateChallengeData(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, message: "Empty challenge list" };
  }
  const warnings = [];
  list.forEach((challenge, index) => {
    REQUIRED_CHALLENGE_FIELDS.forEach((field) => {
      if (challenge[field] == null) {
        warnings.push(`[#${index + 1}] Missing field: ${field}`);
      }
    });
    if (challenge.dialogue && !Array.isArray(challenge.dialogue)) {
      warnings.push(`[#${index + 1}] dialogue should be an array`);
    }
    if (challenge.followUp && !Array.isArray(challenge.followUp)) {
      warnings.push(`[#${index + 1}] followUp should be an array`);
    }
    if (challenge.hints && !Array.isArray(challenge.hints)) {
      warnings.push(`[#${index + 1}] hints should be an array`);
    }
    if (challenge.grammar && !Array.isArray(challenge.grammar)) {
      warnings.push(`[#${index + 1}] grammar should be an array`);
    }
    if (challenge.thinkingHints && !Array.isArray(challenge.thinkingHints)) {
      warnings.push(`[#${index + 1}] thinkingHints should be an array`);
    }
  });
  if (warnings.length) {
    console.warn("[schema] challenge validation warnings:\\n" + warnings.join("\\n"));
    return { ok: false, message: "Some challenges have missing fields." };
  }
  return { ok: true, message: "" };
}

function speak(text, role = "system") {
  tts.speak(text, role);
}
function showCompletionScreen() {
  if (elements.completionBadges) {
    elements.completionBadges.innerHTML = "";
    const badges = [];
    badges.push({ en: "Completed", zh: "\u5b8c\u6210\u901a\u95dc" });
    if (totalWrongCount === 0) {
      badges.push({ en: "Perfect Run", zh: "\u96f6\u932f\u901a\u95dc" });
    }
    if (correctCount >= challenges.length) {
      badges.push({ en: "All Answers", zh: "\u5168\u984c\u7b54\u5c0d" });
    }
    if (totalWrongCount > 0) {
      badges.push({ en: "Review Cleared", zh: "\u5fa9\u7fd2\u5b8c\u6210" });
    }
    badges.forEach((badge) => {
      const item = document.createElement("div");
      item.className = "completion-badge";
      item.innerHTML = `<span>${badge.en}</span><span class="zh">${badge.zh}</span>`;
      elements.completionBadges.appendChild(item);
    });
  }
  if (elements.completionScreen) {
    elements.completionScreen.hidden = false;
  }
  setNextEnabled(false);
}

function hideCompletionScreen() {
  if (elements.completionScreen) {
    elements.completionScreen.hidden = true;
  }
}

function showInterlude(bridge) {
  if (!elements.interlude || !bridge) return false;
  elements.interludeEn.textContent = bridge.en || "";
  elements.interludeZh.textContent = bridge.zh || "";
  elements.interlude.hidden = false;
  return true;
}

function hideInterlude() {
  if (elements.interlude) {
    elements.interlude.hidden = true;
  }
}

function computeNextIndex() {
  if (wrongQueue.length) {
    return { index: wrongQueue[0], fromQueue: true };
  }
  return { index: (state.currentIndex + 1) % challenges.length, fromQueue: false };
}

function proceedToNextChallenge() {
  const next = pendingNext || computeNextIndex();
  if (next.fromQueue) {
    wrongQueue.shift();
  }
  state.currentIndex = next.index;
  pendingNext = null;
  hideInterlude();
  renderChallenge();
}

function setNextEnabled(enabled) {
  elements.next.disabled = !enabled;
}

function setAnswerVisible(visible) {
  elements.answerLine.hidden = !visible;
  if (elements.inputBar) {
    elements.inputBar.hidden = !visible;
  }
}

// Typewriter helpers
function resetTypingState() {
  if (typingTimer) {
    clearTimeout(typingTimer);
  }
  isTyping = false;
  typingTimer = null;
  typingTarget = null;
  typingFullText = "";
  typingIndex = 0;
  pendingEnd = false;
}

function getTypingDelay(char) {
  const base = 26;
  if (/[,.!?;:]/.test(char)) return base + 120;
  return base;
}

function finishTyping() {
  if (!isTyping) return;
  if (typingTimer) {
    clearTimeout(typingTimer);
  }
  isTyping = false;
  if (typingTarget) {
    typingTarget.textContent = typingFullText;
    applyKeywordHighlight(typingTarget);
  }
  typingTimer = null;
  typingTarget = null;
  typingFullText = "";
  typingIndex = 0;
  if (pendingEnd) {
    state.canProceed = true;
    setNextEnabled(true);
    pendingEnd = false;
  }
  updateIndicator();
}

function typeNextChar() {
  if (!isTyping || !typingTarget) return;
  if (typingIndex >= typingFullText.length) {
    finishTyping();
    return;
  }
  const char = typingFullText[typingIndex];
  typingTarget.textContent += char;
  typingIndex += 1;
  typingTimer = setTimeout(typeNextChar, getTypingDelay(char));
}

function startTyping(target, fullText) {
  resetTypingState();
  if (!target) return;
  typingTarget = target;
  typingFullText = fullText || "";
  typingIndex = 0;
  typingTarget.textContent = "";
  isTyping = true;
  typeNextChar();
  updateIndicator();
}

// VN advance indicator visibility
function updateIndicator() {
  if (!elements.vnIndicator) return;
  const canAdvance = state.storySteps.length > 0 && state.stepIndex < state.storySteps.length;
  const show = currentDisplayedType === "line" && canAdvance && !isTyping;
  elements.vnIndicator.hidden = !show;
}

// Apply UI text from ui.json
function applyUiText() {
  if (!ui) return;
  if (ui.meta && ui.meta.title) {
    document.title = ui.meta.title;
  }
  if (ui.brand) {
    setText(uiElements.brandTitle, ui.brand.title);
    if (ui.brand.tagline) {
      setText(uiElements.taglineEn, ui.brand.tagline.en);
      setText(uiElements.taglineZh, ui.brand.tagline.zh);
    }
  }
  if (ui.stats) {
    if (ui.stats.chapter) {
      setText(uiElements.statChapterEn, ui.stats.chapter.en);
      setText(uiElements.statChapterZh, ui.stats.chapter.zh);
    }
    if (ui.stats.hp) {
      setText(uiElements.statHpEn, ui.stats.hp.en);
      setText(uiElements.statHpZh, ui.stats.hp.zh);
    }
    if (ui.stats.streak) {
      setText(uiElements.statStreakEn, ui.stats.streak.en);
      setText(uiElements.statStreakZh, ui.stats.streak.zh);
    }
    setText(uiElements.statChapterValue, ui.stats.chapterValue);
    setText(uiElements.statHpValue, ui.stats.hpValue);
    if (ui.stats.streakValue != null) {
      const parsed = Number(ui.stats.streakValue);
      if (!Number.isNaN(parsed)) {
        state.streak = parsed;
      }
      elements.streak.textContent = ui.stats.streakValue;
    } else {
      elements.streak.textContent = String(state.streak);
    }
  }
  if (ui.tabs) {
    if (ui.tabs.morph) {
      setText(uiElements.tabMorphEn, ui.tabs.morph.en);
      setText(uiElements.tabMorphZh, ui.tabs.morph.zh);
    }
    if (ui.tabs.grammar) {
      setText(uiElements.tabGrammarEn, ui.tabs.grammar.en);
      setText(uiElements.tabGrammarZh, ui.tabs.grammar.zh);
    }
  }
  if (ui.panels) {
    if (ui.panels.morph) {
      setText(uiElements.panelMorphEn, ui.panels.morph.en);
      setText(uiElements.panelMorphZh, ui.panels.morph.zh);
    }
    if (ui.panels.grammar) {
      setText(uiElements.panelGrammarEn, ui.panels.grammar.en);
      setText(uiElements.panelGrammarZh, ui.panels.grammar.zh);
    }
  }
  if (ui.buttons) {
    if (ui.buttons.revealHint) {
      setText(uiElements.btnRevealEn, ui.buttons.revealHint.en);
      setText(uiElements.btnRevealZh, ui.buttons.revealHint.zh);
    }
    if (ui.buttons.next) {
      setText(uiElements.btnNextEn, ui.buttons.next.en);
      setText(uiElements.btnNextZh, ui.buttons.next.zh);
    }
    if (ui.buttons.shufflePattern) {
      setText(uiElements.btnShuffleEn, ui.buttons.shufflePattern.en);
      setText(uiElements.btnShuffleZh, ui.buttons.shufflePattern.zh);
    }
    if (ui.buttons.handwriting) {
      setText(uiElements.btnHandwritingEn, ui.buttons.handwriting.en);
      setText(uiElements.btnHandwritingZh, ui.buttons.handwriting.zh);
    }
    if (ui.buttons.submit) {
      setText(uiElements.btnSubmitEn, ui.buttons.submit.en);
      setText(uiElements.btnSubmitZh, ui.buttons.submit.zh);
    }
    if (ui.buttons.erase) {
      setText(uiElements.btnEraseEn, ui.buttons.erase.en);
      setText(uiElements.btnEraseZh, ui.buttons.erase.zh);
    }
  }
  if (ui.answerSpeaker) {
    setText(uiElements.answerSpeakerEn, ui.answerSpeaker.en);
    setText(uiElements.answerSpeakerZh, ui.answerSpeaker.zh);
  }
  if (ui.labels && ui.labels.originTitle) {
    setText(uiElements.originTitleEn, ui.labels.originTitle.en);
    setText(uiElements.originTitleZh, ui.labels.originTitle.zh);
  }
  if (ui.input) {
    if (ui.input.placeholder) {
      elements.answer.placeholder = ui.input.placeholder;
    }
    if (ui.input.statusDefault) {
      setStatus(ui.input.statusDefault.en, ui.input.statusDefault.zh);
    }
  }
}

// Initialize TTS voices
if ("speechSynthesis" in window) {
  tts.loadVoices();
  window.speechSynthesis.onvoiceschanged = () => tts.loadVoices();
}

// Load UI text and chapter data
async function loadUiAndChapters() {
  try {
    const response = await fetch("ui.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    ui = await response.json();
    applyUiText();
    await loadChapters();
  } catch (error) {
    setStatus(
      "Failed to load ui.json. Use a local server to open this page.",
      ""
    );
    setNextEnabled(false);
  }
}

async function loadChapters() {
  try {
    const response = await fetch("chapters.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Empty chapter list");
    }
    chapters = data;
    currentChapter = chapters[0];
    populateChapterSelect();
    renderChapterCards();
    await loadChapter(currentChapter.file);
  } catch (error) {
    const msg = getMessage("loadChallengesFail");
    const en = msg.en || "Failed to load chapters.json. Use a local server.";
    setStatus(en, msg.zh || "");
    setNextEnabled(false);
  }
}

function populateChapterSelect() {
  if (!elements.chapterSelect) return;
  elements.chapterSelect.innerHTML = "";
  chapters.forEach((chapter) => {
    const option = document.createElement("option");
    option.value = chapter.id || chapter.file;
    option.textContent = chapter.title || chapter.id || "Chapter";
    if (currentChapter && (chapter.id === currentChapter.id || chapter.file === currentChapter.file)) {
      option.selected = true;
    }
    elements.chapterSelect.appendChild(option);
  });
}

function renderChapterCards() {
  if (!elements.chapterCards) return;
  elements.chapterCards.innerHTML = "";
  chapters.forEach((chapter) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "chapter-card";
    card.innerHTML = `<div class="title">${chapter.title || "Chapter"}</div>
      <div class="subtitle">${chapter.id || chapter.file}</div>`;
    card.addEventListener("click", () => {
      selectChapter(chapter);
    });
    elements.chapterCards.appendChild(card);
  });
}

async function loadChapter(file) {
  try {
    const response = await fetch(file, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const validation = validateChallengeData(data);
    if (!validation.ok) {
      const warning =
        validation.message ||
        "Some challenges are missing fields. See console for details.";
      if (warning !== lastValidationWarning) {
        setStatus(
          warning,
          "\u90e8\u5206\u984c\u76ee\u8cc7\u6599\u7f3a\u6f0f\uff0c\u8acb\u67e5\u770b\u63a7\u5236\u53f0\u3002"
        );
        lastValidationWarning = warning;
      }
    }
    challenges = data;
    state.currentIndex = 0;
    completedSet = new Set();
    wrongQueue = [];
    totalWrongCount = 0;
    correctCount = 0;
    if (currentChapter && uiElements.statChapterValue) {
      uiElements.statChapterValue.textContent =
        currentChapter.title || uiElements.statChapterValue.textContent;
    }
    if (currentChapter && elements.chapterCurrent) {
      elements.chapterCurrent.textContent = currentChapter.title || "Chapter";
    }
    renderChallenge();
  } catch (error) {
    const msg = getMessage("loadChallengesFail");
    const en = msg.en || "Failed to load chapter file.";
    setStatus(en, msg.zh || "");
    setNextEnabled(false);
  }
}

function openChapterPanel() {
  if (elements.chapterPanel) {
    elements.chapterPanel.hidden = false;
  }
}

function closeChapterPanel() {
  if (elements.chapterPanel) {
    elements.chapterPanel.hidden = true;
  }
}

function selectChapter(next) {
  if (!next) return;
  currentChapter = next;
  if (elements.chapterCurrent) {
    elements.chapterCurrent.textContent = next.title || "Chapter";
  }
  closeChapterPanel();
  loadChapter(next.file);
}
// Build VN steps: dialogue -> cloze -> follow-up
function normalizeDialogueLine(line) {
  if (!line) return null;
  return {
    speaker: line.speaker || "",
    speakerZh: line.speakerZh || "",
    text: line.text || "",
    textZh: line.textZh || "",
    side: line.side || "left"
  };
}

function buildStorySteps(challenge) {
  const steps = [];
  const dialogue = Array.isArray(challenge.dialogue) ? challenge.dialogue : [];
  const followUp = Array.isArray(challenge.followUp) ? challenge.followUp : [];
  dialogue.forEach((line) => {
    const normalized = normalizeDialogueLine(line);
    if (!normalized) return;
    steps.push({
      type: "line",
      data: normalized,
      target: "before",
      isThinking: isThinkingLine(normalized)
    });
  });
  steps.push({ type: "cloze" });
  followUp.forEach((line) => {
    const normalized = normalizeDialogueLine(line);
    if (!normalized) return;
    steps.push({
      type: "line",
      data: normalized,
      target: "after",
      isThinking: isThinkingLine(normalized)
    });
  });
  return steps;
}

// Render current challenge and start VN flow
function renderChallenge() {
  if (!challenges.length) {
    const msg = getMessage("noChallenges");
    setStatus(msg.en || "No challenges loaded.", msg.zh || "");
    return;
  }
  const challenge = challenges[state.currentIndex];
  setSceneBackground(challenge.sceneImage || "");

  const scenePrefixEn = ui?.labels?.scenePrefix?.en || "Situation: ";
  const scenePrefixZh = ui?.labels?.scenePrefix?.zh || "";
  const npcPrefixEn = ui?.labels?.npcPrefix?.en || "NPC: ";
  const npcPrefixZh = ui?.labels?.npcPrefix?.zh || "";

  elements.sceneTitleEn.textContent = `${scenePrefixEn}${challenge.scene || ""}`;
  elements.sceneTitleZh.textContent = `${scenePrefixZh}${challenge.sceneZh || ""}`;
  elements.npcEn.textContent = `${npcPrefixEn}${challenge.npc || ""}`;
  elements.npcZh.textContent = `${npcPrefixZh}${challenge.npcZh || ""}`;
  elements.contextEn.textContent = challenge.context || "";
  elements.contextZh.textContent = challenge.contextZh || "";
  elements.pos.textContent = `${challenge.pos || ""} / ${challenge.posZh || ""}`;

  elements.sentenceEn.innerHTML = (challenge.sentence || "").replace(
    "____",
    '<span class="blank" id="blank-slot">____</span>'
  );
  elements.sentenceZh.textContent = challenge.sentenceZh || "";
  elements.blank = document.getElementById("blank-slot");
  elements.answer.value = "";

  state.wrongCount = 0;
  state.canProceed = false;
  setNextEnabled(false);
  hideCompletionScreen();
  hideInterlude();

  elements.originBox.hidden = true;
  elements.originTextEn.textContent = "";
  elements.originTextZh.textContent = "";
  if (elements.familyBox) {
    elements.familyBox.hidden = true;
    elements.familyTextEn.textContent = "";
    elements.familyTextZh.textContent = "";
  }

  elements.dialogueBefore.innerHTML = "";
  elements.dialogueAfter.innerHTML = "";
  keepInputBarVisible = false;
  setAnswerVisible(false);
  resetTypingState();
  currentDisplayedType = null;
  updateIndicator();

  currentKeywords = buildKeywordList(challenge);

  thinkingHints = buildThinkingHints(challenge);
  thinkingHintIndex = thinkingHints.length ? 0 : -1;
  currentThinkingLine = null;
  state.storySteps = buildStorySteps(challenge);
  state.stepIndex = 0;

  if (ui && ui.input && ui.input.statusDefault) {
    setStatus(ui.input.statusDefault.en, ui.input.statusDefault.zh);
  }
  const hintLadder = buildHintLadder(challenge);
  renderHints(challenge, hintLadder);
  renderGrammar(challenge);

  advanceStep();
}

// Render a single dialogue line (EN typed, ZH static)
function appendDialogueLine(target, line) {
  const item = document.createElement("div");
  const sideClass = line.side === "right" ? "right" : "left";
  item.className = `dialogue-line ${sideClass}`;
  const speakerEl = document.createElement("div");
  speakerEl.className = "speaker";
  speakerEl.textContent = line.speaker || "";

  const textEl = document.createElement("div");
  textEl.textContent = line.text || "";
  textEl.dataset.raw = line.text || "";
  textEl.dataset.keywords = JSON.stringify(currentKeywords || []);

  const zhEl = document.createElement("div");
  zhEl.className = "zh";
  const zhSpeaker = line.speakerZh || "";
  const zhText = line.textZh || "";
  if (zhSpeaker) {
    zhEl.textContent = `${zhSpeaker}\uff1a${zhText}`;
  } else {
    zhEl.textContent = zhText;
  }

  item.appendChild(speakerEl);
  item.appendChild(textEl);
  item.appendChild(zhEl);
  target.appendChild(item);
  return { textEl, zhEl };
}

// Advance VN steps (line/cloze/follow-up)
function advanceStep(fromUser = false) {
  if (!state.storySteps.length || state.stepIndex >= state.storySteps.length) {
    if (!state.canProceed) {
      state.canProceed = true;
      setNextEnabled(true);
    }
    updateIndicator();
    return;
  }

  const step = state.storySteps[state.stepIndex];

  if (step.type === "line") {
    setAnswerVisible(keepInputBarVisible);
    const target = step.target === "after" ? elements.dialogueAfter : elements.dialogueBefore;
    const lineData = getRenderedLineData(step);
    const { textEl, zhEl } = appendDialogueLine(target, lineData);
    if (step.isThinking) {
      currentThinkingLine = { textEl, zhEl };
      updateThinkingBubble();
    }
    state.stepIndex += 1;
    currentDisplayedType = "line";
    if (state.stepIndex >= state.storySteps.length) {
      pendingEnd = true;
    }
    const spokenText = (lineData?.text || "").trim() || (lineData?.textZh || "").trim();
    const role = step.data?.side === "right" ? "user" : "system";
    speak(spokenText, role);
    startTyping(textEl, lineData?.text || "");
    return;
  }

  if (step.type === "cloze") {
    tts.cancel();
    setAnswerVisible(true);
    elements.answer.focus();
    currentDisplayedType = "cloze";
    updateIndicator();
    if (fromUser) {
      const msg = getMessage("solveFirst");
      if (msg.en || msg.zh) {
        setStatus(msg.en, msg.zh);
      }
    }
    return;
  }
}

// Finish cloze step and continue story
function completeClozeAndContinue() {
  if (!state.storySteps.length || state.stepIndex >= state.storySteps.length) return;
  const step = state.storySteps[state.stepIndex];
  if (!step || step.type !== "cloze") return;
  state.stepIndex += 1;
  keepInputBarVisible = true;
  // Keep input bar visible after correct answer, but hide the cloze line.
  elements.answerLine.hidden = true;
  if (elements.inputBar) {
    elements.inputBar.hidden = false;
  }
  elements.answer.value = "";
  currentDisplayedType = "line";
  if (state.stepIndex >= state.storySteps.length) {
    state.canProceed = true;
    setNextEnabled(true);
    updateIndicator();
    return;
  }
  advanceStep(false);
}

// Side-panel hints (morphology)
function renderHints(challenge, hintList = null) {
  elements.morphList.innerHTML = "";
  const hints = hintList || challenge.hints || [];
  hints.forEach((hint) => {
    const item = document.createElement("li");
    item.className = "hint-item" + (hint.hidden ? " is-hidden" : "");
    item.dataset.label = hint.label;
    item.dataset.labelZh = hint.labelZh || "";
    item.dataset.value = hint.value;
    item.dataset.valueZh = hint.valueZh || "";
    if (hint.tier != null) {
      item.dataset.tier = String(hint.tier);
    }
    const labelZh = hint.labelZh ? `<span class="zh">${hint.labelZh}</span>` : "";
    const valueZh = hint.valueZh ? `<span class="value zh">${hint.valueZh}</span>` : "";
    item.innerHTML = `<strong>${hint.label}${labelZh}</strong>
      <span class="value">${hint.value}</span>
      ${valueZh}`;
    elements.morphList.appendChild(item);
  });
}

// Side-panel grammar hints
function renderGrammar(challenge, grammarList = null) {
  elements.grammarList.innerHTML = "";
  const items = grammarList || challenge.grammar || [];
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "hint-item";
    const labelZh = item.labelZh ? `<span class="zh">${item.labelZh}</span>` : "";
    const valueZh = item.valueZh ? `<span class="value zh">${item.valueZh}</span>` : "";
    li.innerHTML = `<strong>${item.label}${labelZh}</strong>
      <span class="value">${item.value}</span>
      ${valueZh}`;
    elements.grammarList.appendChild(li);
  });
}

function revealNextHiddenHint() {
  const hiddenItem = elements.morphList.querySelector(".is-hidden");
  if (!hiddenItem) return null;
  hiddenItem.classList.remove("is-hidden");
  hiddenItem.classList.add("is-revealed");
  setTimeout(() => hiddenItem.classList.remove("is-revealed"), 600);
  return {
    label: hiddenItem.dataset.label || "",
    labelZh: hiddenItem.dataset.labelZh || "",
    value: hiddenItem.dataset.value || "",
    valueZh: hiddenItem.dataset.valueZh || "",
    tier: hiddenItem.dataset.tier || "?"
  };
}

function revealHint() {
  const revealed = revealNextHiddenHint();
  const revealedThinking = revealNextThinkingHint();
  if (!revealed) {
    if (!revealedThinking) {
      const msg = getMessage("allHintsRevealed");
      setStatus(msg.en, msg.zh);
    } else {
      setStatus("Thinking hint updated.", "\u5fc3\u88e1\u63d0\u793a\u5df2\u66f4\u65b0\u3002");
    }
    return;
  }
  const msg = getMessage("hintRevealed");
  const en = `Hint L${revealed.tier}: ${revealed.label} \u2014 ${revealed.value}`;
  const zhLabel = revealed.labelZh ? revealed.labelZh : revealed.label;
  const zhValue = revealed.valueZh ? revealed.valueZh : revealed.value;
  const zh = `\u63d0\u793a L${revealed.tier}\uff1a${zhLabel} \u2014 ${zhValue}`;
  setStatus(en, zh);
}

function handleWrongAnswer(challenge) {
  state.wrongCount += 1;
  totalWrongCount += 1;
  if (!wrongQueue.includes(state.currentIndex)) {
    wrongQueue.push(state.currentIndex);
  }
  if (elements.answerLine) {
    elements.answerLine.classList.add("error-shake", "error-flash");
    setTimeout(() => {
      elements.answerLine.classList.remove("error-shake", "error-flash");
    }, 700);
  }
  const revealed = revealNextHiddenHint();
  revealNextThinkingHint();
  if (revealed) {
    const en = `Hint L${revealed.tier}: ${revealed.label} \u2014 ${revealed.value}`;
    const zhLabel = revealed.labelZh ? revealed.labelZh : revealed.label;
    const zhValue = revealed.valueZh ? revealed.valueZh : revealed.value;
    const zh = `\u63d0\u793a L${revealed.tier}\uff1a${zhLabel} \u2014 ${zhValue}`;
    setStatus(en, zh);
    return;
  }
  const templates = [
    {
      en: "Not quite. Check the part of speech: {pos}.",
      zh: "\u9084\u5dee\u4e00\u9ede\uff0c\u6ce8\u610f\u8a5e\u6027\uff1a{posZh}\u3002"
    },
    {
      en: "Not quite. Think about the context: {context}.",
      zh: "\u9084\u5dee\u4e00\u9ede\uff0c\u56de\u5230\u60c5\u5883\uff1a{contextZh}\u3002"
    },
    {
      en: "Not quite. Use morphology: prefix / root / suffix.",
      zh: "\u9084\u5dee\u4e00\u9ede\uff0c\u770b\u770b\u5b57\u9996\uff0f\u5b57\u6839\uff0f\u5b57\u5c3e\u3002"
    },
    {
      en: "Not quite. Try a word family of the target.",
      zh: "\u9084\u5dee\u4e00\u9ede\uff0c\u60f3\u60f3\u540c\u5b57\u65cf\u3002"
    }
  ];
  const template = templates[(state.wrongCount - 1) % templates.length];
  const en = formatTemplate(template.en, {
    pos: challenge.pos || "",
    context: challenge.context || ""
  });
  const zh = formatTemplate(template.zh, {
    posZh: challenge.posZh || "",
    contextZh: challenge.contextZh || ""
  });
  setStatus(en, zh);
}

// Validate answer and resume follow-up
function checkAnswer() {
  if (!challenges.length) return;
  const challenge = challenges[state.currentIndex];

  if (!state.storySteps.length || state.stepIndex >= state.storySteps.length) {
    const msg = getMessage("pressNext");
    setStatus(msg.en, msg.zh);
    return;
  }

  const currentStep = state.storySteps[state.stepIndex];
  if (!currentStep || currentStep.type !== "cloze") {
    const msg = getMessage("pressNext");
    setStatus(msg.en, msg.zh);
    return;
  }

  const value = elements.answer.value.trim().toLowerCase();
  if (!value) {
    const msg = getMessage("typeMissing");
    setStatus(msg.en, msg.zh);
    return;
  }

  if (value === challenge.answer.toLowerCase()) {
    elements.blank.textContent = value;
    elements.blank.classList.add("is-filled");
    if (challenge.answerZh) {
      elements.sentenceZh.textContent = challenge.sentenceZh.replace("____", challenge.answerZh);
    }
    if (challenge.origin || challenge.originZh) {
      elements.originBox.hidden = false;
      elements.originTextEn.textContent = challenge.origin || "";
      elements.originTextZh.textContent = challenge.originZh || "";
    }
    const wordFamily = (challenge.hints || []).find((hint) => hint.label === "word family");
    if (wordFamily && elements.familyBox) {
      elements.familyBox.hidden = false;
      elements.familyTextEn.textContent = wordFamily.value || "";
      elements.familyTextZh.textContent = wordFamily.valueZh || "";
    }
    const msg = getMessage("correctPressNext");
    setStatus(msg.en, msg.zh);
    speak(value, "system");
    completedSet.add(state.currentIndex);
    wrongQueue = wrongQueue.filter((index) => index !== state.currentIndex);
    correctCount += 1;
    state.streak += 1;
    elements.streak.textContent = state.streak;
    elements.answerLine.classList.add("success-flash");
    setTimeout(() => elements.answerLine.classList.remove("success-flash"), 700);
    completeClozeAndContinue();
  } else {
    handleWrongAnswer(challenge);
  }
}
function nextChallenge() {
  if (!challenges.length) return;
  if (!state.canProceed) {
    const msg = getMessage("solveFirst");
    setStatus(msg.en, msg.zh);
    return;
  }
  if (!wrongQueue.length && completedSet.size >= challenges.length) {
    showCompletionScreen();
    return;
  }
  const bridge = challenges[state.currentIndex]?.bridge;
  if (bridge && !pendingNext) {
    pendingNext = computeNextIndex();
    if (showInterlude(bridge)) {
      return;
    }
  }
  proceedToNextChallenge();
}

function shufflePattern() {
  if (!challenges.length) return;
  const challenge = challenges[state.currentIndex];
  const list = (challenge.grammar || []).slice();
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  renderGrammar(challenge, list);
}

function shouldIgnoreAdvance(target) {
  if (!target) return false;
  if (target.closest("#answer-input")) return true;
  if (target.isContentEditable) return true;
  return false;
}

// Unified advance handler for click/space
function handleAdvanceInput() {
  if (isTyping) {
    finishTyping();
    return;
  }
  if (state.canProceed) return;
  advanceStep(true);
}

// Input + VN interaction events
if (elements.submit) {
  elements.submit.addEventListener("click", checkAnswer);
}
if (elements.answer) {
  elements.answer.addEventListener("keydown", (event) => {
    if (event.key === "Enter") checkAnswer();
  });
}
if (elements.erase) {
  elements.erase.addEventListener("click", () => {
    elements.answer.value = "";
    const msg = getMessage("cleared");
    setStatus(msg.en, msg.zh);
  });
}
if (elements.revealHint) {
  elements.revealHint.addEventListener("click", revealHint);
}
if (elements.next) {
  elements.next.addEventListener("click", nextChallenge);
}
if (elements.refresh) {
  elements.refresh.addEventListener("click", shufflePattern);
}
if (elements.handwriting) {
  elements.handwriting.addEventListener("click", () => {
    elements.answer.classList.toggle("handwriting");
  });
}
if (elements.restart) {
  elements.restart.addEventListener("click", () => {
    completedSet = new Set();
    wrongQueue = [];
    state.currentIndex = 0;
    totalWrongCount = 0;
    correctCount = 0;
    renderChallenge();
  });
}
if (elements.ttsToggle) {
  elements.ttsToggle.addEventListener("change", () => {
    ttsEnabled = elements.ttsToggle.checked;
    if (!ttsEnabled) {
      tts.cancel();
    }
  });
}
if (elements.chapterSelect) {
  elements.chapterSelect.addEventListener("change", () => {
    const selected = elements.chapterSelect.value;
    const next = chapters.find((chapter) => chapter.id === selected || chapter.file === selected);
    if (next) selectChapter(next);
  });
}
if (elements.chapterButton && elements.chapterPanel) {
  elements.chapterButton.addEventListener("click", () => {
    openChapterPanel();
  });
}
if (elements.chapterPanel) {
  elements.chapterPanel.addEventListener("click", (event) => {
    if (event.target === elements.chapterPanel) closeChapterPanel();
  });
}

if (elements.sceneVisual) {
  elements.sceneVisual.addEventListener("click", () => {
    if (elements.interlude && !elements.interlude.hidden) {
      proceedToNextChallenge();
      return;
    }
    handleAdvanceInput();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  if (shouldIgnoreAdvance(event.target)) return;
  if (elements.interlude && !elements.interlude.hidden) {
    event.preventDefault();
    proceedToNextChallenge();
    return;
  }
  event.preventDefault();
  handleAdvanceInput();
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.target;
    document.querySelectorAll(".panel[data-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.id === target);
    });
  });
});

loadUiAndChapters();
