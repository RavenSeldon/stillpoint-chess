# Verification record — November 4, 2026

## Environment

- Node.js 24.21.0; npm 11.12.1.
- TypeScript 5.9.3 and Vite 8.3.5 installed locally and pinned.
- chess.js 1.4.0 and Stockfish.js 19.0.1 Lite single-threaded installed locally and pinned.
- Playwright 1.64.1 with Chromium 156.0.8078.4 and WebKit 27.2.

## Observed checks

| Check | Outcome |
|---|---|
| `npm run build` | PASS — strict TypeScript, Vite production bundle, generated service worker, 49 local assets precached |
| `npm run test:unit` | PASS — 57 passed, 0 failed; includes initial perft 20/400/8902, chess rules, English/Chinese/French/Dutch move explanations, authored-content coverage, PGN round trips, evaluation/mate parsing, SRS (including assisted review), knight BFS, backup/preference validation, adaptive learning (including tier-contextualized game evidence and due-blunder scheduling), rules-verified tactical pattern classification, learning-evidence measurement (independent recall, delayed retention, transfer), per-language scope-note completeness, and recovery validation/expiry |
| `npm run test:static` | PASS — all 49 assets, Stockfish WASM, manifest, and icons served beneath `/sample-repository/` |
| `npm run test:e2e` | PASS — 26 tests per browser, 52 total: 26 Chromium + 26 WebKit, 0 failed/skipped |
| Keyboard-only operation | PASS in Chromium and WebKit — skip link, all seven main views, move entry form, square selection, promotion chooser (including Escape cancel and underpromotion to rook) operated by keyboard alone; focus survives full app re-renders |
| Real engine game and coach review | PASS — legal user move, real Stockfish reply, two move records, and review UI observed in Chromium |
| Beginner teaching | PASS — first-game e4 action produced a real engine reply; separate learner/opponent lessons and the preferred-move explanation remained visible |
| Optional guidance | PASS — dismissal removed extended lessons without disabling play; the preference survived reload and could be re-enabled |
| Authored exercise lessons | PASS — correct and revealed opening moves showed their authored purposes; Fool’s Mate revealed its concrete checkmate lesson without blaming the learner |
| Language and reading access | PASS — keyboard skip link focused main content; Simplified Chinese guide/move lessons, larger text, and reduced motion persisted after IndexedDB writes and reload; French and Dutch guides, starter lessons, and saved preferences were exercised; decorative navigation icons were excluded from accessible names |
| Direct UCI worker check | PASS — `uci`/`uciok` and a legal `bestmove` from the bundled worker |
| Mobile training flow | PASS at 390 × 844 — Opening Dojo, Visualization, feedback, and no main-content horizontal overflow |
| Mobile beginner layout | PASS at 390 × 844 — onboarding and English/Chinese/French/Dutch lessons produced no document or main-content horizontal overflow |
| Learning Path flow | PASS — two distinct Visualization attempts appeared in the activity trail; answered prompts locked against duplicate taps; the recommendation opened the intended exercise |
| Today flow | PASS — a fresh visit opened one real recommendation; the primary action reached Play; after a real two-ply game, Today offered Resume practice and restored both moves |
| Installation lifecycle | PASS with simulated browser events at 390 × 844 — Android instructions and four diagnostics appeared; no install button existed without a prompt; an accepted prompt remained Browser tab until `appinstalled` confirmed installation |
| Four-theme flow | PASS — Indigo Focus, Lavender Paper, Forest Quiet, and Ember Study reached distinct final backgrounds after their transitions; Ember Study persisted after reload |
| Motion and mobile navigation | PASS — view entrance ran normally; active mobile tab centered; system and in-app reduced-motion settings removed animation |
| Practice recovery | PASS — a real two-ply game, Black orientation, Coach off, and depth 2 survived navigation and reload; an expired snapshot was removed and a fresh board shown |
| Production animation check | PASS — moved-piece Web Animations API glide observed; reduced-motion move produced zero active animations |
| Piece artwork and visibility modes | PASS — 32 local SVGs loaded; Ghost remained at 25% opacity; Discs and Full blindfold changed rendering as intended; accessible square labels and Standard mode remained intact |
| Offline production reentry | PASS — service worker cached WASM and artwork; after offline reload, 32 visible/loaded SVG pieces, training, and Stockfish reply still worked |
| PGN regression | PASS — exported result is not duplicated and the exported game round-trips to the same final FEN |
| Visual inspection | PASS at 1440 × 1000 desktop and 390 × 844 mobile viewports; Today, Android installation guidance, first-game Play, and settled multilingual onboarding inspected without overflow; no console errors or failed asset requests occurred in the final Today/install inspection |

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
- Added persistent English/Simplified Chinese/French/Dutch teaching preferences, larger text, explicit reduced motion, a keyboard skip link, and cleaner accessible navigation names.
- Stacked mobile language selectors after visual inspection showed that longer option labels needed more room.
- Added a Today home that reuses the existing explainable recommendations and resumes an unfinished practice without duplicating game state.
- Added browser-specific installation instructions, four live diagnostics, visible outcomes, and a strict distinction between prompt acceptance and browser-confirmed installation.

