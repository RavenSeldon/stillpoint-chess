import {
  Chess as ChessJs,
  type Move as ChessJsMove,
  type Square,
} from "chess.js";

/** Compatibility facade around chess.js. Board indices run from a1 = 0 to h8 = 63. */
export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type Piece = { type: PieceType; color: Color };
export type Move = {
  from: number;
  to: number;
  promotion?: PieceType;
  castle?: "k" | "q";
  ep?: boolean;
};
export type MoveRecord = { uci: string; san: string; before: string; after: string };

export const INITIAL_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const files = "abcdefgh";

export function coord(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= 64)
    throw Error("Invalid square index");
  return files[index % 8] + String(Math.floor(index / 8) + 1);
}

export function idx(name: string): number {
  if (!/^[a-h][1-8]$/.test(name)) throw Error("Invalid square: " + name);
  return files.indexOf(name[0]) + (Number(name[1]) - 1) * 8;
}

function toInternalMove(move: ChessJsMove): Move {
  return {
    from: idx(move.from),
    to: idx(move.to),
    promotion: move.promotion,
    castle: move.isKingsideCastle()
      ? "k"
      : move.isQueensideCastle()
        ? "q"
        : undefined,
    ep: move.isEnPassant() || undefined,
  };
}

function moveUciParts(move: ChessJsMove): string {
  return move.from + move.to + (move.promotion || "");
}

export class Chess {
  private inner: ChessJs;
  board: (Piece | null)[] = Array(64).fill(null);
  turn: Color = "w";
  castling = "KQkq";
  enPassant = -1;
  halfmove = 0;
  fullmove = 1;
  history: MoveRecord[] = [];
  startingFen = INITIAL_FEN;
  positions: string[] = [];

  constructor(fen = INITIAL_FEN) {
    this.inner = new ChessJs(fen);
    this.load(fen);
  }

  private sync() {
    this.board = Array(64).fill(null);
    for (const row of this.inner.board()) {
      for (const piece of row) {
        if (piece) this.board[idx(piece.square)] = { type: piece.type, color: piece.color };
      }
    }
    const fen = this.inner.fen().split(" ");
    this.turn = this.inner.turn();
    this.castling = fen[2] === "-" ? "" : fen[2];
    this.enPassant = fen[3] === "-" ? -1 : idx(fen[3]);
    this.halfmove = Number(fen[4]);
    this.fullmove = Number(fen[5]);
  }

  private assertKings() {
    for (const color of ["w", "b"] as Color[]) {
      if (this.board.filter((piece) => piece?.color === color && piece.type === "k").length !== 1)
        throw Error("FEN requires one king per side");
    }
  }

  clone() {
    const copy = new Chess(this.fen());
    copy.history = this.history.map((item) => ({ ...item }));
    copy.positions = [...this.positions];
    copy.startingFen = this.startingFen;
    return copy;
  }

  load(fen: string) {
    this.inner.load(fen.trim());
    this.history = [];
    this.startingFen = this.inner.fen();
    this.sync();
    this.assertKings();
    this.positions = [this.positionKey()];
    return this;
  }

  fen() {
    return this.inner.fen();
  }

  positionKey() {
    return this.fen().split(" ").slice(0, 4).join(" ");
  }

  kingSquare(color: Color) {
    return this.board.findIndex((piece) => piece?.color === color && piece.type === "k");
  }

  inCheck(color: Color = this.turn) {
    return color === this.turn && this.inner.isCheck();
  }

  isAttacked(): boolean {
    throw Error("isAttacked is intentionally not exposed by the chess.js facade");
  }

  legalMoves(): Move[] {
    return this.inner.moves({ verbose: true }).map(toInternalMove);
  }

  moveUci(move: Move) {
    return coord(move.from) + coord(move.to) + (move.promotion || "");
  }

  moveSan(move: Move, legal: Move[] = this.legalMoves()) {
    const uci = this.moveUci(move);
    const verbose = this.inner.moves({ verbose: true });
    const match = verbose.find((candidate) => moveUciParts(candidate) === uci);
    if (!match || !legal.some((candidate) => this.moveUci(candidate) === uci))
      throw Error("Illegal move: " + uci);
    return match.san;
  }

  move(input: string | Move): MoveRecord {
    const before = this.fen();
    let played: ChessJsMove;
    try {
      if (typeof input !== "string") {
        const uci = this.moveUci(input);
        played = this.inner.move({
          from: uci.slice(0, 2) as Square,
          to: uci.slice(2, 4) as Square,
          promotion: uci[4],
        });
      } else {
        const wanted = input.trim().replace(/0/g, "O").replace(/[!?]+$/g, "");
        if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(wanted)) {
          const uci = wanted.toLowerCase();
          played = this.inner.move({
            from: uci.slice(0, 2) as Square,
            to: uci.slice(2, 4) as Square,
            promotion: uci[4],
          });
        } else {
          played = this.inner.move(wanted);
        }
      }
    } catch {
      const label = typeof input === "string" ? input : this.moveUci(input);
      throw Error("Illegal move: " + label);
    }
    const record = {
      uci: moveUciParts(played),
      san: played.san,
      before,
      after: this.inner.fen(),
    };
    this.history.push(record);
    this.sync();
    this.positions.push(this.positionKey());
    return record;
  }

  undo() {
    const record = this.history.at(-1);
    if (!record || !this.inner.undo()) return undefined;
    this.history.pop();
    this.positions.pop();
    this.sync();
    return record;
  }

  moves() {
    return this.inner
      .moves({ verbose: true })
      .map((move) => ({ uci: moveUciParts(move), san: move.san }));
  }

  isInsufficientMaterial() {
    return this.inner.isInsufficientMaterial();
  }

  result(): string | null {
    if (this.inner.isCheckmate()) return this.turn === "w" ? "0-1" : "1-0";
    if (
      this.inner.isStalemate() ||
      this.isInsufficientMaterial() ||
      this.halfmove >= 150 ||
      this.positions.filter((key) => key === this.positionKey()).length >= 5
    )
      return "1/2-1/2";
    return null;
  }

  canClaimDraw() {
    return (
      this.halfmove >= 100 ||
      this.positions.filter((key) => key === this.positionKey()).length >= 3
    );
  }

  pgn(resultOverride?: string) {
    const game = new ChessJs(this.startingFen);
    for (const move of this.history)
      game.move({ from: move.uci.slice(0, 2), to: move.uci.slice(2, 4), promotion: move.uci[4] });
    const result = resultOverride || this.result() || "*";
    game.setHeader("Result", result);
    if (this.startingFen !== INITIAL_FEN) {
      game.setHeader("SetUp", "1");
      game.setHeader("FEN", this.startingFen);
    }
    return game.pgn({ maxWidth: 0 });
  }

  loadPgn(pgn: string) {
    const parsed = new ChessJs();
    parsed.loadPgn(pgn);
    const start = parsed.getHeaders().FEN || INITIAL_FEN;
    const moves = parsed.history({ verbose: true });
    this.inner = new ChessJs(start);
    this.startingFen = start;
    this.history = [];
    this.positions = [];
    this.sync();
    this.assertKings();
    this.positions = [this.positionKey()];
    for (const move of moves) {
      const before = this.fen();
      const played = this.inner.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      this.history.push({
        uci: moveUciParts(played),
        san: played.san,
        before,
        after: this.fen(),
      });
      this.positions.push(this.positionKey());
    }
    this.sync();
    return this;
  }
}
