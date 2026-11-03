# Stillpoint · A Chess Practice

Stillpoint is a private, local-first chess training web app for desktop and mobile browsers. It combines legal chess, a real local Stockfish opponent and coach, opening recall, visualization exercises, objective-based endgame practice, a Blunder Bank, classical game study, and exportable progress.

**Current status: verified Chromium training release.** It is not a claim that every advanced item in `REFINED_BUILD_PROMPT.md` is complete. See [Scope and limitations](#scope-and-limitations).

## Run locally

Requirements: Node.js 20 or later and npm. All build dependencies are pinned in `package-lock.json`; no global TypeScript installation is needed.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For a production build:

```sh
npm run build
npm run preview
```

The deployable static site is generated in `dist/`. Do not open it through `file://`; service workers, WASM, and installation require HTTP locally or HTTPS when hosted.

## What is included

- **Play:** tap, drag, SAN, or UCI input; White, Black, or random side; custom FEN/PGN; untimed and timed practice; takeback in untimed games; draw claims; resignation; board flip; blindfold visibility levels; PGN export.
- **Learning Path:** four actionable recommendations, seven practice-readiness signals, relative strengths and growth edges, recent trends, evidence labels, and an activity trail. Every recommendation opens a real local exercise.
- **Four complete themes:** Indigo Focus, Lavender Paper, Forest Quiet, and Ember Study, each with coordinated navigation, panels, controls, and board colors. Legacy light/dark preferences migrate automatically.
- **Modern visual system:** locally bundled scalable Cburnett SVG pieces, clear selection/capture states, last-move highlights, refined controls, and responsive desktop/mobile navigation.
- **Real local engine:** Stockfish 19 Lite, single-threaded JS/WASM, running in a Web Worker. Six bounded difficulty tiers are descriptive presets, not calibrated Elo ratings.
- **Coach and review:** pre-/post-move Stockfish comparison, mover-perspective normalization, typed mate scores, estimated win-probability loss, move classifications, preferred-move arrows, an evaluation trace for reviewed moves, and practice from the largest turning points.
- **Opening Dojo:** six legal starter lines with selected alternatives, walkthroughs, recall drills, and persistent spaced repetition.
- **Visualization:** coordinate sprint, square-color trainer, exact knight shortest-path solver, blindfold play, and eight opening-sequence mental-replay exercises.
- **Endgames:** five legal positions with concrete practice objectives. They are not represented as tablebase-certified adjudicators.
- **Blunder Bank:** three starter mate-in-one examples plus deduplicated positions captured from completed coach analysis.
- **Classical Masters:** five complete, legally replayable historical scores with original notes and Guess the Move.
- **Data ownership:** IndexedDB persistence, timestamped learning history, versioned JSON backup, deduplicated merge/validated overwrite import, PGN export, and two-step data reset.
- **PWA:** manifest, icons, standalone display, Chromium install prompt support, versioned service-worker cache, and locally bundled runtime assets.

## Offline and mobile installation

Offline mode begins **after a successful first online load**, not before it. The service worker precaches the application shell, training data, engine worker, and matching WASM asset together.

### Chrome / Chromium on desktop or Android

1. Deploy through GitHub Pages or serve locally.
2. Open the app once while online and wait for the service worker to finish caching.
3. In **Data & Privacy**, confirm **Offline assets ready**.
4. When Chromium offers installation, use **Install Stillpoint** in that panel or the browser’s **Install app** menu item.
5. Relaunch once while offline to verify the installed copy on the specific device.

Installation UI varies by browser and operating system. If Chromium does not offer installation, the same app still works as a normal web page. iOS/Safari installation and low-memory device behavior have not been verified in this release.

## GitHub Pages deployment

The included workflow `.github/workflows/deploy.yml` installs pinned dependencies, builds the app, runs unit tests, uploads `dist/`, and deploys it with GitHub’s Pages actions.

1. Push this directory to a GitHub repository, with the workflow on the `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Run the **Build and deploy Stillpoint to GitHub Pages** workflow if it did not run automatically.
5. Open the resulting HTTPS URL and verify the app, engine, installation prompt, and offline reentry on your own device.

Vite uses `base: './'`, and runtime engine, manifest, icon, and service-worker references are relative. The static smoke test explicitly serves the build under `/sample-repository/` and checks every precached asset. An actual public Pages deployment has not been performed from this environment.

## Verification

```sh
npm run test:unit    # production build plus chess, learning, themes, evaluation, SRS, and backup tests
npm run test:static  # requires Python 3; checks subpath asset and manifest delivery
npx playwright install chromium
npm run test:e2e     # Chromium play, adaptive path, themes, mobile flow, and offline reload
```

Or run the complete sequence:

```sh
npm run verify
```

Browser tests exercise the production build, not only the development server. See `VERIFICATION.md` for the latest observed results and remaining unverified environments.

## Scope and limitations

- Learning Path scores are explainable practice-readiness heuristics based on local outcomes, recency, and a neutral prior. They are not Elo estimates, diagnoses, or predictions; sparse histories remain explicitly low-confidence.
- The Opening Dojo is a starter repertoire, not an exhaustive opening tree.
- “Visualize the Sequence” currently trains legal opening recall; its positions are not advertised as uniquely verified tactical puzzles.
- Endgame drills use actual outcomes and stated practice goals, not theoretical WDL labels or tablebase adjudication.
- Review analyzes the learner’s moves when Coach is enabled; it is not a separate full-game analysis of every engine reply.
- Accuracy is labelled as an estimate per move or a simple mean of those estimates, not as Lichess game accuracy.
- The custom board is retained for its keyboard, tap, drag, textual, and blindfold support; Chessground is not embedded.
- Browser storage can be evicted. Export important backups before clearing site data, uninstalling, or changing devices.
- Only Chromium desktop/mobile-viewport behavior is covered by the current browser suite. WebKit, physical iOS devices, and actual GitHub Pages hosting remain unverified here.

## Architecture

- `src/core/chess/Chess.ts`: small compatibility facade over pinned `chess.js` 1.4.0.
- `src/core/engine/adapter.ts`: queued UCI protocol, cancellation, typed scores, worker lifecycle, and bounded strength presets.
- `public/engine/`: unmodified Stockfish.js 19.0.1 Lite single-threaded browser assets and license.
- `src/core/learning/engine.ts`: local evidence aggregation, recency weighting, readiness, trends, and actionable recommendations.
- `src/core/eval`, `src/core/srs`, `src/core/storage`: evaluation math, memory schedule, learning-history validation, and local persistence.
- `src/data`: opening, calculation, endgame, and classical-game content with legality tests.
- `src/ui`: accessible custom board, Learning Path, training views, and four persistent themes.
- `scripts/package.mjs`: content-hashed, release-versioned offline precache generation.

No account, analytics, remote chess API, runtime CDN, or third-party cookie is used. Normal requests to the static host still occur when online.

## License and provenance

Application source is GPL-3.0-or-later. See `LICENSE`, `THIRD_PARTY_NOTICES.md`, and `public/licenses/` for dependency notices and historical-game provenance. Stockfish and chess.js are embedded with their respective license texts; no Chessground code is included.
