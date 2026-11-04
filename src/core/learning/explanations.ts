import { Chess, idx, type MoveRecord, type PieceType } from "../chess/Chess.js";
import type { LessonLanguage } from "./languages.js";

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
export type ExplanationLanguage = LessonLanguage;

export function explainMove(beforeFen: string, input: string | MoveRecord, language: ExplanationLanguage = "en"): MoveExplanation {
  const before = new Chess(beforeFen);
  const game = new Chess(beforeFen);
  const record = game.move(typeof input === "string" ? input : input.uci);
  const from = record.uci.slice(0, 2);
  const to = record.uci.slice(2, 4);
  const moving = before.board[idx(from)];
  if (!moving) throw Error("Cannot explain a move without a moving piece");
  const captured = before.board[idx(to)];
  const t = (en: string, zh: string, fr: string, nl: string) => ({ en, zh, fr, nl })[language];
  const localizedNames: Record<LessonLanguage, Record<PieceType, string>> = {
    en: pieceNames,
    zh: { p: "兵", n: "马", b: "象", r: "车", q: "后", k: "王" },
    fr: { p: "pion", n: "cavalier", b: "fou", r: "tour", q: "dame", k: "roi" },
    nl: { p: "pion", n: "paard", b: "loper", r: "toren", q: "dame", k: "koning" },
  };
  const name = localizedNames[language][moving.type];
  const reasons: string[] = [];
  const castle = moving.type === "k" && Math.abs(idx(to) - idx(from)) === 2;

  if (castle) {
    reasons.push(t(
      "Castling moves your king toward safety and brings a rook into the game in one turn.",
      "王车易位同时让王走向更安全的位置，并让车投入棋局。",
      "Le roque met votre roi à l’abri et fait entrer une tour en jeu en un seul coup.",
      "Met de rokade breng je je koning in veiligheid en haal je in één zet een toren in het spel.",
    ));
  }
  if (captured || record.san.includes("x")) {
    reasons.push(captured
      ? t(
        `It removes a ${captured.color === "w" ? "White" : "Black"} ${pieceNames[captured.type]}. Before calling it a gain, check whether your piece can be recaptured.`,
        `它吃掉了${captured.color === "w" ? "白方" : "黑方"}的${localizedNames.zh[captured.type]}。先别急着把它算成得子，还要检查你的棋子是否会被回吃。`,
        `Cela retire une pièce ${captured.color === "w" ? "blanche" : "noire"} (${localizedNames.fr[captured.type]}). Avant de compter cela comme un gain, vérifiez si votre pièce peut être reprise.`,
        `Het slaat een ${captured.color === "w" ? "wit" : "zwart"} stuk (${localizedNames.nl[captured.type]}). Voordat je dit als winst ziet, controleer je of jouw stuk kan worden teruggeslagen.`,
      )
      : t(
        "It captures en passant: the opposing pawn is removed even though your pawn lands on an empty square.",
        "这是吃过路兵：虽然你的兵落在空格，对方的兵仍会被移除。",
        "C’est une prise en passant : le pion adverse est retiré même si votre pion arrive sur une case vide.",
        "Dit is en passant slaan: de vijandelijke pion wordt geslagen, ook al komt jouw pion op een leeg veld terecht.",
      ));
  }
  if (game.result() === "1-0" || game.result() === "0-1") {
    if (record.san.includes("#")) reasons.push(t(
      "Checkmate: the opposing king is attacked and has no legal way to answer the check.",
      "将杀：对方的王正被攻击，而且没有任何合法着法能解除将军。",
      "Échec et mat : le roi adverse est attaqué et aucun coup légal ne permet de parer l’échec.",
      "Schaakmat: de vijandelijke koning wordt aangevallen en geen enkele legale zet kan de schaakstand opheffen.",
    ));
  } else if (record.san.includes("+")) {
    reasons.push(t(
      "Check: the opposing king is attacked, so your opponent must answer that threat on the next turn.",
      "将军：对方的王正被攻击，所以对手下一步必须解除这个威胁。",
      "Échec : le roi adverse est attaqué ; votre adversaire doit répondre à cette menace au prochain coup.",
      "Schaak: de vijandelijke koning wordt aangevallen, dus je tegenstander moet bij de volgende zet op deze dreiging reageren.",
    ));
  }
  if (["n", "b"].includes(moving.type) && ["1", "8"].includes(from[1]) && to[1] !== from[1]) {
    reasons.push(t(
      `Development: this ${name} leaves its starting rank and becomes easier to use. In most openings, getting knights and bishops into play is an early priority.`,
      `出子：这个${name}离开初始横线，更容易参与棋局。大多数开局里，尽早让马和象投入战斗是重要目标。`,
      `Développement : ce ${name} quitte sa rangée initiale et devient plus utile. Dans la plupart des ouvertures, développer tôt les cavaliers et les fous est une priorité.`,
      `Ontwikkeling: dit ${name} verlaat de beginrij en wordt actiever. In de meeste openingen is het vroeg in het spel brengen van paarden en lopers een prioriteit.`,
    ));
  }
  if (["d4", "d5", "e4", "e5"].includes(to)) {
    reasons.push(t(
      `Central influence: ${to} is one of the four central squares. Pieces and pawns there often reach more of the board.`,
      `中心影响：${to} 是四个中心格之一。棋子或兵位于中心时，通常能影响棋盘上更多区域。`,
      `Influence centrale : ${to} est l’une des quatre cases centrales. Les pièces et les pions y atteignent souvent une plus grande partie de l’échiquier.`,
      `Centrale invloed: ${to} is een van de vier centrale velden. Stukken en pionnen bereiken daar vaak meer van het bord.`,
    ));
  }
  if (record.uci[4]) {
    const promoted = record.uci[4] as PieceType;
    reasons.push(t(
      `Promotion: the pawn reaches the far edge and becomes a ${pieceNames[promoted]}.`,
      `升变：兵到达棋盘另一端，变成${localizedNames.zh[promoted]}。`,
      `Promotion : le pion atteint l’extrémité de l’échiquier et se transforme en ${localizedNames.fr[promoted]}.`,
      `Promotie: de pion bereikt de overkant en verandert in een ${localizedNames.nl[promoted]}.`,
    ));
  }
  if (!reasons.length) {
    reasons.push(t(
      "This is a legal move. To understand its purpose, ask what it attacks, what it protects, and whether the moved piece is safe.",
      "这是一步合法着法。想理解它的目的，可以问：它攻击什么、保护什么，移动后的棋子安全吗？",
      "C’est un coup légal. Pour en comprendre le but, demandez-vous ce qu’il attaque, ce qu’il protège et si la pièce déplacée est en sécurité.",
      "Dit is een legale zet. Om het doel te begrijpen, vraag je af wat de zet aanvalt, wat hij beschermt en of het verplaatste stuk veilig is.",
    ));
  }

  let reading: string;
  if (castle) {
    reading = t(
      `${record.san} means castle ${to[0] === "g" ? "kingside" : "queenside"}: the king moves from ${from} to ${to}, and the rook moves beside it.`,
      `${record.san} 表示${to[0] === "g" ? "短" : "长"}易位：王从 ${from} 移到 ${to}，车同时移到王旁边。`,
      `${record.san} signifie le ${to[0] === "g" ? "petit roque" : "grand roque"} : le roi va de ${from} à ${to} et la tour se place à côté de lui.`,
      `${record.san} betekent de ${to[0] === "g" ? "korte" : "lange"} rokade: de koning gaat van ${from} naar ${to} en de toren komt naast hem te staan.`,
    );
  } else {
    const captureText = record.san.includes("x") ? t(", with a capture", "，并吃子", ", avec une capture", ", met een slagzet") : "";
    const notationLetter = moving.type === "n" ? "N" : moving.type.toUpperCase();
    if (language === "zh") {
      reading = `${record.san}：${name}从 ${from} 到 ${to}${captureText}。${moving.type === "p" ? "兵的着法不写棋子字母。" : `${name}在记谱中用 ${notationLetter} 表示。`}`;
    } else if (language === "fr") {
      reading = `${record.san} : ${name} de ${from} à ${to}${captureText}. ${moving.type === "p" ? "Le coup d’un pion ne comporte pas de lettre de pièce." : `La notation affichée ici utilise ${notationLetter} pour cette pièce.`}`;
    } else if (language === "nl") {
      reading = `${record.san}: ${name} van ${from} naar ${to}${captureText}. ${moving.type === "p" ? "Voor een pionzet wordt geen stukletter geschreven." : `De notatie op dit bord gebruikt ${notationLetter} voor dit stuk.`}`;
    } else {
      reading = `${record.san}: ${name} from ${from} to ${to}${captureText}. ${moving.type === "p" ? "Pawn moves omit a piece letter." : `${name[0].toUpperCase() + name.slice(1)} moves use ${notationLetter} in chess notation.`}`;
    }
    if (record.san.includes("#")) reading += t(" # means checkmate.", " # 表示将杀。", " # signifie échec et mat.", " # betekent schaakmat.");
    else if (record.san.includes("+")) reading += t(" + means check.", " + 表示将军。", " + signifie échec.", " + betekent schaak.");
  }
  return { san: record.san, reading, reasons };
}