## Corrections from the November 4, 2026 review

- Coach grading now compares the preferred continuation and the played continuation from the SAME position under identical search limits, instead of pairing a pre-move line with a separate post-move search. Shallow searches are reported as limited evidence rather than dressed up as blunder labels.
- The preferred-move arrow no longer appears over the wrong position. A “Review decision” control restores the exact position in which the alternative was found and draws the arrow there; turning points in the review card offer the same in-position view.
- Opening recall distinguishes independent recall, assisted recall (hints used), and attempts with errors. Only independent recall advances mastery; assisted completions schedule an independent retry and are recorded as their own evidence type.
- Every endgame drill declares a measurable success condition (promotion, checkmate, draw, or win) and completion is judged against that condition rather than the bare game result.
- Blunder repair accepts any verified checkmate and engine-verified equivalent continuations under identical search limits; without the engine it says plainly that only the stored move can be checked. Personal blunders now carry spaced-review scheduling, and due patterns surface first in recommendations.
- Practice-game evidence is read against the recorded opponent tier, so results against different strengths are no longer averaged as if they were equal tasks.
- Games finished with Live Coach off can be analyzed afterward, move by move, with the same comparison the live coach uses; verified blunders flow into the Blunder Bank.
- Pawn promotion now asks which piece to promote to (queen, rook, bishop, or knight) instead of silently defaulting to a queen, with keyboard access and Escape to cancel.
- Keyboard focus is preserved across re-renders of both the app shell and the board.
- The document language stays English; only translated lesson and guide sections carry their own `lang` tags, instead of retagging the whole untranslated interface.

## The transfer test (Learning Loop completion)

- Blunders captured from play are tagged with a tactical pattern only when the pattern verifies from the rules alone: mate in one, loose material (undefended, or defended only by the king with the capturing piece protected), or a fork (the moved piece alone attacking two targets of at least minor-piece value). Unverifiable positions stay untagged.
- After an independent blunder repair, a transfer test offers the same verified idea in an unseen position — a personal game position first, then one of six authored puzzles whose declared patterns are re-verified at startup (`validateContent` fails loudly otherwise).
- Transfer attempts are recorded separately (`transfer:<pattern>`), with assisted attempts distinguished from independent ones, so recognition, retention, and transfer remain three different measurements.

## Cross-browser and keyboard pass

- Playwright now runs every end-to-end test on both Chromium and WebKit; the full suite passes on both, including the offline service-worker reentry and Stockfish WASM play.
- A keyboard regression suite covers skip-link and navigation traversal, both move-entry paths (form and board squares), the promotion chooser (all four pieces, Escape cancel, underpromotion), and focus preservation across re-renders.
- Keyboard traversal testing exposed a real defect: after selecting a square, its legal targets sat up to ~70 tab stops away. The board now groups the selected square and its legal targets at the front of the tab order while a selection is active, so a legal destination is one or two stops away; all other squares remain reachable by continuing to tab.
- WebKit keyboard tests drive traversal the way Safari users do without full keyboard access (Option+Tab); plain-Tab behavior is Safari's own platform default, not an app defect.

## Measuring whether learning sticks

- The Learning Path now reports the three outcome measures the project judges itself by, each computed only from local records: **independent recall** (openings and pattern repairs completed without hints, with assisted completions counted separately), **delayed retention** (personal mistakes re-solved a day or more after capture), and **transfer** (verified patterns solved in unseen positions).
- Each measure is shown as a plain fraction over raw counts — never a percentage dressed up as a rating — and each carries an honest empty state that explains how the evidence is produced, so a fresh profile shows "—" with guidance rather than a fabricated number.

## Language setting feedback fix

- Reported symptom: changing the lesson language in Data & Privacy appeared to do nothing. Confirmed by measurement: the setting worked (the Play guide and move lessons did switch), but zero visible text changed on the screen where the choice was made.
- The selector now shows a live preview card in the chosen language immediately beneath it, the coverage note is written in each language it describes, and the change is announced to assistive technology in the new language. A regression test asserts visible change on both engines.

## Not verified or intentionally not claimed

- Simplified Chinese, French, and Dutch localization is intentionally partial: authored opening/master notes and the wider interface remain English.
- Generated move lessons explain observable chess facts; they do not claim to reconstruct a complete strategic plan or human intention from Stockfish output.
- Playwright WebKit (the Safari engine) now runs the full suite; a physical phone, real iOS/Safari device, low-memory device, or installed-app standalone session was still not tested.
- Chromium’s native installation prompt was not accepted end-to-end; the app listens for the real prompt and provides a working action only when the browser supplies it.
- Opening content remains a six-line starter repertoire with selected alternatives, not a complete opening tree.
- Calculation exercises are opening-memory sequences, not certified unique tactical puzzles.
- Endgames use practice objectives without tablebase-certified WDL claims.
- Review covers the learner’s moves, live or via post-game analysis; engine replies are not graded.
- No calibrated Elo, Lichess game accuracy, screen-reader certification, or universal browser compatibility is claimed.
