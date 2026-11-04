import { test, expect, type Page } from "@playwright/test";

async function openPlay(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Play", exact: true }).click();
}

test("desktop play uses real Stockfish and produces a review", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openPlay(page);
  await expect(page.locator(".square")).toHaveCount(64);
  await expect(page.getByRole("heading", { name: "The Practice Board" })).toBeVisible();
  await expect(page.getByText(/Stockfish 19 Lite runs locally/)).toBeVisible();
  await page.getByRole("textbox", { name: "Enter move in algebraic notation" }).fill("e4");
  await page.locator("#move-form button").click();
  await expect(page.getByText(/Engine played/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".move-chip")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Your review" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("bundled worker completes UCI handshake and returns a legal bestmove", async ({ page }) => {
  await openPlay(page);
  const bestmove = await page.evaluate(async () => {
    const worker = new Worker("./engine/stockfish-19-lite-single.js");
    worker.postMessage("uci");
    const result = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("UCI timeout")), 20_000);
      worker.onmessage = (event) => {
        const line = String(event.data);
        if (line === "uciok") {
          worker.postMessage("position startpos");
          worker.postMessage("go depth 2");
        }
        const match = /^bestmove\s+(\S+)/.exec(line);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      };
      worker.onerror = (event) => { clearTimeout(timeout); reject(new Error(event.message)); };
    });
    worker.terminate();
    return result;
  });
  expect(bestmove).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
});

test("mobile training navigation and board remain within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlay(page);
  await page.getByRole("button", { name: "Opening Dojo" }).click();
  await expect(page.getByRole("heading", { name: "Opening Dojo" })).toBeVisible();
  await page.locator("#drill-mode").click();
  await page.locator("#opening-move").fill("e4");
  await page.locator("#opening-move-form button").click();
  await page.getByRole("button", { name: "Visualization" }).click();
  await page.getByRole("button", { name: "Square Color" }).click();
  await page.getByRole("button", { name: "Dark square" }).click();
  await expect(page.locator(".mental-result")).toContainText("a1 is dark");
  const overflow = await page.locator("main").evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(overflow).toBe(false);
});

test("piece artwork and visibility modes preserve the playable board", async ({ page }) => {
  await openPlay(page);
  await expect(page.locator(".square")).toHaveCount(64);
  await expect(page.locator(".piece-image")).toHaveCount(32);
  await expect.poll(() => page.locator(".piece-image").evaluateAll((images) => images.every((image) => {
    const piece = image as HTMLImageElement;
    return piece.complete && piece.naturalWidth > 0;
  }))).toBe(true);

  await page.locator("#blind-choice").selectOption("ghost");
  await expect(page.locator(".piece-image.ghost")).toHaveCount(32);
  await expect(page.locator(".piece-image.ghost").first()).toHaveCSS("opacity", "0.25");
  await page.locator("#blind-choice").selectOption("discs");
  await expect(page.locator(".piece.disc")).toHaveCount(32);
  await expect(page.locator(".piece-image")).toHaveCount(0);
  await page.locator("#blind-choice").selectOption("blindfold");
  await expect(page.locator(".piece")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "e2, White pawn", exact: true })).toBeVisible();
  await page.locator("#blind-choice").selectOption("standard");
  await expect(page.locator(".piece-image")).toHaveCount(32);
});

test("production app, engine, and training reload while offline", async ({ page, context }) => {
  await openPlay(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.locator(".square")).toHaveCount(64);
  const engineCached = await page.evaluate(async () => Boolean(await caches.match("./engine/stockfish-19-lite-single.wasm")));
  expect(engineCached).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".square")).toHaveCount(64);
  await expect(page.locator(".piece-image")).toHaveCount(32);
  await expect.poll(() => page.locator(".piece-image").evaluateAll((images) => images.every((image) => {
    const piece = image as HTMLImageElement;
    const bounds = piece.getBoundingClientRect();
    return piece.complete && piece.naturalWidth > 0 && bounds.width > 0 && bounds.height > 0 && getComputedStyle(piece).visibility === "visible";
  }))).toBe(true);
  await page.locator("#coach-toggle").uncheck();
  await page.getByRole("textbox", { name: "Enter move in algebraic notation" }).fill("e4");
  await page.locator("#move-form button").click();
  await expect(page.getByText(/Engine played/).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Visualization" }).click();
  await expect(page.getByRole("heading", { name: "Visualization Gym" })).toBeVisible();
  await context.setOffline(false);
});

