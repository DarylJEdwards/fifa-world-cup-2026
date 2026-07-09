import { groupCodes, matches as seedMatches, teams as seedTeams } from "../../src/data/seed.js";
import { buildKnockoutSlots, rankThirdPlaceTeams } from "../../src/lib/standings.js";
import type { GroupCode, GroupStanding, Match, StandingRow, Team, TournamentSnapshot } from "../../src/types.js";

interface ApiFootballConfig {
  baseUrl: string;
  apiKey: string;
  leagueId: string;
  season: string;
  timeoutMs: number;
  providerName: string;
}

interface ApiFootballEnvelope<T> {
  errors?: unknown;
  results?: number;
  response?: T[];
}

interface ApiFootballFixture {
  fixture?: {
    id?: number;
    date?: string;
    venue?: {
      name?: string;
      city?: string;
    };
    status?: {
      short?: string;
      elapsed?: number | null;
      extra?: number | null;
    };
  };
  league?: {
    round?: string;
  };
  teams?: {
    home?: ApiFootballTeamRef;
    away?: ApiFootballTeamRef;
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
}

interface ApiFootballStandingResponse {
  league?: {
    standings?: ApiFootballStandingRow[][];
  };
}

interface ApiFootballStandingRow {
  rank?: number;
  team?: ApiFootballTeamRef;
  points?: number;
  goalsDiff?: number;
  group?: string;
  form?: string;
  all?: {
    played?: number;
    win?: number;
    draw?: number;
    lose?: number;
    goals?: {
      for?: number;
      against?: number;
    };
  };
}

interface ApiFootballTeamRef {
  id?: number;
  name?: string;
  code?: string | null;
  logo?: string;
}

export async function loadApiFootballSnapshot(config: ApiFootballConfig): Promise<TournamentSnapshot> {
  const [fixtures, standings] = await Promise.all([
    fetchApiFootball<ApiFootballFixture>(config, "fixtures"),
    fetchApiFootball<ApiFootballStandingResponse>(config, "standings")
  ]);

  return mapApiFootballSnapshot({
    fixtures,
    standings,
    providerName: config.providerName
  });
}

export function mapApiFootballSnapshot({
  fixtures,
  standings,
  providerName
}: {
  fixtures: ApiFootballEnvelope<ApiFootballFixture>;
  standings: ApiFootballEnvelope<ApiFootballStandingResponse>;
  providerName: string;
}): TournamentSnapshot {
  assertEnvelope("fixtures", fixtures);
  assertEnvelope("standings", standings);

  const apiTeamIdToInternalId = new Map<number, string>();
  const groups = buildGroupsFromStandings(standings, apiTeamIdToInternalId);
  const providerMatches = mapFixtures(fixtures, apiTeamIdToInternalId);
  const groupsWithMatches = groups.map((group) => ({
    ...group,
    matches: providerMatches.filter((match) => match.group === group.code)
  }));
  const thirdPlaceRace = rankThirdPlaceTeams(groupsWithMatches);
  const knockoutSlots = buildKnockoutSlots(groupsWithMatches, thirdPlaceRace);
  const liveMatches = groupsWithMatches.flatMap((group) => group.matches).filter((match) => match.status === "live");
  const countedMatches = groupsWithMatches.flatMap((group) => group.matches).filter((match) => match.homeScore !== null && match.awayScore !== null);
  const checkedAt = new Date().toISOString();

  return {
    source: "provider",
    providerName,
    providerStatus: {
      state: "live",
      provider: providerName,
      detail: "API-Football standings and fixtures mapped into the internal tournament model.",
      checkedAt
    },
    lastUpdated: checkedAt,
    groups: groupsWithMatches,
    thirdPlaceRace,
    knockoutSlots,
    liveMatches,
    totalMatches: 104,
    goalsScored: countedMatches.length > 0
      ? countedMatches.reduce((total, match) => total + (match.homeScore ?? 0) + (match.awayScore ?? 0), 0)
      : Math.round(groupsWithMatches.flatMap((group) => group.rows).reduce((total, row) => total + row.goalsFor, 0) / 2)
  };
}

async function fetchApiFootball<T>(config: ApiFootballConfig, endpoint: "fixtures" | "standings"): Promise<ApiFootballEnvelope<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const url = new URL(endpoint, normalizeBaseUrl(config.baseUrl));
  url.searchParams.set("league", config.leagueId);
  url.searchParams.set("season", config.season);

