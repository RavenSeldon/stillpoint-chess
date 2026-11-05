import test from "node:test";
import assert from "node:assert/strict";
import { translateText } from "../../dist/assets/ui/localization.js";

const explanation = "The pawn occupies the center and opens diagonals for the queen and the f1 bishop.";

test("static interface and course dictionaries cover every supported locale", () => {
  for (const language of ["zh", "fr", "nl"]) {
    for (const source of [
      "PRACTICE AGAINST THE ENGINE",
      "Recent practice game restored",
      "That move is not legal in the imagined position. Recalculate the sequence.",
      "Rapid 15+10",
      "Best move, SAN or UCI",
      explanation,
      "The pawn occupies the center and opens diagonals for the queen and f1 bishop.",
    ]) assert.notEqual(translateText(source, language), source, `${language}: ${source}`);
  }
});

test("composed feedback recursively translates explanations, scores, and goals", () => {
  const sources = [
    `Correct: e4. ${explanation}`,
    "Opponent played e5. Black claims matching central space and opens paths for the queen and f8 bishop.",
    "Best · estimated −0.34 percentage points · 82% estimated move accuracy. Preferred e4 (+0.34 pawns); after d5: +0.10 pawns.",
    "Flag fall · Objective not met: Promote your pawn or checkmate.",
    "Correct. The final rook delivers mate: the position was prepared long before the last move.",
    "Recovered recent practice · Engine played e5",
  ];
  for (const language of ["zh", "fr", "nl"]) {
    for (const source of sources) {
      const translated = translateText(source, language);
      assert.notEqual(translated, source, `${language}: ${source}`);
      assert.ok(!translated.includes("pawns"), `${language} score: ${translated}`);
      assert.ok(!translated.includes("Engine played"), `${language} recovery: ${translated}`);
      assert.ok(!translated.includes("Promote your pawn"), `${language} goal: ${translated}`);
    }
  }
});

test("multi-sentence verdicts and readable activity labels do not leak English", () => {
  const independent = "Transfer confirmed: Qxf7#. You recognized the idea in a position you had never seen—the strongest evidence of learning this dojo measures.";
  const assisted = "Correct: Qh4#. Solved with a hint—an independent retry is scheduled soon; only independent solves advance the interval.";
  for (const language of ["zh", "fr", "nl"]) {
    for (const source of [independent, assisted]) {
      const translated = translateText(source, language);
      assert.ok(!translated.includes("You recognized"), `${language}: ${translated}`);
      assert.ok(!translated.includes("Solved with"), `${language}: ${translated}`);
      assert.ok(!translated.includes("strongest evidence"), `${language}: ${translated}`);
    }
    for (const source of ["Coordinate Blitz · e4", "Square Color · a1", "Knight Path · b1–f6", "Opening · Italian Game", "Transfer test · mate in one"]) {
      assert.notEqual(translateText(source, language), source, `${language}: ${source}`);
    }
  }
});