test("learning path records distinct practice attempts and opens a recommendation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openPlay(page);
  await page.getByRole("button", { name: "Visualization" }).click();
  await page.getByRole("button", { name: "Square Color" }).click();
  await page.getByRole("button", { name: "Dark square" }).click();
  await expect(page.locator(".mental-result")).toContainText("a1 is dark");
  await expect(page.getByRole("button", { name: "Dark square" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Light square" })).toBeDisabled();
  await page.getByRole("button", { name: "Next coordinate" }).click();
  const target = (await page.locator(".mental-surface h2").textContent())!.trim();
  const isLight = (target.charCodeAt(0) - 97 + Number(target[1])) % 2 === 0;
  await page.getByRole("button", { name: isLight ? "Light square" : "Dark square" }).click();
  await expect(page.locator(".mental-result")).toContainText(`Correct. ${target}`);

  await page.getByRole("button", { name: "Learning Path" }).click();
  await expect(page.getByRole("heading", { name: "Practice what matters next" })).toBeVisible();
  await expect(page.locator(".path-intro .metrics > div").first()).toContainText("2");
  await expect(page.locator(".activity-row")).toHaveCount(2);
  await expect(page.locator(".activity-row").last()).toContainText("color:a1");
  await expect(page.locator(".skill-row").filter({ hasText: "Visualization" })).toContainText("Strength");
  await page.getByRole("button", { name: "Open visualization" }).click();
  await expect(page.getByRole("heading", { name: "Visualization Gym" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("all four colour themes are distinct and persist after reload", async ({ page }) => {
  await openPlay(page);
  await page.getByRole("button", { name: "Data & Privacy" }).click();
  const select = page.locator("#theme-select");
  await expect(select.locator("option")).toHaveCount(4);
  const backgrounds = new Set<string>();
  const expected = {
    indigo: "rgb(12, 13, 43)",
    paper: "rgb(241, 240, 237)",
    forest: "rgb(16, 27, 24)",
    ember: "rgb(246, 234, 217)",
  };
  for (const theme of ["indigo", "paper", "forest", "ember"] as const) {
    await select.selectOption(theme);
    await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
    await expect(select).toHaveValue(theme);
    await expect(page.locator("body")).toHaveCSS("background-color", expected[theme]);
    backgrounds.add(expected[theme]);
  }
  expect(backgrounds.size).toBe(4);
  await page.reload();
  await page.getByRole("button", { name: "Data & Privacy" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "ember");
  await expect(page.locator("#theme-select")).toHaveValue("ember");
  await page.locator("#theme-select").selectOption("indigo");
});

test("view motion, mobile tab centering, and reduced motion remain unobtrusive", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlay(page);
  await page.getByRole("button", { name: "Visualization" }).click();
  await expect(page.locator("main")).toHaveClass(/view-enter/);
  const motion = await page.locator("main > *").first().evaluate((element) => getComputedStyle(element).animationName);
  expect(motion).toBe("view-in");

  await page.getByRole("button", { name: "Data & Privacy" }).click();
  await expect.poll(() => page.locator(".nav-link.active").evaluate((tab) => {
    const bounds = tab.getBoundingClientRect();
    const navigation = tab.closest("nav")!.getBoundingClientRect();
    return bounds.left >= navigation.left - 1 && bounds.right <= navigation.right + 1;
  })).toBe(true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Learning Path" }).click();
  const reducedMotion = await page.locator("main > *").first().evaluate((element) => getComputedStyle(element).animationName);
  expect(reducedMotion).toBe("none");
});

test("recent practice survives navigation and reload with its settings", async ({ page }) => {
  const recoveryKey = "stillpoint.practice-recovery.v1";
  await openPlay(page);
  await page.locator("#coach-toggle").uncheck();
  await page.locator("#strength-choice").selectOption("2");
  await page.getByRole("textbox", { name: "Enter move in algebraic notation" }).fill("e4");
  await page.locator("#move-form button").click();
  await expect(page.getByText(/Engine played/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".move-chip")).toHaveCount(2);
  await page.locator("#flip-board").click();
  await page.getByRole("button", { name: "Learning Path" }).click();
  await expect(page.getByRole("heading", { name: "Practice what matters next" })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), recoveryKey)).not.toBeNull();

  await page.reload();
  await expect(page.locator(".board-note")).toContainText("Recovered recent practice");
  await expect(page.locator(".move-chip")).toHaveCount(2);
  await expect(page.locator("#side-choice")).toHaveValue("w");
  await expect(page.locator("#strength-choice")).toHaveValue("2");
  await expect(page.locator("#coach-toggle")).not.toBeChecked();
  await expect(page.locator(".square").first()).toHaveAttribute("aria-label", /h1/);
  await expect(page.getByText(/Recent practice is recoverable for 10 minutes/)).toBeVisible();

  await page.reload();
  await expect(page.locator(".move-chip")).toHaveCount(2);
  await expect(page.locator(".board-note")).not.toContainText("Recovered recent practice · Recovered recent practice");
});

test("an expired practice snapshot is removed instead of restored", async ({ page }) => {
  const recoveryKey = "stillpoint.practice-recovery.v1";
  await page.addInitScript(({ key }) => {
    localStorage.setItem(key, JSON.stringify({
      version: 1,
      savedAt: Date.now() - 10 * 60 * 1000 - 1,
      pgn: "1. e4 e5",
      fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
      player: "w",
      orientation: "w",
      gameResult: null,
      gameSaved: false,
      selectedTime: "zen",
      clocks: [0, 0],
      increment: 0,
      coach: false,
      status: "Engine played e5",
      depth: 2,
    }));
  }, { key: recoveryKey });
  await openPlay(page);
  await expect(page.locator(".square")).toHaveCount(64);
  await expect(page.locator(".move-chip")).toHaveCount(0);
  await expect(page.locator(".board-note")).toContainText("Ready for a new game");
  await expect(page.locator(".board-note")).not.toContainText("Recovered recent practice");
  expect(await page.evaluate((key) => localStorage.getItem(key), recoveryKey)).toBeNull();
});

test("first-game guidance plays a real move and preserves both sides' explanations", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openPlay(page);
  await expect(page.getByRole("heading", { name: "Your first move is enough" })).toBeVisible();
  await page.getByRole("button", { name: "Try 1. e4", exact: true }).click();
  await expect(page.getByText(/Engine played/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".move-chip")).toHaveCount(2);
  await expect(page.locator(".move-lesson").filter({ hasText: "e4: pawn from e2 to e4" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your last move" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Opponent’s last move" })).toBeVisible();
  await expect(page.locator(".coach-preferred")).toContainText("Stockfish preferred it at this search depth");
  await expect(page.getByRole("heading", { name: "Your first move is enough" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("guidance dismissal persists without disabling play and can be reversed", async ({ page }) => {
  await openPlay(page);
  await page.getByRole("button", { name: "Hide guidance", exact: true }).click();
  await expect(page.locator(".beginner-guide")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Enter move in algebraic notation" })).toBeEnabled();
  await page.getByRole("textbox", { name: "Enter move in algebraic notation" }).fill("e4");
  await page.locator("#move-form button").click();
  await expect(page.getByText(/Engine played/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".move-lesson")).toHaveCount(0);
  await expect(page.locator(".coach-preferred")).toHaveCount(0);
  await expect(page.locator(".coach-box")).toContainText("Preferred");

  await page.getByRole("button", { name: "Data & Privacy" }).click();
  await expect(page.locator("#setting-guidance")).not.toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: "Data & Privacy" }).click();
  await expect(page.locator("#setting-guidance")).not.toBeChecked();
  await page.locator("#setting-guidance").check();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your first move is enough" })).toBeVisible();
});

test("opening recall explains correct moves and revealed repertoire answers", async ({ page }) => {
  await openPlay(page);
  await page.getByRole("button", { name: "Opening Dojo" }).click();
  await page.locator("#drill-mode").click();
  await page.locator("#opening-move").fill("e4");
  await page.locator("#opening-move-form button").click();
  await expect(page.locator(".coach-box")).toContainText("Correct: e4");
  await expect(page.locator(".move-purpose")).toContainText("opens diagonals for the queen and the f1 bishop");
  await expect(page.locator(".coach-box")).toContainText("Opponent played e5");
  await page.getByRole("button", { name: "Reveal & explain" }).click();
  await expect(page.locator(".coach-box")).toContainText("Try Nf3");
  await expect(page.locator(".coach-box")).toContainText("attacks e5");
});

test("starter Blunder Bank is nonjudgmental and reveals a concrete mate lesson", async ({ page }) => {
  await openPlay(page);
  await page.getByRole("button", { name: "Blunder Bank" }).click();
  await expect(page.getByText("This is a practice pattern, not one of your mistakes. Find checkmate in one move.")).toBeVisible();
  await page.getByRole("button", { name: "Reveal & explain" }).click();
  await expect(page.locator(".move-reading")).toContainText("Qh4#: queen from d8 to h4");
  await expect(page.locator(".move-purpose")).toContainText("White’s f- and g-pawn advances have exposed the king");
  await expect(page.locator(".move-lesson ul")).toContainText("Checkmate:");
});

test("mobile onboarding and move lessons avoid horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlay(page);
  await expect(page.locator(".beginner-guide")).toBeVisible();
  await page.getByRole("button", { name: "Try 1. e4", exact: true }).click();
  await expect(page.getByText(/Engine played/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".move-lesson").filter({ hasText: "e4: pawn from e2 to e4" })).toBeVisible();
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth > innerWidth,
    main: document.querySelector("main")!.scrollWidth > document.querySelector("main")!.clientWidth,
  }));
  expect(overflow).toEqual({ document: false, main: false });
});

test("Chinese lessons, larger text, reduced motion, and skip link persist accessibly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlay(page);
  await page.locator(".skip-link").focus();
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.locator("#guide-language").selectOption("zh");
  await expect(page.getByRole("heading", { name: "走出第一步，就已经开始了" })).toBeVisible();
  await expect(page.locator(".beginner-guide")).toHaveAttribute("lang", "zh-CN");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Data & Privacy" }).click();
  await expect(page.locator("#language-select")).toHaveValue("zh");
  await page.locator("#setting-large-text").check();
  await page.locator("#setting-reduce-motion").check();
  await expect(page.locator("body")).toHaveAttribute("data-text-size", "large");
  await expect(page.locator("body")).toHaveAttribute("data-motion", "reduce");
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("zen-chess-lab", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state = await new Promise<{ settings?: { language: string; largeText: boolean; reduceMotion: boolean } }>((resolve, reject) => {
      const request = db.transaction("state", "readonly").objectStore("state").get("current");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state.settings?.language === "zh" && state.settings.largeText && state.settings.reduceMotion;
  })).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Data & Privacy" }).click();
  await expect(page.locator("#language-select")).toHaveValue("zh");
  await expect(page.locator("#setting-large-text")).toBeChecked();
  await expect(page.locator("#setting-reduce-motion")).toBeChecked();

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("heading", { name: "走出第一步，就已经开始了" })).toBeVisible();
  const motion = await page.locator("main > *").first().evaluate((element) => getComputedStyle(element).animationName);
  expect(motion).toBe("none");
  await page.getByRole("button", { name: "试试 1. e4", exact: true }).click();
  await expect(page.getByText(/Engine played/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".move-lesson").filter({ hasText: "e4：兵从 e2 到 e4" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});

test("French and Dutch teaching persist and fit a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlay(page);
  await expect(page.locator("#guide-language")).toHaveValue("en");
  await expect(page.locator("#guide-language option")).toHaveCount(4);
  expect(await page.locator("#guide-language").evaluate((select: HTMLSelectElement) => Array.from(select.options, (option) => option.value))).toEqual(["en", "zh", "fr", "nl"]);

  await page.locator("#guide-language").selectOption("fr");
  await expect(page.getByRole("heading", { name: "Votre premier coup suffit" })).toBeVisible();
  await expect(page.locator(".beginner-guide")).toHaveAttribute("lang", "fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);

  await page.getByRole("button", { name: "Blunder Bank" }).click();
  await page.getByRole("button", { name: "Reveal & explain" }).click();
  await expect(page.locator(".move-purpose")).toContainText("La dame rejoint h4 par la diagonale");

  await page.getByRole("button", { name: "Data & Privacy" }).click();
  await page.locator("#language-select").selectOption("nl");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Blunder Bank" }).click();
  await expect(page.locator(".move-purpose")).toContainText("De dame gaat via de diagonaal naar h4");

  await page.getByRole("button", { name: "Data & Privacy" }).click();
  await expect(page.locator("#language-select")).toHaveValue("nl");
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("zen-chess-lab", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state = await new Promise<{ settings?: { language: string } }>((resolve, reject) => {
      const request = db.transaction("state", "readonly").objectStore("state").get("current");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state.settings?.language === "nl";
  })).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Data & Privacy" }).click();
  await expect(page.locator("#language-select")).toHaveValue("nl");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Je eerste zet is genoeg" })).toBeVisible();
  await expect(page.locator(".beginner-guide")).toHaveAttribute("lang", "nl");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("Today opens a real recommendation and resumes an unfinished practice", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "One useful move is enough." })).toBeVisible();
  await expect(page.locator(".today-focus .btn.primary")).toHaveCount(1);
  await expect(page.locator("#today-start")).toHaveText("Enter the practice board");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);

  await page.locator("#today-start").click();
  await expect(page.getByRole("heading", { name: "The Practice Board" })).toBeVisible();
  await page.getByRole("button", { name: "Try 1. e4", exact: true }).click();
  await expect(page.getByText(/Engine played/).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator("#today-focus-title")).toHaveText("Return to your board");
  await page.locator("#today-start").click();
  await expect(page.locator(".move-chip")).toHaveCount(2);
  await expect(page.getByText(/Engine played/).first()).toBeVisible();
});

test("simulated Android installation reports prompts and confirmation honestly", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (Linux; Android 16) Chrome/156.0.0.0 Mobile Safari/537.36" });
  });
  await openPlay(page);
  await page.getByRole("button", { name: "Data & Privacy" }).click();
  await expect(page.locator(".install-check")).toHaveCount(4);
  await expect(page.locator(".install-check").filter({ hasText: "Secure context" })).toContainText("Ready");
  await expect(page.locator(".install-check").filter({ hasText: "Manifest link" })).toContainText("Found");
  await expect(page.locator(".install-check").filter({ hasText: "Offline assets" })).toContainText("Ready");
  await expect(page.locator(".install-check").filter({ hasText: "Browser install prompt" })).toContainText("Not offered");
  await expect(page.locator(".install-panel")).toContainText("On Android Chrome");
  await expect(page.locator("#install-app")).toHaveCount(0);

  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await expect(page.locator("#install-app")).toBeVisible();
  await expect(page.locator(".install-check").filter({ hasText: "Browser install prompt" })).toContainText("Available");
  await page.locator("#install-app").click();
  await expect(page.locator(".install-result")).toContainText("Installation accepted");
  await expect(page.locator(".install-result")).toContainText("Waiting for the browser");
  await expect(page.locator(".install-state")).toHaveText("Browser tab");

  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(page.locator(".install-result")).toContainText("Installed. Stillpoint can now open from your app launcher.");
  await expect(page.locator(".install-state")).toHaveText("Installed app");
  await expect(page.locator(".install-check").filter({ hasText: "Browser install prompt" })).toContainText("Not needed");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});
