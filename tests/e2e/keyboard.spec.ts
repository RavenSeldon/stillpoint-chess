import { test, expect, type Page } from "@playwright/test";

/**
 * Keyboard-only traversal: core play and training must remain operable
 * without a pointer, and focus must survive the app's full re-renders.
 */

async function openPlay(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Play", exact: true }).click();
}

/**
 * WebKit mirrors Safari: plain Tab only visits text fields unless the user
 * enables full keyboard access; Option+Tab (Alt+Tab) traverses every control.
 */
function tabKey(page: Page) {
  return page.context().browser()?.browserType().name() === "webkit" ? "Alt+Tab" : "Tab";
}

/**
 * Tab forward until the target holds focus; fails honestly after `limit` stops.
 * Targets: "#id", "square:e4", or a visible-label suffix (nav buttons carry
 * emoji prefixes in textContent, e.g. "✦Learning Path").
 */
async function tabUntilFocused(page: Page, target: string, limit: number) {
  for (let i = 0; i < limit; i++) {
    const hit = await page.evaluate((wanted) => {
      const el = document.activeElement;
      if (!el || el === document.body) return false;
      if (wanted.startsWith("#")) return el.id === wanted.slice(1);
      if (wanted.startsWith("square:")) return el.getAttribute("data-square") === wanted.slice(7);
      const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
      return label === wanted || label.endsWith(wanted);
    }, target);
    if (hit) return;
    await page.keyboard.press(tabKey(page));
  }
  throw new Error(`Never reached ${target} by keyboard within ${limit} tab stops`);
}

test("skip link and every main view are reachable by keyboard alone", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.keyboard.press(tabKey(page));
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  // Entering the skip link lands past the navigation; reload so nav
  // traversal starts cleanly from the top of the tab order.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Learning Path", exact: true })).toBeVisible();

  // Each view switch resets focus to the top of the page, so every hop
  // begins from the skip link and reaches nav within the first ~10 stops.
  for (const [label, heading] of [
    ["Learning Path", "Practice what matters next"],
    ["Opening Dojo", "Opening Dojo"],
    ["Visualization", "Visualization Gym"],
    ["Endgames", "Essential Endgames"],
    ["Blunder Bank", "Blunder Bank"],
    ["Master Games", "Classical Masters"],
    ["Data & Privacy", "Your Space"],
  ] as const) {
    await tabUntilFocused(page, label, 15);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});

test("a complete keyboard-only move works: input form and board squares", async ({ page }) => {
  await openPlay(page);
  // Path one: the move form, operated entirely by keyboard.
  await tabUntilFocused(page, "#move-input", 120);
  await page.keyboard.type("e4");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Engine played/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".move-chip")).toHaveCount(2);

  // Path two: tap-free square selection on the board itself.
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await tabUntilFocused(page, "square:e2", 90);
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-square="e2"]')).toHaveAttribute("aria-pressed", "true");
  // After selection the board re-renders; when focus restore works the legal
  // targets sit a couple of stops away, and the generous limit also covers a
  // full wrap from the top of the page.
  await tabUntilFocused(page, "square:e4", 60);
  await page.keyboard.press("Enter");
  await expect(page.locator(".move-chip").first()).toContainText("e4", { timeout: 30_000 });
});

test("promotion chooser offers all four pieces and respects Escape", async ({ page }) => {
  await openPlay(page);
  // Load a position with a pending promotion; strength irrelevant (zen, no clock).
  await page.locator(".setup-details summary").click();
  await page.locator("#setup-text").fill("8/2P5/8/8/8/4k3/8/4K3 w - - 0 1");
  await page.getByRole("button", { name: "Load position" }).click();

  await tabUntilFocused(page, "square:c7", 90);
  await page.keyboard.press("Enter");
  await tabUntilFocused(page, "square:c8", 60);
  await page.keyboard.press("Enter");

  const chooser = page.getByRole("dialog", { name: /Choose the piece to promote/ });
  await expect(chooser).toBeVisible();
  await expect(page.getByRole("button", { name: "Promote to queen" })).toBeFocused();

  // Escape cancels: no promotion happens and the position is unchanged.
  await page.keyboard.press("Escape");
  await expect(chooser).toHaveCount(0);
  await expect(page.locator('[data-square="c7"]')).toHaveAttribute("aria-label", /White pawn/);
  await expect(page.locator('[data-square="c8"]')).toHaveAttribute("aria-label", /empty/);

  // Reopen and choose the rook by keyboard: underpromotion must be real.
  await tabUntilFocused(page, "square:c7", 90);
  await page.keyboard.press("Enter");
  await tabUntilFocused(page, "square:c8", 60);
  await page.keyboard.press("Enter");
  await page.keyboard.press(tabKey(page)); // queen → rook
  await expect(page.getByRole("button", { name: "Promote to rook" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-square="c8"]')).toHaveAttribute("aria-label", /White rook/);
});

test("focus survives the app's full re-renders", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Visualization" }).click();
  await page.getByRole("button", { name: "Square Color" }).click();
  const next = page.getByRole("button", { name: "Next coordinate" });
  await next.focus();
  await page.keyboard.press("Enter");
  // The whole app re-renders on each exercise step; focus must come back.
  await expect(next).toBeFocused();
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(next).toBeFocused();
});
