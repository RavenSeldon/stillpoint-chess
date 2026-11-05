import { test, expect } from "@playwright/test";
import { translateText } from "../../src/ui/localization";

const locales = [
  { id: "zh", tag: "zh-CN" },
  { id: "fr", tag: "fr" },
  { id: "nl", tag: "nl" },
] as const;

const views = [
  ["today", "One useful move is enough.", "Today"],
  ["path", "Practice what matters next", "Learning Path"],
  ["play", "The Practice Board", "Play"],
  ["openings", "Opening Dojo", "Opening Dojo"],
  ["visualize", "Visualization Gym", "Visualization"],
  ["endgames", "Essential Endgames", "Endgames"],
  ["blunders", "Blunder Bank", "Blunder Bank"],
  ["masters", "Classical Masters", "Master Games"],
  ["settings", "Your Space", "Data & Privacy"],
] as const;

for (const locale of locales) {
  test(`${locale.id}: every view, course copy, feedback, and mobile layout`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    const failedRequests: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator('[data-view="settings"]').click();
    await page.locator("#language-select").selectOption(locale.id);
    await expect(page.locator("html")).toHaveAttribute("lang", locale.tag);

    for (const [view, heading, navigation] of views) {
      await page.locator(`.navigation [data-view="${view}"]`).click();
      await expect(page.locator("main h1")).toHaveText(translateText(heading, locale.id));
      await expect(page.locator(".navigation")).toContainText(translateText(navigation, locale.id));
      await expect(page.locator("html")).toHaveAttribute("lang", locale.tag);

      if (view === "openings") {
        await expect(page.locator(".opening-note")).toContainText(translateText("Develop rapidly, claim central squares, and prepare d4 with c3.", locale.id));
        await page.locator("#opening-select").selectOption("ruy");
        await expect(page.locator("#opening-select option:checked")).toContainText(translateText("Ruy Lopez", locale.id));
        await page.locator("#opening-select").selectOption("italian");
        await page.locator("#drill-mode").click();
        await page.locator("#opening-move").fill("e4");
        await page.locator("#opening-move-form button").click();
        const explanation = "The pawn occupies the center and opens diagonals for the queen and the f1 bishop.";
        await expect(page.locator(".coach-box")).toContainText(translateText(`Correct: e4. ${explanation}`, locale.id));
      }
      if (view === "endgames") {
        await expect(page.locator("main")).toContainText(translateText("Promote your pawn or checkmate.", locale.id));
      }
      if (view === "blunders") {
        await page.locator("#blunder-hint").click();
        await expect(page.locator(".move-purpose")).toContainText(translateText("The queen reaches h4 with check along the diagonal to e1. White’s f- and g-pawn advances have exposed the king, and there is no legal answer to this check.", locale.id));
      }
      if (view === "masters") {
        await expect(page.locator("main")).toContainText(translateText("The Opera Game", locale.id));
      }

      const overflow = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth > innerWidth,
        main: document.querySelector("main")!.scrollWidth > document.querySelector("main")!.clientWidth,
      }));
      expect(overflow, `${locale.id}/${view} overflow`).toEqual({ document: false, main: false });
      if (process.env.LOCALIZATION_SHOTS) {
        await page.screenshot({ path: testInfo.outputPath(`${locale.id}-${view}.png`), fullPage: true });
      }
    }
    expect(errors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}

test("board-only promotion UI translates immediately and remains keyboard usable", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('[data-view="settings"]').click();
  await page.locator("#language-select").selectOption("zh");
  await page.locator('[data-view="play"]').click();
  await page.locator(".setup-details summary").click();
  await page.locator("#setup-text").fill("7k/P7/8/8/8/8/8/7K w - - 0 1");
  await page.locator("#load-setup").click();
  await page.locator('[data-square="a7"]').click();
  await page.locator('[data-square="a8"]').click();
  const dialog = page.getByRole("dialog", { name: translateText("Choose the piece to promote to on a8", "zh") });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".promotion-title")).toHaveText(translateText("Promote on a8", "zh"));
  for (const piece of ["queen", "rook", "bishop", "knight"]) {
    await expect(dialog.getByRole("button", { name: translateText(`Promote to ${piece}`, "zh") })).toBeVisible();
  }
  await expect(dialog.getByRole("button", { name: translateText("Promote to queen", "zh") })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".promotion-overlay")).toHaveCount(0);
  if (process.env.LOCALIZATION_SHOTS) {
    await page.locator('[data-square="a7"]').click();
    await page.locator('[data-square="a8"]').click();
    await expect(page.locator(".promotion-overlay")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("zh-promotion-desktop.png"), fullPage: true });
  }
  expect(errors).toEqual([]);
});
