import { Chess, INITIAL_FEN, type Color } from "../core/chess/Chess.js";
import { OfflineEngineAdapter } from "../core/engine/adapter.js";
import {
  cpToWinProbability,
  moveAccuracy,
  classify,
  perspectiveCp,
  whiteScore,
  type Grade,
  type Score,
} from "../core/eval/math.js";
import {
  knightNeighbors,
  shortestKnightPath,
  squareIsLight,
  validateKnightPath,
} from "../core/eval/knight.js";
import {
  LocalDatabase,
  freshState,
  validateSave,
  type SaveState,
  type Blunder,
  type LearningArea,
  type Theme,
} from "../core/storage/db.js";
import { PRACTICE_RECOVERY_KEY, parsePracticeRecovery } from "../core/storage/recovery.js";
import { freshSrs, due, review } from "../core/srs/scheduler.js";
import { buildLearningProfile, type Recommendation } from "../core/learning/engine.js";
import { explainMove } from "../core/learning/explanations.js";
import {
  openings,
  masters,
  calculations,
  calculationStart,
  endgames,
  validateContent,
  starterBlunders,
} from "../data/content.js";
import { BoardView, type BlindTier } from "./board.js";
const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ]!,
  );
const $ = (id: string) => document.getElementById(id) as HTMLElement | null;
function btn(id: string, label: string, variant = "", disabled = false) {
  return `<button id="${id}" type="button" class="btn ${variant}" ${disabled ? "disabled" : ""}>${label}</button>`;
}
function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function parseTime(value: string) {
  if (value === "zen") return null;
  const [minutes, inc] = value.split("+").map(Number);
  return { remaining: [minutes * 60, minutes * 60], inc };
}
const nav = [
  ["path", "Learning Path", "✦"],
  ["play", "Play", "♞"],
  ["openings", "Opening Dojo", "◇"],
  ["visualize", "Visualization", "◎"],
  ["endgames", "Endgames", "♙"],
  ["blunders", "Blunder Bank", "↺"],
  ["masters", "Master Games", "♛"],
  ["settings", "Data & Privacy", "⚙"],
] as const;
const themeColors: Record<Theme, string> = {
  indigo: "#0c0d2b",
  paper: "#f1f0ed",
  forest: "#101b18",
  ember: "#f6ead9",
};

type ReviewEntry = {
  ply: number;
  fenBefore: string;
  played: string;
  best: string | null;
  loss: number;
  grade: Grade;
  whiteCp: number;
};
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
function scoreForSide(score: Score, side: Color) {
  return perspectiveCp(whiteScore(score), side);
}
function scoreText(score: Score, side: Color) {
  const own = score.perspective === side ? score : score.kind === "cp"
    ? { ...score, value: -score.value }
    : { ...score, moves: -score.moves };
  if (own.kind === "mate")
    return own.moves > 0 ? `mate in ${own.moves}` : own.moves < 0 ? `mate against in ${Math.abs(own.moves)}` : "checkmate";
  return `${own.value >= 0 ? "+" : ""}${(own.value / 100).toFixed(2)} pawns`;
}

