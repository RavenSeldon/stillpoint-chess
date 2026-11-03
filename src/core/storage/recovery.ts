import { Chess, type Color } from "../chess/Chess.js";

export const PRACTICE_RECOVERY_KEY = "stillpoint.practice-recovery.v1";
export const PRACTICE_RECOVERY_TTL_MS = 10 * 60 * 1000;

export type PracticeRecovery = {
  version: 1;
  savedAt: number;
  pgn: string;
  fen: string;
  player: Color;
  orientation: Color;
  gameResult: string | null;
  gameSaved: boolean;
  selectedTime: string;
  clocks: [number, number];
  increment: number;
  coach: boolean;
  status: string;
  depth: number;
};

const times = new Set(["zen", "10+0", "15+10", "3+2", "5+0"]);
const results = new Set([null, "*", "1-0", "0-1", "1/2-1/2"]);
const validNumber = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

/** Parse untrusted local storage without ever restoring a partial or impossible game. */
export function parsePracticeRecovery(raw: string | null, now = Date.now()): PracticeRecovery | null {
  if (!raw || raw.length > 120_000) return null;
  try {
    const value = JSON.parse(raw) as Partial<PracticeRecovery>;
    const age = typeof value.savedAt === "number" ? now - value.savedAt : -1;
    if (
      value.version !== 1 ||
      age < 0 || age > PRACTICE_RECOVERY_TTL_MS ||
      typeof value.pgn !== "string" || value.pgn.length > 100_000 ||
      typeof value.fen !== "string" || value.fen.length > 200 ||
      !["w", "b"].includes(value.player || "") ||
      !["w", "b"].includes(value.orientation || "") ||
      !results.has(value.gameResult ?? null) ||
      typeof value.gameSaved !== "boolean" ||
      !times.has(value.selectedTime || "") ||
      !Array.isArray(value.clocks) || value.clocks.length !== 2 ||
      !value.clocks.every((clock) => validNumber(clock, 0, 86_400)) ||
      !validNumber(value.increment, 0, 60) ||
      typeof value.coach !== "boolean" ||
      typeof value.status !== "string" || value.status.length > 500 ||
      !Number.isInteger(value.depth) || !validNumber(value.depth, 1, 6)
    ) return null;

    const game = new Chess().loadPgn(value.pgn);
    if (game.fen() !== value.fen) return null;
    return {
      version: 1,
      savedAt: value.savedAt!,
      pgn: value.pgn,
      fen: value.fen,
      player: value.player as Color,
      orientation: value.orientation as Color,
      gameResult: value.gameResult ?? null,
      gameSaved: value.gameSaved,
      selectedTime: value.selectedTime!,
      clocks: [value.clocks[0], value.clocks[1]],
      increment: value.increment!,
      coach: value.coach,
      status: value.status,
      depth: value.depth!,
    };
  } catch {
    return null;
  }
}
