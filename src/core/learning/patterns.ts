import { Chess, idx, coord, type Color } from "../chess/Chess.js";

/**
 * A small set of tactical patterns that can be verified from the rules alone.
 * Anything we cannot verify stays unclassified rather than being dressed up
 * as an explanation — conservative truth over confident invention.
 */
export type TacticPattern = "mate-one" | "hanging-piece" | "fork";

export const patternLabels: Record<TacticPattern, string> = {
  "mate-one": "mate in one",
  "hanging-piece": "loose material",
  fork: "fork",
};

/**
 * Classify the verified tactical idea behind the best move (SAN or UCI) in a
 * position. Returns null when no reliably identifiable pattern exists.
 */
export function classifyPattern(fen: string, bestMove: string): TacticPattern | null {
  try {
    const before = new Chess(fen);
    const mover = before.turn;
    const enemy: Color = mover === "w" ? "b" : "w";
    const game = new Chess(fen);
    const record = game.move(bestMove);
    const to = record.uci.slice(2, 4);
    const captured = before.board[idx(to)];

    // Mate in one: verified by the rules, not by evaluation.
    if (record.san.includes("#")) return "mate-one";

    // Fork: after the move, the moved piece alone attacks at least two enemy
    // pieces of at least minor-piece value (the king counts: a check fork).
    const targets = game.board.filter((piece, index) => {
      if (!piece || piece.color !== enemy || piece.type === "p") return false;
      return game.attackersOf(coord(index), mover).includes(to);
    });
    if (targets.length >= 2) return "fork";

    // Loose material: the best move captures something no enemy piece defended.
    // A king alone counts only when the capturing piece is itself protected;
    // otherwise the "tactic" would simply lose the piece to the king.
    if (captured && record.san.includes("x")) {
      const allDefenders = before.attackersOf(to, enemy);
      const defenders = allDefenders.filter((square) => before.board[idx(square)]?.type !== "k");
      if (!defenders.length) {
        if (!allDefenders.length) return "hanging-piece";
        if (game.attackersOf(to, mover).length > 0) return "hanging-piece";
      }
    }
    return null;
  } catch {
    return null;
  }
}
