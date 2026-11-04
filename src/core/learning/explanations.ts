import { Chess, idx, type MoveRecord, type PieceType } from "../chess/Chess.js";

export type MoveExplanation = {
  san: string;
  reading: string;
  reasons: string[];
};

const pieceNames: Record<PieceType, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

/**
 * Explain observable chess facts, not imagined engine intent.
 * Authored lessons can add strategic context; this layer makes every move readable.
 */
export type ExplanationLanguage = "en" | "zh";

export function explainMove(beforeFen: string, input: string | MoveRecord, language: ExplanationLanguage = "en"): MoveExplanation {
  const before = new Chess(beforeFen);
  const game = new Chess(beforeFen);
  const record = game.move(typeof input === "string" ? input : input.uci);
  const from = record.uci.slice(0, 2);
  const to = record.uci.slice(2, 4);
  const moving = before.board[idx(from)];
  if (!moving) throw Error("Cannot explain a move without a moving piece");
  const captured = before.board[idx(to)];
  const zh = language === "zh";
  const t = (en: string, chinese: string) => zh ? chinese : en;
  const chineseNames: Record<PieceType, string> = { p: "兵", n: "马", b: "象", r: "车", q: "后", k: "王" };
  const name = zh ? chineseNames[moving.type] : pieceNames[moving.type];
  const reasons: string[] = [];
  const castle = moving.type === "k" && Math.abs(idx(to) - idx(from)) === 2;

  if (castle) {
    reasons.push(t(
      "Castling moves your king toward safety and brings a rook into the game in one turn.",
      "王车易位同时让王走向更安全的位置，并让车投入棋局。",
    ));
  }
  if (captured || record.san.includes("x")) {
    reasons.push(captured
      ? t(
        `It removes a ${captured.color === "w" ? "White" : "Black"} ${pieceNames[captured.type]}. Before calling it a gain, check whether your piece can be recaptured.`,
        `它吃掉了${captured.color === "w" ? "白方" : "黑方"}的${chineseNames[captured.type]}。先别急着把它算成得子，还要检查你的棋子是否会被回吃。`,
      )
      : t(
        "It captures en passant: the opposing pawn is removed even though your pawn lands on an empty square.",
        "这是吃过路兵：虽然你的兵落在空格，对方的兵仍会被移除。",
      ));
  }
  if (game.result() === "1-0" || game.result() === "0-1") {
    if (record.san.includes("#")) reasons.push(t(
      "Checkmate: the opposing king is attacked and has no legal way to answer the check.",
      "将杀：对方的王正被攻击，而且没有任何合法着法能解除将军。",
    ));
  } else if (record.san.includes("+")) {
    reasons.push(t(
      "Check: the opposing king is attacked, so your opponent must answer that threat on the next turn.",
      "将军：对方的王正被攻击，所以对手下一步必须解除这个威胁。",
    ));
  }
  if (["n", "b"].includes(moving.type) && ["1", "8"].includes(from[1]) && to[1] !== from[1]) {
    reasons.push(t(
      `Development: this ${name} leaves its starting rank and becomes easier to use. In most openings, getting knights and bishops into play is an early priority.`,
      `出子：这个${name}离开初始横线，更容易参与棋局。大多数开局里，尽早让马和象投入战斗是重要目标。`,
    ));
  }
  if (["d4", "d5", "e4", "e5"].includes(to)) {
    reasons.push(t(
      `Central influence: ${to} is one of the four central squares. Pieces and pawns there often reach more of the board.`,
      `中心影响：${to} 是四个中心格之一。棋子或兵位于中心时，通常能影响棋盘上更多区域。`,
    ));
  }
  if (record.uci[4]) {
    reasons.push(t(
      `Promotion: the pawn reaches the far edge and becomes a ${pieceNames[record.uci[4] as PieceType]}.`,
      `升变：兵到达棋盘另一端，变成${chineseNames[record.uci[4] as PieceType]}。`,
    ));
  }
  if (!reasons.length) {
    reasons.push(t(
      "This is a legal move. To understand its purpose, ask what it attacks, what it protects, and whether the moved piece is safe.",
      "这是一步合法着法。想理解它的目的，可以问：它攻击什么、保护什么，移动后的棋子安全吗？",
    ));
  }

  let reading: string;
  if (castle) {
    reading = t(
      `${record.san} means castle ${to[0] === "g" ? "kingside" : "queenside"}: the king moves from ${from} to ${to}, and the rook moves beside it.`,
      `${record.san} 表示${to[0] === "g" ? "短" : "长"}易位：王从 ${from} 移到 ${to}，车同时移到王旁边。`,
    );
  } else {
    const captureText = record.san.includes("x") ? t(", with a capture", "，并吃子") : "";
    reading = zh
      ? `${record.san}：${name}从 ${from} 到 ${to}${captureText}。${moving.type === "p" ? "兵的着法不写棋子字母。" : `${name}在记谱中用 ${moving.type === "n" ? "N" : moving.type.toUpperCase()} 表示。`}`
      : `${record.san}: ${name} from ${from} to ${to}${captureText}. ${moving.type === "p" ? "Pawn moves omit a piece letter." : `${name[0].toUpperCase() + name.slice(1)} moves use ${moving.type === "n" ? "N" : moving.type.toUpperCase()} in chess notation.`}`;
    if (record.san.includes("#")) reading += t(" # means checkmate.", " # 表示将杀。");
    else if (record.san.includes("+")) reading += t(" + means check.", " + 表示将军。");
  }
  return { san: record.san, reading, reasons };
}
