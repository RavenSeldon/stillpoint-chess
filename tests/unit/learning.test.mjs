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
