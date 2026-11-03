# Verification record — November 3, 2026

## Environment

- Node.js 24.21.0; npm 11.12.1.
- TypeScript 5.9.3 and Vite 8.3.5 installed locally and pinned.
- chess.js 1.4.0 and Stockfish.js 19.0.1 Lite single-threaded installed locally and pinned.
- Playwright 1.64.1 with Chromium 156.0.8078.4.

## Observed checks

| Check | Outcome |
|---|---|
| `npm run build` | PASS — strict TypeScript, Vite production bundle, generated service worker, 39 local assets precached |
| `npm run test:unit` | PASS — 25 passed, 0 failed; includes initial perft 20/400/8902, chess rules, PGN export/reimport, data continuity, evaluation/mate parsing, SRS, knight BFS, backup validation |
| `npm run test:static` | PASS — all 39 assets, Stockfish WASM, manifest, and icons served beneath `/sample-repository/` |
| `npm run test:e2e` | PASS — 5 Chromium tests passed, 0 failed/skipped |
| Real engine game and coach review | PASS — legal user move, real Stockfish reply, two move records, and review UI observed in Chromium |
| Direct UCI worker check | PASS — `uci`/`uciok` and a legal `bestmove` from the bundled worker |
| Mobile training flow | PASS at 390 × 844 — Opening Dojo, Visualization, feedback, and no main-content horizontal overflow |
| Piece artwork and visibility modes | PASS — 32 local SVGs loaded; Ghost remained at 25% opacity; Discs and Full blindfold changed rendering as intended; accessible square labels and Standard mode remained intact |
| Offline production reentry | PASS — service worker cached WASM and artwork; after offline reload, 32 visible/loaded SVG pieces, training, and Stockfish reply still worked |
| PGN regression | PASS — exported result is not duplicated and the exported game round-trips to the same final FEN |
| Visual inspection | PASS at 1440 × 1000 desktop and 390 × 844 mobile viewports; dark, light, and Visualization production screenshots inspected after applying the indigo/lavender/teal/pink/gold palette |

The complete `npm run verify` sequence was executed successfully. Browser tests ran against the production build through Vite preview. The production bundle is approximately 2.5 MB, dominated by the locally cached Stockfish WASM asset.

## Important corrections made in this release

- Replaced the locally authored rules implementation used by the UI with chess.js while preserving the app’s existing board and training interfaces.
- Replayed the previous 21 tests successfully before adding UCI and PGN regression coverage.
- Replaced user-facing minimax play with a queued, cancellable Stockfish worker and six bounded, non-Elo difficulty presets.
- Preserved mate as a typed score and normalized evaluations consistently for coaching.
- Added review turning points, estimated mean move accuracy, evaluation trace, critical-position practice, and Blunder Bank deduplication.
- Added Chromium installation handling, visible online/offline readiness, local license texts, and a GitHub Pages Actions workflow.
- Refreshed the visual hierarchy, board palette, controls, and responsive navigation; replaced platform-dependent chess glyphs with locally bundled scalable Cburnett SVG artwork and preserved all visibility modes.
- Fixed a PGN export defect discovered during the final audit: the result had been appended twice, preventing reimport.

## Not verified or intentionally not claimed

- No actual public GitHub Pages deployment was performed from this environment; local subpath delivery and deployment workflow were verified only.
- No physical phone, iOS/Safari, WebKit, low-memory device, or installed-app standalone session was tested.
- Chromium’s native installation prompt was not accepted end-to-end; the app listens for the real prompt and provides a working action only when the browser supplies it.
- Opening content remains a six-line starter repertoire with selected alternatives, not a complete opening tree.
- Calculation exercises are opening-memory sequences, not certified unique tactical puzzles.
- Endgames use practice objectives without tablebase-certified WDL claims.
- Review covers learner moves analyzed with Coach enabled, not every move of a completed game.
- No calibrated Elo, Lichess game accuracy, screen-reader certification, or universal browser compatibility is claimed.
