import test from "node:test";
import assert from "node:assert/strict";
import { Chess, INITIAL_FEN } from "../../dist/assets/core/chess/Chess.js";
import { explainMove } from "../../dist/assets/core/learning/explanations.js";
import { guideCopy, lessonLanguages, scopeNotes } from "../../dist/assets/core/learning/languages.js";

function beforePgn(pgn) {
  return new Chess().loadPgn(pgn).fen();
}

test("e4 is decoded for a beginner with concrete central and opening effects", () => {
  const lesson = explainMove(INITIAL_FEN, "e4");
  assert.equal(lesson.san, "e4");
  assert.match(lesson.reading, /pawn from e2 to e4/);
  assert.match(lesson.reading, /omit a piece letter/);
  assert.ok(lesson.reasons.some((reason) => reason.includes("four central squares")));
});

test("Chinese move reading and reasons preserve the same legal facts", () => {
  const lesson = explainMove(INITIAL_FEN, "e2e4", "zh");
  assert.equal(lesson.san, "e4");
  assert.match(lesson.reading, /兵从 e2 到 e4/);
  assert.match(lesson.reading, /不写棋子字母/);
  assert.ok(lesson.reasons.some((reason) => reason.includes("中心影响")));
});

test("French and Dutch move readings preserve concrete legal and central facts", () => {
  const french = explainMove(INITIAL_FEN, "e2e4", "fr");
  assert.equal(french.san, "e4");
  assert.match(french.reading, /pion de e2 à e4/);
  assert.match(french.reading, /ne comporte pas de lettre de pièce/);
  assert.ok(french.reasons.some((reason) => reason.includes("Influence centrale")));

  const dutch = explainMove(INITIAL_FEN, "e2e4", "nl");
  assert.equal(dutch.san, "e4");
  assert.match(dutch.reading, /pion van e2 naar e4/);
  assert.match(dutch.reading, /geen stukletter/);
  assert.ok(dutch.reasons.some((reason) => reason.includes("Centrale invloed")));
});

test("development explains Nf3 without inventing a guaranteed strategy", () => {
  const lesson = explainMove(INITIAL_FEN, "Nf3");
  assert.match(lesson.reading, /knight from g1 to f3/);
  assert.match(lesson.reading, /use N/);
  assert.ok(lesson.reasons.some((reason) => reason.startsWith("Development:")));
});

test("captures identify the removed piece and remind about recapture", () => {
  const lesson = explainMove(beforePgn("1. e4 d5"), "exd5");
  assert.match(lesson.reading, /with a capture/);
  assert.ok(lesson.reasons.some((reason) => reason.includes("Black pawn") && reason.includes("recaptured")));
});

test("check and checkmate use distinct plain-language explanations", () => {
  const check = explainMove(beforePgn("1. e4 e5 2. Qh5 Nc6"), "Qe5+");
  assert.match(check.reading, /\+ means check/);
  assert.ok(check.reasons.some((reason) => reason.startsWith("Check:")));
  assert.ok(check.reasons.every((reason) => !reason.startsWith("Checkmate:")));

  const mate = explainMove(beforePgn("1. f3 e5 2. g4"), "Qh4#");
  assert.match(mate.reading, /# means checkmate/);
  assert.ok(mate.reasons.some((reason) => reason.startsWith("Checkmate:")));
});

test("castling and promotion explain the actual transformation", () => {
  const castle = explainMove(beforePgn("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5"), "O-O");
  assert.match(castle.reading, /castle kingside/);
  assert.match(castle.reading, /king moves from e1 to g1/);
  assert.ok(castle.reasons.some((reason) => reason.startsWith("Castling")));

  const promotion = explainMove("7k/P7/8/8/8/8/8/7K w - - 0 1", "a7a8q");
  assert.equal(promotion.san, "a8=Q+");
  assert.ok(promotion.reasons.some((reason) => reason.includes("becomes a queen")));
});

test("illegal moves cannot receive a fabricated explanation", () => {
  assert.throws(() => explainMove(INITIAL_FEN, "e5"), /Illegal move/);
  assert.throws(() => explainMove(INITIAL_FEN, "Ke2"), /Illegal move/);
});

test("every lesson language has a scope note and guide copy in its own language", () => {
  for (const language of lessonLanguages) {
    assert.ok(scopeNotes[language] && scopeNotes[language].length > 40, `scope note missing for ${language}`);
    assert.ok(guideCopy[language].title.length > 3, `guide title missing for ${language}`);
  }
  assert.ok(/[一-鿿]/.test(scopeNotes.zh), "Chinese scope note must actually be Chinese");
  assert.ok(/[一-鿿]/.test(guideCopy.zh.title), "Chinese preview must actually be Chinese");
  assert.ok(!/[一-鿿]/.test(scopeNotes.en) && !/[一-鿿]/.test(scopeNotes.fr) && !/[一-鿿]/.test(scopeNotes.nl));
});
