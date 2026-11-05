export const lessonLanguages = ["en", "zh", "fr", "nl"] as const;
export type LessonLanguage = typeof lessonLanguages[number];

export const languageTags: Record<LessonLanguage, string> = {
  en: "en",
  zh: "zh-CN",
  fr: "fr",
  nl: "nl",
};

export const languageNames: Record<LessonLanguage, string> = {
  en: "English",
  zh: "简体中文",
  fr: "Français",
  nl: "Nederlands",
};

export type GuideCopy = {
  overline: string;
  title: string;
  goalLead: string;
  goal: string;
  whiteLead: string;
  white: string;
  tapLead: string;
  tap: string;
  tryLead: string;
  tryText: string;
  tryButton: string;
  hide: string;
  hideAria: string;
  helper: string;
};

export const guideCopy: Record<LessonLanguage, GuideCopy> = {
  en: {
    overline: "START HERE · NO EXPERIENCE NEEDED",
    title: "Your first move is enough",
    goalLead: "The goal is checkmate:",
    goal: "attack the opposing king so it has no legal escape. You never actually capture the king.",
    whiteLead: "White moves first.",
    white: "You are White in this game.",
    tapLead: "Tap a white piece.",
    tap: "Small dots show where it can legally move; rings show captures.",
    tryLead: "Try e2 → e4.",
    tryText: "This pawn takes a central square and opens a diagonal for your bishop. You can also type e4.",
    tryButton: "Try 1. e4",
    hide: "Hide guidance",
    hideAria: "Hide beginner guidance",
    helper: "Guidance is optional. Turn it back on any time in Data & Privacy.",
  },
  zh: {
    overline: "从这里开始 · 无需基础",
    title: "走出第一步，就已经开始了",
    goalLead: "目标是将杀：",
    goal: "攻击对方的王，让它没有任何合法方式解除将军。棋子规则中并不会真的吃掉王。",
    whiteLead: "白方先行。",
    white: "这一局你执白。",
    tapLead: "点选一个白棋。",
    tap: "小圆点表示合法落点；圆环表示可以吃子。",
    tryLead: "试试 e2 → e4。",
    tryText: "这个兵占据中心格，也为象打开斜线。你也可以直接输入 e4。",
    tryButton: "试试 1. e4",
    hide: "隐藏引导",
    hideAria: "隐藏新手引导",
    helper: "引导完全可选。随时可以在“数据与隐私”中重新开启。",
  },
  fr: {
    overline: "COMMENCEZ ICI · AUCUNE EXPÉRIENCE REQUISE",
    title: "Votre premier coup suffit",
    goalLead: "L’objectif est l’échec et mat :",
    goal: "attaquez le roi adverse de sorte qu’aucun coup légal ne permette de parer l’échec. Le roi n’est jamais réellement capturé.",
    whiteLead: "Les Blancs jouent en premier.",
    white: "Vous jouez les Blancs dans cette partie.",
    tapLead: "Touchez une pièce blanche.",
    tap: "Les points indiquent les cases légales ; les anneaux signalent les captures.",
    tryLead: "Essayez e2 → e4.",
    tryText: "Ce pion occupe une case centrale et ouvre une diagonale à votre fou. Vous pouvez aussi saisir e4.",
    tryButton: "Essayer 1. e4",
    hide: "Masquer le guide",
    hideAria: "Masquer le guide pour débutants",
    helper: "Le guide est facultatif. Réactivez-le à tout moment dans Données et confidentialité.",
  },
  nl: {
    overline: "BEGIN HIER · GEEN ERVARING NODIG",
    title: "Je eerste zet is genoeg",
    goalLead: "Het doel is schaakmat:",
    goal: "val de vijandelijke koning aan zodat geen enkele legale zet de schaakstand kan opheffen. De koning wordt nooit echt geslagen.",
    whiteLead: "Wit begint.",
    white: "Jij speelt met wit in deze partij.",
    tapLead: "Tik op een wit stuk.",
    tap: "Stippen tonen legale bestemmingen; ringen tonen slagzetten.",
    tryLead: "Probeer e2 → e4.",
    tryText: "Deze pion beslaat een centraal veld en opent een diagonaal voor je loper. Je kunt ook e4 typen.",
    tryButton: "Probeer 1. e4",
    hide: "Verberg begeleiding",
    hideAria: "Verberg begeleiding voor beginners",
    helper: "Begeleiding is optioneel. Zet het op elk moment opnieuw aan bij Gegevens en privacy.",
  },
};

