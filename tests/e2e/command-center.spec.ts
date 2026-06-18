import { expect, test } from "@playwright/test";
import axe from "axe-core";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await expect(page.getByText("Live Tournament Orbit")).toBeVisible({ timeout: 20_000 });
});

test("core command-center controls update visible state", async ({ page }, testInfo) => {
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

  await page.screenshot({ path: testInfo.outputPath("command-center.png"), fullPage: true });
});

test("navigation opens every product section", async ({ page }) => {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");

  for (const section of ["Matches", "Knockout", "Teams", "Players", "Stats Hub", "Settings"]) {
    if (!(await page.getByRole("button", { name: section }).isVisible())) {
      await menuButton.click();
    }
    await page.getByRole("button", { name: section }).click();
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }

  if (!(await page.getByRole("button", { name: "Groups" }).isVisible())) {
    await menuButton.click();
  }
  await page.getByRole("button", { name: "Groups" }).click();
  await expect(page.getByText("Live Tournament Orbit")).toBeVisible();
});

test("keyboard focus and serious accessibility checks pass", async ({ page }) => {
  const homeNav = page.getByRole("button", { name: "Home" });
  if (!(await homeNav.isVisible())) {
    await page.getByRole("button", { name: "Open menu" }).click();
  }
  await homeNav.focus();
  await expect(homeNav).toBeFocused();

  await page.addScriptTag({ content: axe.source });
  const results = await page.evaluate<AxeRunResult>(async () => {
    const runner = (window as unknown as AxeWindow).axe;
    return runner.run(document, {
      rules: {
        "color-contrast": { enabled: false }
      }
    });
  });
  const severeViolations = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");

  expect(
    severeViolations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.flatMap((node) => node.target)
    }))
  ).toEqual([]);
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
