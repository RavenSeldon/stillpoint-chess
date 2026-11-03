# Third-party notices and historical provenance

## Application and distributed dependencies

Stillpoint application source, its custom browser board, training content, and app shell are supplied under **GPL-3.0-or-later**; see `LICENSE`.

### chess.js 1.4.0

- Purpose: legal move generation, chess state, SAN, FEN, and PGN parsing.
- Package: exact pinned `chess.js@1.4.0` from the npm registry.
- License: BSD-2-Clause.
- Project: https://github.com/jhlywa/chess.js
- License text: `public/licenses/CHESS-JS-LICENSE.txt`.

### Stockfish.js / Stockfish 19.0.1

- Purpose: local chess opponent and position analysis.
- Distributed assets: unmodified `stockfish-19-lite-single.js` and matching `stockfish-19-lite-single.wasm` from exact pinned npm package `stockfish@19.0.1`.
- Engine: Stockfish 19 Lite, single-threaded; no cross-origin isolation or SharedArrayBuffer required.
- License: GPL-3.0 for the engine package; see `public/licenses/STOCKFISH-LICENSE.txt` and `public/engine/STOCKFISH-LICENSE.txt`.
- Stockfish.js project and corresponding source/build scripts: https://github.com/nmrugg/stockfish.js
- Stockfish project: https://github.com/official-stockfish/Stockfish
- Package author: Nathan Rugg; additional credits are recorded in the upstream project.

The application’s GPL-compatible license and source publication cover the combined distribution. Anyone redistributing the engine binaries must preserve the license and provide access to the corresponding source as required by GPL-3.0. The unmodified npm package version and upstream source locations above identify the exact provenance used here.

### Cburnett Staunton chess pieces

- Purpose: scalable, consistent local piece artwork on every board.
- Creator: Colin M.L. Burnett.
- Assets: twelve unmodified SVG files in `public/pieces/`, obtained from `lichess-org/lila` at commit `10c9e1d2b431746aa9238dedca85f321da6c5a64`.
- Upstream license declaration: GPLv2 or later; used under the GPL licensing option in this GPL-3.0-or-later application.
- License reference: `public/licenses/GPL-2.0.txt`; provenance: `public/pieces/README.md`.

### Build and test tooling

- Vite 8.3.5 and TypeScript 5.9.3 are pinned development/build dependencies; their generated application output is distributed, not their development servers.
- Playwright 1.64.1 is pinned test tooling and is not loaded by the production application.
- Node’s built-in `node:test` runs the unit suite.
- No Chessground, Tailwind, runtime CDN, remote font, or remote analysis service is included.

## Classical masters — factual game move scores

Move scores are historical game records transcribed from publicly accessible sources. Legal continuity is checked with chess.js through the application’s dataset tests. URLs document provenance of the factual records, not a license to reproduce accompanying website commentary. Displayed instructional annotations are newly authored for this app.

| Game | Move-score provenance |
|---|---|
| Morphy – Duke Karl / Count Isouard, Paris 1858 | https://en.wikipedia.org/wiki/Opera_Game |
| Capablanca – Marshall, New York 1918 | https://chessmotion.com/explore/famous-chess-games/capablanca-marshall-attack |
| Tal – Smyslov, Bled 1959 | https://chessmotion.com/explore/famous-chess-games/tal-smyslov-1959 |
| Donald Byrne – Bobby Fischer, New York 1956 | https://www.bobbychess.com/en/games/byrne-fischer-1956-game-of-the-century/ |
| Kasparov – Topalov, Wijk aan Zee 1999 | https://github.com/kerry-huang-nyu/chessRobot/blob/main/kasparov_topalov_1999.pgn |

Historical move scores are treated as factual descriptions of events, not as a blanket assertion that every presentation is public domain in every jurisdiction. Recheck provenance and jurisdiction before commercial redistribution.

## Endgame reference

Lucena starting-position instructional reference: https://chessmotion.com/explore/endgames/lucena-position

Other starter positions and exercise coaching are adapted or authored for this implementation. Positions are checked for legal parsing and continuity but are **not certified for precise tablebase WDL outcomes**.

## Branding and network behavior

The Stillpoint title, icons, and CSS were authored for this project. No third-party image CDN, remote font, advertising, analytics, or tracking script is included. Stockfish analysis runs locally; positions and games are not sent to an analysis API.
