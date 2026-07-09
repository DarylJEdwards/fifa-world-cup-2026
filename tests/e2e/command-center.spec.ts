import { expect, test } from "@playwright/test";
import axe from "axe-core";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText("Live Tournament Orbit")).toBeVisible({ timeout: 20_000 });
});

test("all product sections expose complete fallback-safe workflows", async ({ page }) => {
  const openSection = async (name: string) => {
    const button = page.getByRole("button", { name });
    if (!(await button.isVisible())) await page.getByRole("button", { name: "Open menu" }).click();
    await button.click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  };

  await openSection("Groups");
  await expect(page.locator(".group-board-card")).toHaveCount(12);
  await expect(page.locator(".group-board-card").first()).toContainText("6 fixtures");

  await openSection("Matches");
  await expect(page.locator(".match-card")).toHaveCount(104);
  await page.getByLabel("Stage").selectOption("round32");
  await expect(page.locator(".match-card")).toHaveCount(16);
  await page.getByLabel("Search").fill("no-such-team");
  await expect(page.getByText("No matches fit these filters")).toBeVisible();
  await page.getByLabel("Search").fill("");

  await openSection("Knockout");
  await expect(page.locator(".bracket-round")).toHaveCount(6);
  await expect(page.locator(".bracket-match")).toHaveCount(32);
  await expect(page.getByLabel("Best third-place ranking")).toBeAttached();

  await openSection("Teams");
  await expect(page.locator(".team-card")).toHaveCount(48);
  await page.getByRole("button", { name: "Open Mexico profile" }).click();
  await expect(page.getByRole("article", { name: "Mexico team profile" })).toContainText("4 tournament fixtures");
  await page.getByLabel("Search").fill("Mexico");
  await expect(page.locator(".team-card")).toHaveCount(1);

  await openSection("Players");
  await expect(page.getByText("Verified player statistics are unavailable")).toBeVisible();

  await openSection("Stats Hub");
  await expect(page.locator(".kpi-grid")).toContainText("104");
  await expect(page.locator(".stage-telemetry > div").first()).toContainText("0/72");

  await openSection("Settings");
  const settings = page.getByRole("region", { name: "Settings" });
  await page.locator(".refresh-control input").fill("2");
  await expect(page.locator(".refresh-control input")).toHaveValue("10");
  await settings.getByLabel("Theme").selectOption("gold");
  await page.getByRole("button", { name: "Reset preferences" }).click();
  await expect(settings.getByLabel("Theme")).toHaveValue("dark");
});

test("core command-center controls update visible state", async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000);
  await expect(page.locator(".group-card")).toHaveCount(12);
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator(".inspector-head strong")).toHaveText("Group A");

  await page.locator('button[data-group="L"]').click();
  await expect(page.locator(".inspector-head strong")).toHaveText("Group L");

  await page.getByRole("button", { name: "Next group, Group A" }).click();
  await expect(page.locator(".inspector-head strong")).toHaveText("Group A");

  await page.getByRole("button", { name: "Previous group, Group L" }).click();
  await expect(page.locator(".inspector-head strong")).toHaveText("Group L");

  const favoritesCount = page.locator(".segmented", { hasText: "Favorites" }).locator("strong");
  const favoritesBefore = await favoritesCount.textContent();
  await page.getByRole("button", { name: "Toggle favorite" }).click();
  await expect(favoritesCount).not.toHaveText(favoritesBefore ?? "");

  await page.getByLabel("Theme").selectOption("gold");
  await expect(page.locator(".app-shell")).toHaveClass(/theme-gold/);

  await page.getByLabel("Layout").selectOption("compact");
  await expect(page.locator(".app-shell")).toHaveClass(/layout-compact/);

  await page.getByLabel("Timezone").selectOption("utc");
  await expect(page.getByLabel("Timezone")).toHaveValue("utc");

  await page.getByRole("button", { name: "Toggle reduced motion" }).click();
  await expect(page.locator(".app-shell")).toHaveClass(/reduce-motion/);

  const refresh = page.waitForResponse((response) => response.url().includes("/api/tournament") && response.ok());
  await page.getByRole("button", { name: "Refresh data" }).click();
  await refresh;

  const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(noHorizontalOverflow).toBe(true);

  await page.screenshot({ path: testInfo.outputPath("command-center.png"), animations: "disabled" });
});

test("preferences survive a full page reload", async ({ page }) => {
  await page.locator('button[data-group="L"]').click();
  await page.getByLabel("Theme").selectOption("gold");
  await page.getByLabel("Layout").selectOption("compact");
  await page.getByLabel("Timezone").selectOption("utc");
  await page.getByRole("button", { name: "Toggle reduced motion" }).click();

  await page.reload();
  await expect(page.getByText("Live Tournament Orbit")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".inspector-head strong")).toHaveText("Group L");
  await expect(page.locator(".app-shell")).toHaveClass(/theme-gold/);
  await expect(page.locator(".app-shell")).toHaveClass(/layout-compact/);
  await expect(page.locator(".app-shell")).toHaveClass(/reduce-motion/);
  await expect(page.getByLabel("Timezone")).toHaveValue("utc");
});

test("navigation opens every product section", async ({ page }) => {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");

  for (const section of ["Matches", "Groups", "Knockout", "Teams", "Players", "Stats Hub", "Settings"]) {
    if (!(await page.getByRole("button", { name: section }).isVisible())) {
      await menuButton.click();
    }
    await page.getByRole("button", { name: section }).click();
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }

});

test("keyboard focus and serious accessibility checks pass on every section", async ({ page }) => {
  const homeNav = page.getByRole("button", { name: "Home" });
  if (!(await homeNav.isVisible())) {
    await page.getByRole("button", { name: "Open menu" }).click();
  }
  await homeNav.focus();
  await expect(homeNav).toBeFocused();

  for (const section of ["Home", "Matches", "Groups", "Knockout", "Teams", "Players", "Stats Hub", "Settings"]) {
    const button = page.getByRole("button", { name: section });
    if (!(await button.isVisible())) await page.getByRole("button", { name: "Open menu" }).click();
    await button.click();
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate<AxeRunResult>(async () => {
      const runner = (window as unknown as AxeWindow).axe;
      return runner.run(document);
    });
    const severeViolations = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
    expect(
      severeViolations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.flatMap((node) => node.target)
      })),
      `${section} accessibility violations`
    ).toEqual([]);
  }
});

interface AxeWindow {
  axe: {
    run: (context: Document, options: unknown) => Promise<AxeRunResult>;
  };
}

interface AxeRunResult {
  violations: Array<{
    id: string;
    impact: string | null;
    nodes: Array<{
      target: string[];
    }>;
  }>;
}
