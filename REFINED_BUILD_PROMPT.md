# Stillpoint Chess Training PWA — Production Build Contract v2.0

This is a **revised, implementation-ready version** of the supplied six-module build prompt. All v2 technical corrections in this preface supersede any remaining inconsistent clauses below. Preserve the original product ambition but require evidence for claims.

## Critical corrections and acceptance rules (supersede below)

1. **Software and hosting:** Use Vite, strict TypeScript, chess.js, Chessground, and the exact pinned Stockfish.js Lite *single-threaded* JS/WASM pair. Confirm package names, asset paths, exported API, iOS WebKit behavior and licenses from installed artifacts. Include lockfile. GitHub Pages must work at `/` and `/repo-name/`. All application assets, including the WASM network and game scores, must function offline **after first successful installation/caching**, not magically before first load.
2. **License:** Chessground is GPL-3.0-or-later and Stockfish.js/Stockfish is GPLv3-based. Choose a GPL-compatible source license for the distributed combined application, include all required notices/source offers, attribution and exact source/build provenance. No proprietary closed-source claim. Historical move scores are factual records; track the specific transcription/PGN source, any collection license and the separate original commentary.
3. **Ratings:** Stockfish strength is a device/build-dependent **difficulty tier**, not a validated 600/1000/1350/1700/2050/2400 Elo rating. Query and respect actual UCI option ranges (`UCI_LimitStrength`, `UCI_Elo`, `Skill Level`) and do not simultaneously apply contradictory options. Claim ratings only after a reproducible calibrated match study, not from guessed search depths. Optional adaptive difficulty adjusts at game boundaries from a rolling performance estimate, bounded by user-selected min/max tiers and with a visible off switch.
4. **Search perspective and comparable evaluation:** Define an immutable `Analysis` record `{fen, sideToMove, score:{cp|mate}, scorePerspective, depth, nodes, multipv, pv, engineVersion, complete}`. Preserve mate scores as typed mate scores. Compare best and played outcomes from the **same mover perspective**, same engine version, and equivalent search budgets. Avoid root-score versus child-score sign flips. Handle forced-mate exceptions in explicit tests. If interrupted, label analysis incomplete and do not record a definitive blunder.
5. **Coach honesty:** The given Lichess logistic win-probability equation is a model, not a proof of actual outcome. The provided exponential formula is for **per-move accuracy**. If game-level accuracy is desired, implement Lichess's separately documented aggregate or label your own `Estimated mean move accuracy`; do not calculate accuracy from mean delta and call it Lichess accuracy. Reserve `!!` for a separately specified tactical brilliance test; otherwise use `Best`. Label book moves independently. Heuristic explanations must mention only verified threats/captures from legal continuations—otherwise say `The evaluation changed; no simple tactical explanation verified`.
6. **Draw/clock rules:** Explicitly distinguish automatic 75-move/fivefold outcomes from user-claimable 50-move/threefold conditions. A draw offer to a local engine must have a documented acceptance algorithm (or only a claim is offered). Background auto-pause is an **offline training policy**, never a claim of fair competitive time control; expose it visibly. Preserve remaining clocks in stored sessions and restore safely.
7. **Endgame grading:** `cp < +150` or any W(cp) threshold cannot certify theoretical WDL. Use a locally bundled exact WDL table/solver for the selected endgame state space, or keep an honest practice objective without theoretical grading. Include 7-piece/other tablebase coverage limits and WDL versus distance-to-zeroing nuances. Prevalidate every starting FEN, move and objective; do not invent alternate defenses.
8. **Repertoire model:** `isAcceptedRepertoireMove` applies to **edges**, not terminal nodes. Terminal nodes need no accepted child. Every accepted alternative needs a legal reachable continuation or must be explicitly marked as a completed line. Variation-specific coaching, side-to-move, and auto-opponent policy must be unambiguous. Accept all explicitly allowed moves, not just the first SAN. Use canonical FEN keys and stable IDs; account for transpositions.
9. **Calculation puzzles:** A move sequence that is legal is not necessarily a tactical winning puzzle. Separately verify tactic, uniqueness/acceptable alternatives, baseline outcome, side to move, and solution with adequate analysis. During mental replay the initial board remains static; accept SAN/UCI against the imagined resulting FEN, then reveal/replay the actual sequence. Clearly distinguish opening-memory sequences from verified forcing tactics.
10. **PWA and UI:** Cache all worker/WASM chunks with the deployed relative base. Include a release-versioned cache upgrade with cleanup, an offline regression test and update recovery if cache is stale. Avoid runtime CDN/fonts/network calls. Test low-memory iOS devices and first-install/offline reentry. Use semantic keyboard navigation and full accessible input alternatives when drag is impossible.
11. **Quality gates:** After each milestone run a real build and tests, report exact commands/results and unresolved issues. No UI buttons may be rendered if they do not work. Do not fabricate `Stockfish` execution, tablebase results, browser compatibility, master PGN provenance, task completion, test output or performance benchmarks. Keep unfinished features out of navigation until complete. If dependency access or execution is blocked, state that precisely and deliver the verified vertical slice rather than substituting an untested claim of production completeness.
12. **Browser acceptance:** Run Playwright against Chromium and WebKit (including 390×844 and a reduced-width device) when available; capture page errors, overflow, keyboard move, tap moves, worker UCI handshake/`bestmove`, cancellation/stale-response filtering, alternative opening branches, pause/resume, offline navigation, import rollback, and SW asset caching. A skipped or blocked browser test is **not a pass**.

