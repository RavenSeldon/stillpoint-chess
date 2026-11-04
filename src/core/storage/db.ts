import { Chess } from "../chess/Chess.js";
import type { SRS } from "../srs/scheduler.js";
import { lessonLanguages, type LessonLanguage } from "../learning/languages.js";

export const themeIds = ["indigo", "paper", "forest", "ember"] as const;
export type Theme = typeof themeIds[number];
export const learningAreas = ["play", "openings", "tactics", "visualization", "calculation", "endgames", "study"] as const;
export type LearningArea = typeof learningAreas[number];
export type LearningAttempt = {
  id: string;
  area: LearningArea;
  correct: boolean;
  timestamp: number;
  key: string;
};
export type Blunder = {
  id: string;
  fen: string;
  bad: string;
  best: string;
  solved: number;
  starter: boolean;
  title: string;
  lesson?: string;
  timestamp?: number;
  /** Spaced-review state; absent on legacy records until their first scheduled solve. */
  intervalDays?: number;
  nextDueTimestamp?: number;
  /** Verified tactical idea behind the correction; absent when unverifiable. */
  pattern?: "mate-one" | "hanging-piece" | "fork";
};
export type SavedGame = {
  id: string;
  date: number;
  pgn: string;
  result: string;
  playerSide: "w" | "b";
  mode?: "play" | "endgame";
  /** Opponent tier (1–6) so outcomes are read against difficulty, not flat averages. */
  strength?: number;
};
export type SaveState = {
  version: 1;
  seededStarter: boolean;
  games: SavedGame[];
  blunders: Blunder[];
  srs: Record<string, SRS>;
  learning: LearningAttempt[];
  stats: {
    coordinateBest: number;
    colorCorrect: number;
    colorAttempts: number;
    knightSolved: number;
    calcSolved: number;
    masterSolved: number;
  };
  settings: {
    theme: Theme;
    coords: boolean;
    sound: boolean;
    guidance: boolean;
    language: LessonLanguage;
    largeText: boolean;
    reduceMotion: boolean;
  };
};

export function freshState(): SaveState {
  return {
    version: 1,
    seededStarter: false,
    games: [],
    blunders: [],
    srs: {},
    learning: [],
    stats: { coordinateBest: 0, colorCorrect: 0, colorAttempts: 0, knightSolved: 0, calcSolved: 0, masterSolved: 0 },
    settings: { theme: "indigo", coords: true, sound: false, guidance: true, language: "en", largeText: false, reduceMotion: false },
  };
}

function normalizeTheme(value: unknown): Theme {
  const legacy = { dark: "indigo", light: "paper" } as const;
  const candidate = String(value) in legacy ? legacy[String(value) as keyof typeof legacy] : String(value);
  if (!(themeIds as readonly string[]).includes(candidate)) throw Error("Invalid theme");
  return candidate as Theme;
}

function validateLearning(value: unknown): LearningAttempt[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 5000) throw Error("Invalid learning history");
  return value.map((raw: unknown) => {
    const attempt = raw as LearningAttempt;
    if (!attempt || typeof attempt.id !== "string" || attempt.id.length > 100 || typeof attempt.key !== "string" || attempt.key.length > 160 || typeof attempt.correct !== "boolean" || typeof attempt.timestamp !== "number" || !Number.isFinite(attempt.timestamp) || attempt.timestamp < 0 || !(learningAreas as readonly string[]).includes(attempt.area)) {
      throw Error("Invalid learning attempt");
    }
    return { ...attempt };
  });
}

