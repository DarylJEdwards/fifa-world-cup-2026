import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("preference persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with safe command-center defaults", async () => {
    const { usePreferences } = await import("./preferences");

    expect(usePreferences.getState()).toMatchObject({
      selectedGroup: "A",
      favorites: ["mex", "can", "usa"],
      theme: "dark",
      layout: "cinematic",
      timezone: "local",
      refreshSeconds: 30,
      reducedMotion: false
    });
  });

  it("updates every preference and toggles favorites idempotently", async () => {
    const { usePreferences } = await import("./preferences");
    const state = usePreferences.getState();

    state.setSelectedGroup("L");
    state.toggleFavorite("mex");
    state.toggleFavorite("bra");
    state.setTheme("gold");
    state.setLayout("compact");
    state.setTimezone("utc");
    state.setRefreshSeconds(60);
    state.setReducedMotion(true);

    expect(usePreferences.getState()).toMatchObject({
      selectedGroup: "L",
      favorites: ["can", "usa", "bra"],
      theme: "gold",
      layout: "compact",
      timezone: "utc",
      refreshSeconds: 60,
      reducedMotion: true
    });
  });

  it("rehydrates persisted preferences in a fresh store instance", async () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("localStorage", storage);
    const first = await import("./preferences");
    first.usePreferences.getState().setSelectedGroup("K");
    first.usePreferences.getState().setTheme("gold");
    first.usePreferences.getState().setReducedMotion(true);

    vi.resetModules();
    vi.stubGlobal("localStorage", storage);
    const second = await import("./preferences");
    await second.usePreferences.persist.rehydrate();

    expect(second.usePreferences.getState()).toMatchObject({
      selectedGroup: "K",
      theme: "gold",
      reducedMotion: true
    });
  });

  it("clamps refresh intervals and can restore every default", async () => {
    const { usePreferences } = await import("./preferences");
    const state = usePreferences.getState();

    state.setRefreshSeconds(2);
    expect(usePreferences.getState().refreshSeconds).toBe(10);
    usePreferences.getState().setRefreshSeconds(999);
    expect(usePreferences.getState().refreshSeconds).toBe(300);
    usePreferences.getState().setRefreshSeconds(Number.NaN);
    expect(usePreferences.getState().refreshSeconds).toBe(30);

    usePreferences.getState().setTheme("gold");
    usePreferences.getState().toggleFavorite("bra");
    usePreferences.getState().resetPreferences();
    expect(usePreferences.getState()).toMatchObject({
      selectedGroup: "A",
      favorites: ["mex", "can", "usa"],
      theme: "dark",
      layout: "cinematic",
      timezone: "local",
      refreshSeconds: 30,
      reducedMotion: false
    });
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}
