import { test, expect } from "@playwright/test";

test("desktop play uses real Stockfish and produces a review", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
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
  await page.goto("/");
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
  await page.goto("/");
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
  await page.goto("/");
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
  await page.goto("/");
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

test("learning path records practice and opens an adaptive recommendation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Visualization" }).click();
  await page.getByRole("button", { name: "Square Color" }).click();
  await page.getByRole("button", { name: "Dark square" }).click();
  await page.getByRole("button", { name: "Dark square" }).click();
  await expect(page.locator(".mental-result")).toContainText("a1 is dark");

  await page.getByRole("button", { name: "Learning Path" }).click();
  await expect(page.getByRole("heading", { name: "Practice what matters next" })).toBeVisible();
  await expect(page.locator(".path-intro .metrics > div").first()).toContainText("2");
  await expect(page.locator(".activity-row")).toHaveCount(2);
  await expect(page.locator(".activity-row").first()).toContainText("color:a1");
  await expect(page.locator(".skill-row").filter({ hasText: "Visualization" })).toContainText("Strength");
  await page.getByRole("button", { name: "Open visualization" }).click();
  await expect(page.getByRole("heading", { name: "Visualization Gym" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("all four colour themes are distinct and persist after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Data & Privacy" }).click();
  const select = page.locator("#theme-select");
  await expect(select.locator("option")).toHaveCount(4);
  const backgrounds = new Set<string>();
  for (const theme of ["indigo", "paper", "forest", "ember"]) {
    await select.selectOption(theme);
    await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
    await expect(select).toHaveValue(theme);
    backgrounds.add(await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor));
  }
  expect(backgrounds.size).toBe(4);
  await page.reload();
  await page.getByRole("button", { name: "Data & Privacy" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "ember");
  await expect(page.locator("#theme-select")).toHaveValue("ember");
  await page.locator("#theme-select").selectOption("indigo");
});