---

# Final Build Prompt: Local-First Chess Training PWA

## Role
Act as a Principal Web Application Engineer, PWA Specialist, Chess-Rules Expert, and Grandmaster Chess Coach. Build a complete, production-grade application directly in the current workspace—not a collection of snippets, mockups, or placeholders. Make sound architectural decisions, implement the full product, execute the build, run automated unit and browser tests, and report verified results.

## Product Objective
Create a responsive, installable, offline-capable **Chess Training Progressive Web App (PWA)** that runs as a 100% static web application on desktop and mobile (deployable to GitHub Pages with zero backend and zero account requirements). It must allow users to play against an adaptive engine, review mistakes with mathematical precision, master openings via spaced repetition, train board visualization, practice fundamental endgames, revisit personal blunders, and study classical master games.

**Design Philosophy:** *Truth on the board, focused effort (Virya), and effortless flow (Wu Wei).* The UI must be calm, uncluttered, fast, and precise. Use a restrained, Zen-inspired visual system (high-contrast monochrome/slate with warm wood/stone accents and semantic feedback colors) that supports deep cognitive focus rather than decorative distraction.

---

## Non-Negotiable Invariants
1. **Zero Placeholder Policy:** Never leave `TODO` comments, stubbed functions, fake evaluations, or unimplemented UI buttons. Every rendered control must be wired to working, tested logic.
2. **Static Hosting & COOP/COEP Independence:** GitHub Pages does not support custom `Cross-Origin-Opener-Policy` or `Cross-Origin-Embedder-Policy` headers. Therefore, you **must not** use multi-threaded Stockfish WASM builds that require `SharedArrayBuffer`. Use a single-threaded WASM build (e.g., `stockfish.js` single-threaded WASM/ASM.js worker) that runs reliably in standard Web Workers across Chrome, Firefox, and iOS Safari.
3. **Strict Legal Continuity:** Every FEN, PGN, opening node, puzzle sequence, and endgame position bundled with or generated by the app must be validated by `chess.js` at build time and startup.
4. **No External API Dependency at Runtime:** All evaluations, opening books, puzzles, and master games must be bundled locally and cached by the Service Worker for 100% offline execution.

---

