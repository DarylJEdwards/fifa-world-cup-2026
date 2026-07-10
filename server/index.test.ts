import { createServer, type IncomingMessage, type RequestListener, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { groupCodes, matches as seedMatches, teams as seedTeams } from "../src/data/seed";
import { createApp, isTournamentSnapshot, resetProviderCacheForTests } from "./index";
import type { GroupStanding, Match, Team, TournamentSnapshot } from "../src/types";
import { mapApiFootballMatchStatus } from "./provider/apiFootball";

describe("World Cup API contract", () => {
  afterEach(() => {
    delete process.env.SPORTS_API_BASE_URL;
    delete process.env.SPORTS_API_KEY;
    delete process.env.SPORTS_PROVIDER;
    delete process.env.PROVIDER_CACHE_TTL_SECONDS;
    delete process.env.PROVIDER_LIVE_CACHE_TTL_SECONDS;
    delete process.env.PROVIDER_IDLE_CACHE_TTL_SECONDS;
    delete process.env.PROVIDER_STALE_TTL_SECONDS;
    delete process.env.PROVIDER_TIMEOUT_MS;
    delete process.env.SPORTS_API_LEAGUE_ID;
    delete process.env.SPORTS_API_SEASON;
    resetProviderCacheForTests();
    vi.restoreAllMocks();
  });

  it("serves the core route shapes from the seed cache", async () => {
    const api = await startServer(createApp());
    try {
      const health = await getJson<HealthResponse>(`${api.baseUrl}/api/health`);
      expect(health).toMatchObject({ ok: false, ready: false, degraded: true, providerConfigured: false, provider: "seed" });
      expect(typeof health.cachedAt).toBe("string");
      expect(health.providerStatus.state).toBe("missing-config");

      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(isTournamentSnapshot(tournament)).toBe(true);
      expect(tournament.groups).toHaveLength(12);
      expect(tournament.thirdPlaceRace).toHaveLength(12);
      expect(tournament.liveMatches).toHaveLength(0);
      expect(tournament.matches).toHaveLength(104);

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

  it("reports missing provider configuration while serving the complete seed fallback", async () => {
    process.env.SPORTS_PROVIDER = "API-Football";
    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.source).toBe("seed-cache");
      expect(tournament.providerName).toBe("API-Football");
      expect(tournament.providerStatus.state).toBe("missing-config");
      expect(tournament.providerStatus.detail).toContain("SPORTS_API_KEY");
      expect(tournament.groups).toHaveLength(12);
    } finally {
      await stopServer(api.server);
    }
  });

  it("loads the official FIFA provider without an API key", async () => {
    let requestedUrl = "";
    const provider = await startServer((request, response) => {
      requestedUrl = request.url ?? "";
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(fifaCalendarEnvelope()));
    });
    process.env.SPORTS_PROVIDER = "fifa";
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_SEASON = "2026";

    const api = await startServer(createApp());
    try {
      const health = await getJson<HealthResponse>(`${api.baseUrl}/api/health`);
      expect(health).toMatchObject({
        ok: true,
        ready: true,
        degraded: false,
        providerConfigured: true,
        provider: "fifa"
      });
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament).toMatchObject({
        source: "provider",
        providerName: "FIFA",
        providerStatus: { state: "live", provider: "FIFA" },
        totalMatches: 104
      });
      expect(tournament.matches).toHaveLength(104);
      expect(tournament.matches?.filter((match) => match.status === "complete")).toHaveLength(72);
      const request = new URL(requestedUrl, provider.baseUrl);
      expect(request.pathname).toBe("/api/v3/calendar/matches");
      expect(request.searchParams.get("IdCompetition")).toBe("17");
      expect(request.searchParams.get("IdSeason")).toBe("285023");
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("uses fast fixture caching without refetching slower player capabilities", async () => {
    let providerRequests = 0;
    const provider = await startServer((request: IncomingMessage, response: ServerResponse) => {
      providerRequests += 1;
      response.setHeader("content-type", "application/json");
      const body = request.url?.startsWith("/standings")
        ? apiFootballStandingsEnvelope()
        : request.url?.startsWith("/fixtures")
          ? apiFootballFixturesEnvelope()
          : { errors: [], results: 0, response: [] };
      response.end(JSON.stringify(body));
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    process.env.PROVIDER_CACHE_TTL_SECONDS = "1";
    const api = await startServer(createApp());
    try {
      expect((await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`)).providerStatus.state).toBe("live");
      expect((await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`)).providerStatus.state).toBe("live");
      expect(providerRequests).toBe(6);
      await delay(1100);
      expect((await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`)).providerStatus.state).toBe("live");
      expect(providerRequests).toBe(8);
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
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
      response.end(JSON.stringify(request.url?.startsWith("/fixtures") ? apiFootballFixturesEnvelope() : { errors: [], results: 0, response: [] }));
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
      expect(tournament.matches).toHaveLength(104);
      expect(tournament.matches?.filter((match) => match.stage !== "group")).toHaveLength(32);
      expect(tournament.capabilities).toMatchObject({ fullSchedule: true, bracket: true, standings: true });
      expect(tournament.freshness).toMatchObject({ state: "live", ageSeconds: 0 });
      expect(tournament.providerStatus.nextRefreshSeconds).toBe(15);
      expect(await getJson<Match[]>(`${api.baseUrl}/api/matches`)).toHaveLength(104);
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
      expect(staleTournament.freshness?.state).toBe("stale");
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("rejects a wrong configured World Cup league before making an upstream request", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let providerRequests = 0;
    const provider = await startServer((_request, response) => {
      providerRequests += 1;
      response.end(JSON.stringify(apiFootballFixturesEnvelope()));
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    process.env.SPORTS_API_LEAGUE_ID = "2";
    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.source).toBe("seed-cache");
      expect(tournament.providerStatus.state).toBe("fallback");
      expect(tournament.providerStatus.detail).toContain("league must be 1");
      expect(providerRequests).toBe(0);
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("rejects incomplete or wrong-competition fixture feeds instead of mixing seed matches into live data", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const provider = await startServer((request, response) => {
      response.setHeader("content-type", "application/json");
      if (request.url?.startsWith("/standings")) return response.end(JSON.stringify(apiFootballStandingsEnvelope()));
      if (request.url?.startsWith("/fixtures")) return response.end(JSON.stringify(apiFootballFixturesEnvelope({ fixtureCount: 103, leagueId: 2 })));
      response.end(JSON.stringify({ errors: [], results: 0, response: [] }));
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.source).toBe("seed-cache");
      expect(tournament.providerStatus.state).toBe("fallback");
      expect(tournament.providerStatus.detail).toMatch(/wrong league|104 World Cup matches/);
      expect(tournament.providerStatus.state).not.toBe("live");
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("requests the explicit World Cup competition and exposes player leaderboard capabilities", async () => {
    const requestedUrls: string[] = [];
    const provider = await startServer((request, response) => {
      requestedUrls.push(request.url ?? "");
      response.setHeader("content-type", "application/json");
      if (request.url?.startsWith("/standings")) return response.end(JSON.stringify(apiFootballStandingsEnvelope()));
      if (request.url?.startsWith("/fixtures")) return response.end(JSON.stringify(apiFootballFixturesEnvelope()));
      response.end(JSON.stringify(apiFootballPlayersEnvelope()));
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.players).toHaveLength(1);
      expect(tournament.players?.[0]).toMatchObject({ name: "Tournament Star", teamId: "mex" });
      expect(tournament.playerLeaders?.map((leaderboard) => leaderboard.category).sort()).toEqual([
        "assists", "goals", "minutes", "redCards", "yellowCards"
      ]);
      expect(tournament.capabilities).toMatchObject({ playerStats: true, leaderboards: true });
      expect(requestedUrls).toHaveLength(6);
      requestedUrls.forEach((url) => {
        const parsed = new URL(url, provider.baseUrl);
        expect(parsed.searchParams.get("league")).toBe("1");
        expect(parsed.searchParams.get("season")).toBe("2026");
      });
      const health = await getJson<HealthResponse>(`${api.baseUrl}/api/health`);
      expect(health).toMatchObject({ ok: true, ready: true, degraded: false, providerConfigured: true });
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("publishes a slower freshness cadence when no match is live", async () => {
    const provider = await startServer((request, response) => {
      response.setHeader("content-type", "application/json");
      if (request.url?.startsWith("/standings")) return response.end(JSON.stringify(apiFootballStandingsEnvelope()));
      if (request.url?.startsWith("/fixtures")) return response.end(JSON.stringify(apiFootballFixturesEnvelope({ includeLive: false })));
      response.end(JSON.stringify({ errors: [], results: 0, response: [] }));
    });
    process.env.SPORTS_API_BASE_URL = provider.baseUrl;
    process.env.SPORTS_API_KEY = "test-key";
    const api = await startServer(createApp());
    try {
      const tournament = await getJson<TournamentSnapshot>(`${api.baseUrl}/api/tournament`);
      expect(tournament.liveMatches).toHaveLength(0);
      expect(tournament.providerStatus.nextRefreshSeconds).toBe(300);
      expect(tournament.freshness?.nextRefreshAt).toBeTruthy();
    } finally {
      await stopServer(api.server);
      await stopServer(provider.server);
    }
  });

  it("maps provider status codes without treating postponed or cancelled fixtures as live", () => {
    expect(mapApiFootballMatchStatus("NS")).toBe("scheduled");
    expect(mapApiFootballMatchStatus("2H")).toBe("live");
    expect(mapApiFootballMatchStatus("PEN")).toBe("complete");
    expect(mapApiFootballMatchStatus("PST")).toBe("postponed");
    expect(mapApiFootballMatchStatus("CANC")).toBe("cancelled");
    expect(mapApiFootballMatchStatus("SUSP")).toBe("suspended");
    expect(() => mapApiFootballMatchStatus("UNKNOWN")).toThrow("Unsupported");
  });
});

interface HealthResponse {
  ok: boolean;
  ready: boolean;
  degraded: boolean;
  providerConfigured: boolean;
  provider: string;
  cachedAt: string;
  providerStatus: TournamentSnapshot["providerStatus"];
}

function fifaCalendarEnvelope() {
  return {
    ContinuationToken: null,
    Results: Array.from({ length: 104 }, (_, index) => {
      const matchNumber = index + 1;
      const groupMatch = matchNumber <= 72 ? seedMatches[matchNumber - 1] : undefined;
      const homeTeam = groupMatch ? seedTeams.find((team) => team.id === groupMatch.homeTeamId) : undefined;
      const awayTeam = groupMatch ? seedTeams.find((team) => team.id === groupMatch.awayTeamId) : undefined;
      const fifaTeam = (team: Team | undefined) => team ? {
        IdTeam: `fifa-${team.id}`,
        IdCountry: team.shortName === "CUR" ? "CUW" : team.shortName,
        Abbreviation: team.shortName === "CUR" ? "CUW" : team.shortName,
        TeamName: [{ Locale: "en-GB", Description: team.name }],
        ShortClubName: team.name,
        Score: matchNumber % 2
      } : null;
      const stageName = fifaTestStageName(matchNumber);
      return {
        IdCompetition: "17",
        IdSeason: "285023",
        IdStage: `stage-${stageName}`,
        IdGroup: groupMatch ? `group-${groupMatch.group}` : undefined,
        IdMatch: `fifa-match-${matchNumber}`,
        MatchNumber: matchNumber,
        MatchStatus: groupMatch ? 0 : 1,
        ResultType: groupMatch ? 1 : 0,
        Date: new Date(Date.UTC(2026, 5, 11, 19) + index * 3_600_000).toISOString(),
        StageName: [{ Locale: "en-GB", Description: stageName }],
        GroupName: groupMatch ? [{ Locale: "en-GB", Description: `Group ${groupMatch.group}` }] : [],
        Home: fifaTeam(homeTeam),
        Away: fifaTeam(awayTeam),
        HomeTeamScore: groupMatch ? matchNumber % 3 : null,
        AwayTeamScore: groupMatch ? (matchNumber + 1) % 2 : null,
        HomeTeamPenaltyScore: null,
        AwayTeamPenaltyScore: null,
        MatchTime: groupMatch ? "90'" : null,
        Winner: groupMatch ? `fifa-${homeTeam?.id}` : null,
        PlaceHolderA: groupMatch ? null : "Previous winner",
        PlaceHolderB: groupMatch ? null : "Previous winner",
        Stadium: {
          Name: [{ Locale: "en-GB", Description: `Stadium ${matchNumber}` }],
          CityName: [{ Locale: "en-GB", Description: "Host City" }]
        }
      };
    })
  };
}

function fifaTestStageName(matchNumber: number): string {
  if (matchNumber <= 72) return "First Stage";
  if (matchNumber <= 88) return "Round of 32";
  if (matchNumber <= 96) return "Round of 16";
  if (matchNumber <= 100) return "Quarter-final";
  if (matchNumber <= 102) return "Semi-final";
  if (matchNumber === 103) return "Play-off for third place";
  return "Final";
}

function apiFootballStandingsEnvelope(options: { omitGroup?: string } = {}) {
  let apiId = 1000;
  return {
    errors: [],
    results: 1,
    response: [
      {
        league: {
          id: 1,
          season: 2026,
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

function apiFootballFixturesEnvelope(options: { fixtureCount?: number; leagueId?: number; includeLive?: boolean } = {}) {
  const fixtureCount = options.fixtureCount ?? 104;
  const leagueId = options.leagueId ?? 1;
  const includeLive = options.includeLive ?? true;
  const pairs = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]] as const;
  const groupFixtures = groupCodes.flatMap((group) => {
    const groupTeams = seedTeams.filter((team) => team.group === group);
    return pairs.map(([homeIndex, awayIndex], roundIndex) => ({
      fixture: {
        id: 9001 + groupCodes.indexOf(group) * 6 + roundIndex,
        date: new Date(Date.UTC(2026, 5, 11) + (groupCodes.indexOf(group) * 6 + roundIndex) * 21_600_000).toISOString(),
        venue: { name: `Group ${group} Stadium`, city: "Host City" },
        status: {
          short: group === "A" && roundIndex === 0 && includeLive ? "2H" : roundIndex < 2 ? "FT" : "NS",
          elapsed: group === "A" && roundIndex === 0 && includeLive ? 62 : undefined
        }
      },
      league: { id: leagueId, season: 2026, round: `World Cup - Group ${group}` },
      teams: {
        home: { name: groupTeams[homeIndex].name, code: groupTeams[homeIndex].shortName },
        away: { name: groupTeams[awayIndex].name, code: groupTeams[awayIndex].shortName }
      },
      goals: roundIndex < 2 ? { home: 1, away: 0 } : { home: null, away: null }
    }));
  });
  const knockoutRounds = [
    ...Array.from({ length: 16 }, () => "Round of 32"),
    ...Array.from({ length: 8 }, () => "Round of 16"),
    ...Array.from({ length: 4 }, () => "Quarter-finals"),
    ...Array.from({ length: 2 }, () => "Semi-finals"),
    "3rd Place Final",
    "Final"
  ];
  const knockoutFixtures = knockoutRounds.map((round, index) => {
    const home = seedTeams[(index * 2) % seedTeams.length];
    const away = seedTeams[(index * 2 + 1) % seedTeams.length];
    return {
      fixture: {
        id: 9073 + index,
        date: new Date(Date.UTC(2026, 6, 1) + index * 21_600_000).toISOString(),
        venue: { name: "Knockout Stadium", city: "Host City" },
        status: { short: "NS" }
      },
      league: { id: leagueId, season: 2026, round },
      teams: {
        home: { name: home.name, code: home.shortName },
        away: { name: away.name, code: away.shortName }
      },
      goals: { home: null, away: null },
      score: { penalty: { home: null, away: null } }
    };
  });
  const response = [...groupFixtures, ...knockoutFixtures].slice(0, fixtureCount);
  return {
    errors: [],
    results: response.length,
    response
  };
}

function apiFootballPlayersEnvelope() {
  return {
    errors: [],
    results: 1,
    response: [
      {
        player: { id: 77, name: "Tournament Star", photo: "https://example.test/player.png" },
        statistics: [
          {
            team: { id: 1000, name: "Mexico", code: "MEX" },
            league: { id: 1, season: 2026 },
            games: { appearances: 7, minutes: 612, number: 10, position: "Attacker" },
            goals: { total: 5, assists: 3 },
            cards: { yellow: 2, yellowred: 0, red: 1 }
          }
        ]
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
