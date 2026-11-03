import { due } from "../srs/scheduler.js";
import type { LearningArea, LearningAttempt, SaveState } from "../storage/db.js";

export type LearningTarget = "play" | "openings" | "visualize" | "endgames" | "blunders" | "masters";
export type PracticeMode = "coordinates" | "color" | "knight" | "calculation" | "guess" | "drill";
export type SkillProfile = {
  id: LearningArea;
  label: string;
  score: number;
  confidence: number;
  evidence: number;
  recentChange: number | null;
  status: "Baseline" | "Growth edge" | "Developing" | "Strength";
};
export type Recommendation = {
  area: LearningArea;
  title: string;
  reason: string;
  action: string;
  target: LearningTarget;
  key?: string;
  mode?: PracticeMode;
};
export type LearningProfile = {
  skills: SkillProfile[];
  recommendations: Recommendation[];
  strongest: SkillProfile | null;
  growthEdge: SkillProfile | null;
  recordedAttempts: number;
  recentAttempts: number;
};

export const skillOrder: LearningArea[] = ["play", "openings", "tactics", "visualization", "calculation", "endgames", "study"];
export const skillLabels: Record<LearningArea, string> = {
  play: "Game craft",
  openings: "Openings",
  tactics: "Pattern repair",
  visualization: "Visualization",
  calculation: "Calculation",
  endgames: "Endgames",
  study: "Master study",
};

type Evidence = { value: number; weight: number; timestamp: number };
type LearningState = Pick<SaveState, "games" | "blunders" | "srs" | "stats" | "learning">;
const DAY = 86_400_000;
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function historyStats(attempts: LearningAttempt[], predicate: (attempt: LearningAttempt) => boolean) {
  const selected = attempts.filter(predicate);
  return {
    attempts: selected.length,
    correct: selected.filter((attempt) => attempt.correct).length,
    latest: selected.reduce((latest, attempt) => Math.max(latest, attempt.timestamp), 0),
  };
}

function aggregate(
  output: Evidence[],
  attempts: number,
  correct: number,
  timestamp: number,
  valueAdjustment = 0,
) {
  if (attempts <= 0) return;
  const accuracy = clamp(correct / attempts);
  output.push({
    value: clamp(accuracy + valueAdjustment),
    weight: Math.min(6, attempts),
    timestamp,
  });
}

function gameValue(result: string, side: "w" | "b") {
  if (result === "1/2-1/2") return 0.5;
  if (result === "1-0") return side === "w" ? 1 : 0;
  if (result === "0-1") return side === "b" ? 1 : 0;
  return 0.5;
}

function collectEvidence(state: LearningState): Record<LearningArea, Evidence[]> {
  const result = {} as Record<LearningArea, Evidence[]>;
  for (const area of skillOrder) result[area] = [];
  for (const attempt of state.learning) {
    result[attempt.area].push({ value: attempt.correct ? 1 : 0, weight: 1, timestamp: attempt.timestamp });
  }
  for (const game of state.games) {
    if (game.mode && game.mode !== "play") continue;
    result.play.push({ value: gameValue(game.result, game.playerSide), weight: 1, timestamp: game.date });
  }

  for (const [key, srs] of Object.entries(state.srs)) {
    const recorded = historyStats(state.learning, (attempt) => attempt.area === "openings" && attempt.key === key);
    const attempts = Math.max(0, srs.attempts - recorded.attempts);
    const correct = Math.max(0, srs.correctCount - recorded.correct);
    const masteryAdjustment = (srs.masteryPercent / 100 - (attempts ? correct / attempts : 0)) * 0.25;
    aggregate(result.openings, attempts, correct, 0, masteryAdjustment);
  }

  for (const blunder of state.blunders) {
    const recorded = historyStats(state.learning, (attempt) => attempt.area === "tactics" && attempt.key === blunder.id);
    aggregate(result.tactics, Math.max(0, blunder.solved - recorded.correct), Math.max(0, blunder.solved - recorded.correct), blunder.timestamp || 0);
  }

  const colors = historyStats(state.learning, (attempt) => attempt.area === "visualization" && attempt.key.startsWith("color:"));
  aggregate(result.visualization, Math.max(0, state.stats.colorAttempts - colors.attempts), Math.max(0, state.stats.colorCorrect - colors.correct), 0);
  const knights = historyStats(state.learning, (attempt) => attempt.area === "visualization" && attempt.key.startsWith("knight:"));
  aggregate(result.visualization, Math.max(0, state.stats.knightSolved - knights.correct), Math.max(0, state.stats.knightSolved - knights.correct), 0);

  const calculations = historyStats(state.learning, (attempt) => attempt.area === "calculation");
  aggregate(result.calculation, Math.max(0, state.stats.calcSolved - calculations.correct), Math.max(0, state.stats.calcSolved - calculations.correct), 0);
  const studies = historyStats(state.learning, (attempt) => attempt.area === "study");
  aggregate(result.study, Math.max(0, state.stats.masterSolved - studies.correct), Math.max(0, state.stats.masterSolved - studies.correct), 0);
  return result;
}