## Required Technology & Architecture
Use the following stack unless a documented compatibility issue in the environment requires an equivalent, justified substitution:
- **Build & Tooling:** Vite + TypeScript (strict mode enabled).
- **UI Framework:** Preact, React, or clean modular TypeScript Web Components + Tailwind CSS (configured locally, not via runtime CDN script) so the entire bundle compiles into static assets.
- **Chess Logic:** `chess.js` (exact current stable version pinned in `package-lock.json`, no caret range) for legal move validation, FEN/PGN parsing, threefold repetition, 50-move rule, and insufficient material detection.
- **Board UI:** `chessground` (`@lichess-org/chessground`) for responsive, mobile-touch-friendly rendering, legal move destinations, last-move highlights, and SVG arrow/circle drawing.
- **Engine Worker:** An exact-version pinned Stockfish.js **Lite single-threaded WASM + JS pair** (e.g., Stockfish.js 19 `stockfish-19-lite-single.js` + matching `.wasm`, after verifying actual package paths) loaded from local static assets inside a dedicated Web Worker behind an asynchronous TypeScript `EngineAdapter` interface (`init()`, `evaluatePosition()`, `getBestMove()`, `cancel()`, `destroy()`).
- **Persistence:** `IndexedDB` (via `idb` or a clean promise wrapper) for game history, Blunder Bank, and SRS opening progress; `localStorage` for lightweight UI preferences (theme, sound, board coordinates, coach toggles).
- **Testing:** `Vitest` for unit and data-integrity tests; `Playwright` for end-to-end browser and mobile viewport verification.

### Module Architecture
Organize `src/` into strict boundaries:
- `src/core/chess/`: Stateful wrapper around `chess.js`, move tree navigation, PGN/FEN utilities.
- `src/core/engine/`: Web Worker lifecycle, UCI protocol parser, request queue, cancellation token handling, and deterministic mock adapter for testing.
- `src/core/eval/`: Centipawn-to-Win-Probability math, move classification state machine, and tactical heuristic generator.
- `src/core/storage/`: IndexedDB schema, migrations, JSON export/import validators.
- `src/core/srs/`: Spaced-repetition scheduler and mastery calculators.
- `src/data/`: Validated JSON/TS datasets (Openings, Classical Games, Endgame Drills, Visualization Prompts) + `THIRD_PARTY_NOTICES.md` documenting licenses and public-domain provenance.
- `src/ui/`: Modular views, accessible dialogs, responsive board container, and SVG evaluation graph.

---

## Browser, Hosting, and Lifecycle Requirements
1. **GitHub Pages Base-Path Agnostic:** Configure Vite (`base: './'`) and all asset/worker/manifest paths using relative URLs so the app works whether hosted at a root domain (`/`) or a subpath (`/repo-name/`).
2. **PWA Installability:** Provide a valid `manifest.webmanifest` (standalone display, theme colors, SVG/PNG icons at 192x192 and 512x512) and a Service Worker (`sw.js` via `vite-plugin-pwa` or custom cache-first strategy) that precaches the app shell, Stockfish WASM/JS worker, and all training JSON bundles.
3. **Page Visibility & Lifecycle:** Listen to `visibilitychange` and `pagehide`. Pause active timers in Visualization drills when the tab is backgrounded, flush pending IndexedDB writes, and terminate or idle the engine worker cleanly on unload.

---

## Feature Module 1: Play & Game Management
Provide a complete human-vs-engine play environment supporting:
- **Player Setup:** Choose White, Black, or Random; start from standard initial position or any valid custom FEN / pasted PGN.
- **Time Controls:** Untimed (Zen mode), Rapid (10+0, 15+10), Blitz (3+2, 5+0), with automatic pause when hidden.
- **Game Controls:** Move history notation table, step backward/forward through history, Takeback (in untimed/training modes), Flip Board, Resign, Offer/Claim Draw, and Export PGN.
- **Six Approximate Difficulty Tiers (NOT claimed calibrated Elo):** Configure Stockfish via UCI options (`UCI_LimitStrength`, `UCI_Elo`, `Skill Level`) combined with strict depth, node, or movetime caps:
  1. **Novice (illustrative beginner tier; no rating claim):** use a legal reduced-strength configuration with bounded search and optional principled mistake selection.
  2. **Beginner (illustrative):** use lower strength settings within the engine’s reported `UCI_Elo` supported range; if unsupported, use a depth/node cap and label the tier, not an Elo rating.
  3. **Intermediate (illustrative):** bounded search; avoid combining mutually confounding `Skill Level` and `UCI_LimitStrength` modes without tests.
  4. **Advanced (illustrative):** bounded search; expose measured depth and node count to diagnostics.
  5. **Expert (illustrative):** bounded strong search, but make no numerical Elo promise.
  6. **Maximum Available:** full engine strength within a fixed resource budget, no implied Elo, never unbounded `go infinite`.
- **Engine Responsiveness:** If the user clicks Takeback, New Game, or switches tabs while the engine is thinking, issue UCI `stop` immediately and discard stale promises.