  try {
    const response = await fetch(url, {
      headers: {
        "x-apisports-key": config.apiKey
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`API-Football ${endpoint} returned ${response.status}`);
    return await response.json() as ApiFootballEnvelope<T>;
  } finally {
    clearTimeout(timeout);
  }
}

function buildGroupsFromStandings(
  standings: ApiFootballEnvelope<ApiFootballStandingResponse>,
  apiTeamIdToInternalId: Map<number, string>
): GroupStanding[] {
  const apiRows = standings.response
    ?.flatMap((entry) => entry.league?.standings ?? [])
    .flat() ?? [];
  if (apiRows.length === 0) throw new Error("API-Football standings response was empty");

  const rowsByGroup = new Map<GroupCode, StandingRow[]>();
  apiRows.forEach((apiRow) => {
    const group = parseGroupCode(apiRow.group);
    if (!group || !apiRow.team?.name) return;
    const team = mapTeam(apiRow.team, group);
    if (apiRow.team.id !== undefined) apiTeamIdToInternalId.set(apiRow.team.id, team.id);
    const played = numberOr(apiRow.all?.played, numberOr(apiRow.all?.win) + numberOr(apiRow.all?.draw) + numberOr(apiRow.all?.lose));
    const row: StandingRow = {
      team,
      played,
      won: numberOr(apiRow.all?.win),
      drawn: numberOr(apiRow.all?.draw),
      lost: numberOr(apiRow.all?.lose),
      goalsFor: numberOr(apiRow.all?.goals?.for),
      goalsAgainst: numberOr(apiRow.all?.goals?.against),
      goalDifference: numberOr(apiRow.goalsDiff),
      points: numberOr(apiRow.points),
      fairPlay: 0,
      rank: numberOr(apiRow.rank, (rowsByGroup.get(group)?.length ?? 0) + 1),
      qualification: "outside",
      tiebreakers: []
    };
    rowsByGroup.set(group, [...(rowsByGroup.get(group) ?? []), row]);
  });

  const groups = groupCodes.map((code) => {
    const rows = [...(rowsByGroup.get(code) ?? [])].sort((a, b) => a.rank - b.rank);
    return {
      code,
      rows: rows.map((row, index) => ({
        ...row,
        rank: index + 1,
        qualification: index < 2 ? "round32" as const : index === 2 ? "thirdRace" as const : "outside" as const
      })),
      matches: []
    };
  });

  const incomplete = groups.find((group) => group.rows.length !== 4);
  if (incomplete) throw new Error(`API-Football standings missing complete Group ${incomplete.code}`);
  return groups;
}

function mapFixtures(fixtures: ApiFootballEnvelope<ApiFootballFixture>, apiTeamIdToInternalId: Map<number, string>): Match[] {
  const mapped = fixtures.response
    ?.map((entry) => {
      const group = parseGroupCode(entry.league?.round);
      const homeTeamId = mapApiFixtureTeam(entry.teams?.home, apiTeamIdToInternalId);
      const awayTeamId = mapApiFixtureTeam(entry.teams?.away, apiTeamIdToInternalId);
      if (!group || !homeTeamId || !awayTeamId || !entry.fixture?.date) return undefined;
      const venue = [entry.fixture.venue?.name, entry.fixture.venue?.city].filter(Boolean).join(", ") || "Venue TBD";
      const elapsed = entry.fixture.status?.elapsed;
      const extra = entry.fixture.status?.extra;
      const match: Match = {
        id: `api-football-${entry.fixture.id ?? `${homeTeamId}-${awayTeamId}`}`,
        group,
        homeTeamId,
        awayTeamId,
        homeScore: entry.goals?.home ?? null,
        awayScore: entry.goals?.away ?? null,
        status: mapMatchStatus(entry.fixture.status?.short),
        kickoff: entry.fixture.date,
        venue
      };
      if (typeof elapsed === "number") match.minute = `${elapsed}${typeof extra === "number" ? `+${extra}` : ""}'`;
      return match;
    })
    .filter((match): match is Match => Boolean(match)) ?? [];

  return mapped.length > 0 ? mapped : seedMatches;
}

function mapApiFixtureTeam(team: ApiFootballTeamRef | undefined, apiTeamIdToInternalId: Map<number, string>): string | undefined {
  if (team?.id !== undefined && apiTeamIdToInternalId.has(team.id)) return apiTeamIdToInternalId.get(team.id);
  if (!team?.name) return undefined;
  return findSeedTeam(team.name, team.code ?? undefined)?.id;
}

function mapTeam(apiTeam: ApiFootballTeamRef, group: GroupCode): Team {
  const seed = findSeedTeam(apiTeam.name ?? "", apiTeam.code ?? undefined);
  if (seed) return { ...seed, group };
  const name = apiTeam.name ?? "Unknown team";
  const shortName = (apiTeam.code ?? name.slice(0, 3)).toUpperCase();
  return {
    id: `api-${apiTeam.id ?? slug(name)}`,
    name,
    shortName,
    group,
    flag: "🏳️",
    colors: ["#1d4332", "#f8f1dc", "#d8a93c"],
    confederation: "TBD",
    fifaRank: 999,
    profile: {
      manager: "Provider roster pending",
      captain: "Provider roster pending",
      star: "Provider player feed pending",
      bestFinish: "Provider history pending",
      form: []
    }
  };
}

function findSeedTeam(name: string, code?: string): Team | undefined {
  const normalizedName = normalize(name);
  const normalizedCode = normalize(code ?? "");
  return seedTeams.find((team) =>
    normalize(team.name) === normalizedName ||
    normalize(team.shortName) === normalizedCode ||
    normalize(team.shortName) === normalizedName
  );
}

function assertEnvelope<T>(label: string, value: ApiFootballEnvelope<T>): void {
  if (!value || typeof value !== "object") throw new Error(`API-Football ${label} response was not an object`);
  if (hasProviderErrors(value.errors)) throw new Error(`API-Football ${label} returned provider errors`);
  if (!Array.isArray(value.response)) throw new Error(`API-Football ${label} response array missing`);
}

function hasProviderErrors(errors: unknown): boolean {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  if (typeof errors === "object") return Object.keys(errors).length > 0;
  return true;
}

function parseGroupCode(value: string | undefined): GroupCode | undefined {
  const match = value?.match(/\bGroup\s+([A-L])\b/i) ?? value?.match(/\b([A-L])\b$/i);
  const code = match?.[1]?.toUpperCase();
  return groupCodes.includes(code as GroupCode) ? code as GroupCode : undefined;
}

function mapMatchStatus(short: string | undefined): Match["status"] {
  if (!short || ["NS", "TBD", "PST"].includes(short)) return "scheduled";
  if (["FT", "AET", "PEN"].includes(short)) return "complete";
  return "live";
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slug(value: string): string {
  return normalize(value) || "team";
}

function numberOr(value: number | undefined | null, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
