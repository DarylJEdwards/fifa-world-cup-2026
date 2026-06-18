import { createServer, type IncomingMessage, type RequestListener, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { groupCodes, teams as seedTeams } from "../src/data/seed";
import { createApp, isTournamentSnapshot, resetProviderCacheForTests } from "./index";
import type { GroupStanding, Match, Team, TournamentSnapshot } from "../src/types";

describe("World Cup API contract", () => {
  afterEach(() => {
    delete process.env.SPORTS_API_BASE_URL;
    delete process.env.SPORTS_API_KEY;
    delete process.env.SPORTS_PROVIDER;
    delete process.env.PROVIDER_CACHE_TTL_SECONDS;
    delete process.env.PROVIDER_STALE_TTL_SECONDS;
    resetProviderCacheForTests();
    vi.restoreAllMocks();
  });

  it("serves the core route shapes from the seed cache", async () => {
    const api = await startServer(createApp());
    try {
      const health = await getJson<HealthResponse>(`${api.baseUrl}/api/health`);
      expect(health).toMatchObject({ ok: true, provider: "seed" });
      expect(typeof health.cachedAt).toBe("string");
      expect(health.providerStatus.state).toBe("seed");

      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(isTournamentSnapshot(tournament)).toBe(true);
      expect(tournament.groups).toHaveLength(12);
      expect(tournament.thirdPlaceRace).toHaveLength(12);
      expect(tournament.liveMatches.length).toBeGreaterThan(0);

      const groups = await getJson<GroupStanding[]>(`${api.baseUrl}/api/groups`);
      expect(groups).toHaveLength(12);
      expect(groups[0].rows).toHaveLength(4);

      const matches = await getJson<Match[]>(`${api.baseUrl}/api/matches`);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]).toHaveProperty("kickoff");

      const standings = await getJson<Array<Pick<GroupStanding, "code" | "rows">>>(`${api.baseUrl}/api/standings`);
      expect(standings).toHaveLength(12);
      expect(standings[0]).toEqual({ code: tournament.groups[0].code, rows: tournament.groups[0].rows });

      const teamId = tournament.groups[0].rows[0].team.id;
      const team = await getJson<Team>(`${api.baseUrl}/api/teams/${teamId}`);
      expect(team).toEqual(tournament.groups[0].rows[0].team);
    } finally {
      await stopServer(api.server);
    }
  });

  it("returns 404 for unknown teams", async () => {
    const api = await startServer(createApp());
    try {
      const response = await fetch(`${api.baseUrl}/api/teams/not-a-team`);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Team not found" });
    } finally {
      await stopServer(api.server);
    }
  });

  it("maps API-Football standings and fixtures into the tournament snapshot", async () => {
    let providerHeaders: IncomingMessage["headers"] = {};
    const provider = await startServer((request: IncomingMessage, response: ServerResponse) => {
      providerHeaders = request.headers;
      response.setHeader("content-type", "application/json");
      if (request.url?.startsWith("/standings")) {
        response.end(JSON.stringify(apiFootballStandingsEnvelope()));
        return;
      }
      response.end(JSON.stringify(apiFootballFixturesEnvelope()));
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    process.env.SPORTS_PROVIDER = "API-Football";

    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.source).toBe("provider");
      expect(tournament.providerName).toBe("API-Football");
      expect(tournament.providerStatus.state).toBe("live");
      expect(tournament.groups).toHaveLength(12);
      expect(tournament.groups[0].matches[0]).toMatchObject({ group: "A", status: "live", homeScore: 1, awayScore: 0 });
      expect(providerHeaders["x-apisports-key"]).toBe("test-key");
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("falls back to seed cache when provider JSON is invalid", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const provider = await startServer((_request: IncomingMessage, response: ServerResponse) => {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ groups: [] }));
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    process.env.SPORTS_PROVIDER = "Broken Provider";

    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.source).toBe("seed-cache");
      expect(tournament.providerName).toBe("Broken Provider");
      expect(tournament.providerStatus.state).toBe("fallback");
      expect(tournament.groups).toHaveLength(12);
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("falls back to seed cache when the provider returns a non-200 response", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const provider = await startServer((_request: IncomingMessage, response: ServerResponse) => {
      response.statusCode = 429;
      response.end("rate limited");
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    process.env.SPORTS_PROVIDER = "Rate Limited Provider";

    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.source).toBe("seed-cache");
      expect(tournament.providerStatus.state).toBe("fallback");
      expect(tournament.providerStatus.detail).toContain("429");
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it.each([
    { statusCode: 401, label: "auth failure" },
    { statusCode: 403, label: "forbidden auth failure" },
    { statusCode: 429, label: "quota or rate limit" },
    { statusCode: 503, label: "provider outage" }
  ])("reports fallback detail for provider $statusCode responses ($label)", async ({ statusCode }) => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const provider = await startServer((_request: IncomingMessage, response: ServerResponse) => {
      response.statusCode = statusCode;
      response.end(`provider returned ${statusCode}`);
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    process.env.SPORTS_PROVIDER = "API-Football";

    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.source).toBe("seed-cache");
      expect(tournament.providerStatus.state).toBe("fallback");
      expect(tournament.providerStatus.detail).toContain(String(statusCode));
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("falls back to seed cache when provider requests time out", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const provider = await startServer(() => {
      // Intentionally hold the connection open until the provider timeout aborts the request.
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    process.env.SPORTS_PROVIDER = "Slow Provider";
    process.env.PROVIDER_TIMEOUT_MS = "25";

    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.source).toBe("seed-cache");
      expect(tournament.providerStatus.state).toBe("fallback");
      expect(tournament.providerStatus.detail).toMatch(/abort|timeout|operation/i);
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("falls back to seed cache when provider standings are empty", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const provider = await startServer((request: IncomingMessage, response: ServerResponse) => {
      response.setHeader("content-type", "application/json");
      if (request.url?.startsWith("/standings")) {
        response.end(JSON.stringify({ errors: [], results: 0, response: [] }));
        return;
      }
      response.end(JSON.stringify(apiFootballFixturesEnvelope()));
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    process.env.SPORTS_PROVIDER = "Empty Provider";

    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.source).toBe("seed-cache");
      expect(tournament.providerStatus.state).toBe("fallback");
      expect(tournament.providerStatus.detail).toContain("empty");
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("falls back to seed cache when provider standings are missing a group", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const provider = await startServer((request: IncomingMessage, response: ServerResponse) => {
      response.setHeader("content-type", "application/json");
      if (request.url?.startsWith("/standings")) {
        response.end(JSON.stringify(apiFootballStandingsEnvelope({ omitGroup: "L" })));
        return;
      }
      response.end(JSON.stringify(apiFootballFixturesEnvelope()));
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    process.env.SPORTS_PROVIDER = "Incomplete Provider";

    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.source).toBe("seed-cache");
      expect(tournament.providerStatus.state).toBe("fallback");
      expect(tournament.providerStatus.detail).toContain("Group L");
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("serves stale provider cache after a refresh failure", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let shouldFail = false;
    const provider = await startServer((request: IncomingMessage, response: ServerResponse) => {
      response.setHeader("content-type", "application/json");
      if (shouldFail) {
        response.end(JSON.stringify({ errors: { message: "schema drift" }, response: [] }));
        return;
      }
      if (request.url?.startsWith("/standings")) {
        response.end(JSON.stringify(apiFootballStandingsEnvelope()));
        return;
      }
      response.end(JSON.stringify(apiFootballFixturesEnvelope()));
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    process.env.SPORTS_PROVIDER = "API-Football";
    process.env.PROVIDER_CACHE_TTL_SECONDS = "1";
    process.env.PROVIDER_STALE_TTL_SECONDS = "60";

    const api = await startServer(createApp());
    try {
      const liveTournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(liveTournament.providerStatus.state).toBe("live");
      shouldFail = true;
      await delay(1100);
      const staleTournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(staleTournament.source).toBe("provider");
      expect(staleTournament.providerStatus.state).toBe("stale");
      expect(staleTournament.providerStatus.cacheAgeSeconds).toBeGreaterThanOrEqual(1);
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });
});

interface HealthResponse {
  ok: boolean;
  provider: string;
  cachedAt: string;
  providerStatus: TournamentSnapshot["providerStatus"];
}

function apiFootballStandingsEnvelope(options: { omitGroup?: string } = {}) {
  let apiId = 1000;
  return {
    errors: [],
    results: 1,
    response: [
      {
        league: {
          standings: groupCodes.filter((code) => code !== options.omitGroup).map((code) =>
            seedTeams
              .filter((team) => team.group === code)
              .map((team, index) => ({
                rank: index + 1,
                team: {
                  id: apiId++,
                  name: team.name,
                  code: team.shortName
                },
                points: 9 - index,
                goalsDiff: 4 - index,
                group: `World Cup - Group ${code}`,
                all: {
                  played: 3,
                  win: Math.max(0, 3 - index),
                  draw: index === 3 ? 1 : 0,
                  lose: index,
                  goals: {
                    for: 6 - index,
                    against: 2 + index
                  }
                }
              }))
          )
        }
      }
    ]
  };
}

function apiFootballFixturesEnvelope() {
  return {
    errors: [],
    results: 1,
    response: [
      {
        fixture: {
          id: 9001,
          date: "2026-06-18T21:00:00-05:00",
          venue: {
            name: "Estadio Guadalajara",
            city: "Guadalajara"
          },
          status: {
            short: "2H",
            elapsed: 62
          }
        },
        league: {
          round: "World Cup - Group A"
        },
        teams: {
          home: { name: "Mexico", code: "MEX" },
          away: { name: "South Korea", code: "KOR" }
        },
        goals: {
          home: 1,
          away: 0
        }
      }
    ]
  };
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  expect(response.ok).toBe(true);
  return response.json() as Promise<T>;
}

function startServer(listener: RequestListener): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer(listener);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