---

## Feature Module 2: Coach Mode & Post-Game Review

### 1. Deterministic Evaluation & Classification Policy
Normalize all engine scores (`cp` and `mate`) to the side to move, and compute **Win Probability ($W \in [0, 100]$)** using the standard Lichess sigmoid model:
$$W(cp) = \frac{100}{1 + \exp(-0.00368208 \cdot cp)}$$
*(Represent mate scores as a distinct `MateIn(N)` type for grading and graphing. For display only, saturate positive mates near +10000 and negative mates near -10000 without confusing the sign or score perspective. Do not pretend a mate score is a precise centipawn measurement.)*

Let $\Delta W = \max(0, W_{\text{best}} - W_{\text{played}})$ be the Win Probability Loss for the user's move compared to the engine's best move before the move was played:
- **Best (Star):** Played move matches the engine’s #1 choice OR $\Delta W \le 1.5\%$. Do not label this **Brilliant (`!!`)**; that requires a separately specified and tested tactical criterion.
- **Excellent (`!`):** $\Delta W \in (1.5\%, 4.0\%]$.
- **Good:** $\Delta W \in (4.0\%, 8.0\%]$.
- **Inaccuracy (`?!`):** $\Delta W \in (8.0\%, 14.0\%]$ (or allows a missed forced mate while still winning).
- **Mistake (`?`):** $\Delta W \in (14.0\%, 24.0\%]$.
- **Blunder (`??`):** $\Delta W > 24.0\%$ OR turns a winning/drawn position into a forced mate against the user, OR misses a forced mate-in-1/2/3 lowering evaluation below +3.0.
- **Book (separate tag):** Move matches a validated Opening Dojo repertoire node within the first 10 plies. A book tag does not override an objectively bad-move classification.

### 2. Live Coach Mode (Toggleable during Play)
- When enabled, evaluate the user's move immediately after it is played.
- Draw a **Green SVG Arrow** on the board for the engine's optimal move (`BestMove`) and a **Red/Amber Arrow** for the user's move if classified as Inaccuracy, Mistake, or Blunder.
- Generate a concise, rule-based **Tactical/Positional Explanation** by comparing board states before and after the principal variation (e.g., *"Hangs a piece on d4"*, *"Allows a fork/check on f7"*, *"Loses king safety / walks into a mate net"*, *"Develops a piece and contests the center"*, or *"Captures free material"*).
- Provide a **"Retry Move"** button when a Mistake or Blunder is made.

### 3. Post-Game Interactive Review
- Render an interactive **SVG Evaluation Area Chart** across all plies; clicking any point jumps the board to that ply.
- Display **estimated per-move accuracy** using $103.1668 \cdot \exp(-0.04354 \cdot \Delta W) - 3.1669$ (clamped to $[0,100]$). For **game accuracy**, use the documented volatility-weighted/harmonic method of Lichess or explicitly label a simple aggregate as an independent approximation; never label accuracy-at-mean-loss as Lichess game accuracy. and a summary count of Best, Good, Inaccuracies, Mistakes, and Blunders.
- Highlight the **Top 3 Critical Turning Points** (highest $\Delta W$) with a one-click **"Practice from this Position"** action that launches live play against the engine from that exact FEN.

---

## Feature Module 3: Opening Dojo & Spaced Repetition

### 1. Curated, Validated Starter Repertoire
Author and validate a structured multi-branch opening tree covering:
- **For White:**
  1. **Italian Game** (Giuoco Piano mainline, Evans Gambit idea, and Two Knights Defense / Fried Liver punishment of `1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5?!`).
  2. **Ruy Lopez** (Morphy Defense `3...a6 4.Ba4 Nf6 5.O-O Be7` and Berlin Defense overview).
  3. **Queen's Gambit** (Declined Orthodox `1.d4 d5 2.c4 e6 3.Nc3 Nf6` and Accepted `2...dxc4` central takeover + punishing the trap `3.e3 b5? 4.a4 c6 5.axb5 cxb5?? 6.Qf3`).