export const lessonCopy: Record<LessonLanguage, {
  explanation: string;
  readMove: string;
  why: string;
  yourLast: string;
  opponentLast: string;
  preferredSuffix: string;
  genericBlunder: string;
}> = {
  en: {
    explanation: "Move explanation",
    readMove: "READ THIS MOVE",
    why: "Why this move appears here:",
    yourLast: "Your last move",
    opponentLast: "Opponent’s last move",
    preferredSuffix: "Stockfish preferred it at this search depth; that is evidence to inspect, not a claim about human intent.",
    genericBlunder: "Look for the concrete check, capture, or threat that makes this continuation effective.",
  },
  zh: {
    explanation: "着法讲解",
    readMove: "读懂这一步",
    why: "为什么这步出现在这里：",
    yourLast: "你的上一手",
    opponentLast: "对手的上一手",
    preferredSuffix: "Stockfish 在当前搜索深度下更偏好这一步；这只是供你检验的搜索证据，不代表它知道人类棋手的意图。",
    genericBlunder: "寻找让这步棋有效的具体将军、吃子或威胁。",
  },
  fr: {
    explanation: "Explication du coup",
    readMove: "LIRE CE COUP",
    why: "Pourquoi ce coup figure ici :",
    yourLast: "Votre dernier coup",
    opponentLast: "Dernier coup de l’adversaire",
    preferredSuffix: "Stockfish préfère ce coup à cette profondeur de recherche ; c’est un indice à examiner, pas une affirmation sur l’intention humaine.",
    genericBlunder: "Cherchez l’échec, la capture ou la menace concrète qui rend cette suite efficace.",
  },
  nl: {
    explanation: "Uitleg van de zet",
    readMove: "LEES DEZE ZET",
    why: "Waarom deze zet hier staat:",
    yourLast: "Jouw laatste zet",
    opponentLast: "Laatste zet van de tegenstander",
    preferredSuffix: "Stockfish gaf bij deze zoekdiepte de voorkeur aan deze zet; dat is een aanwijzing om te onderzoeken, geen bewering over menselijke bedoelingen.",
    genericBlunder: "Zoek de concrete schaakzet, slagzet of dreiging die deze voortzetting effectief maakt.",
  },
};

/**
 * Shown next to the language selector so the coverage of each language is
 * explained in that language itself — a learner should not need English to
 * learn what English is still required for.
 */
export const scopeNotes: Record<LessonLanguage, string> = {
  en: "Your language choice covers the full interface, training content, feedback, and accessibility labels. Chess notation, player names, and the Stillpoint name remain unchanged.",
  zh: "语言选择覆盖完整界面、训练内容、反馈与无障碍标签。棋谱记法、棋手姓名和 Stillpoint 名称保持不变。",
  fr: "Votre choix de langue couvre toute l’interface, les contenus d’entraînement, les retours et les labels d’accessibilité. La notation des échecs, les noms des joueurs et le nom Stillpoint restent inchangés.",
  nl: "Je taalkeuze dekt de volledige interface, trainingsinhoud, feedback en toegankelijkheidslabels. Schaaknotatie, spelersnamen en de naam Stillpoint blijven ongewijzigd.",
};

export const starterLessons: Record<"zh" | "fr" | "nl", Record<string, string>> = {
  zh: {
    "example-0": "后沿斜线到 h4 将军，直指 e1 的王。白方过早推进 f 兵和 g 兵，暴露了王；此时没有任何合法着法能解除将军。",
    "example-1": "后吃掉 f7 兵并将军，c4 象同时保护后。黑王无法解除这次攻击。要点是识别棋子协同，而不是以为早出后永远都好。",
    "example-2": "车到 e8 将军。黑王被自己的 f7、g7、h7 兵困住，无法逃出底线。",
  },
  fr: {
    "example-0": "La dame rejoint h4 par la diagonale et donne l’échec au roi en e1. Les poussées des pions f et g ont exposé le roi blanc, et aucun coup légal ne peut parer cet échec.",
    "example-1": "La dame capture le pion f7 en donnant l’échec, tandis que le fou en c4 la protège. Le roi noir ne peut pas répondre à cette attaque. Retenez la coordination des pièces, et non l’idée qu’une sortie précoce de la dame est toujours bonne.",
    "example-2": "La tour va en e8 et donne l’échec. Le roi noir est enfermé par ses propres pions f7, g7 et h7, sans échappatoire depuis la dernière rangée.",
  },
  nl: {
    "example-0": "De dame gaat via de diagonaal naar h4 en geeft schaak aan de koning op e1. Het vooruitspelen van de f- en g-pion heeft de witte koning blootgesteld; geen enkele legale zet kan deze schaakstand opheffen.",
    "example-1": "De dame slaat de pion op f7 en geeft schaak, terwijl de loper op c4 haar beschermt. De zwarte koning kan niet op deze aanval reageren. Het punt is de samenwerking tussen stukken, niet dat een vroege damezet altijd goed is.",
    "example-2": "De toren gaat naar e8 en geeft schaak. De zwarte koning zit klem achter zijn eigen pionnen op f7, g7 en h7 en kan niet van de achterste rij ontsnappen.",
  },
};
