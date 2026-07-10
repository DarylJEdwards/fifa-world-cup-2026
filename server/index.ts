import cors from "cors";
import express from "express";
import { buildTournamentSnapshot } from "../src/lib/standings.js";
import type { ProviderStatus, TournamentSnapshot } from "../src/types.js";
import {
  API_FOOTBALL_WORLD_CUP_LEAGUE_ID,
  API_FOOTBALL_WORLD_CUP_SEASON,
  loadApiFootballSnapshot,
  resetApiFootballCachesForTests
} from "./provider/apiFootball.js";
import {
  FIFA_PUBLIC_BASE_URL,
  FIFA_WORLD_CUP_SEASON,
  loadFifaSnapshot
} from "./provider/fifa.js";

const port = Number(process.env.PORT ?? 4174);
let providerCache: { snapshot: TournamentSnapshot; fetchedAt: number; freshUntil: number; staleUntil: number } | undefined;

export function resetProviderCacheForTests(): void {
  if (process.env.NODE_ENV === "test") {
    providerCache = undefined;
    resetApiFootballCachesForTests();
  }
}

export function createApp() {
  const app = express();
  let cache: TournamentSnapshot = buildTournamentSnapshot();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", async (_request, response) => {
    cache = await loadSnapshot();
    const ready = cache.providerStatus.state === "live";
    response.json({
      ok: ready,
      ready,
      degraded: !ready,
      providerConfigured: isProviderConfigured(),
      provider: envString("SPORTS_PROVIDER") ?? "seed",
      buildSha: envString("VERCEL_GIT_COMMIT_SHA") ?? envString("GITHUB_SHA") ?? "local",
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
    response.json(cache.matches ?? cache.groups.flatMap((group) => group.matches));
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
  const providerUrl = envString("SPORTS_API_BASE_URL");
  const providerKey = envString("SPORTS_API_KEY");
  const configuredProvider = envString("SPORTS_PROVIDER") ?? "seed";
  const providerKind = normalizeProvider(configuredProvider, Boolean(providerUrl && providerKey));
  const providerName = providerKind === "fifa" ? "FIFA" : configuredProvider;
  const missingConfig =
    providerKind === "fifa"
      ? undefined
      : providerKind === "api-football"
        ? !providerUrl || !providerKey
          ? "SPORTS_API_BASE_URL or SPORTS_API_KEY is missing"
          : undefined
        : "SPORTS_PROVIDER must be fifa or api-football";
  if (missingConfig) {
    return withProviderStatus(
      buildTournamentSnapshot("seed-cache", "Seed cache"),
      "missing-config",
      providerName,
      `${missingConfig}; serving seed-cache fallback.`
    );
  }

  const now = Date.now();
  const legacyTtlSeconds = envOptionalNumber("PROVIDER_CACHE_TTL_SECONDS");
  const liveTtlSeconds = legacyTtlSeconds ?? envNumber("PROVIDER_LIVE_CACHE_TTL_SECONDS", 15);
  const idleTtlSeconds = legacyTtlSeconds ?? envNumber("PROVIDER_IDLE_CACHE_TTL_SECONDS", 300);
  const staleTtlSeconds = envNumber("PROVIDER_STALE_TTL_SECONDS", 600);
  const timeoutMs = envNumber("PROVIDER_TIMEOUT_MS", 8000);
  if (providerCache && now < providerCache.freshUntil) {
    const cacheAgeSeconds = Math.round((now - providerCache.fetchedAt) / 1000);
    const nextRefreshSeconds = Math.max(1, Math.ceil((providerCache.freshUntil - now) / 1000));
    return withCacheAge(providerCache.snapshot, "live", cacheAgeSeconds, nextRefreshSeconds);
  }

  try {
    const snapshot = providerKind === "fifa"
      ? await loadFifaSnapshot({
          baseUrl: providerUrl ?? FIFA_PUBLIC_BASE_URL,
          season: envString("SPORTS_API_SEASON") ?? FIFA_WORLD_CUP_SEASON,
          timeoutMs,
          providerName
        })
      : await loadApiFootballSnapshot({
          baseUrl: providerUrl as string,
          apiKey: providerKey as string,
          leagueId: envString("SPORTS_API_LEAGUE_ID") ?? API_FOOTBALL_WORLD_CUP_LEAGUE_ID,
          season: envString("SPORTS_API_SEASON") ?? API_FOOTBALL_WORLD_CUP_SEASON,
          timeoutMs,
          providerName
        });
    if (!isTournamentSnapshot(snapshot)) throw new Error("Provider mapper returned an invalid TournamentSnapshot");
    const freshTtlSeconds = snapshot.providerStatus.nextRefreshSeconds === 15 ? liveTtlSeconds : idleTtlSeconds;
    providerCache = {
      snapshot,
      fetchedAt: now,
      freshUntil: now + freshTtlSeconds * 1000,
      staleUntil: now + staleTtlSeconds * 1000
    };
    return withCacheAge(snapshot, "live", 0, freshTtlSeconds);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.warn("Falling back to seed cache:", message);
    if (providerCache && now < providerCache.staleUntil) {
      const retrySeconds = providerCache.snapshot.providerStatus.nextRefreshSeconds === 15 ? liveTtlSeconds : idleTtlSeconds;
      return withCacheAge(providerCache.snapshot, "stale", Math.round((now - providerCache.fetchedAt) / 1000), retrySeconds, message);
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
  if (snapshot.source === "provider") {
    if (!Array.isArray(snapshot.matches) || snapshot.matches.length !== 104) return false;
    if (new Set(snapshot.matches.map((match) => match.matchNumber)).size !== 104) return false;
    if (snapshot.matches.some((match) => !match.stage || !match.homeSource || !match.awaySource)) return false;
    if (!snapshot.capabilities?.fullSchedule || !snapshot.capabilities.bracket) return false;
    if (!snapshot.freshness || snapshot.freshness.state === "unavailable") return false;
  }

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
  const checkedAt = new Date().toISOString();
  return {
    ...snapshot,
    source: state === "live" || state === "stale" ? "provider" : "seed-cache",
    providerName: provider,
    providerStatus: {
      state,
      provider,
      detail,
      checkedAt
    },
    freshness: {
      state: state === "live" ? "live" : state === "stale" ? "stale" : "unavailable",
      updatedAt: checkedAt,
      ageSeconds: 0
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
  const checkedAt = new Date().toISOString();
  return {
    ...snapshot,
    providerStatus: {
      ...snapshot.providerStatus,
      state,
      detail: errorDetail
        ? `Serving stale provider cache after refresh failure: ${errorDetail}`
        : snapshot.providerStatus.detail,
      checkedAt,
      cacheAgeSeconds,
      nextRefreshSeconds
    },
    freshness: {
      state: state === "stale" ? "stale" : cacheAgeSeconds > 0 ? "cached" : "live",
      updatedAt: snapshot.freshness?.updatedAt ?? snapshot.lastUpdated,
      ageSeconds: cacheAgeSeconds,
      nextRefreshAt: new Date(Date.now() + nextRefreshSeconds * 1000).toISOString()
    }
  };
}

function envNumber(name: string, fallback: number): number {
  const value = Number(envString(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function envOptionalNumber(name: string): number | undefined {
  const raw = envString(name);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function envString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function normalizeProvider(provider: string, inferApiFootball = false): "fifa" | "api-football" | "unknown" {
  const normalized = provider.trim().toLowerCase();
  if (normalized === "fifa" || normalized === "fifa-official") return "fifa";
  if (normalized === "api-football" || normalized === "api football") return "api-football";
  if (inferApiFootball) return "api-football";
  return "unknown";
}

function isProviderConfigured(): boolean {
  const providerUrl = envString("SPORTS_API_BASE_URL");
  const providerKey = envString("SPORTS_API_KEY");
  const hasApiFootballCredentials = Boolean(providerUrl && providerKey);
  const providerKind = normalizeProvider(envString("SPORTS_PROVIDER") ?? "seed", hasApiFootballCredentials);
  if (providerKind === "fifa") return true;
  if (providerKind === "api-football") return Boolean(providerUrl && providerKey);
  return false;
}