- **For Black:**
  4. **Sicilian Defense** (Najdorf / Open Sicilian setup `1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6` and Bowdler Attack punishment `2.Bc4?! e6`).
  5. **Caro-Kann Defense** (Classical Variation `1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5` and Advance Variation `3.e5 Bf5` with `...c5` break).
  6. **French Defense / King's Indian Setup** (French Advance `1.e4 e6 2.d4 d5 3.e5 c5 4.c3 Nc6 5.Nf3 Qb6` targeting `d4` and `b2`).

### 2. Required Content Schema per Node
Every node in the opening dataset must be verified at build/test time and include:
- `id`, `parentId`, `fen` (before move), `san` (move in Standard Algebraic Notation), `uci`, `resultingFen`.
- `isAcceptedRepertoireMove: boolean` (supports multiple valid repertoire alternatives at a single node).
- `coaching`: `{ strategicIdea: string, whenToUse: string, commonMistakeAndPunishment: string }`.

### 3. Walkthrough & SRS Drill Modes
- **Walkthrough Mode:** Step through mainlines and sidelines with coaching cards, branch selector pills, and board arrows illustrating key square control and pawn breaks.
- **Drill Mode:** Auto-play the opponent's move (`250ms` delay) and prompt the user to play the repertoire response on the board. Accept **any** child node marked `isAcceptedRepertoireMove: true`.
- **Spaced Repetition Scheduler (Modified SM-2):**
  - Track per-line state in IndexedDB: `attempts`, `correctCount`, `lapseCount`, `intervalDays` (0, 1, 3, 7, 14, 30), `easeFactor` (default `2.5`, min `1.3`), `nextDueTimestamp`, and `masteryPercent`.
  - Provide a "Due for Review" queue, per-opening mastery bars, and a "Reset Repertoire Progress" button with a confirmation modal.

---

## Feature Module 4: Visualization & Cognitive Gym
Implement four complete, self-contained cognitive trainers that properly pause/abort when the browser tab becomes hidden (`document.hidden`):

1. **Coordinate Blitz:**
   - 60-second timed sprint. Flash a target square (`a1`–`h8`) and player perspective (White, Black, or Alternating).
   - Provide a toggle to hide board rank/file labels. Track score, accuracy %, average reaction time (ms), and personal best in storage.