export class App {
  private db = new LocalDatabase();
  private state: SaveState = freshState();
  private engine = new OfflineEngineAdapter();
  private view = "play";
  private game = new Chess();
  private board: BoardView | null = null;
  private player: Color = "w";
  private orientation: Color = "w";
  private playMode: "play" | "endgame" = "play";
  private playSnapshot: {
    game: Chess;
    player: Color;
    gameResult: string | null;
    gameSaved: boolean;
    selectedTime: string;
    clocks: number[];
    increment: number;
    coach: boolean;
    status: string;
  } | null = null;
  private boardBlind: BlindTier = "standard";
  private peekUntil = 0;
  private coach = true;
  private depth = 3;
  private reviews: ReviewEntry[] = [];
  private installPrompt: InstallPromptEvent | null = null;
  private offlineReady = false;
  private online = navigator.onLine;
  private lastArrow: { uci: string; color: "green" | "red" } | null = null;
  private coachMessage = "";
  private coachLesson = "";
  private status = "Ready for a new game";
  private gameResult: string | null = null;
  private selectedTime = "zen";
  private clocks: number[] = [600, 600];
  private increment = 0;
  private clockHandle: ReturnType<typeof setInterval> | null = null;
  private gameSaved = false;
  private thinking = false;
  private revision = 0;
  private openingId = openings[0].id;
  private openingMode: "walk" | "drill" = "walk";
  private openingIndex = 0;
  private openingCorrect = 0;
  private openingErrors = 0;
  private openingRecorded = false;
  private openingFeedback = "";
  private openingLastSan = "";
  private gym: "coordinates" | "color" | "knight" | "calculation" =
    "coordinates";
  private sprintRemaining = 60;
  private sprintCount = 0;
  private sprintCorrect = 0;
  private sprintTarget = "e4";
  private sprintOrientation: Color = "w";
  private sprintStarted = false;
  private targetStarted = 0;
  private elapsedTargetMs = 0;
  private gymInterval: ReturnType<typeof setInterval> | null = null;
  private colorTarget = "a1";
  private colorResult = "";
  private knightFrom = "b1";
  private knightTo = "f6";
  private knightResult = "";
  private knightPath: string[] = [];
  private calculationId = calculations[0].id;
  private calculationFeedback = "";
  private calculationRevealed = false;
  private endgameId = endgames[0].id;
  private blunderId = "example-0";
  private blunderFeedback = "";
  private blunderShowLesson = false;
  private masterId = masters[0].id;
  private masterIndex = 0;
  private masterMode: "study" | "guess" = "study";
  private masterFeedback = "";
  private announcements = "";
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(private root: HTMLElement) {}
  async init() {
    validateContent();
    await this.db.open();
    this.state = await this.db.read();
    if (!this.state.seededStarter) {
      this.state.blunders = starterBlunders();
      this.state.seededStarter = true;
      await this.db.write(this.state);
    }
    const recovered = this.restorePracticeRecovery();
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      this.installPrompt = event as InstallPromptEvent;
      if (this.view === "settings") this.render();
    });
    window.addEventListener("appinstalled", () => {
      this.installPrompt = null;
      this.announce("Stillpoint installed");
      if (this.view === "settings") this.render();
    });
    const updateNetwork = () => {
      this.online = navigator.onLine;
      if (this.view === "settings") this.render();
    };
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.ready.then(() => {
        this.offlineReady = true;
        if (this.view === "settings") this.render();
      }).catch(() => { this.offlineReady = false; });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.savePracticeRecovery();
        this.stopClock();
        this.stopGymInterval();
        this.engine.cancel();
        this.thinking = false;
        this.revision++;
        this.save().catch(console.error);
      } else {
        if (this.view === "visualize" && this.sprintStarted)
          this.beginGymTick();
        if (
          this.view === "play" &&
          this.selectedTime !== "zen" &&
          !this.gameResult
        )
          this.startClock();
        if (
          (this.view === "play" || this.view === "endgames") &&
          this.game.turn !== this.player &&
          !this.gameResult
        )
          this.engineMove();
      }
    });
    window.addEventListener("pagehide", () => {
      this.savePracticeRecovery();
      this.stopClock();
      this.stopGymInterval();
      this.engine.destroy();
      this.db.close();
    });
    this.render();
    if (recovered) {
      if (this.selectedTime !== "zen" && !this.gameResult) this.startClock();
      if (this.game.turn !== this.player && !this.gameResult) this.engineMove();
    }
  }
  private announce(text: string) {
    this.announcements = text;
    const live = $("live");
    if (live) live.textContent = text;
  }
  private async save() {
    await this.db.write(this.state);
  }
  private saveSoon() {
    this.save().catch((e) => this.announce("Storage error: " + e.message));
  }
  private recordLearning(area: LearningArea, correct: boolean, key: string) {
    this.state.learning.unshift({
      id: crypto.randomUUID(),
      area,
      correct,
      key,
      timestamp: Date.now(),
    });
    this.state.learning = this.state.learning.slice(0, 2000);
    this.saveSoon();
  }
  private savePracticeRecovery() {
    if (this.playMode !== "play" || this.view !== "play") return;
    try {
      localStorage.setItem(PRACTICE_RECOVERY_KEY, JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        pgn: this.game.pgn(this.gameResult || undefined),
        fen: this.game.fen(),
        player: this.player,
        orientation: this.orientation,
        gameResult: this.gameResult,
        gameSaved: this.gameSaved,
        selectedTime: this.selectedTime,
        clocks: this.clocks,
        increment: this.increment,
        coach: this.coach,
        status: this.status,
        depth: this.depth,
      }));
    } catch {
      // Recovery is an enhancement; blocked or full storage must not interrupt chess.
    }
  }
  private restorePracticeRecovery() {
    try {
      const raw = localStorage.getItem(PRACTICE_RECOVERY_KEY);
      const saved = parsePracticeRecovery(raw);
      if (!saved) {
        if (raw) localStorage.removeItem(PRACTICE_RECOVERY_KEY);
        return false;
      }
      this.playMode = "play";
      this.playSnapshot = null;
      this.game = new Chess().loadPgn(saved.pgn);
      this.player = saved.player;
      this.orientation = saved.orientation;
      this.gameResult = saved.gameResult;
      this.gameSaved = saved.gameSaved;
      this.selectedTime = saved.selectedTime;
      this.clocks = [...saved.clocks];
      this.increment = saved.increment;
      this.coach = saved.coach;
      this.depth = saved.depth;
      const previousStatus = saved.status.replace(/^(?:Recovered recent practice · )+/, "");
      this.status = `Recovered recent practice · ${previousStatus}`;
      this.announcements = "Recent practice game restored";
      return true;
    } catch {
      return false;
    }
  }
  private bind(id: string, fun: () => void) {
    const el = $(id);
    if (el) el.addEventListener("click", fun);
  }
  private onChange(id: string, fun: (value: string) => void) {
    const el = $(id) as HTMLSelectElement | HTMLInputElement | null;
    if (el) el.addEventListener("change", () => fun(el.value));
  }
  private switchView(view: string) {
    if (view === this.view) return;
    if (this.view === "play" && view !== "play") {
      this.playSnapshot = {
        game: this.game,
        player: this.player,
        gameResult: this.gameResult,
        gameSaved: this.gameSaved,
        selectedTime: this.selectedTime,
        clocks: [...this.clocks],
        increment: this.increment,
        coach: this.coach,
        status: this.status,
      };
      this.savePracticeRecovery();
    }
    this.revision++;
    this.engine.cancel();
    this.thinking = false;
    this.stopClock();
    this.stopGymInterval();
    if (view === "play" && this.playSnapshot) {
      const p = this.playSnapshot;
      this.game = p.game;
      this.player = p.player;
      this.gameResult = p.gameResult;
      this.gameSaved = p.gameSaved;
      this.selectedTime = p.selectedTime;
      this.clocks = p.clocks;
      this.increment = p.increment;
      this.coach = p.coach;
      this.status = p.status;
      this.playSnapshot = null;
      this.playMode = "play";
    }
    this.view = view;
    this.render();
    $("main-content")?.classList.add("view-enter");
    const navigation = document.querySelector<HTMLElement>(".navigation nav");
    const activeTab = navigation?.querySelector<HTMLElement>(".nav-link.active");
    if (navigation && activeTab && navigation.scrollWidth > navigation.clientWidth) {
      navigation.scrollTo({
        left: activeTab.offsetLeft - (navigation.clientWidth - activeTab.offsetWidth) / 2,
        behavior: this.state.settings.reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
    if (view === "play") {
      if (this.selectedTime !== "zen" && !this.gameResult) this.startClock();
      if (this.game.turn !== this.player && !this.gameResult) this.engineMove();
    }
    if (
      view === "endgames" &&
      this.playMode === "endgame" &&
      this.game.turn !== this.player &&
      !this.gameResult
    )
      this.engineMove();
  }
  private layout(
    title: string,
    eyebrow: string,
    sub: string,
    boardMarkup: string,
    side: string,
    foot = "",
  ) {
    return `<div class="workspace-heading"><div><span class="overline">${eyebrow}</span><h1>${title}</h1><p>${sub}</p></div><span class="current-mode">LOCAL FIRST <span class="status-dot"></span></span></div>
   <div class="workspace-grid"><section class="board-column">${boardMarkup}<div class="board-footer">${foot}</div></section><section class="side-column">${side}</section></div>`;
  }
  private boardShell(top: string = "", bottom: string = "") {
    return `<div class="board-topline">${top}</div><div id="board-mount" class="board-mount" aria-label="Interactive chessboard"></div>${bottom}`;
  }
  private panel(title: string, inner: string, overline = "SESSION") {
    return `<div class="panel"><span class="overline">${overline}</span><h2>${title}</h2>${inner}</div>`;
  }
  private moveLesson(before: string, move: string, purpose = "") {
    if (!this.state.settings.guidance) return "";
    try {
      const zh = this.state.settings.language === "zh";
      const lesson = explainMove(before, move, this.state.settings.language);
      return `<section class="move-lesson" aria-label="${zh ? "着法讲解" : "Move explanation"}"><span class="overline">${zh ? "读懂这一步" : "READ THIS MOVE"}</span><p class="move-reading">${esc(lesson.reading)}</p>${purpose ? `<p class="move-purpose"><b>${zh ? "为什么这步出现在这里：" : "Why this move appears here:"}</b> ${esc(purpose)}</p>` : ""}<ul>${lesson.reasons.map((reason) => `<li>${esc(reason)}</li>`).join("")}</ul></section>`;
    } catch {
      return "";
    }
  }
  private latestMoveLesson() {
    if (!this.state.settings.guidance) return "";
    const zh = this.state.settings.language === "zh";
    const last = this.game.history.at(-1);
    const lastPlayer = [...this.game.history].reverse().find((move) => move.before.split(" ")[1] === this.player);
    const playerLesson = lastPlayer
      ? `<h3>${zh ? "你的上一手" : "Your last move"}</h3>${this.moveLesson(lastPlayer.before, lastPlayer.uci)}`
      : "";
    const opponentLesson = last && last !== lastPlayer
      ? `<h3>${zh ? "对手的上一手" : "Opponent’s last move"}</h3>${this.moveLesson(last.before, last.uci)}`
      : "";
    return playerLesson + opponentLesson;
  }
  private beginnerGuide() {
    if (!this.state.settings.guidance || this.game.history.length || this.player !== "w") return "";
    const zh = this.state.settings.language === "zh";
    const language = `<div class="field-row guide-language"><label for="guide-language">Language / 教学语言</label><select id="guide-language"><option value="en" ${zh ? "" : "selected"}>English</option><option value="zh" ${zh ? "selected" : ""}>简体中文</option></select></div>`;
    if (zh) return `<section class="beginner-guide" aria-labelledby="beginner-guide-title"><div class="guide-topline"><span class="overline">从这里开始 · 无需基础</span><button type="button" class="guide-close" data-guidance-off aria-label="隐藏新手引导">×</button></div>${language}<h2 id="beginner-guide-title">走出第一步，就已经开始了</h2><p><b>目标是将杀：</b>攻击对方的王，让它没有任何合法方式解除将军。棋子规则中并不会真的吃掉王。</p><ol class="beginner-steps"><li><b>白方先行。</b>这一局你执白。</li><li><b>点选一个白棋。</b>小圆点表示合法落点；圆环表示可以吃子。</li><li><b>试试 e2 → e4。</b>这个兵占据中心格，也为象打开斜线。你也可以直接输入 <b>e4</b>。</li></ol><div class="button-row">${btn("beginner-e4", "试试 1. e4", "primary")}<button type="button" class="btn" data-guidance-off>隐藏引导</button></div><p class="helper">引导完全可选。随时可以在“数据与隐私”中重新开启。</p></section>`;
    return `<section class="beginner-guide" aria-labelledby="beginner-guide-title"><div class="guide-topline"><span class="overline">START HERE · NO EXPERIENCE NEEDED</span><button type="button" class="guide-close" data-guidance-off aria-label="Hide beginner guidance">×</button></div>${language}<h2 id="beginner-guide-title">Your first move is enough</h2><p><b>The goal is checkmate:</b> attack the opposing king so it has no legal escape. You never actually capture the king.</p><ol class="beginner-steps"><li><b>White moves first.</b> You are White in this game.</li><li><b>Tap a white piece.</b> Small dots show where it can legally move; rings show captures.</li><li><b>Try e2 → e4.</b> This pawn takes a central square and opens a diagonal for your bishop. You can also type <b>e4</b>.</li></ol><div class="button-row">${btn("beginner-e4", "Try 1. e4", "primary")}<button type="button" class="btn" data-guidance-off>Hide guidance</button></div><p class="helper">Guidance is optional. Turn it back on any time in Data & Privacy.</p></section>`;
  }
  private openingLesson(index: number, san = this.currentOpening().moves[index]) {
    const line = this.currentOpening();
    if (index < 0 || index >= line.moves.length) return "";
    const game = new Chess();
    for (let i = 0; i < index; i++) game.move(line.moves[i]);
    const purpose = san === line.moves[index]
      ? line.explanations[index]
      : `${line.idea} This accepted alternative uses the same opening’s broader plan.`;
    return this.moveLesson(game.fen(), san, purpose);
  }
  private blunderLesson(blunder: Blunder) {
    const zh = this.state.settings.language === "zh";
    if (zh && blunder.starter) {
      const lessons: Record<string, string> = {
        "example-0": "后沿斜线到 h4 将军，直指 e1 的王。白方过早推进 f 兵和 g 兵，暴露了王；此时没有任何合法着法能解除将军。",
        "example-1": "后吃掉 f7 兵并将军，c4 象同时保护后。黑王无法解除这次攻击。要点是识别棋子协同，而不是以为早出后永远都好。",
        "example-2": "车到 e8 将军。黑王被自己的 f7、g7、h7 兵困住，无法逃出底线。",
      };
      if (lessons[blunder.id]) return lessons[blunder.id];
    }
    if (!zh && blunder.lesson) return blunder.lesson;
    try {
      return explainMove(blunder.fen, blunder.best, this.state.settings.language).reasons.join(" ");
    } catch {
      return zh
        ? "寻找让这步棋有效的具体将军、吃子或威胁。"
        : "Look for the concrete check, capture, or threat that makes this continuation effective.";
    }
  }
  private applyTheme() {
    const settings = this.state.settings;
    document.body.dataset.theme = settings.theme;
    document.body.dataset.textSize = settings.largeText ? "large" : "standard";
    document.body.dataset.motion = settings.reduceMotion ? "reduce" : "system";
    document.documentElement.lang = settings.language === "zh" ? "zh-CN" : "en";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColors[settings.theme]);
  }
  private render() {
    this.applyTheme();
    const active = nav.find((n) => n[0] === this.view);
    this.root.innerHTML = `<div class="app-shell"><aside class="navigation"><div class="brand"><div class="brand-symbol">♔</div><div><div class="brand-title">STILLPOINT</div><div class="brand-subtitle">A CHESS PRACTICE</div></div></div><div class="nav-caption">YOUR PRACTICE</div><nav aria-label="Main navigation">${nav.map(([id, label, glyph]) => `<button class="nav-link ${id === this.view ? "active" : ""}" data-view="${id}" type="button" ${id === this.view ? 'aria-current="page"' : ""}><span class="nav-glyph" aria-hidden="true">${glyph}</span>${label}</button>`).join("")}</nav><div class="nav-bottom"><div class="practice-line">道 · 愛 · 不二</div><small>Truth on the board.<br>Progress stays on this device.</small></div></aside><main id="main-content" class="main-content" tabindex="-1">${this.renderMain()}</main><div id="live" class="sr-only" aria-live="polite" aria-atomic="true">${esc(this.announcements)}</div></div>`;
    document
      .querySelectorAll<HTMLButtonElement>("[data-view]")
      .forEach((b) =>
        b.addEventListener("click", () => this.switchView(b.dataset.view!)),
      );
    document.querySelectorAll<HTMLButtonElement>("[data-guidance-off]").forEach((button) => {
      button.addEventListener("click", () => {
        this.state.settings.guidance = false;
        this.saveSoon();
        this.announce("Beginner guidance hidden. Re-enable it in Data & Privacy.");
        this.render();
      });
    });
    switch (this.view) {
      case "path":
        this.wirePath();
        break;
      case "play":
        this.wirePlay();
        break;
      case "openings":
        this.wireOpenings();
        break;
      case "visualize":
        this.wireVisualize();
        break;
      case "endgames":
        this.wireEndgames();
        break;
      case "blunders":
        this.wireBlunders();
        break;
      case "masters":
        this.wireMasters();
        break;
      case "settings":
        this.wireSettings();
        break;
    }
  }
  private renderMain() {
    switch (this.view) {
      case "path":
        return this.pathHtml();
      case "play":
        return this.playHtml();
      case "openings":
        return this.openingsHtml();
      case "visualize":
        return this.visualHtml();
      case "endgames":
        return this.endgamesHtml();
      case "blunders":
        return this.blundersHtml();
      case "masters":
        return this.mastersHtml();
      case "settings":
        return this.settingsHtml();
      default:
        return "";
    }
  }
  private boardRender(
    game: Chess,
    interactive = true,
    options: Record<string, unknown> = {},
  ) {
    const el = $("board-mount");
    if (!el) return;
    this.board = new BoardView(el);
    this.board.render(game, {
      orientation: this.view === "play" ? this.orientation : this.player,
      interactive,
      coords: this.state.settings.coords,
      blind: this.boardBlind,
      lastMove: game.history.at(-1)?.uci,
      arrow: this.lastArrow,
      ...options,
    });
  }
  private pathHtml() {
    const profile = buildLearningProfile(this.state);
    const insight = profile.growthEdge
      ? `<b>Growth edge:</b> ${esc(profile.growthEdge.label)}. <b>Relative strength:</b> ${esc(profile.strongest?.label || "Still emerging")}. These are practice signals from your local history, not ratings or fixed traits.`
      : profile.strongest
        ? `<b>Emerging strength:</b> ${esc(profile.strongest.label)}. Practice other areas to build a broader, more useful baseline.`
        : "Complete a few activities to establish a baseline. Stillpoint will keep recommendations varied until enough evidence exists.";
    const recommendations = profile.recommendations.map((recommendation, index) => `<article class="recommendation-card"><span class="recommendation-number">0${index + 1}</span><div><h3>${esc(recommendation.title)}</h3><p>${esc(recommendation.reason)}</p></div><button class="btn ${index === 0 ? "primary" : ""}" type="button" data-recommendation="${index}">${esc(recommendation.action)}</button></article>`).join("");
    const skills = profile.skills.map((skill) => `<div class="skill-row"><div class="skill-heading"><span>${esc(skill.label)}</span><b>${skill.score}</b></div><meter min="0" max="100" value="${skill.score}" aria-label="${esc(skill.label)} practice readiness">${skill.score}%</meter><small>${skill.status} · ${skill.evidence} evidence${skill.recentChange === null ? "" : ` · recent ${skill.recentChange > 0 ? "+" : ""}${skill.recentChange} pp`}</small></div>`).join("");
    const recent = [...this.state.learning].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
    const activity = recent.length ? recent.map((attempt) => {
      const age = Math.max(0, Date.now() - attempt.timestamp);
      const when = age < 60_000 ? "just now" : age < 3_600_000 ? `${Math.floor(age / 60_000)} min ago` : age < 86_400_000 ? `${Math.floor(age / 3_600_000)} hr ago` : `${Math.floor(age / 86_400_000)} d ago`;
      const skill = profile.skills.find((item) => item.id === attempt.area)!;
      return `<div class="activity-row"><span><b>${esc(skill.label)}</b><small>${esc(attempt.key)}</small></span><span class="activity-result ${attempt.correct ? "positive" : ""}">${attempt.correct ? "Completed" : "Review"} · ${when}</span></div>`;
    }).join("") : `<p class="helper">Your completed exercises will appear here. Nothing leaves this device.</p>`;
    return `<div class="workspace-heading"><div><span class="overline">YOUR LEARNING PATH</span><h1>Practice what matters next</h1><p>A changing plan shaped by your games, recall, mistakes, and training history.</p></div><span class="current-mode">LOCAL & EXPLAINABLE <span class="status-dot"></span></span></div>
      <div class="path-overview"><section class="panel path-intro"><span class="overline">A LIVING PRACTICE</span><h2>${profile.recordedAttempts ? "Your path is adapting" : "Begin with a gentle baseline"}</h2><p>${insight}</p><div class="metrics wide"><div><b>${profile.recentAttempts}</b><small>Attempts · 7 days</small></div><div><b>${this.state.games.filter((game) => !game.mode || game.mode === "play").length}</b><small>Practice games</small></div><div><b>${Object.values(this.state.srs).filter((item) => due(item)).length}</b><small>Lines due</small></div></div></section>
      <section class="panel"><span class="overline">HOW TO READ THIS</span><h2>Signals, not judgments</h2><p>Readiness combines observed outcomes, recency, and a small neutral prior. Confidence grows with evidence. It is not Elo, a diagnosis, or a prediction of your potential.</p><p class="helper">Recommendations always open the existing local exercises; no account or remote analysis is used.</p></section></div>
      <div class="learning-grid"><section class="panel"><span class="overline">RECOMMENDED NEXT</span><h2>Your next four steps</h2><div class="recommendation-list">${recommendations}</div></section><section class="panel"><span class="overline">PRACTICE PROFILE</span><h2>Strengths & growth edges</h2><div class="skill-list">${skills}</div></section></div>
      <section class="panel activity-panel"><span class="overline">RECENT LEARNING</span><h2>Your practice trail</h2>${activity}</section>`;
  }
  private wirePath() {
    const profile = buildLearningProfile(this.state);
    document.querySelectorAll<HTMLButtonElement>("[data-recommendation]").forEach((button) => {
      button.addEventListener("click", () => {
        const recommendation = profile.recommendations[Number(button.dataset.recommendation)];
        if (recommendation) this.openRecommendation(recommendation);
      });
    });
  }
  private openRecommendation(recommendation: Recommendation) {
    if (recommendation.area === "openings") {
      if (recommendation.key && openings.some((opening) => opening.id === recommendation.key)) this.openingId = recommendation.key;
      this.openingMode = "drill";
      this.openingIndex = 0;
      this.openingCorrect = 0;
      this.openingErrors = 0;
      this.openingRecorded = false;
      this.openingFeedback = "";
      this.openingLastSan = "";
    } else if (recommendation.area === "visualization" || recommendation.area === "calculation") {
      if (recommendation.mode && ["coordinates", "color", "knight", "calculation"].includes(recommendation.mode)) this.gym = recommendation.mode as typeof this.gym;
      this.stopGymInterval();
      this.sprintStarted = false;
    } else if (recommendation.area === "tactics") {
      if (recommendation.key && this.state.blunders.some((blunder) => blunder.id === recommendation.key)) this.blunderId = recommendation.key;
      this.blunderFeedback = "";
    } else if (recommendation.area === "endgames") {
      if (recommendation.key && endgames.some((endgame) => endgame.id === recommendation.key)) this.endgameId = recommendation.key;
      this.playMode = "play";
    } else if (recommendation.area === "study") {
      if (recommendation.key && masters.some((master) => master.id === recommendation.key)) this.masterId = recommendation.key;
      this.masterMode = "guess";
      this.masterIndex = this.currentMaster().notes[0].ply;
      this.masterFeedback = "";
    }
    this.switchView(recommendation.target);
  }
  private reviewHtml() {
    if (!this.reviews.length) return "";
    const average = this.reviews.reduce((sum, item) => sum + moveAccuracy(item.loss), 0) / this.reviews.length;
    const critical = [...this.reviews].sort((a, b) => b.loss - a.loss).slice(0, 3);
    const points = this.reviews.map((item, index) => {
      const x = this.reviews.length === 1 ? 120 : 8 + index * (224 / (this.reviews.length - 1));
      const y = 34 - Math.max(-1000, Math.min(1000, item.whiteCp)) / 1000 * 25;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<div class="section-rule"></div><div class="review-card"><h3>Your review</h3><p class="helper">Estimated mean move accuracy ${average.toFixed(0)}% · ${this.reviews.filter(item => item.grade === "Blunder").length} blunder(s). The graph shows your reviewed positions from White’s perspective.</p><svg class="eval-chart" viewBox="0 0 240 68" role="img" aria-label="Evaluation trace for your reviewed moves"><line x1="0" y1="34" x2="240" y2="34" class="eval-zero"/><polyline points="${points}" class="eval-line"/></svg><h3>Largest turning points</h3>${critical.map(item => `<div class="critical-row"><span><b>${esc(item.played)}</b> · ${item.grade} · −${item.loss.toFixed(1)} pp${item.best ? ` · Preferred ${esc(item.best)}` : ""}</span><button class="btn" type="button" data-practice="${esc(item.fenBefore)}">Practice</button></div>`).join("")}</div>`;
  }

  // Play against the local Stockfish worker.
  private playHtml() {
    const result = this.gameResult || this.game.result();
    const last = this.game.history.at(-1);
    const moveList = this.game.history
      .map(
        (m, i) =>
          `<button class="move-chip" data-replay="${i + 1}" aria-label="View position after move ${i + 1}">${i % 2 === 0 ? Math.floor(i / 2) + 1 + ". " : ""}${esc(m.san)}</button>`,
      )
      .join("");
    const clock =
      this.selectedTime === "zen"
        ? "ZEN / NO CLOCK"
        : `WHITE ${this.formatClock(this.clocks[0])} · BLACK ${this.formatClock(this.clocks[1])}`;
    const board = this.boardShell(
      `<span>${this.player === "w" ? "YOU · WHITE" : "YOU · BLACK"}</span><span>${clock}</span>`,
      `<div class="board-note">${esc(this.status)} ${this.thinking ? "· Thinking…" : ""}</div>`,
    );
    const tiers = [["1", "Novice · depth 1"], ["2", "Beginner · depth 2"], ["3", "Club · limited"], ["4", "Advanced · limited"], ["5", "Expert · limited"], ["6", "Maximum · 0.9s"]];
    const settings = `<div class="field-row"><label for="side-choice">Play as</label><select id="side-choice"><option value="w" ${this.player === "w" ? "selected" : ""}>White</option><option value="b" ${this.player === "b" ? "selected" : ""}>Black</option><option value="random">Random</option></select></div><div class="field-row"><label for="strength-choice">Opponent</label><select id="strength-choice">${tiers.map(([value, label]) => `<option value="${value}" ${this.depth === Number(value) ? "selected" : ""}>${label}</option>`).join("")}</select></div><p class="helper">Difficulty tiers are device-dependent, not calibrated Elo ratings.</p><div class="field-row"><label for="time-choice">Clock</label><select id="time-choice"><option value="zen">Zen / untimed</option><option value="10+0" ${this.selectedTime === "10+0" ? "selected" : ""}>Rapid 10+0</option><option value="15+10" ${this.selectedTime === "15+10" ? "selected" : ""}>Rapid 15+10</option><option value="3+2" ${this.selectedTime === "3+2" ? "selected" : ""}>Blitz 3+2</option><option value="5+0" ${this.selectedTime === "5+0" ? "selected" : ""}>Blitz 5+0</option></select></div>
   <div class="field-row"><label for="blind-choice">Piece visibility</label><select id="blind-choice">${[
     ["standard", "Standard"],
     ["ghost", "Ghost · 25%"],
     ["discs", "Neutral discs"],
     ["blindfold", "Full blindfold"],
   ]
     .map(
       ([id, label]) =>
         `<option ${id === this.boardBlind ? "selected" : ""} value="${id}">${label}</option>`,
     )
     .join("")}</select></div>
   <label class="check-line"><input id="coach-toggle" type="checkbox" ${this.coach ? "checked" : ""}> Live coach · experimental search evaluation</label>`;
    const side = this.beginnerGuide() + this.panel(
      "Your table",
      `${settings}<div class="button-row">${btn("new-game", "New game", "primary")}${btn("flip-board", "Flip board")}</div><div class="button-row">${this.selectedTime === "zen" ? btn("takeback", "Takeback") : ""}${btn("resign", "Resign")}${btn("claim-draw", "Claim draw")}</div><div class="button-row">${this.boardBlind === "blindfold" ? btn("peek", "Peek for 3s") : ""}${btn("export-pgn", "Export PGN")}</div><div class="section-rule"></div><label for="move-input" class="overline">MOVE INPUT</label><form id="move-form" class="inline-form"><input id="move-input" aria-label="Enter move in algebraic notation" placeholder="e4, Nf3, e2e4…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send"><button type="submit" class="btn primary">Play</button></form><p class="helper">Tap two squares, drag a piece, or enter SAN/UCI.</p><details class="setup-details"><summary>Load custom FEN or PGN</summary><textarea id="setup-text" rows="3" aria-label="Custom FEN or PGN" placeholder="Paste a valid FEN or PGN here"></textarea>${btn("load-setup", "Load position")}</details><div class="section-rule"></div><h3>Coach’s observation</h3><p class="coach-box">${esc(this.coachMessage || "After your move, local Stockfish compares the preferred continuation with the resulting position. Evaluations are estimates, not explanations of human intent.")}</p>${this.state.settings.guidance && this.coachLesson ? `<p class="coach-preferred"><b>Preferred move, in plain language:</b> ${esc(this.coachLesson)}</p>` : ""}${this.latestMoveLesson()}<div class="section-rule"></div><h3>Move record</h3><div class="move-history">${moveList || '<span class="muted">The first move is yours.</span>'}</div>${result ? `<p class="result-line">Game ended: ${result}</p>` : ""}${this.reviewHtml()}`,
      "PRACTICE AGAINST THE ENGINE",
    );
    return this.layout(
      "The Practice Board",
      "01 / PLAY",
      "Settle your attention. See the position as it is.",
      board,
      side,
      "Stockfish 19 Lite runs locally in a single-threaded Web Worker. No position or game is sent to an analysis service. Recent practice is recoverable for 10 minutes on this device.",
    );
  }
  private formatClock(s: number) {
    return `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;
  }
  private async startNewGame() {
    this.revision++;
    this.engine.cancel();
    this.thinking = false;
    this.game = new Chess();
    this.orientation = this.player;
    this.gameResult = null;
    this.gameSaved = false;
    this.coachMessage = "";
    this.coachLesson = "";
    this.reviews = [];
    this.lastArrow = null;
    this.status = "New game. Your move.";
    const tc = parseTime(this.selectedTime);
    this.clocks = tc?.remaining || [0, 0];
    this.increment = tc?.inc || 0;
    if (tc) this.startClock();
    this.render();
    this.savePracticeRecovery();
    if (this.player === "b") await this.engineMove();
  }
  private stopClock() {
    if (this.clockHandle) clearInterval(this.clockHandle);
    this.clockHandle = null;
  }
  private startClock() {
    this.stopClock();
    if (this.selectedTime === "zen" || this.gameResult) return;
    this.clockHandle = setInterval(() => {
      if (document.hidden || (!this.game.history.length && this.player === "w"))
        return;
      const i = this.game.turn === "w" ? 0 : 1;
      this.clocks[i] = Math.max(0, this.clocks[i] - 1);
      const node = document.querySelector(".board-topline span:last-child");
      if (node)
        node.textContent = `WHITE ${this.formatClock(this.clocks[0])} · BLACK ${this.formatClock(this.clocks[1])}`;
      if (this.clocks[i] <= 0) {
        this.gameResult = i === 0 ? "0-1" : "1-0";
        this.finishGame("Flag fall");
        this.render();
      }
    }, 1000);
  }
  private finishGame(text: string) {
    this.stopClock();
    this.status = text;
    this.engine.cancel();
    this.thinking = false;
    if (this.gameSaved) return;
    this.gameSaved = true;
    const result = this.gameResult || this.game.result() || "*";
    this.state.games.unshift({
      id: crypto.randomUUID(),
      date: Date.now(),
      pgn: this.game.pgn(this.gameResult || undefined),
      result,
      playerSide: this.player,
      mode: this.playMode,
    });
    this.state.games = this.state.games.slice(0, 200);
    if (this.playMode === "endgame") {
      const won = (result === "1-0" && this.player === "w") || (result === "0-1" && this.player === "b");
      const achievedDraw = this.endgameId === "philidor" && result === "1/2-1/2";
      this.recordLearning("endgames", won || achievedDraw, this.endgameId);
    }
    this.saveSoon();
    this.savePracticeRecovery();
  }
  private async makePlayMove(uciOrSan: string) {
    if (this.thinking || this.gameResult || this.game.result()) {
      this.announce("Game is not accepting moves");
      return;
    }
    if (this.game.turn !== this.player) {
      this.announce("Wait for the engine");
      return;
    }
    const before = this.game.fen(),
      side = this.player;
    let rec;
    try {
      rec = this.game.move(uciOrSan);
    } catch (e) {
      this.announce((e as Error).message);
      return;
    }
    this.lastArrow = null;
    this.coachLesson = "";
    this.status = `You played ${rec.san}`;
    if (this.selectedTime !== "zen")
      this.clocks[side === "w" ? 0 : 1] += this.increment;
    this.render();
    this.savePracticeRecovery();
    const rev = ++this.revision;
    if (this.coach) {
      this.thinking = true;
      try {
        const best = await this.engine.evaluatePosition(before, 2);
        if (rev !== this.revision || !best.complete) return;
        const after = this.game.fen();
        const played = await this.engine.evaluatePosition(after, 2);
        if (rev !== this.revision || !played.complete) return;
        const winBest = cpToWinProbability(scoreForSide(best.score, side));
        const winPlayed = cpToWinProbability(scoreForSide(played.score, side));
        const loss = Math.max(0, winBest - winPlayed);
        const grade = classify(loss);
        this.reviews.push({
          ply: this.game.history.length,
          fenBefore: before,
          played: rec.san,
          best: best.san,
          loss,
          grade,
          whiteCp: played.scoreCp,
        });
        this.coachMessage = `${grade} · estimated −${loss.toFixed(1)} percentage points · ${moveAccuracy(loss).toFixed(0)}% estimated move accuracy. Preferred ${best.san || "none"} (${scoreText(best.score, side)}); after ${rec.san}: ${scoreText(played.score, side)}.`;
        if (best.san) {
          const language = this.state.settings.language;
          const preferred = explainMove(before, best.san, language);
          this.coachLesson = `${preferred.reading} ${preferred.reasons.join(" ")} ${language === "zh"
            ? "Stockfish 在当前搜索深度下更偏好这一步；这只是供你检验的搜索证据，不代表它知道人类棋手的意图。"
            : "Stockfish preferred it at this search depth; that is evidence to inspect, not a claim about human intent."}`;
        }
        if (best.bestMove && best.bestMove !== rec.uci) {
          this.lastArrow = { uci: best.bestMove, color: "green" };
          if (grade === "Blunder" && !this.state.blunders.some(item => item.fen === before && !item.starter)) {
            const bestMove = new Chess(before).move(best.bestMove);
            this.state.blunders.unshift({
              id: crypto.randomUUID(),
              fen: before,
              bad: rec.san,
              best: bestMove.san,
              solved: 0,
              starter: false,
              title: "Your game · " + new Date().toLocaleDateString(),
              lesson: explainMove(before, bestMove).reasons.join(" "),
              timestamp: Date.now(),
            });
            this.state.blunders = this.state.blunders.slice(0, 500);
            this.saveSoon();
          }
        }
        this.announce(this.coachMessage);
      } catch (e) {
        if (rev !== this.revision) return;
        this.coachMessage =
          "Coach analysis interrupted; game moves remain valid.";
      } finally {
        if (rev === this.revision) this.thinking = false;
      }
    }
    if (rev !== this.revision) return;
    const result = this.game.result();
    if (result) {
      this.gameResult = result;
      this.finishGame("Game over");
      this.render();
      return;
    }
    this.render();
    await this.engineMove();
  }
  private async engineMove() {
    if (
      this.thinking ||
      this.gameResult ||
      this.game.result() ||
      this.game.turn === this.player
    )
      return;
    const fen = this.game.fen(),
      rev = ++this.revision;
    this.thinking = true;
    this.render();
    try {
      const move = await this.engine.getBestMove(fen, this.depth);
      if (rev !== this.revision || !move) return;
      const rec = this.game.move(move);
      this.lastArrow = null;
      this.status = `Engine played ${rec.san}`;
      this.announce(this.status);
      if (this.selectedTime !== "zen")
        this.clocks[this.player === "w" ? 1 : 0] += this.increment;
      const result = this.game.result();
      if (result) {
        this.gameResult = result;
        this.finishGame("Game over");
      }
      this.thinking = false;
      this.render();
      this.savePracticeRecovery();
    } catch (e) {
      if (rev !== this.revision) return;
      this.thinking = false;
      this.status = "Engine unavailable; retry by starting a new game";
      this.render();
    }
  }
  private wirePlay() {
    this.boardRender(
      this.game,
      !this.thinking && !this.gameResult && this.game.turn === this.player,
      { onMove: (uci: string) => this.makePlayMove(uci) },
    );
    this.bind("beginner-e4", () => this.makePlayMove("e4"));
    this.onChange("guide-language", (value) => {
      if (!["en", "zh"].includes(value)) return;
      this.state.settings.language = value as "en" | "zh";
      this.saveSoon();
      this.render();
    });
    this.onChange("side-choice", (s) => {
      this.player =
        s === "random" ? (Math.random() < 0.5 ? "w" : "b") : (s as Color);
      this.startNewGame();
    });
    this.onChange("strength-choice", (v) => {
      this.depth = Number(v);
      this.savePracticeRecovery();
    });
    this.onChange("time-choice", (v) => {
      this.selectedTime = v;
      this.startNewGame();
    });
    this.onChange("blind-choice", (v) => {
      this.boardBlind = v as BlindTier;
      this.render();
    });
    const coach = $("coach-toggle") as HTMLInputElement | null;
    if (coach)
      coach.onchange = () => {
        this.coach = coach.checked;
        this.render();
        this.savePracticeRecovery();
      };
    this.bind("new-game", () => this.startNewGame());
    this.bind("flip-board", () => {
      this.orientation = this.orientation === "w" ? "b" : "w";
      this.render();
      this.savePracticeRecovery();
    });
    this.bind("takeback", () => {
      this.revision++;
      this.engine.cancel();
      this.thinking = false;
      if (this.game.history.length) {
        this.game.undo();
        if (this.game.turn !== this.player) this.game.undo();
      }
      this.gameResult = null;
      this.lastArrow = null;
      this.status = "Move taken back";
      this.render();
      this.savePracticeRecovery();
    });
    this.bind("resign", () => {
      if (this.gameResult || this.game.history.length === 0) return;
      if (confirm("Resign this game?")) {
        this.gameResult = this.player === "w" ? "0-1" : "1-0";
        this.finishGame("You resigned");
        this.render();
      }
    });
    this.bind("claim-draw", () => {
      if (!this.game.canClaimDraw()) {
        this.announce(
          "Draw not currently claimable: requires 50 moves or threefold repetition",
        );
        return;
      }
      this.gameResult = "1/2-1/2";
      this.finishGame("Draw claimed");
      this.render();
    });
    this.bind("export-pgn", () =>
      download(
        "stillpoint-game.pgn",
        this.game.pgn(this.gameResult || undefined),
        "application/x-chess-pgn",
      ),
    );
    this.bind("load-setup", () => {
      const input = $("setup-text") as HTMLTextAreaElement | null;
      const data = input?.value.trim() || "";
      if (!data) {
        this.announce("Paste a FEN or PGN first");
        return;
      }
      try {
        const game = /^[^\s]+\/[^\s]+/.test(data)
          ? new Chess(data)
          : new Chess().loadPgn(data);
        this.revision++;
        this.engine.cancel();
        this.game = game;
        this.gameResult = game.result();
        this.gameSaved = false;
        this.reviews = [];
        this.lastArrow = null;
        this.selectedTime = "zen";
        this.status = "Custom position imported";
        this.coachMessage = "";
        this.coachLesson = "";
        this.render();
        this.savePracticeRecovery();
        if (this.game.turn !== this.player && !this.gameResult)
          this.engineMove();
      } catch (e) {
        this.announce("Import rejected: " + (e as Error).message);
      }
    });
    this.bind("peek", () => {
      this.peekUntil = Date.now() + 3000;
      this.boardRender(this.game, true, {
        blind: "standard",
        onMove: (u: string) => this.makePlayMove(u),
      });
      setTimeout(() => {
        if (Date.now() >= this.peekUntil && this.view === "play") this.render();
      }, 3100);
    });
    $("move-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("move-input") as HTMLInputElement | null;
      if (input) this.makePlayMove(input.value);
    });
    document.querySelectorAll("[data-replay]").forEach((node) =>
      node.addEventListener("click", () => {
        const count = Number((node as HTMLElement).dataset.replay),
          fen = this.game.history[count - 1].after;
        const display = new Chess(fen);
        this.boardRender(display, false, { blind: "standard" });
        this.announce(`Showing move ${count} from the game record`);
      }),
    );
    document.querySelectorAll<HTMLElement>("[data-practice]").forEach((node) =>
      node.addEventListener("click", () => {
        this.revision++;
        this.engine.cancel();
        this.game = new Chess(node.dataset.practice!);
        this.player = this.game.turn;
        this.orientation = this.player;
        this.gameResult = null;
        this.gameSaved = false;
        this.selectedTime = "zen";
        this.reviews = [];
        this.lastArrow = null;
        this.coachMessage = "Practice from the critical position. The original game remains in your saved history.";
        this.coachLesson = "";
        this.status = "Find a stronger continuation";
        this.render();
        this.savePracticeRecovery();
      }),
    );
  }
  // Opening dojo. Repertoire follows authored legal branches, not pseudo-evaluations.
  private currentOpening() {
    return openings.find((x) => x.id === this.openingId) || openings[0];
  }
  private openingGame() {
    const g = new Chess();
    for (let i = 0; i < this.openingIndex; i++)
      g.move(this.currentOpening().moves[i]);
    return g;
  }
  private openingsHtml() {
    const line = this.currentOpening(),
      g = this.openingGame(),
      stat = this.state.srs[line.id] || freshSrs();
    const selector = `<div class="field-row"><label for="opening-select">Opening</label><select id="opening-select">${openings.map((o) => `<option value="${o.id}" ${o.id === line.id ? "selected" : ""}>${esc(o.title)} · ${o.side === "w" ? "White" : "Black"}</option>`).join("")}</select></div>`;
    const modes = `<div class="segment">${btn("walk-mode", "Walkthrough", this.openingMode === "walk" ? "current" : "")}${btn("drill-mode", "Recall drill", this.openingMode === "drill" ? "current" : "")}</div>`;
    const next = line.moves[this.openingIndex];
    const isPlayersTurn = g.turn === line.side;
    const lesson = this.openingIndex
      ? this.openingLesson(this.openingIndex - 1, this.openingLastSan || undefined)
      : "";
    const card =
      this.openingMode === "walk"
        ? `<div class="opening-note"><b>Strategic idea</b><p>${esc(line.idea)}</p><b>Common mistake</b><p>${esc(line.trap)}</p></div><div class="button-row">${btn("opening-prev", "← Previous")}${btn("opening-next", "Next →", "primary")}</div><p class="helper">${this.openingIndex}/${line.moves.length} plies · ${next ? `Next: ${esc(next)}` : "Line complete"}</p>${lesson}`
        : `<div class="coach-box">${esc(this.openingFeedback || (this.openingIndex >= line.moves.length ? "Drill complete. Review the reasons below, then return later to recall them." : isPlayersTurn ? "Find the repertoire move. A correct answer will show both the move and its purpose." : "Opponent reply incoming…"))}</div><div class="button-row">${btn("opening-restart", "Restart drill")}${btn("opening-hint", "Reveal & explain")}</div><form id="opening-move-form" class="inline-form"><input id="opening-move" aria-label="Enter opening move" placeholder="SAN or UCI" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send"><button class="btn primary" type="submit">Play</button></form><p class="helper">Correct moves ${this.openingCorrect} · retries ${this.openingErrors}. Legal alternatives are not automatically bad; they are simply outside this memory line.</p>${lesson}`;
    const side = this.panel(
      line.title,
      `${selector}${modes}${card}<div class="section-rule"></div><h3>Memory schedule</h3><div class="progress-track"><div style="width:${stat.masteryPercent}%"></div></div><p class="helper">Mastery ${stat.masteryPercent}% · ${stat.attempts} completed review${stat.attempts === 1 ? "" : "s"} · ${due(stat) ? "Due now" : "Next review " + new Date(stat.nextDueTimestamp).toLocaleDateString()}</p>${btn("reset-opening", "Reset this line")}`,
      "REPERTOIRE / SPACED REPETITION",
    );
    return this.layout(
      "Opening Dojo",
      "02 / OPENINGS",
      "Understand the plan, then retrieve the move from memory.",
      this.boardShell(
        `<span>${esc(line.side === "w" ? "YOU · WHITE" : "YOU · BLACK")}</span><span>${this.openingIndex} / ${line.moves.length}</span>`,
      ),
      side,
      "SRS remembers your completed drills locally. Recall is different from guessing what a shallow engine prefers.",
    );
  }
  private wireOpenings() {
    const g = this.openingGame(),
      line = this.currentOpening();
    this.player = line.side;
    this.lastArrow = null;
    this.boardRender(
      g,
      this.openingMode === "drill" &&
        g.turn === line.side &&
        this.openingIndex < line.moves.length,
      { blind: "standard", onMove: (uci: string) => this.openingTryMove(uci) },
    );
    this.onChange("opening-select", (v) => {
      this.openingId = v;
      this.openingIndex = 0;
      this.openingCorrect = 0;
      this.openingErrors = 0;
      this.openingRecorded = false;
      this.openingFeedback = "";
      this.openingLastSan = "";
      this.render();
    });
    this.bind("walk-mode", () => {
      this.openingMode = "walk";
      this.openingIndex = 0;
      this.openingRecorded = false;
      this.openingFeedback = "";
      this.openingLastSan = "";
      this.render();
    });
    this.bind("drill-mode", () => {
      this.openingMode = "drill";
      this.openingIndex = 0;
      this.openingCorrect = 0;
      this.openingErrors = 0;
      this.openingRecorded = false;
      this.openingFeedback = "";
      this.openingLastSan = "";
      this.render();
      this.autoplayOpening();
    });
    this.bind("opening-next", () => {
      this.openingIndex = Math.min(line.moves.length, this.openingIndex + 1);
      this.openingFeedback = "";
      this.openingLastSan = "";
      this.render();
    });
    this.bind("opening-prev", () => {
      this.openingIndex = Math.max(0, this.openingIndex - 1);
      this.openingFeedback = "";
      this.openingLastSan = "";
      this.render();
    });
    this.bind("opening-restart", () => {
      this.openingIndex = 0;
      this.openingCorrect = 0;
      this.openingErrors = 0;
      this.openingRecorded = false;
      this.openingFeedback = "";
      this.openingLastSan = "";
      this.render();
      this.autoplayOpening();
    });
    this.bind("opening-hint", () => {
      if (this.openingIndex < line.moves.length) {
        const move = line.moves[this.openingIndex];
        this.openingFeedback = this.state.settings.guidance
          ? `Try ${move}. ${line.explanations[this.openingIndex]}`
          : `Repertoire move: ${move}`;
        this.announce(this.openingFeedback);
        this.render();
      }
    });
    $("opening-move-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("opening-move") as HTMLInputElement;
      if (input) this.openingTryMove(input.value);
    });
    this.bind("reset-opening", () => {
      if (!confirm("Reset mastery progress for this opening?")) return;
      delete this.state.srs[line.id];
      this.saveSoon();
      this.render();
    });
  }
  private autoplayOpening() {
    const line = this.currentOpening();
    if (
      this.view !== "openings" ||
      this.openingMode !== "drill" ||
      this.openingIndex >= line.moves.length
    )
      return;
    const g = this.openingGame();
    if (g.turn === line.side) return;
    const rev = this.revision;
    setTimeout(() => {
      if (
        rev !== this.revision ||
        this.view !== "openings" ||
        this.openingMode !== "drill"
      )
        return;
      const played = line.moves[this.openingIndex];
      this.openingIndex++;
      this.openingLastSan = played;
      this.openingFeedback = this.state.settings.guidance
        ? `Opponent played ${played}. ${line.explanations[this.openingIndex - 1]}`
        : `Opponent played ${played}.`;
      if (this.openingIndex >= line.moves.length) this.completeOpening();
      this.render();
      this.autoplayOpening();
    }, 250);
  }
  private completeOpening() {
    if (this.openingRecorded) return;
    this.openingRecorded = true;
    const line = this.currentOpening(),
      correct = this.openingErrors === 0;
    this.state.srs[line.id] = review(
      this.state.srs[line.id] || freshSrs(),
      correct,
    );
    this.recordLearning("openings", correct, line.id);
    this.saveSoon();
    this.announce(
      correct
        ? "Line recalled without errors. Review scheduled."
        : "Line completed; review scheduled sooner.",
    );
  }
  private openingTryMove(uci: string) {
    const line = this.currentOpening(),
      g = this.openingGame();
    if (this.openingIndex >= line.moves.length) return;
    let san: string;
    try {
      san = g.move(uci).san;
    } catch {
      this.openingFeedback = "That move is not legal here. Select one of your pieces to see its legal destinations, then try again.";
      this.announce(this.openingFeedback);
      this.render();
      return;
    }
    const playedIndex = this.openingIndex;
    const accepted = [
      line.moves[playedIndex],
      ...(line.alternatives?.[playedIndex] || []),
    ].some((s) => s.replace(/[+#]$/, "") === san.replace(/[+#]$/, ""));
    if (!accepted) {
      this.openingErrors++;
      this.openingFeedback = `${san} is legal, but it is outside this authored memory line. That does not make it a bad move. Try again, or choose Reveal & explain.`;
      this.announce(this.openingFeedback);
      this.render();
      return;
    }
    const isMainMove = san.replace(/[+#]$/, "") === line.moves[playedIndex].replace(/[+#]$/, "");
    const purpose = isMainMove
      ? line.explanations[playedIndex]
      : `This accepted alternative follows the line’s broader plan: ${line.idea}`;
    this.openingCorrect++;
    this.openingLastSan = san;
    this.openingFeedback = this.state.settings.guidance
      ? `Correct: ${san}. ${purpose}`
      : `Correct: ${san}.`;
    this.openingIndex++;
    if (
      this.openingIndex === line.moves.length ||
      line.alternatives?.[playedIndex]?.includes(san)
    ) {
      this.completeOpening();
    } else this.announce(this.openingFeedback);
    this.render();
    this.autoplayOpening();
  }
  // Visualization and mental calculation
  private nextSquare() {
    const file = "abcdefgh"[Math.floor(Math.random() * 8)],
      rank = String(1 + Math.floor(Math.random() * 8));
    return file + rank;
  }
  private visualHtml() {
    const tabs = `<div class="subtabs">${[
      ["coordinates", "Coordinate Blitz"],
      ["color", "Square Color"],
      ["knight", "Knight Path"],
      ["calculation", "Visualize Sequence"],
    ]
      .map(
        ([id, name]) =>
          `<button type="button" data-gym="${id}" class="subtab ${id === this.gym ? "active" : ""}">${name}</button>`,
      )
      .join("")}</div>`;
    let board = "",
      side = "";
    if (this.gym === "coordinates") {
      board = this.boardShell(
        `<span>${this.sprintOrientation === "w" ? "WHITE VIEW" : "BLACK VIEW"}</span><span>${this.sprintRemaining}s REMAINING</span>`,
      );
      side = this.panel(
        "Coordinate Blitz",
        `<p>Find the square as quickly as possible. You have 60 seconds.</p><div class="target-panel"><span class="overline">LOCATE</span><strong>${this.sprintStarted ? this.sprintTarget : "—"}</strong></div><div class="metrics"><div><b>${this.sprintCount}</b><small>Attempts</small></div><div><b>${this.sprintCount ? Math.round((this.sprintCorrect / this.sprintCount) * 100) : 0}%</b><small>Accuracy</small></div><div><b>${this.sprintCount ? Math.round(this.elapsedTargetMs / this.sprintCount) : 0}ms</b><small>Avg. response</small></div></div><div class="button-row">${btn("sprint-start", this.sprintStarted ? "Restart 60s" : "Start 60s", "primary")}${btn("sprint-pause", this.sprintStarted ? "Pause" : "Resume")}</div><label class="check-line"><input type="checkbox" id="coords-toggle" ${this.state.settings.coords ? "checked" : ""}> Show board coordinates</label>`,
        "60-SECOND SPRINT",
      );
    } else if (this.gym === "color") {
      board = `<div class="mental-surface"><div class="mental-icon">◇</div><span class="overline">NO BOARD · MENTAL SPACE</span><h2>${this.colorTarget}</h2><p>Is this a light square or a dark square?</p><div class="button-row center">${btn("choose-light", "Light square", "primary", Boolean(this.colorResult))}${btn("choose-dark", "Dark square", "", Boolean(this.colorResult))}</div><p class="mental-result">${esc(this.colorResult || "Choose once, then move to the next coordinate.")}</p></div>`;
      side = this.panel(
        "Color sense",
        `<p>Use the parity of file and rank. a1 is dark; moving one file or one rank flips the color.</p><div class="metrics"><div><b>${this.state.stats.colorCorrect}</b><small>Correct</small></div><div><b>${this.state.stats.colorAttempts}</b><small>Attempts</small></div></div>${btn("color-next", "Next coordinate", "primary")}`,
        "BOARDLESS EXERCISE",
      );
    } else if (this.gym === "knight") {
      board = this.knightPath.length
        ? this.boardShell(
            `<span>PATH REVEALED</span><span>${this.knightPath.length - 1} MOVES</span>`,
          )
        : `<div class="mental-surface"><div class="mental-icon">♘</div><span class="overline">NO BOARD · MENTAL SPACE</span><h2>${this.knightFrom} → ${this.knightTo}</h2><p>Calculate the minimum number of knight jumps and a legal route without moving a piece.</p></div>`;
      side = this.panel(
        "Knight’s distance",
        `<div class="field-row"><label for="knight-count">Fewest jumps</label><input id="knight-count" type="number" min="0" max="12" inputmode="numeric" placeholder="e.g. 3"></div><div class="field-row"><label for="knight-route">Your path</label><input id="knight-route" placeholder="b1 c3 e4 f6"></div><p class="helper">Include the starting and ending squares, separated by spaces.</p><div class="button-row">${btn("knight-check", "Check path", "primary")}${btn("knight-next", "New problem")}</div><p class="coach-box">${esc(this.knightResult || "The route must be legal and use the minimum number of jumps.")}</p>`,
        "EXACT BFS VALIDATION",
      );
    } else {
      const c = calculations.find((p) => p.id === this.calculationId)!;
      board = this.boardShell(
        `<span>${esc(c.intro)}</span><span>MENTAL REPLAY</span>`,
      );
      side = this.panel(
        "Visualize the sequence",
        `<div class="field-row"><label for="calculation-select">Scenario</label><select id="calculation-select">${calculations.map((p, i) => `<option value="${p.id}" ${c.id === p.id ? "selected" : ""}>${i + 1}. ${esc(p.intro)}</option>`).join("")}</select></div><p>Keep the visible board unchanged while imagining these moves:</p><div class="sequence-pill">${esc(c.sequence.join(" · "))}</div><p>From the resulting <b>imagined</b> position, enter the continuation in SAN or UCI.</p><form id="calculation-form" class="inline-form"><input id="calculation-answer" aria-label="Imagined continuation move" placeholder="e.g. Bc5" autocomplete="off"><button type="submit" class="btn primary">Check</button></form><p class="coach-box">${esc(this.calculationFeedback || "Do not move the displayed pieces until you have answered.")}</p><div class="button-row">${btn("calculation-show", "Reveal position")}${btn("calculation-next", "Next sequence")}</div>`,
        "3–5 PLY CALCULATION",
      );
    }
    return this.layout(
      "Visualization Gym",
      "03 / VISUALIZE",
      "Hold the board in your mind, then test what you saw.",
      tabs + board,
      side,
      "An active timed sprint pauses automatically when this tab becomes hidden.",
    );
  }
  private stopGymInterval() {
    if (this.gymInterval) clearInterval(this.gymInterval);
    this.gymInterval = null;
  }
  private beginGymTick() {
    this.stopGymInterval();
    if (!this.sprintStarted || this.sprintRemaining <= 0) return;
    this.gymInterval = setInterval(() => {
      if (document.hidden) return;
      this.sprintRemaining--;
      const span = document.querySelector(".board-topline span:last-child");
      if (span) span.textContent = `${this.sprintRemaining}s REMAINING`;
      if (this.sprintRemaining <= 0) {
        this.sprintStarted = false;
        this.stopGymInterval();
        this.state.stats.coordinateBest = Math.max(
          this.state.stats.coordinateBest,
          this.sprintCorrect,
        );
        this.saveSoon();
        this.announce("Sprint finished: " + this.sprintCorrect + " correct");
        this.render();
      }
    }, 1000);
  }
  private wireVisualize() {
    document.querySelectorAll("[data-gym]").forEach((b) =>
      b.addEventListener("click", () => {
        this.gym = (b as HTMLElement).dataset.gym as typeof this.gym;
        this.stopGymInterval();
        this.sprintStarted = false;
        this.colorResult = "";
        this.knightResult = "";
        this.knightPath = [];
        this.render();
      }),
    );
    if (this.gym === "coordinates") {
      const g = new Chess();
      const el = $("board-mount");
      if (el) {
        this.board = new BoardView(el);
        this.board.render(g, {
          orientation: this.sprintOrientation,
          interactive: false,
          blind: "blindfold",
          coords: this.state.settings.coords,
          onSquare: (square: string) => {
            if (!this.sprintStarted) return;
            this.elapsedTargetMs += performance.now() - this.targetStarted;
            this.sprintCount++;
            if (square === this.sprintTarget) {
              this.sprintCorrect++;
              this.announce("Correct: " + square);
            } else
              this.announce(
                "You selected " + square + "; target was " + this.sprintTarget,
              );
            this.recordLearning("visualization", square === this.sprintTarget, `coordinate:${this.sprintTarget}`);
            this.sprintTarget = this.nextSquare();
            this.sprintOrientation = this.sprintCount % 2 === 0 ? "w" : "b";
            this.targetStarted = performance.now();
            this.render();
          },
        });
      }
      this.bind("sprint-start", () => {
        this.sprintRemaining = 60;
        this.sprintCount = 0;
        this.sprintCorrect = 0;
        this.elapsedTargetMs = 0;
        this.sprintStarted = true;
        this.sprintTarget = this.nextSquare();
        this.sprintOrientation = "w";
        this.targetStarted = performance.now();
        this.render();
        this.beginGymTick();
      });
      this.bind("sprint-pause", () => {
        this.sprintStarted = !this.sprintStarted;
        this.render();
        if (this.sprintStarted) this.beginGymTick();
        else this.stopGymInterval();
      });
      const cb = $("coords-toggle") as HTMLInputElement | null;
      if (cb)
        cb.onchange = () => {
          this.state.settings.coords = cb.checked;
          this.saveSoon();
          this.render();
        };
    } else if (this.gym === "color") {
      this.bind("choose-light", () => this.markColor(true));
      this.bind("choose-dark", () => this.markColor(false));
      this.bind("color-next", () => {
        this.colorTarget = this.nextSquare();
        this.colorResult = "";
        this.render();
      });
    } else if (this.gym === "knight") {
      if (this.knightPath.length) {
        const g = new Chess();
        const el = $("board-mount");
        if (el) {
          this.board = new BoardView(el);
          this.board.render(g, {
            blind: "blindfold",
            interactive: false,
            coords: true,
            path: this.knightPath,
          });
        }
      }
      this.bind("knight-check", () => {
        const count = Number(($("knight-count") as HTMLInputElement).value),
          path = ($("knight-route") as HTMLInputElement).value
            .trim()
            .toLowerCase()
            .split(/\s+/);
        const shortest = shortestKnightPath(this.knightFrom, this.knightTo);
        const correct =
          Number.isInteger(count) &&
          count === shortest.length - 1 &&
          validateKnightPath(path, this.knightFrom, this.knightTo) &&
          path.length === shortest.length;
        this.knightPath = shortest;
        this.knightResult = correct
          ? "Exact shortest route. Well calculated."
          : `Not the shortest valid route. One answer: ${shortest.join(" → ")} (${shortest.length - 1} moves).`;
        if (correct) this.state.stats.knightSolved++;
        this.recordLearning("visualization", correct, `knight:${this.knightFrom}-${this.knightTo}`);
        this.saveSoon();
        this.announce(this.knightResult);
        this.render();
      });
      this.bind("knight-next", () => {
        this.knightFrom = this.nextSquare();
        this.knightTo = this.nextSquare();
        while (this.knightTo === this.knightFrom)
          this.knightTo = this.nextSquare();
        this.knightResult = "";
        this.knightPath = [];
        this.render();
      });
    } else {
      const c = calculations.find((p) => p.id === this.calculationId)!;
      let game = calculationStart(c);
      if (this.calculationRevealed) {
        for (const move of c.sequence) game.move(move);
      }
      const el = $("board-mount");
      if (el) {
        this.board = new BoardView(el);
        this.board.render(game, {
          interactive: false,
          coords: true,
          blind: "standard",
        });
      }
      this.onChange("calculation-select", (v) => {
        this.calculationId = v;
        this.calculationFeedback = "";
        this.calculationRevealed = false;
        this.render();
      });
      $("calculation-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const answer = (
            $("calculation-answer") as HTMLInputElement
          ).value.trim(),
          sim = calculationStart(c);
        let correct = false;
        for (const move of c.sequence) sim.move(move);
        try {
          const got = sim.move(answer).san;
          const expected = new Chess(sim.history.at(-1)!.before).move(
            c.answer,
          ).san;
          if (got.replace(/[+#]$/, "") === expected.replace(/[+#]$/, "")) {
            correct = true;
            this.calculationFeedback = `Correct continuation: ${expected}.${this.state.settings.guidance ? " " + c.explanation : ""}`;
            this.state.stats.calcSolved++;
          } else
            this.calculationFeedback = `${got} is legal, but the authored continuation is ${expected}. This is opening recall, not a proved winning tactic.${this.state.settings.guidance ? " " + c.explanation : ""}`;
        } catch {
          this.calculationFeedback =
            "That move is not legal in the imagined position. Recalculate the sequence.";
        }
        this.recordLearning("calculation", correct, c.id);
        this.announce(this.calculationFeedback);
        this.render();
      });
      this.bind("calculation-show", () => {
        this.calculationRevealed = true;
        this.render();
      });
      this.bind("calculation-next", () => {
        const index = calculations.findIndex(
          (p) => p.id === this.calculationId,
        );
        this.calculationId = calculations[(index + 1) % calculations.length].id;
        this.calculationFeedback = "";
        this.calculationRevealed = false;
        this.render();
      });
    }
  }
  private markColor(chosen: boolean) {
    const correct = squareIsLight(this.colorTarget) === chosen;
    this.state.stats.colorAttempts++;
    if (correct) this.state.stats.colorCorrect++;
    this.colorResult = `${correct ? "Correct." : "Not quite."} ${this.colorTarget} is ${squareIsLight(this.colorTarget) ? "light" : "dark"}. Each step along a rank or file flips parity.`;
    this.recordLearning("visualization", correct, `color:${this.colorTarget}`);
    this.announce(this.colorResult);
    this.saveSoon();
    this.render();
  }
  // Goal-oriented endgame sparring: never present heuristic scores as tablebase truth.
  private endgamesHtml() {
    const e = endgames.find((p) => p.id === this.endgameId)!;
    const inGame = this.playMode === "endgame";
    const shown = inGame ? this.game : new Chess(e.fen);
    const board = this.boardShell(
      `<span>${esc(e.title)}</span><span>${shown.turn === "w" ? "WHITE" : "BLACK"} TO MOVE</span>`,
      inGame ? `<div class="board-note">${esc(this.status)}</div>` : "",
    );
    const side = this.panel(
      e.title,
      `<div class="field-row"><label for="endgame-select">Training position</label><select id="endgame-select">${endgames.map((p) => `<option value="${p.id}" ${p.id === e.id ? "selected" : ""}>${esc(p.title)}</option>`).join("")}</select></div><h3>Objective</h3><p>${esc(e.goal)}</p><h3>Key idea</h3><p>${esc(e.lesson)}</p><div class="button-row">${btn("start-endgame", "Start drill", "primary")}${inGame ? btn("reset-endgame", "Reset") : ""}</div>${inGame ? `<div class="section-rule"></div><form id="endgame-move-form" class="inline-form"><input id="endgame-move" aria-label="Enter endgame move" placeholder="e.g. Rd1+"><button class="btn primary" type="submit">Play</button></form><p class="helper">${this.gameResult ? "Result " + this.gameResult : "Your objective is judged by the actual legal game result or promotion—not by shallow centipawns."}</p>${this.latestMoveLesson()}` : ""}`,
      "ENDGAME FUNDAMENTALS",
    );
    return this.layout(
      "Essential Endgames",
      "04 / ENDGAMES",
      "Practice conversions and defensive technique against a local opponent.",
      board,
      side,
      "These are working sparring drills, not Syzygy-verified theoretical win/draw graders.",
    );
  }
  private wireEndgames() {
    const e = endgames.find((p) => p.id === this.endgameId)!;
    const game = this.playMode === "endgame" ? this.game : new Chess(e.fen);
    this.player = e.side;
    this.lastArrow = null;
    this.boardRender(
      game,
      this.playMode === "endgame" &&
        !this.thinking &&
        !this.gameResult &&
        game.turn === this.player,
      { blind: "standard", onMove: (uci: string) => this.makePlayMove(uci) },
    );
    this.onChange("endgame-select", (v) => {
      this.endgameId = v;
      this.playMode = "play";
      this.render();
    });
    this.bind("start-endgame", () => {
      this.revision++;
      this.engine.cancel();
      this.thinking = false;
      this.game = new Chess(e.fen);
      this.playMode = "endgame";
      this.gameResult = null;
      this.gameSaved = false;
      this.status = "Endgame practice started";
      this.selectedTime = "zen";
      this.coach = false;
      this.render();
    });
    this.bind("reset-endgame", () => {
      this.game = new Chess(e.fen);
      this.gameResult = null;
      this.gameSaved = false;
      this.engine.cancel();
      this.thinking = false;
      this.render();
    });
    $("endgame-move-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const s = ($("endgame-move") as HTMLInputElement).value;
      this.makePlayMove(s);
    });
  }
  private blundersHtml() {
    const b =
      this.state.blunders.find((p) => p.id === this.blunderId) ||
      this.state.blunders[0];
    if (!b)
      return this.layout(
        "Blunder Bank",
        "05 / BLUNDERS",
        "Review your mistakes.",
        "",
        this.panel(
          "No records",
          `<p>Make and analyze moves in Play to collect new challenges.</p>`,
        ),
      );
    const list = this.state.blunders
      .map(
        (p) =>
          `<button class="bank-item ${p.id === b.id ? "chosen" : ""}" data-blunder="${p.id}"><span>${esc(p.title)}${p.starter ? " · starter" : ""}</span><small>${p.solved} solved</small></button>`,
      )
      .join("");
    const side = this.panel(
      "Repair the pattern",
      `<p>${b.starter ? "This is a practice pattern, not one of your mistakes. Find checkmate in one move." : "This position came from your game. Look for a stronger continuation, without rushing."}</p><p class="coach-box">${b.starter ? "In the played example" : "In your game"}, the move was <b>${esc(b.bad)}</b>. Look for checks, captures, and immediate threats. You can reveal the answer and its lesson whenever you are ready.</p><form id="blunder-move-form" class="inline-form"><input id="blunder-move" aria-label="Answer the blunder puzzle" placeholder="Best move, SAN or UCI"><button class="btn primary" type="submit">Check</button></form><p class="helper">${esc(this.blunderFeedback || "Think before moving. The board also accepts a tap or drag.")}</p>${this.blunderShowLesson ? this.moveLesson(b.fen, b.best, this.blunderLesson(b)) : ""}<div class="button-row">${btn("blunder-hint", "Reveal & explain")}${btn("blunder-delete", "Delete record")}</div><div class="section-rule"></div><h3>Review queue · ${this.state.blunders.length}</h3><div class="bank-list">${list}</div>`,
      "PATTERNS, NOT PUNISHMENT",
    );
    return this.layout(
      "Blunder Bank",
      "05 / BLUNDERS",
      "Revisit mistakes until the better idea becomes instinctive.",
      this.boardShell(
        `<span>${b.starter ? "STARTER EXAMPLE" : "FROM YOUR GAMES"}</span><span>${esc(b.title)}</span>`,
      ),
      side,
      "Starter examples are synthetic mate-in-one oversights, not authentic personal game blunders.",
    );
  }
  private wireBlunders() {
    const b =
      this.state.blunders.find((p) => p.id === this.blunderId) ||
      this.state.blunders[0];
    if (!b) return;
    const game = new Chess(b.fen);
    this.player = game.turn;
    this.lastArrow = null;
    const solve = (attempt: string) => {
      const test = new Chess(b.fen);
      let correct = false;
      this.blunderShowLesson = false;
      try {
        const got = test.move(attempt);
        if (got.san.replace(/[+#]$/, "") === b.best.replace(/[+#]$/, "")) {
          correct = true;
          this.blunderShowLesson = true;
          b.solved++;
          this.blunderFeedback = "Correct: " + b.best + "." + (this.state.settings.guidance
            ? " The lesson below explains the concrete resource."
            : "");
        } else
          this.blunderFeedback =
            `${got.san} is legal, but it misses this puzzle’s tactical point. Reconsider checks, captures, and immediate threats.`;
      } catch {
        this.blunderFeedback = "That move is illegal in this position. Try a move shown by selecting one of your pieces.";
      }
      this.recordLearning("tactics", correct, b.id);
      this.announce(this.blunderFeedback);
      this.render();
    };
    this.boardRender(game, true, { blind: "standard", onMove: solve });
    $("blunder-move-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      solve(($("blunder-move") as HTMLInputElement).value);
    });
    this.bind("blunder-hint", () => {
      this.blunderShowLesson = true;
      this.blunderFeedback = `The move is ${b.best}.${this.state.settings.guidance ? " Read the idea below, then try it from this position later." : ""}`;
      this.render();
    });
    this.bind("blunder-delete", () => {
      if (!confirm("Delete this blunder record?")) return;
      this.state.blunders = this.state.blunders.filter((p) => p.id !== b.id);
      this.blunderId = this.state.blunders[0]?.id || "";
      this.blunderFeedback = "";
      this.blunderShowLesson = false;
      this.saveSoon();
      this.render();
    });
    document.querySelectorAll("[data-blunder]").forEach((n) =>
      n.addEventListener("click", () => {
        this.blunderId = (n as HTMLElement).dataset.blunder!;
        this.blunderFeedback = "";
        this.blunderShowLesson = false;
        this.render();
      }),
    );
  }
  // Historical games are sourced as scores and annotated here with freshly written lessons.
  private currentMaster() {
    return masters.find((m) => m.id === this.masterId) || masters[0];
  }
  private masterGame() {
    const g = new Chess().loadPgn(this.currentMaster().score);
    const displayed = new Chess();
    for (const m of g.history.slice(0, this.masterIndex)) displayed.move(m.uci);
    return { g, displayed };
  }
  private mastersHtml() {
    const master = this.currentMaster(),
      { g } = this.masterGame();
    const note = master.notes.find((n) => n.ply === this.masterIndex);
    const atCritical = !!note && this.masterMode === "guess";
    const chips = g.history
      .map(
        (m, i) =>
          `<button data-master-ply="${i + 1}" class="move-chip ${this.masterIndex === i + 1 ? "selected-chip" : ""}">${i % 2 === 0 ? Math.floor(i / 2) + 1 + ". " : ""}${esc(m.san)}</button>`,
      )
      .join("");
    const side = this.panel(
      master.title,
      `<div class="field-row"><label for="master-select">Master game</label><select id="master-select">${masters.map((m) => `<option value="${m.id}" ${m.id === this.masterId ? "selected" : ""}>${esc(m.white)} vs ${esc(m.black)}, ${m.year}</option>`).join("")}</select></div>
  <p class="helper">${esc(master.white)} — ${esc(master.black)} · ${master.year} · ${master.result}</p><div class="segment">${btn("study-mode", "Study", this.masterMode === "study" ? "current" : "")}${btn("guess-mode", "Guess the move", this.masterMode === "guess" ? "current" : "")}</div><div class="button-row">${btn("master-prev", "← Back")}${btn("master-next", "Forward →", "primary")}</div>
  <div class="coach-box">${atCritical ? "Critical moment. Find the master’s next move." : esc(master.notes.find((n) => n.ply === this.masterIndex - 1)?.text || "Watch the pieces coordinate; track threats before the next move.")}</div>
  ${atCritical ? `<form id="master-guess-form" class="inline-form"><input id="master-guess" aria-label="Guess the master's move" placeholder="SAN or UCI" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send"><button class="btn primary" type="submit">Guess</button></form>` : ""}<p class="helper">${esc(this.masterFeedback)}</p><div class="section-rule"></div><h3>Move score · ${this.masterIndex}/${g.history.length}</h3><div class="move-history">${chips}</div><a class="source-link" target="_blank" rel="noopener noreferrer" href="${esc(master.source)}">Game score provenance ↗</a>`,
      "HONOR THOSE WHO CAME BEFORE",
    );
    return this.layout(
      "Classical Masters",
      "06 / MASTERS",
      "Study what enduring games reveal about calculation, courage, and patience.",
      this.boardShell(
        `<span>${esc(master.white)}</span><span>${esc(master.black)}</span>`,
      ),
      side,
      "Original instructional notes. Exact game moves are replayed and legality-checked at startup.",
    );
  }
  private wireMasters() {
    const master = this.currentMaster(),
      { g, displayed } = this.masterGame();
    this.player = "w";
    this.lastArrow = null;
    this.boardRender(displayed, false, { blind: "standard" });
    this.onChange("master-select", (v) => {
      this.masterId = v;
      this.masterIndex = 0;
      this.masterFeedback = "";
      this.render();
    });
    this.bind("study-mode", () => {
      this.masterMode = "study";
      this.masterFeedback = "";
      this.render();
    });
    this.bind("guess-mode", () => {
      this.masterMode = "guess";
      this.masterIndex = master.notes[0].ply;
      this.masterFeedback = "";
      this.render();
    });
    this.bind("master-prev", () => {
      this.masterIndex = Math.max(0, this.masterIndex - 1);
      this.render();
    });
    this.bind("master-next", () => {
      this.masterIndex = Math.min(g.history.length, this.masterIndex + 1);
      this.masterFeedback = "";
      this.render();
    });
    document.querySelectorAll("[data-master-ply]").forEach((n) =>
      n.addEventListener("click", () => {
        this.masterIndex = Number((n as HTMLElement).dataset.masterPly);
        this.masterFeedback = "";
        this.render();
      }),
    );
    $("master-guess-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const typed = ($("master-guess") as HTMLInputElement).value.trim();
      const expected = g.history[this.masterIndex],
        position = new Chess(expected.before);
      let correct = false;
      try {
        const attempt = position.move(typed);
        if (attempt.san === expected.san) {
          correct = true;
          this.masterFeedback =
            "Correct. " +
            (master.notes.find((n) => n.ply === this.masterIndex)?.text || "");
          this.state.stats.masterSolved++;
        } else
          this.masterFeedback = `The game move was ${expected.san}. Your move was legal but different; no engine-approved partial credit is claimed.`;
      } catch {
        this.masterFeedback = "That move is illegal here.";
      }
      this.recordLearning("study", correct, `${master.id}:${this.masterIndex}`);
      this.announce(this.masterFeedback);
      this.render();
    });
  }
  private settingsHtml() {
    const s = this.state;
    const summary = `<div class="metrics wide"><div><b>${s.games.length}</b><small>Saved games</small></div><div><b>${s.blunders.length}</b><small>Blunders</small></div><div><b>${Object.keys(s.srs).length}</b><small>Trained lines</small></div></div>`;
    const install = this.installPrompt
      ? btn("install-app", "Install Stillpoint", "primary")
      : `<p class="helper">In Chrome or Chromium, use the browser menu → “Cast, save, and share” or “More tools” → “Install app” when offered. Installation requires HTTPS or localhost.</p>`;
    const themeOptions = ([
      ["indigo", "Indigo Focus"],
      ["paper", "Lavender Paper"],
      ["forest", "Forest Quiet"],
      ["ember", "Ember Study"],
    ] as const).map(([id, label]) => `<option value="${id}" ${s.settings.theme === id ? "selected" : ""}>${label}</option>`).join("");
    const panel = this.panel(
      "Your data stays here",
      `${summary}<p>No game, position, or learning signal is sent to an analysis service. Current results are stored in this browser’s IndexedDB; a temporary practice snapshot is kept in local storage for 10 minutes. Clearing browser storage or uninstalling may remove them; export a backup first.</p>
   <div class="button-row">${btn("export-backup", "Export JSON backup", "primary")}<label for="import-backup" class="btn">Import backup</label><input id="import-backup" class="sr-only" type="file" accept="application/json,.json"></div><p class="helper">Imports are validated before they replace or merge with current data.</p><div class="section-rule"></div><div class="field-row"><label for="theme-select">Colour theme</label><select id="theme-select">${themeOptions}</select></div><div class="field-row"><label for="language-select">Lesson language / 教学语言</label><select id="language-select"><option value="en" ${s.settings.language === "en" ? "selected" : ""}>English</option><option value="zh" ${s.settings.language === "zh" ? "selected" : ""}>简体中文</option></select></div><p class="helper">Chinese currently covers the first-game guide, generated move lessons, and starter Blunder Bank lessons. Authored opening notes, master commentary, and the wider interface remain English.</p><label class="check-line"><input id="setting-coords" type="checkbox" ${s.settings.coords ? "checked" : ""}> Show board coordinates</label><label class="check-line"><input id="setting-guidance" type="checkbox" ${s.settings.guidance ? "checked" : ""}> Beginner guidance and plain-language move lessons</label><p class="helper">Turn guidance off to hide onboarding and extended explanations. Core controls, answers, engine reviews, and progress remain available.</p><label class="check-line"><input id="setting-large-text" type="checkbox" ${s.settings.largeText ? "checked" : ""}> Larger interface text</label><label class="check-line"><input id="setting-reduce-motion" type="checkbox" ${s.settings.reduceMotion ? "checked" : ""}> Reduce animations and smooth scrolling</label><div class="section-rule"></div>${btn("clear-data", "Clear all local progress", "danger")}<div class="section-rule"></div><h3>Install & offline</h3><p class="status-message"><span class="status-dot"></span> ${this.online ? "Online" : "Offline"} · ${this.offlineReady ? "Offline assets ready" : "Preparing offline assets"}</p>${install}<p class="helper">The app shell, training content, chess.js, and Stockfish WASM are cached together after a successful first online visit. Keep this version cached before going offline.</p>`,
      "PRIVACY BY DESIGN",
    );
    return `<div class="workspace-heading"><div><span class="overline">08 / DATA & PRIVACY</span><h1>Your Space</h1><p>Ownership includes the ability to leave with your records.</p></div></div><div class="settings-layout">${panel}<div class="panel"><span class="overline">IMPLEMENTATION STATUS</span><h2>Built to tell the truth</h2><p>This release uses mature chess rules and real local Stockfish analysis. Its learning path is explainable and evidence-bounded, not a claim of calibrated chess measurement.</p><div class="feature-status"><b>Included</b><p>Adaptive practice recommendations, timestamped learning history, six Stockfish tiers, live coaching, review turning points, opening SRS, four visual exercises, classical games, endgames, Blunder Bank, backup/restore, four colour themes, and a complete offline asset cache.</p><b>Still bounded</b><p>Opening coverage is a starter repertoire; calculation sequences train opening recall rather than certified tactics; endgames use objective-based practice without tablebase claims; reviews analyze your moves rather than every engine reply.</p></div></div></div>`;
  }
  private wireSettings() {
    this.bind("install-app", () => {
      const prompt = this.installPrompt;
      if (!prompt) return;
      prompt.prompt().then(() => prompt.userChoice).then((choice) => {
        this.announce(`Installation ${choice.outcome}`);
        if (choice.outcome === "accepted") this.installPrompt = null;
        this.render();
      }).catch((error) => this.announce("Installation unavailable: " + error.message));
    });
    this.bind("export-backup", () =>
      download(
        "stillpoint-backup-v1.json",
        JSON.stringify(this.state, null, 2),
        "application/json",
      ),
    );
    const picker = $("import-backup") as HTMLInputElement | null;
    if (picker)
      picker.onchange = async () => {
        const file = picker.files?.[0];
        if (!file) return;
        try {
          if (file.size > 5_000_000) throw Error("Backup exceeds 5 MB");
          const imported = validateSave(JSON.parse(await file.text()));
          const method = confirm(
            "Import as MERGE? Select Cancel to choose overwrite or abort.",
          );
          let next: SaveState;
          if (method) {
            const games = new Map(this.state.games.map((g) => [g.id, g])),
              blunders = new Map(this.state.blunders.map((b) => [b.id, b])),
              learning = new Map(this.state.learning.map((attempt) => [attempt.id, attempt]));
            for (const g of imported.games) games.set(g.id, g);
            for (const b of imported.blunders) blunders.set(b.id, b);
            for (const attempt of imported.learning) learning.set(attempt.id, attempt);
            next = {
              ...this.state,
              games: [...games.values()],
              blunders: [...blunders.values()],
              learning: [...learning.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5000),
              srs: { ...this.state.srs, ...imported.srs },
              stats: imported.stats,
              settings: this.state.settings,
            };
          } else {
            if (
              !confirm(
                "Overwrite all current progress with this backup? Cancel to abort.",
              )
            )
              return;
            next = imported;
          }
          this.state = validateSave(next);
          await this.save();
          this.announce("Backup imported successfully");
          this.render();
        } catch (e) {
          this.announce("Import rejected: " + (e as Error).message);
        }
      };
    this.onChange("theme-select", (v) => {
      if (!["indigo", "paper", "forest", "ember"].includes(v)) return;
      this.state.settings.theme = v as Theme;
      this.saveSoon();
      this.applyTheme();
    });
    this.onChange("language-select", (value) => {
      if (!["en", "zh"].includes(value)) return;
      this.state.settings.language = value as "en" | "zh";
      this.saveSoon();
      this.render();
    });
    for (const [id, key] of [["setting-large-text", "largeText"], ["setting-reduce-motion", "reduceMotion"]] as const) {
      const control = $(id) as HTMLInputElement | null;
      if (control) control.onchange = () => {
        this.state.settings[key] = control.checked;
        this.saveSoon();
        this.applyTheme();
      };
    }
    const cb = $("setting-coords") as HTMLInputElement | null;
    if (cb)
      cb.onchange = () => {
        this.state.settings.coords = cb.checked;
        this.saveSoon();
        this.render();
      };
    const guidance = $("setting-guidance") as HTMLInputElement | null;
    if (guidance)
      guidance.onchange = () => {
        this.state.settings.guidance = guidance.checked;
        this.saveSoon();
        this.announce(guidance.checked ? "Beginner guidance enabled" : "Beginner guidance hidden");
        this.render();
      };
    this.bind("clear-data", async () => {
      if (!confirm("First confirmation: clear ALL local chess progress?"))
        return;
      if (
        !confirm(
          "Final confirmation: this action cannot be undone without a backup. Continue?",
        )
      )
        return;
      this.state = freshState();
      this.state.seededStarter = true;
      this.blunderId = "";
      let recoveryCleared = true;
      try {
        localStorage.removeItem(PRACTICE_RECOVERY_KEY);
      } catch {
        recoveryCleared = false;
      }
      await this.save();
      this.announce(recoveryCleared
        ? "Local progress cleared"
        : "Local progress cleared; browser blocked temporary snapshot cleanup");
      this.render();
    });
  }
}
