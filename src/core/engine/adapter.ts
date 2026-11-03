import { Chess, type Color } from "../chess/Chess.js";
import type { Score } from "../eval/math.js";

export type Analysis = {
  fen: string;
  bestMove: string | null;
  san: string | null;
  score: Score;
  /** White-positive display score. Mate is saturated only for chart compatibility. */
  scoreCp: number;
  depth: number;
  nodes: number;
  pv: string[];
  engine: string;
  complete: boolean;
};

export interface EngineAdapter {
  init(): Promise<void>;
  evaluatePosition(fen: string, depth?: number): Promise<Analysis>;
  getBestMove(fen: string, strength?: number): Promise<string | null>;
  cancel(): void;
  destroy(): void;
}

type Job = {
  fen: string;
  depth: number;
  moveTime: number;
  strength: number | null;
  resolve: (analysis: Analysis) => void;
  reject: (error: Error) => void;
};

type ActiveJob = Job & { latest?: Partial<Analysis> };

const ENGINE_NAME = "Stockfish 19 Lite · single-threaded";

function displayCp(score: Score): number {
  const raw =
    score.kind === "cp"
      ? score.value
      : score.moves > 0
        ? 10000 - Math.abs(score.moves) * 10
        : -10000 + Math.abs(score.moves) * 10;
  return score.perspective === "w" ? raw : -raw;
}

/** Parse one UCI info line without flattening mate scores into centipawns. */
export function parseUciInfo(line: string, sideToMove: Color): Partial<Analysis> {
  if (!line.startsWith("info ")) return {};
  const depth = /\bdepth (\d+)/.exec(line);
  const nodes = /\bnodes (\d+)/.exec(line);
  const cp = /\bscore cp (-?\d+)/.exec(line);
  const mate = /\bscore mate (-?\d+)/.exec(line);
  const pv = /\bpv (.+)$/.exec(line);
  const score: Score | undefined = mate
    ? { kind: "mate", moves: Number(mate[1]), perspective: sideToMove }
    : cp
      ? { kind: "cp", value: Number(cp[1]), perspective: sideToMove }
      : undefined;
  return {
    depth: depth ? Number(depth[1]) : undefined,
    nodes: nodes ? Number(nodes[1]) : undefined,
    score,
    scoreCp: score ? displayCp(score) : undefined,
    pv: pv ? pv[1].trim().split(/\s+/) : undefined,
  };
}

export class OfflineEngineAdapter implements EngineAdapter {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((error: Error) => void) | null = null;
  private queue: Job[] = [];
  private active: ActiveJob | null = null;

  async init() {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
      try {
        const url = new URL("engine/stockfish-19-lite-single.js", document.baseURI);
        this.worker = new Worker(url);
        this.worker.onmessage = (event: MessageEvent<string>) => this.receive(String(event.data));
        this.worker.onerror = (event) => {
          this.fail(new Error(event.message || "Stockfish worker failed to load"));
        };
        this.worker.postMessage("uci");
      } catch (error) {
        reject(error instanceof Error ? error : Error(String(error)));
      }
    });
    return this.ready;
  }

  private receive(line: string) {
    if (line === "uciok") {
      this.worker?.postMessage("isready");
      return;
    }
    if (line === "readyok") {
      this.readyResolve?.();
      this.readyResolve = null;
      this.readyReject = null;
      this.runNext();
      return;
    }
    const job = this.active;
    if (!job) return;
    if (line.startsWith("info ")) {
      job.latest = { ...job.latest, ...parseUciInfo(line, job.fen.split(" ")[1] as Color) };
      return;
    }
    const best = /^bestmove\s+(\S+)/.exec(line);
    if (!best) return;
    const bestMove = best[1] === "(none)" ? null : best[1];
    let san: string | null = null;
    if (bestMove) {
      try {
        san = new Chess(job.fen).move(bestMove).san;
      } catch {
        this.active = null;
        job.reject(new Error("Stockfish returned an illegal move"));
        this.runNext();
        return;
      }
    }
    const side = job.fen.split(" ")[1] as Color;
    const terminal = bestMove === null ? new Chess(job.fen).result() : null;
    const score: Score = job.latest?.score || (terminal && terminal !== "1/2-1/2"
      ? { kind: "mate", moves: 0, perspective: side }
      : { kind: "cp", value: 0, perspective: side });
    job.resolve({
      fen: job.fen,
      bestMove,
      san,
      score,
      scoreCp: displayCp(score),
      depth: job.latest?.depth || 0,
      nodes: job.latest?.nodes || 0,
      pv: job.latest?.pv || [],
      engine: ENGINE_NAME,
      complete: true,
    });
    this.active = null;
    this.runNext();
  }

  private enqueue(job: Job) {
    this.queue.push(job);
    this.runNext();
  }

  private runNext() {
    if (this.active || !this.queue.length || !this.worker) return;
    // Jobs can be queued only after init resolves, so an active worker is ready here.
    const job = this.queue.shift()!;
    this.active = { ...job };
    this.worker.postMessage("setoption name UCI_LimitStrength value false");
    this.worker.postMessage("setoption name Skill Level value 20");
    if (job.strength !== null) {
      if (job.strength <= 2) {
        this.worker.postMessage(`setoption name Skill Level value ${job.strength === 1 ? 0 : 3}`);
      } else if (job.strength <= 5) {
        const elo = [0, 0, 0, 1500, 1800, 2100][job.strength];
        this.worker.postMessage("setoption name UCI_LimitStrength value true");
        this.worker.postMessage(`setoption name UCI_Elo value ${elo}`);
      }
    }
    this.worker.postMessage(`position fen ${job.fen}`);
    this.worker.postMessage(
      job.strength !== null && job.strength <= 2
        ? `go depth ${job.strength}`
        : `go depth ${job.depth} movetime ${job.moveTime}`,
    );
  }

  async evaluatePosition(fen: string, depth = 2) {
    new Chess(fen);
    await this.init();
    return new Promise<Analysis>((resolve, reject) =>
      this.enqueue({
        fen,
        depth: 14,
        moveTime: depth <= 2 ? 400 : 750,
        strength: null,
        resolve,
        reject,
      }),
    );
  }

  async getBestMove(fen: string, strength = 3) {
    new Chess(fen);
    await this.init();
    const level = Math.max(1, Math.min(6, Math.round(strength)));
    const analysis = await new Promise<Analysis>((resolve, reject) =>
      this.enqueue({
        fen,
        depth: level === 6 ? 18 : 12,
        moveTime: [0, 120, 180, 250, 400, 650, 900][level],
        strength: level,
        resolve,
        reject,
      }),
    );
    return analysis.bestMove;
  }

  cancel() {
    const error = new Error("Engine search cancelled");
    this.readyReject?.(error);
    this.active?.reject(error);
    this.active = null;
    for (const job of this.queue) job.reject(error);
    this.queue = [];
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.readyResolve = null;
    this.readyReject = null;
  }

  destroy() {
    this.cancel();
  }

  private fail(error: Error) {
    this.readyReject?.(error);
    this.active?.reject(error);
    this.active = null;
    for (const job of this.queue) job.reject(error);
    this.queue = [];
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.readyResolve = null;
    this.readyReject = null;
  }
}