2. **Square Color & Knight's Path Trainer (Boardless Mental Gym):**
   - **Mode A (Color):** Prompt a coordinate (e.g., *"Is `c6` a light or dark square?"*) with NO chessboard visible. Instant feedback + explanation of the parity rule (file + rank parity).
   - **Mode B (Knight's Tour Distance):** Given a start square and target square (e.g., *"Minimum knight moves from `b1` to `f6`, and name a valid intermediate path"*), validate the user's path using an exact Breadth-First Search (BFS) knight graph solver, then reveal an animated visual board confirmation after submission.
3. **Progressive Blindfold Mode:**
   - Allow the user to solve tactical puzzles or play vs. the engine across 4 visibility tiers:
     1. *Standard* (full pieces)
     2. *Ghost* (`25%` opacity pieces)
     3. *Discs* (all pieces rendered as identical neutral circles—either color-coded White/Black discs or mono-color discs)
     4. *Full Blindfold* (empty board; moves entered via algebraic input or clicking empty squares with a "Peek (`3s`)" penalty button).
4. **"Visualize the Sequence" Calculation Puzzles:**
   - Display a starting tactical FEN on the board.
   - Present a forced sequence of **3 to 5 plies in algebraic notation** (e.g., `1. Nxd5 cxd5 2. Bb5+ Nc6`) that is **NOT moved on the board**.
   - Instruct the user: *"Visualize the position after the sequence above, then play the winning move from that resulting position on the board."*
   - Validate the user's move against the post-sequence FEN and animate the full sequence upon completion or failure. Include at least 8 validated multi-ply calculation puzzles in the starter dataset.

---

## Feature Module 5: Endgames, Blunder Bank, and Classical Games

### 1. Endgame Fundamentals (Goal-Based Engine Drills)
Provide interactive drills where the user plays against Stockfish (or a deterministic tablebase-style heuristic plus Stockfish) to achieve a concrete outcome:
1. **King + Pawn vs. Lone King (Opposition & Key Squares):** Win as White without allowing stalemate.
2. **Rook + Pawn vs. Rook (Lucena Position — "Building a Bridge"):** Convert the winning position to promotion or decisive material gain.
3. **Rook vs. Rook + Pawn (Philidor Position — 6th/3rd Rank Defense):** Hold the draw for 15 moves or force a repetition/trade against the engine's winning attempts.
4. **Queen vs. Pawn on the 7th Rank (Bishop/Knight vs. Rook/Central Pawn):** Force the enemy king in front of its pawn, march your king in, and capture/mate (or demonstrate the stalemate drawing defense with a Bishop/Rook pawn).
5. **Basic Checkmate Net (Two Bishops or Queen + King vs. Lone King):** Deliver checkmate within 25 moves.
- **Outcome Evaluation:** Never infer a theoretically winning/drawn endgame from a centipawn threshold. For each curated position, include a checked WDL label and either (A) a compact licensed/offline exact adjudicator for the relevant material, (B) a fully enumerated custom solver for the small position class, or (C) honest objective-only grading (promotion, checkmate, draw claim, move limit) without claiming theoretical equivalence. If exact WDL is unavailable for a deviation, say so; do not falsely fail or pass a legal alternative.

### 2. Automatic Blunder Bank
- Whenever a user commits a **Blunder (`??`)** in Module 1 (Play vs. AI), automatically record a `BlunderRecord` in IndexedDB containing: `id`, `timestamp`, `fenBeforeMove`, `userBlunderMoveSan`, `bestMoveSan`, `bestMoveUci`, `cpBefore`, `cpAfter`, `explanation`, `solvedCount`, `lastReviewed`.
- Seed the Blunder Bank on first launch with **3 pre-populated example blunders** (marked as `Starter Examples`) so the module is immediately testable and functional before a full game is played.
- In the Blunder Bank view, present the `fenBeforeMove` as an interactive puzzle: *"You played `Qxa2??` here. Find the best move instead."* Track mastery and allow deleting or filtering blunders.

### 3. Classical Masters Library ("Honor Those Who Came Before")
Bundle **5 complete, legally verified historical games** with public-domain move scores and original, freshly authored instructional commentary (record provenance in `THIRD_PARTY_NOTICES.md`):
1. **Paul Morphy vs. Duke Karl / Count Isouard (Paris, 1858)** — *The Opera Game* (Development, tempo, and sacrifices for open lines).
2. **José Raúl Capablanca vs. Frank Marshall (New York, 1918)** — *Defending the Marshall Attack* (Cold-blooded defensive mastery and endgame conversion).
3. **Mikhail Tal vs. Vasily Smyslov (Bled Candidates, 1959)** — *Dynamic Piece Sacrifice & Initiative*.
4. **Donald Byrne vs. Bobby Fischer (New York, 1956)** — *The Game of the Century* (Forcing combinations and queen sacrifice).
5. **Garry Kasparov vs. Veselin Topalov (Wijk aan Zee, 1999)** — *Kasparov's Immortal* (Deep king-hunt calculation).
- **Modes:**
  - **Study Mode:** Step through the game with annotated key moments and board arrows.
  - **"Guess the Master's Move" Mode:** Pause at 4–6 annotated critical positions per game; ask the user to find the Master's move on the board, award points (Full points for exact move, partial points for engine-approved alternative, hint option), and reveal the commentary upon completion.

---

## Persistence, Import/Export, and Privacy
- Provide a **Data & Privacy Settings Drawer** allowing the user to:
  - Export all local progress (Games, Blunder Bank, SRS Opening stats, Visualization scores) as a validated, versioned `.json` backup file.
  - Import a `.json` backup file with strict schema validation and safe merge/overwrite options.
  - Clear all local data with a two-step confirmation.
- Zero analytics trackers, zero external telemetry, zero third-party cookies.

## Accessibility & Interaction Quality
- **Dual Input Support:** Users must be able to make moves via drag-and-drop, tap-start/tap-destination on mobile, OR keyboard algebraic/UCI move input (`<input aria-label="Enter move in algebraic notation">`) for full keyboard accessibility.
- **ARIA Live Announcements:** Include a polite `aria-live="polite"` region that announces moves, checks, checkmates, and coach feedback for screen readers.
- **Responsive Layout:** On mobile (`< 768px`), keep the chessboard square, full-width, and visible above the fold without horizontal scrolling, placing controls and coaching feedback in clean bottom sheets or compact tabs directly underneath.

---

## Testing Requirements
Write and execute meaningful automated tests—do not rely solely on manual inspection:

### 1. Unit & Data Validation Tests (`Vitest`)
- **Evaluation & Classification Math:** Test `cpToWinProbability()`, mate score normalization, accuracy formula, and exact boundary transitions between `Best`, `Excellent`, `Good`, `Inaccuracy`, `Mistake`, and `Blunder`.
- **Dataset Continuity Validator:** Programmatically load every Opening Dojo node, Classical Master PGN, Endgame FEN, and Visualization Sequence puzzle through `chess.js`. Assert that 100% of FENs are valid, 100% of moves are legal, every `parentId` resolves, and every opening drill node has at least one `isAcceptedRepertoireMove: true`.
- **SRS & Knight BFS Logic:** Verify SM-2 interval progression, lapse resets, and exact shortest-path knight distance calculations across the board.
- **Import/Export Validator:** Verify that malformed JSON imports are rejected cleanly without corrupting state.

### 2. End-to-End Browser Tests (`Playwright`)
- Verify the app renders cleanly at Desktop (`1280x800`) and Mobile (`390x844`) viewports with zero console errors or uncaught page exceptions.
- Test making a legal move in Play vs. AI, receiving an engine reply, and triggering Live Coach feedback + Blunder Bank capture.
- Test completing an Opening Dojo drill branch (including verifying that an alternative valid repertoire move is accepted).
- Test starting and pausing a Visualization drill and completing a "Guess the Move" prompt in the Classical Masters Library.
- Include at least one integration test verifying the real Stockfish Web Worker responds to `uci` -> `uciok` and returns a valid `bestmove`.

---

## Implementation Order & Autonomous Execution Plan
Work autonomously through these milestones in sequence. Keep the application buildable after each milestone, and **do not stop or ask for permission between milestones**:

1. **Milestone 1 — Workspace Scaffolding & Core Chess/Engine Adapter:** Initialize Vite + TypeScript + Tailwind + `chess.js` + `chessground` + single-threaded `stockfish.js` worker + deterministic test adapter. Verify `npm run build` and basic board rendering.
2. **Milestone 2 — Evaluation Math, Play vs. AI, Coach Mode & Post-Game Review:** Implement ELO tiers, centipawn/win-probability math, arrow overlays, heuristic coaching text, SVG evaluation chart, and IndexedDB game persistence.
3. **Milestone 3 — Opening Dojo & SRS Scheduler:** Author and validate the 6-opening dataset, build Walkthrough and Drill UI, wire up SM-2 persistence, and verify with unit tests.
4. **Milestone 4 — Visualization & Cognitive Gym:** Build Coordinate Blitz, Color/Knight BFS Trainer, Progressive Blindfold Mode, and "Visualize the Sequence" calculation puzzles with visibility-aware timers.
5. **Milestone 5 — Endgames, Blunder Bank & Classical Masters Library:** Implement the 5 endgame drills, automatic Blunder Bank capture + puzzle replay, and the 5 annotated immortal games with "Guess the Move" mode.
6. **Milestone 6 — PWA Offline Lifecycle, Accessibility, Documentation & Full Verification:** Configure `manifest.webmanifest`, Service Worker offline caching, JSON Export/Import, `README.md` (with GitHub Pages deployment instructions), and `THIRD_PARTY_NOTICES.md`. Run `npm run build`, `npm run test:unit`, and `npm run test:e2e`, and fix any failures before concluding.

## Required Deliverables in Workspace
1. Complete source code (`src/`, `public/`, `index.html`, `vite.config.ts`, `package.json`, `tsconfig.json`).
2. Automated test suites (`tests/unit/*.test.ts` and `tests/e2e/*.spec.ts`).
3. `README.md` detailing architecture, local development, testing commands, and step-by-step GitHub Pages + Mobile PWA installation instructions.
4. `THIRD_PARTY_NOTICES.md` recording pinned library versions, licenses (MIT/GPLv3 for Stockfish/Chessground), and public-domain historical game provenance.

Begin executing **Milestone 1** immediately and proceed through **Milestone 6** until the build and all automated tests pass.