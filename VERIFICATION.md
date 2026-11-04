# Verification record — November 3, 2026

## Environment

- Node.js 24.21.0; npm 11.12.1.
- TypeScript 5.9.3 and Vite 8.3.5 installed locally and pinned.
- chess.js 1.4.0 and Stockfish.js 19.0.1 Lite single-threaded installed locally and pinned.
- Playwright 1.64.1 with Chromium 156.0.8078.4.

## Observed checks

| Check | Outcome |
|---|---|
| `npm run build` | PASS — strict TypeScript, Vite production bundle, generated service worker, 42 local assets precached |
| `npm run test:unit` | PASS — 45 passed, 0 failed; includes initial perft 20/400/8902, chess rules, English/Chinese move explanations, authored-content coverage, PGN round trips, evaluation/mate parsing, SRS, knight BFS, backup/preference validation, adaptive learning, and recovery validation/expiry |
| `npm run test:static` | PASS — all 42 assets, Stockfish WASM, manifest, and icons served beneath `/sample-repository/` |
| `npm run test:e2e` | PASS — 16 Chromium tests passed, 0 failed/skipped |
| Real engine game and coach review | PASS — legal user move, real Stockfish reply, two move records, and review UI observed in Chromium |
| Beginner teaching | PASS — first-game e4 action produced a real engine reply; separate learner/opponent lessons and the preferred-move explanation remained visible |
| Optional guidance | PASS — dismissal removed extended lessons without disabling play; the preference survived reload and could be re-enabled |
| Authored exercise lessons | PASS — correct and revealed opening moves showed their authored purposes; Fool’s Mate revealed its concrete checkmate lesson without blaming the learner |
| Language and reading access | PASS — keyboard skip link focused main content; Simplified Chinese guide/move lessons, larger text, and reduced motion persisted after IndexedDB writes and reload; decorative navigation icons were excluded from accessible names |
| Direct UCI worker check | PASS — `uci`/`uciok` and a legal `bestmove` from the bundled worker |
| Mobile training flow | PASS at 390 × 844 — Opening Dojo, Visualization, feedback, and no main-content horizontal overflow |
| Mobile beginner layout | PASS at 390 × 844 — onboarding, English/Chinese lessons, and large text produced no document or main-content horizontal overflow |
| Learning Path flow | PASS — two distinct Visualization attempts appeared in the activity trail; answered prompts locked against duplicate taps; the recommendation opened the intended exercise |
| Four-theme flow | PASS — Indigo Focus, Lavender Paper, Forest Quiet, and Ember Study reached distinct final backgrounds after their transitions; Ember Study persisted after reload |
| Motion and mobile navigation | PASS — view entrance ran normally; active mobile tab centered; system and in-app reduced-motion settings removed animation |
| Practice recovery | PASS — a real two-ply game, Black orientation, Coach off, and depth 2 survived navigation and reload; an expired snapshot was removed and a fresh board shown |
| Production animation check | PASS — moved-piece Web Animations API glide observed; reduced-motion move produced zero active animations |
| Piece artwork and visibility modes | PASS — 32 local SVGs loaded; Ghost remained at 25% opacity; Discs and Full blindfold changed rendering as intended; accessible square labels and Standard mode remained intact |
| Offline production reentry | PASS — service worker cached WASM and artwork; after offline reload, 32 visible/loaded SVG pieces, training, and Stockfish reply still worked |
| PGN regression | PASS — exported result is not duplicated and the exported game round-trips to the same final FEN |
| Visual inspection | PASS at 1440 × 1000 desktop and 390 × 844 mobile viewports; first-game Play and settled Simplified Chinese large-text onboarding inspected without overflow |

The complete `npm run verify` sequence was executed successfully. Browser tests ran against the production build through Vite preview. The production bundle is approximately 2.6 MB, dominated by the locally cached Stockfish WASM asset.

## Important corrections made in this release

- Replaced the locally authored rules implementation used by the UI with chess.js while preserving the app’s existing board and training interfaces.
- Replayed the previous 21 tests successfully before adding UCI and PGN regression coverage.
- Replaced user-facing minimax play with a queued, cancellable Stockfish worker and six bounded, non-Elo difficulty presets.
- Preserved mate as a typed score and normalized evaluations consistently for coaching.
- Added review turning points, estimated mean move accuracy, evaluation trace, critical-position practice, and Blunder Bank deduplication.
- Added Chromium installation handling, visible online/offline readiness, local license texts, and a GitHub Pages Actions workflow.
- Refreshed the visual hierarchy, board palette, controls, and responsive navigation; replaced platform-dependent chess glyphs with locally bundled scalable Cburnett SVG artwork and preserved all visibility modes.
- Added an explainable Learning Path using timestamped attempts, game results, opening recall, blunder repair, visualization, calculation, endgames, and master study; recommendations link directly to existing exercises.
- Added four persistent full-interface themes with migration from legacy light/dark preferences, plus validated backup merge/deduplication for learning events.
- Prevented a single informed skill from being labelled simultaneously as both a strength and a growth edge.
- Fixed a PGN export defect discovered during the final audit: the result had been appended twice, preventing reimport.
- Added validated ten-minute practice recovery across navigation, reloads, and page exits; invalid or expired snapshots are removed, and clearing local progress also clears recovery.
- Added dismissible beginner onboarding, legal move decoding, concrete teaching for every authored opening ply and calculation answer, and nonjudgmental starter Blunder Bank lessons.
- Kept the learner’s latest explanation visible after the engine replies, rather than replacing it with the opponent’s move.
- Added persistent English/Simplified Chinese teaching preferences, larger text, explicit reduced motion, a keyboard skip link, and cleaner accessible navigation names.

## Not verified or intentionally not claimed

- Chinese localization is intentionally partial: authored opening/master notes and the wider interface remain English.
- Generated move lessons explain observable chess facts; they do not claim to reconstruct a complete strategic plan or human intention from Stockfish output.
- No physical phone, iOS/Safari, WebKit, low-memory device, or installed-app standalone session was tested.
- Chromium’s native installation prompt was not accepted end-to-end; the app listens for the real prompt and provides a working action only when the browser supplies it.
- Opening content remains a six-line starter repertoire with selected alternatives, not a complete opening tree.
- Calculation exercises are opening-memory sequences, not certified unique tactical puzzles.
- Endgames use practice objectives without tablebase-certified WDL claims.
- Review covers learner moves analyzed with Coach enabled, not every move of a completed game.
- No calibrated Elo, Lichess game accuracy, screen-reader certification, or universal browser compatibility is claimed.
