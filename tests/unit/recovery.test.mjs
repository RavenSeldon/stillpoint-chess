import test from "node:test";
import assert from "node:assert/strict";
import { Chess, INITIAL_FEN } from "../../dist/assets/core/chess/Chess.js";
import {
  PRACTICE_RECOVERY_TTL_MS,
  parsePracticeRecovery,
} from "../../dist/assets/core/storage/recovery.js";

const now = Date.parse("2026-11-03T13:00:00.000Z");
const game = new Chess();
game.move("e4");
game.move("e5");
const snapshot = {
  version: 1,
  savedAt: now,
  pgn: game.pgn(),
  fen: game.fen(),
  player: "w",
  orientation: "w",
  gameResult: null,
  gameSaved: false,
  selectedTime: "zen",
  clocks: [0, 0],
  increment: 0,
  coach: true,
  status: "Engine played e5",
  depth: 3,
};
const encode = (value) => JSON.stringify(value);

test("valid practice recovery round-trips every persisted field", () => {
  assert.deepEqual(parsePracticeRecovery(encode(snapshot), now), snapshot);
  assert.deepEqual(parsePracticeRecovery(encode(snapshot), now + PRACTICE_RECOVERY_TTL_MS), snapshot);
});

test("expired and future-dated recovery snapshots are rejected", () => {
  assert.equal(parsePracticeRecovery(encode(snapshot), now + PRACTICE_RECOVERY_TTL_MS + 1), null);
  assert.equal(parsePracticeRecovery(encode(snapshot), now - 1), null);
});

test("missing, malformed, and oversized recovery records are rejected", () => {
  assert.equal(parsePracticeRecovery(null, now), null);
  assert.equal(parsePracticeRecovery("not json", now), null);
  assert.equal(parsePracticeRecovery("x".repeat(120_001), now), null);
  assert.equal(parsePracticeRecovery(encode({ ...snapshot, version: 2 }), now), null);
});

test("illegal PGN and a tampered final FEN are rejected", () => {
  assert.equal(parsePracticeRecovery(encode({ ...snapshot, pgn: "1. e9" }), now), null);
  assert.equal(parsePracticeRecovery(encode({ ...snapshot, fen: INITIAL_FEN }), now), null);
});

test("invalid clock, result, side, and engine settings are rejected", () => {
  for (const patch of [
    { clocks: [-1, 0] },
    { clocks: [0] },
    { increment: 61 },
    { gameResult: "white won" },
    { player: "both" },
    { depth: 7 },
    { selectedTime: "1+0" },
  ]) assert.equal(parsePracticeRecovery(encode({ ...snapshot, ...patch }), now), null);
});
