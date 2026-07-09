import cors from "cors";
import express from "express";
import { buildTournamentSnapshot } from "../src/lib/standings.js";
import type { ProviderStatus, TournamentSnapshot } from "../src/types.js";
import { loadApiFootballSnapshot } from "./provider/apiFootball.js";

const port = Number(process.env.PORT ?? 4174);
let providerCache: { snapshot: TournamentSnapshot; fetchedAt: number; staleUntil: number } | undefined;

export function resetProviderCacheForTests(): void {
  if (process.env.NODE_ENV === "test") providerCache = undefined;
}

export function createApp() {
  const app = express();
  let cache: TournamentSnapshot = buildTournamentSnapshot();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({
      ok: true,
      provider: process.env.SPORTS_PROVIDER ?? "seed",
      cachedAt: cache.lastUpdated,
      providerStatus: cache.providerStatus
    });
  });

  app.get("/api/tournament", async (_request, response) => {
    cache = await loadSnapshot();
    response.json(cache);
  });

  app.get("/api/groups", async (_request, response) => {
    cache = await loadSnapshot();
    response.json(cache.groups);
  });

  app.get("/api/matches", async (_request, response) => {
    cache = await loadSnapshot();
    response.json(cache.groups.flatMap((group) => group.matches));
  });

  app.get("/api/standings", async (_request, response) => {
    cache = await loadSnapshot();
    response.json(cache.groups.map(({ code, rows }) => ({ code, rows })));
  });

  app.get("/api/teams/:id", async (request, response) => {
    cache = await loadSnapshot();
    const team = cache.groups.flatMap((group) => group.rows).find((row) => row.team.id === request.params.id)?.team;
    if (!team) {
      response.status(404).json({ error: "Team not found" });
      return;
    }
    response.json(team);
  });

  return app;
}

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  createApp().listen(port, "127.0.0.1", () => {
    console.log(`World Cup 2026 API listening on http://127.0.0.1:${port}`);
  });
}

export async function loadSnapshot(): Promise<TournamentSnapshot> {
  const providerUrl = process.env.SPORTS_API_BASE_URL;
  const providerKey = process.env.SPORTS_API_KEY;
  const providerName = process.env.SPORTS_PROVIDER ?? "api-football";
  if (!providerUrl || !providerKey) {
    return withProviderStatus(
      buildTournamentSnapshot("seed-cache", "Seed cache"),
      "missing-config",
      providerName,
      "SPORTS_API_BASE_URL or SPORTS_API_KEY is missing; serving seed-cache fallback."
    );
  }

  const now = Date.now();
  const freshTtlSeconds = envNumber("PROVIDER_CACHE_TTL_SECONDS", 60);
  const staleTtlSeconds = envNumber("PROVIDER_STALE_TTL_SECONDS", 600);
  const timeoutMs = envNumber("PROVIDER_TIMEOUT_MS", 8000);
  if (providerCache && now - providerCache.fetchedAt < freshTtlSeconds * 1000) {
    return withCacheAge(providerCache.snapshot, "live", Math.round((now - providerCache.fetchedAt) / 1000), freshTtlSeconds);
  }

  try {
    const snapshot = await loadApiFootballSnapshot({
      baseUrl: providerUrl,
      apiKey: providerKey,
      leagueId: process.env.SPORTS_API_LEAGUE_ID ?? "1",
      season: process.env.SPORTS_API_SEASON ?? "2026",
      timeoutMs,
      providerName
    });
    if (!isTournamentSnapshot(snapshot)) throw new Error("Provider mapper returned an invalid TournamentSnapshot");
    providerCache = {
      snapshot,
      fetchedAt: now,
      staleUntil: now + staleTtlSeconds * 1000
    };
    return withCacheAge(snapshot, "live", 0, freshTtlSeconds);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.warn("Falling back to seed cache:", message);
    if (providerCache && now < providerCache.staleUntil) {
      return withCacheAge(providerCache.snapshot, "stale", Math.round((now - providerCache.fetchedAt) / 1000), freshTtlSeconds, message);
    }
    return withProviderStatus(
      buildTournamentSnapshot("seed-cache", "Seed cache fallback"),
      "fallback",
      providerName,
      `Provider unavailable; serving seed-cache fallback. ${message}`
    );
  }
}

export function isTournamentSnapshot(value: unknown): value is TournamentSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<TournamentSnapshot>;
  if (!Array.isArray(snapshot.groups) || snapshot.groups.length !== 12) return false;
  if (!Array.isArray(snapshot.thirdPlaceRace) || !Array.isArray(snapshot.knockoutSlots) || !Array.isArray(snapshot.liveMatches)) return false;
  if (typeof snapshot.lastUpdated !== "string") return false;
  if (!isProviderStatus(snapshot.providerStatus)) return false;

  return snapshot.groups.every((group) =>
    typeof group.code === "string" &&
    Array.isArray(group.rows) &&
    group.rows.length === 4 &&
    Array.isArray(group.matches) &&
    group.rows.every((row) =>
      row &&
      typeof row.rank === "number" &&
      typeof row.points === "number" &&
      typeof row.goalDifference === "number" &&
      row.team &&
      typeof row.team.id === "string" &&
      typeof row.team.name === "string" &&
      Array.isArray(row.team.colors)
    )
  );
}

function isProviderStatus(value: unknown): value is ProviderStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Partial<ProviderStatus>;
  return (
    typeof status.state === "string" &&
    typeof status.provider === "string" &&
    typeof status.detail === "string" &&
    typeof status.checkedAt === "string"
  );
}

function withProviderStatus(
  snapshot: TournamentSnapshot,
  state: ProviderStatus["state"],
  provider: string,
  detail: string
): TournamentSnapshot {
  return {
    ...snapshot,
    source: state === "live" || state === "stale" ? "provider" : "seed-cache",
    providerName: provider,
    providerStatus: {
      state,
      provider,
      detail,
      checkedAt: new Date().toISOString()
    }
  };
}

function withCacheAge(
  snapshot: TournamentSnapshot,
  state: ProviderStatus["state"],
  cacheAgeSeconds: number,
  nextRefreshSeconds: number,
  errorDetail?: string
): TournamentSnapshot {
  return {
    ...snapshot,
    providerStatus: {
      ...snapshot.providerStatus,
      state,
      detail: errorDetail
        ? `Serving stale provider cache after refresh failure: ${errorDetail}`
        : snapshot.providerStatus.detail,
      checkedAt: new Date().toISOString(),
      cacheAgeSeconds,
      nextRefreshSeconds
    }
  };
}

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