export function validateSave(data: unknown): SaveState {
  if (!data || typeof data !== "object") throw Error("Backup must be a JSON object");
  const x = data as Record<string, unknown>;
  if (x.version !== 1) throw Error("Unsupported backup version");
  const p = freshState();
  if (x.seededStarter !== undefined && typeof x.seededStarter !== "boolean") throw Error("Invalid starter seeding flag");
  p.seededStarter = x.seededStarter === true;

  if (!Array.isArray(x.games) || x.games.length > 2000) throw Error("Invalid games list");
  p.games = x.games.map((raw: unknown) => {
    const g = raw as SavedGame;
    if (!g || typeof g.id !== "string" || typeof g.pgn !== "string" || typeof g.date !== "number" || !["w", "b"].includes(g.playerSide) || typeof g.result !== "string" || (g.mode !== undefined && !["play", "endgame"].includes(g.mode)) || (g.strength !== undefined && (!Number.isInteger(g.strength) || g.strength < 1 || g.strength > 6))) throw Error("Invalid game");
    new Chess().loadPgn(g.pgn);
    return { ...g };
  });

  if (!Array.isArray(x.blunders) || x.blunders.length > 3000) throw Error("Invalid blunders");
  p.blunders = x.blunders.map((raw: unknown) => {
    const b = raw as Blunder;
    if (!b || typeof b.id !== "string" || typeof b.fen !== "string" || typeof b.best !== "string" || typeof b.bad !== "string" || !Number.isInteger(b.solved) || b.solved < 0 || typeof b.starter !== "boolean" || typeof b.title !== "string" || (b.lesson !== undefined && (typeof b.lesson !== "string" || b.lesson.length > 1200)) || (b.intervalDays !== undefined && (!Number.isFinite(b.intervalDays) || b.intervalDays < 0 || b.intervalDays > 365)) || (b.nextDueTimestamp !== undefined && (!Number.isFinite(b.nextDueTimestamp) || b.nextDueTimestamp < 0)) || (b.pattern !== undefined && !["mate-one", "hanging-piece", "fork"].includes(b.pattern))) throw Error("Invalid blunder");
    const test = new Chess(b.fen);
    test.move(b.best);
    new Chess(b.fen).move(b.bad);
    return { ...b };
  });

  if (!x.srs || typeof x.srs !== "object" || Array.isArray(x.srs)) throw Error("Invalid SRS progress");
  p.srs = {};
  for (const [key, value] of Object.entries(x.srs)) {
    const v = value as SRS;
    if (!/^[a-z-]{1,40}$/.test(key) || !v || typeof v !== "object" || !["attempts", "correctCount", "lapseCount", "intervalDays", "easeFactor", "nextDueTimestamp", "masteryPercent"].every((field) => typeof (v as unknown as Record<string, unknown>)[field] === "number" && Number.isFinite((v as unknown as Record<string, number>)[field]))) throw Error("Invalid SRS record");
    p.srs[key] = { ...v };
  }

  p.learning = validateLearning(x.learning);
  if (!x.stats || typeof x.stats !== "object") throw Error("Missing stats");
  for (const key of Object.keys(p.stats) as (keyof SaveState["stats"])[]) {
    const value = (x.stats as Record<string, unknown>)[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw Error("Invalid stats");
    p.stats[key] = value;
  }

  if (!x.settings || typeof x.settings !== "object") throw Error("Missing settings");
  const settings = x.settings as Record<string, unknown>;
  if (
    typeof settings.coords !== "boolean" ||
    typeof settings.sound !== "boolean" ||
    (settings.guidance !== undefined && typeof settings.guidance !== "boolean") ||
    (settings.language !== undefined && !(lessonLanguages as readonly string[]).includes(String(settings.language))) ||
    (settings.largeText !== undefined && typeof settings.largeText !== "boolean") ||
    (settings.reduceMotion !== undefined && typeof settings.reduceMotion !== "boolean")
  ) throw Error("Invalid settings");
  p.settings = {
    theme: normalizeTheme(settings.theme),
    coords: settings.coords,
    sound: settings.sound,
    guidance: settings.guidance !== false,
    language: (lessonLanguages as readonly string[]).includes(String(settings.language)) ? settings.language as LessonLanguage : "en",
    largeText: settings.largeText === true,
    reduceMotion: settings.reduceMotion === true,
  };
  return p;
}

export class LocalDatabase {
  private db: IDBDatabase | null = null;
  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("zen-chess-lab", 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("state")) req.result.createObjectStore("state");
      };
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }
  async read(): Promise<SaveState> {
    if (!this.db) throw Error("Database not opened");
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("state", "readonly");
      const req = tx.objectStore("state").get("current");
      req.onsuccess = () => {
        try { resolve(req.result ? validateSave(req.result) : freshState()); } catch (error) { reject(error); }
      };
      req.onerror = () => reject(req.error);
    });
  }
  async write(state: SaveState): Promise<void> {
    const valid = validateSave(state);
    if (!this.db) throw Error("Database not opened");
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("state", "readwrite");
      tx.objectStore("state").put(valid, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  async reset() { await this.write(freshState()); }
  async close() { this.db?.close(); this.db = null; }
}
