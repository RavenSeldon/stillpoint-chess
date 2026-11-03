import { Chess, coord, idx, type Color } from "../core/chess/Chess.js";

export type BlindTier = "standard" | "ghost" | "discs" | "blindfold";
export type BoardOptions = {
  orientation?: Color;
  interactive?: boolean;
  blind?: BlindTier;
  coords?: boolean;
  lastMove?: string;
  arrow?: { uci: string; color: "green" | "red" } | null;
  path?: string[];
  target?: string;
  onMove?: (uci: string) => void;
  onSquare?: (square: string) => void;
};

export class BoardView {
  private selected: string | null = null;
  private fromDrag: string | null = null;

  constructor(private root: HTMLElement) {}

  clearSelection() {
    this.selected = null;
  }

  render(game: Chess, options: BoardOptions = {}) {
    this.root.replaceChildren();
    const orientation = options.orientation || "w";
    const grid = document.createElement("div");
    grid.className = "board-grid";
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", "Chessboard");
    const legal = options.interactive !== false ? game.moves() : [];
    const targets = this.selected
      ? legal.filter((move) => move.uci.startsWith(this.selected!)).map((move) => move.uci.slice(2, 4))
      : [];
    const squares: string[] = [];
    for (let row = 0; row < 8; row++)
      for (let column = 0; column < 8; column++)
        squares.push(coord((orientation === "w" ? 7 - row : row) * 8 + (orientation === "w" ? column : 7 - column)));

    for (const square of squares) {
      const index = idx(square);
      const piece = game.board[index];
      const light = (Math.floor(index / 8) + (index % 8)) % 2 === 1;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `square ${light ? "light" : "dark-square"}`;
      if (options.target === square) button.classList.add("target");
      if (options.path?.includes(square)) button.classList.add("path-square");
      if (this.selected === square) button.classList.add("selected");
      if (targets.includes(square)) button.classList.add("legal-target");
      if (targets.includes(square) && piece) button.classList.add("capture-target");
      if (options.lastMove && (options.lastMove.slice(0, 2) === square || options.lastMove.slice(2, 4) === square))
        button.classList.add("recent");
      button.dataset.square = square;
      button.title = square;
      button.setAttribute("aria-pressed", String(this.selected === square));
      const pieceName = piece
        ? (piece.color === "w" ? "White " : "Black ") +
          { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" }[piece.type]
        : "empty";
      button.setAttribute("aria-label", `${square}, ${pieceName}`);

      if (piece && options.blind !== "blindfold") {
        if (options.blind === "discs") {
          const disc = document.createElement("span");
          disc.className = `piece disc ${piece.color === "w" ? "white-piece" : "black-piece"}`;
          disc.textContent = "●";
          button.append(disc);
        } else {
          const image = document.createElement("img");
          image.className = `piece piece-image ${options.blind === "ghost" ? "ghost" : ""}`;
          image.src = new URL(`pieces/${piece.color}${piece.type.toUpperCase()}.svg`, document.baseURI).href;
          image.alt = "";
          image.draggable = false;
          image.decoding = "async";
          button.append(image);
        }
      }

      if (options.coords) {
        if (square[0] === (orientation === "w" ? "a" : "h")) {
          const tag = document.createElement("span");
          tag.className = "rank-label";
          tag.textContent = square[1];
          button.append(tag);
        }
        if (square[1] === (orientation === "w" ? "1" : "8")) {
          const tag = document.createElement("span");
          tag.className = "file-label";
          tag.textContent = square[0];
          button.append(tag);
        }
      }

      button.onclick = () => {
        if (options.onSquare) {
          options.onSquare(square);
          return;
        }
        if (!options.interactive || !options.onMove) return;
        if (this.selected) {
          const from = this.selected;
          this.selected = null;
          if (from !== square) {
            const matches = legal.filter(
              (move) => move.uci.slice(0, 2) === from && move.uci.slice(2, 4) === square,
            );
            if (matches.length) {
              options.onMove(matches.find((move) => move.uci.endsWith("q"))?.uci || matches[0].uci);
              return;
            }
          }
        }
        if (piece?.color === game.turn) this.selected = square;
        this.render(game, options);
      };
      if (piece && options.interactive && piece.color === game.turn) {
        button.draggable = true;
        button.ondragstart = (event) => {
          this.fromDrag = square;
          event.dataTransfer?.setData("text/plain", square);
        };
      }
      button.ondragover = (event) => event.preventDefault();
      button.ondrop = (event) => {
        event.preventDefault();
        const from = this.fromDrag || event.dataTransfer?.getData("text/plain");
        this.fromDrag = null;
        if (!from || !options.onMove) return;
        const moves = legal.filter((move) => move.uci.slice(0, 2) === from && move.uci.slice(2, 4) === square);
        if (moves.length) options.onMove(moves.find((move) => move.uci.endsWith("q"))?.uci || moves[0].uci);
      };
      grid.append(button);
    }
    this.root.append(grid);

    if (options.arrow && /^[a-h][1-8][a-h][1-8]/.test(options.arrow.uci)) {
      const from = idx(options.arrow.uci.slice(0, 2));
      const to = idx(options.arrow.uci.slice(2, 4));
      const xy = (index: number) =>
        orientation === "w"
          ? [(index % 8 + 0.5) * 100, (7 - Math.floor(index / 8) + 0.5) * 100]
          : [(7 - (index % 8) + 0.5) * 100, (Math.floor(index / 8) + 0.5) * 100];
      const a = xy(from);
      const b = xy(to);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 800 800");
      svg.setAttribute("class", "board-arrow");
      svg.setAttribute("aria-hidden", "true");
      const defs = document.createElementNS(svg.namespaceURI, "defs");
      const marker = document.createElementNS(svg.namespaceURI, "marker");
      marker.setAttribute("id", "arrow-head");
      marker.setAttribute("markerWidth", "5");
      marker.setAttribute("markerHeight", "5");
      marker.setAttribute("refX", "3");
      marker.setAttribute("refY", "2.5");
      marker.setAttribute("orient", "auto");
      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("d", "M0,0 L5,2.5 L0,5 Z");
      path.setAttribute("fill", options.arrow.color === "green" ? "#45e5dd" : "#fb4fa3");
      marker.append(path);
      defs.append(marker);
      svg.append(defs);
      const line = document.createElementNS(svg.namespaceURI, "line");
      line.setAttribute("x1", String(a[0]));
      line.setAttribute("y1", String(a[1]));
      line.setAttribute("x2", String(b[0] - Math.sign(b[0] - a[0]) * 22));
      line.setAttribute("y2", String(b[1] - Math.sign(b[1] - a[1]) * 22));
      line.setAttribute("stroke", options.arrow.color === "green" ? "#45e5dd" : "#fb4fa3");
      line.setAttribute("stroke-width", "14");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("stroke-opacity", ".82");
      line.setAttribute("marker-end", "url(#arrow-head)");
      svg.append(line);
      this.root.append(svg);
    }
  }
}