function recentChange(state: LearningState, area: LearningArea, now: number) {
  const events = [
    ...state.learning.filter((attempt) => attempt.area === area).map((attempt) => ({ timestamp: attempt.timestamp, value: attempt.correct ? 1 : 0 })),
    ...(area === "play" ? state.games.filter((game) => !game.mode || game.mode === "play").map((game) => ({ timestamp: game.date, value: gameValue(game.result, game.playerSide) })) : []),
  ].filter((event) => event.timestamp <= now).sort((a, b) => b.timestamp - a.timestamp);
  if (events.length < 4) return null;
  const recent = events.slice(0, Math.min(5, Math.ceil(events.length / 2)));
  const previous = events.slice(recent.length, recent.length * 2);
  if (!previous.length) return null;
  const mean = (items: typeof events) => items.reduce((sum, item) => sum + item.value, 0) / items.length;
  return Math.round((mean(recent) - mean(previous)) * 100);
}

function recommendationFor(area: LearningArea, skill: SkillProfile, key?: string, reason?: string): Recommendation {
  const base = {
    play: { title: "Play a focused game", action: "Enter the practice board", target: "play" },
    openings: { title: "Rehearse an opening", action: "Open recall drill", target: "openings", mode: "drill" },
    tactics: { title: "Repair a pattern", action: "Open Blunder Bank", target: "blunders" },
    visualization: { title: "Train board vision", action: "Open visualization", target: "visualize" },
    calculation: { title: "Hold a sequence in mind", action: "Open calculation", target: "visualize", mode: "calculation" },
    endgames: { title: "Practice an ending", action: "Open endgames", target: "endgames" },
    study: { title: "Learn from a master", action: "Guess a master move", target: "masters", mode: "guess" },
  } as const;
  const selected = base[area];
  let inferredReason = reason || "A balanced next step in your practice.";
  if (!reason && skill.evidence < 2) inferredReason = "Little evidence yet—use this as a gentle baseline.";
  else if (!reason && skill.status === "Strength") inferredReason = "A relative strength; keep it sharp with deliberate practice.";
  else if (!reason && skill.status === "Growth edge") inferredReason = "Your recorded results make this a useful growth edge.";
  const recommendation: Recommendation = { area, ...selected, reason: inferredReason };
  if (key) recommendation.key = key;
  if (area === "visualization" && !recommendation.mode) recommendation.mode = skill.evidence < 2 ? "coordinates" : "knight";
  return recommendation;
}

export function buildLearningProfile(state: LearningState, now = Date.now()): LearningProfile {
  const evidence = collectEvidence(state);
  const skills = skillOrder.map((id): SkillProfile => {
    const items = evidence[id];
    const weighted = items.map((item) => {
      const ageDays = item.timestamp > 0 ? Math.max(0, now - item.timestamp) / DAY : 60;
      const recency = item.timestamp > 0 ? 0.6 + 0.4 * Math.exp(-ageDays / 45) : 0.55;
      return { ...item, effectiveWeight: item.weight * recency };
    });
    const totalWeight = weighted.reduce((sum, item) => sum + item.effectiveWeight, 0);
    const observed = weighted.reduce((sum, item) => sum + item.value * item.effectiveWeight, 0);
    const score = Math.round(100 * (1 + observed) / (2 + totalWeight));
    const rawEvidence = items.reduce((sum, item) => sum + item.weight, 0);
    const confidence = Math.min(100, Math.round(rawEvidence / 10 * 100));
    const status = rawEvidence < 2 ? "Baseline" : score >= 72 ? "Strength" : score <= 48 ? "Growth edge" : "Developing";
    return { id, label: skillLabels[id], score, confidence, evidence: Math.round(rawEvidence), recentChange: recentChange(state, id, now), status };
  });
  const informed = skills.filter((skill) => skill.evidence >= 2);
  let strongest: SkillProfile | null = null;
  let growthEdge: SkillProfile | null = null;
  if (informed.length === 1) {
    if (informed[0].status === "Strength") strongest = informed[0];
    if (informed[0].status === "Growth edge") growthEdge = informed[0];
  } else if (informed.length > 1) {
    strongest = [...informed].sort((a, b) => b.score - a.score || b.confidence - a.confidence)[0];
    growthEdge = [...informed].sort((a, b) => a.score - b.score || a.confidence - b.confidence)[0];
  }
  const recommendations: Recommendation[] = [];
  const used = new Set<LearningArea>();
  const add = (area: LearningArea, key?: string, reason?: string) => {
    if (used.has(area) || recommendations.length >= 4) return;
    used.add(area);
    recommendations.push(recommendationFor(area, skills.find((skill) => skill.id === area)!, key, reason));
  };

  const dueOpening = Object.entries(state.srs).filter(([, srs]) => due(srs, now)).sort((a, b) => a[1].nextDueTimestamp - b[1].nextDueTimestamp)[0];
  if (dueOpening) add("openings", dueOpening[0], "Due now for spaced review; revisit before adding new lines.");
  const personalBlunder = state.blunders.filter((blunder) => !blunder.starter).sort((a, b) => a.solved - b.solved || (b.timestamp || 0) - (a.timestamp || 0))[0];
  if (personalBlunder) add("tactics", personalBlunder.id, "A position from your own games is ready for pattern repair.");
  if (growthEdge) add(growthEdge.id);
  if (strongest && strongest.id !== growthEdge?.id) add(strongest.id);
  for (const skill of [...skills].sort((a, b) => a.confidence - b.confidence || a.score - b.score)) add(skill.id);

  return {
    skills,
    recommendations,
    strongest,
    growthEdge,
    recordedAttempts: state.learning.length,
    recentAttempts: state.learning.filter((attempt) => now - attempt.timestamp >= 0 && now - attempt.timestamp <= 7 * DAY).length,
  };
}
