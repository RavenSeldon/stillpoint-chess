import test from "node:test";
import assert from "node:assert/strict";
import { buildLearningProfile } from "../../dist/assets/core/learning/engine.js";
import { freshState, validateSave, themeIds } from "../../dist/assets/core/storage/db.js";
import { freshSrs, review } from "../../dist/assets/core/srs/scheduler.js";

const now = Date.UTC(2026, 10, 3, 12);
const attempt = (area, correct, key, timestamp = now) => ({ id: crypto.randomUUID(), area, correct, key, timestamp });

test("learning profile begins with an honest, varied baseline", () => {
  const profile = buildLearningProfile(freshState(), now);
  assert.equal(profile.skills.length, 7);
  assert.equal(profile.recommendations.length, 4);
  assert.equal(profile.strongest, null);
  assert.equal(profile.growthEdge, null);
  for (const skill of profile.skills) {
    assert.equal(skill.score, 50);
    assert.equal(skill.confidence, 0);
    assert.equal(skill.status, "Baseline");
  }
});

test("history identifies growth edges and strengths without ratings", () => {
  const state = freshState();
  state.learning = [
    ...Array.from({ length: 4 }, () => attempt("visualization", false, "color:a1")),
    ...Array.from({ length: 4 }, () => attempt("openings", true, "italian")),
  ];
  const profile = buildLearningProfile(state, now);
  assert.equal(profile.growthEdge.id, "visualization");
  assert.equal(profile.strongest.id, "openings");
  assert.ok(profile.recommendations.some((item) => item.area === "visualization"));
  assert.ok(profile.recommendations.some((item) => item.area === "openings"));
  assert.ok(profile.skills.every((skill) => skill.score >= 0 && skill.score <= 100));
});

test("a single informed skill is not both a strength and growth edge", () => {
  const state = freshState();
  state.learning = [attempt("visualization", true, "color:a1"), attempt("visualization", true, "color:h8")];
  const profile = buildLearningProfile(state, now);
  assert.equal(profile.strongest.id, "visualization");
  assert.equal(profile.growthEdge, null);
  assert.ok(profile.recommendations.some((item) => item.area === "visualization"));
});

test("recent trend compares successive local outcomes", () => {
  const state = freshState();
  state.learning = [
    attempt("study", true, "morphy:12", now - 86_400_000),
    attempt("study", true, "morphy:18", now - 86_400_000),
    attempt("study", false, "morphy:12", now - 10 * 86_400_000),
    attempt("study", false, "morphy:18", now - 10 * 86_400_000),
  ];
  const study = buildLearningProfile(state, now).skills.find((skill) => skill.id === "study");
  assert.equal(study.recentChange, 100);
});

test("game outcomes are read against opponent tier, not flat averages", () => {
  const game = (strength, result) => ({ id: crypto.randomUUID(), date: now, pgn: "1. e4 e5", result, playerSide: "w", mode: "play", strength });
  const beatStrong = freshState();
  beatStrong.games = [game(6, "1-0"), game(6, "1-0"), game(6, "1-0"), game(6, "1-0")];
  const beatNovice = freshState();
  beatNovice.games = [game(1, "1-0"), game(1, "1-0"), game(1, "1-0"), game(1, "1-0")];
  const strongScore = buildLearningProfile(beatStrong, now).skills.find((skill) => skill.id === "play").score;
  const noviceScore = buildLearningProfile(beatNovice, now).skills.find((skill) => skill.id === "play").score;
  assert.ok(strongScore > noviceScore, `expected ${strongScore} > ${noviceScore}`);
  const legacy = freshState();
  legacy.games = [{ id: crypto.randomUUID(), date: now, pgn: "1. e4 e5", result: "1-0", playerSide: "w" }];
  assert.doesNotThrow(() => buildLearningProfile(legacy, now));
});

test("due personal blunders are recommended before unscheduled ones", () => {
  const state = freshState();
  const base = { fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", bad: "Re2", best: "Re8#", starter: false };
  state.blunders = [
    { ...base, id: "later", solved: 0, title: "later", nextDueTimestamp: now + 86_400_000, intervalDays: 1 },
    { ...base, id: "due", solved: 5, title: "due", nextDueTimestamp: now - 1, intervalDays: 3 },
  ];
  const tactics = buildLearningProfile(state, now).recommendations.find((item) => item.area === "tactics");
  assert.equal(tactics.key, "due");
});

test("new opening events do not duplicate aggregate SRS evidence", () => {
  const withSrs = freshState();
  withSrs.learning = [attempt("openings", true, "italian"), attempt("openings", true, "italian")];
  withSrs.srs.italian = review(review(freshSrs(), true, now), true, now);
  const withoutSrs = { ...withSrs, srs: {} };
  const scoreWith = buildLearningProfile(withSrs, now).skills.find((skill) => skill.id === "openings").score;
  const scoreWithout = buildLearningProfile(withoutSrs, now).skills.find((skill) => skill.id === "openings").score;
  assert.equal(scoreWith, scoreWithout);
});

test("four themes and legacy preferences migrate; learning history validates", () => {
  for (const theme of themeIds) {
    const state = freshState();
    state.settings.theme = theme;
    state.learning = [attempt("calculation", true, "calc1")];
    assert.equal(validateSave(state).settings.theme, theme);
    assert.equal(validateSave(state).learning.length, 1);
  }
  const legacy = freshState();
  delete legacy.learning;
  legacy.settings.theme = "dark";
  assert.equal(validateSave(legacy).settings.theme, "indigo");
  assert.deepEqual(validateSave(legacy).learning, []);
  legacy.settings.theme = "light";
  assert.equal(validateSave(legacy).settings.theme, "paper");
  assert.throws(() => validateSave({ ...freshState(), learning: [{ id: "bad", area: "unknown" }] }));
});

test("guidance, lesson language, and reading preferences migrate and validate", () => {
  const legacy = freshState();
  delete legacy.settings.guidance;
  delete legacy.settings.language;
  delete legacy.settings.largeText;
  delete legacy.settings.reduceMotion;
  const migrated = validateSave(legacy).settings;
  assert.equal(migrated.guidance, true);
  assert.equal(migrated.language, "en");
  assert.equal(migrated.largeText, false);
  assert.equal(migrated.reduceMotion, false);

  for (const language of ["zh", "fr", "nl"]) {
    const customized = freshState();
    Object.assign(customized.settings, { guidance: false, language, largeText: true, reduceMotion: true });
    assert.deepEqual(validateSave(customized).settings, customized.settings);
  }
  for (const settings of [
    { guidance: "yes" },
    { language: "de" },
    { largeText: 1 },
    { reduceMotion: null },
  ]) assert.throws(() => validateSave({ ...freshState(), settings: { ...freshState().settings, ...settings } }));
});
