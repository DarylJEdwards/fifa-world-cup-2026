import { groupCodes, teams as seedTeams } from "../../src/data/seed.js";
import { buildKnockoutSlots, rankThirdPlaceTeams } from "../../src/lib/standings.js";
import type {
  CanonicalMatch,
  GroupCode,
  GroupStanding,
  MatchStage,
  MatchStatus,
  Player,
  PlayerLeaderboard,
  PlayerLeaderboardCategory,
  PlayerStats,
  StandingRow,
  Team,
  TournamentSnapshot
} from "../../src/types.js";

export const API_FOOTBALL_WORLD_CUP_LEAGUE_ID = "1";
export const API_FOOTBALL_WORLD_CUP_SEASON = "2026";
const EXPECTED_FIXTURE_COUNT = 104;
const EXPECTED_GROUP_FIXTURE_COUNT = 72;
const PLAYER_CAPABILITY_TTL_MS = 15 * 60 * 1000;
let playerCapabilityCache: { key: string; fetchedAt: number; envelopes: PlayerEnvelopes } | undefined;

export interface ApiFootballConfig {
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

interface ApiFootballTeamRef {
  id?: number;
  name?: string;
  code?: string | null;
  logo?: string;
}

interface ApiFootballLeagueRef {
  id?: number;
  season?: number;
  round?: string;
}

interface ApiFootballFixture {
  fixture?: {
    id?: number;
    date?: string;
    venue?: { name?: string; city?: string };
    status?: { short?: string; elapsed?: number | null; extra?: number | null };
  };
  league?: ApiFootballLeagueRef;
  teams?: { home?: ApiFootballTeamRef; away?: ApiFootballTeamRef };
  goals?: { home?: number | null; away?: number | null };
  score?: { penalty?: { home?: number | null; away?: number | null } };
}

interface ApiFootballStandingResponse {
  league?: ApiFootballLeagueRef & { standings?: ApiFootballStandingRow[][] };
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
    goals?: { for?: number; against?: number };
  };
}

interface ApiFootballPlayerResponse {
  player?: { id?: number; name?: string; photo?: string };
  statistics?: Array<{
    team?: ApiFootballTeamRef;
    league?: ApiFootballLeagueRef;
    games?: { appearances?: number; minutes?: number; number?: number; position?: string };
    goals?: { total?: number; assists?: number | null };
    cards?: { yellow?: number; yellowred?: number; red?: number };
  }>;
}

type PlayerEndpointCategory = Exclude<PlayerLeaderboardCategory, "minutes">;
type PlayerEnvelopes = Partial<Record<PlayerEndpointCategory, ApiFootballEnvelope<ApiFootballPlayerResponse>>>;
type ApiFootballEndpoint =
  | "fixtures"
  | "standings"
  | "players/topscorers"
  | "players/topassists"
  | "players/topyellowcards"
  | "players/topredcards";

const playerEndpoints: Record<PlayerEndpointCategory, ApiFootballEndpoint> = {
  goals: "players/topscorers",
  assists: "players/topassists",
  yellowCards: "players/topyellowcards",
  redCards: "players/topredcards"
};

export async function loadApiFootballSnapshot(config: ApiFootballConfig): Promise<TournamentSnapshot> {
  assertWorldCupConfig(config);
  const [fixtures, standings] = await Promise.all([
    fetchApiFootball<ApiFootballFixture>(config, "fixtures"),
    fetchApiFootball<ApiFootballStandingResponse>(config, "standings")
  ]);
  const playerEnvelopes = await loadPlayerEnvelopes(config);

  return mapApiFootballSnapshot({ fixtures, standings, playerEnvelopes, providerName: config.providerName });
}

export function resetApiFootballCachesForTests(): void {
  if (process.env.NODE_ENV === "test") playerCapabilityCache = undefined;
}

async function loadPlayerEnvelopes(config: ApiFootballConfig): Promise<PlayerEnvelopes> {
  const key = `${normalizeBaseUrl(config.baseUrl)}|${config.leagueId}|${config.season}`;
  const now = Date.now();
  if (playerCapabilityCache?.key === key && now - playerCapabilityCache.fetchedAt < PLAYER_CAPABILITY_TTL_MS) {
    return playerCapabilityCache.envelopes;
  }
  const envelopes: PlayerEnvelopes = {};
  await Promise.all(Object.entries(playerEndpoints).map(async ([category, endpoint]) => {
    try {
      envelopes[category as PlayerEndpointCategory] = await fetchApiFootball<ApiFootballPlayerResponse>(config, endpoint);
    } catch (error) {
      console.warn(`API-Football optional ${endpoint} capability unavailable:`, error instanceof Error ? error.message : error);
    }
  }));
  playerCapabilityCache = { key, fetchedAt: now, envelopes };
  return envelopes;
}

export function mapApiFootballSnapshot({
  fixtures,
  standings,
  playerEnvelopes = {},
  providerName
}: {
  fixtures: ApiFootballEnvelope<ApiFootballFixture>;
  standings: ApiFootballEnvelope<ApiFootballStandingResponse>;
  playerEnvelopes?: PlayerEnvelopes;
  providerName: string;
}): TournamentSnapshot {
  assertEnvelope("fixtures", fixtures);
  assertEnvelope("standings", standings);
  assertFixtureCompetition(fixtures);
  assertStandingsCompetition(standings);

  const checkedAt = new Date().toISOString();
  const apiTeamIdToInternalId = new Map<number, string>();
  const groups = buildGroupsFromStandings(standings, apiTeamIdToInternalId);
  const providerMatches = mapFixtures(fixtures, apiTeamIdToInternalId, groups, checkedAt);
  const groupsWithMatches = groups.map((group) => ({
    ...group,
    matches: providerMatches.filter((match) => match.stage === "group" && match.group === group.code)
  }));
  const thirdPlaceRace = rankThirdPlaceTeams(groupsWithMatches);
  const knockoutSlots = buildKnockoutSlots(groupsWithMatches, thirdPlaceRace);
  const liveMatches = providerMatches.filter((match) => match.status === "live");
  const countedMatches = providerMatches.filter((match) => match.homeScore !== null && match.awayScore !== null);
  const { players, playerLeaders } = mapPlayerCapabilities(playerEnvelopes, apiTeamIdToInternalId, checkedAt);
  const nextRefreshSeconds = liveMatches.length > 0 ? 15 : 300;

  return {
    source: "provider",
    providerName,
    providerStatus: {
      state: "live",
      provider: providerName,
      detail: `Validated World Cup 2026 feed with ${providerMatches.length} fixtures and ${playerLeaders.length} player leaderboards.`,
      checkedAt,
      cacheAgeSeconds: 0,
      nextRefreshSeconds
    },
    lastUpdated: checkedAt,
    groups: groupsWithMatches,
    thirdPlaceRace,
    knockoutSlots,
    matches: providerMatches,
    liveMatches,
    totalMatches: providerMatches.length,
    goalsScored: countedMatches.reduce((total, match) => total + (match.homeScore ?? 0) + (match.awayScore ?? 0), 0),
    capabilities: {
      liveScores: true,
      standings: true,
      fullSchedule: providerMatches.length === EXPECTED_FIXTURE_COUNT,
      bracket: providerMatches.filter((match) => match.stage !== "group").length === 32,
      teamProfiles: true,
      playerStats: players.some((player) => Boolean(player.stats)),
      leaderboards: playerLeaders.length > 0
    },
    freshness: {
      state: "live",
      updatedAt: checkedAt,
      ageSeconds: 0,
      nextRefreshAt: new Date(Date.now() + nextRefreshSeconds * 1000).toISOString()
    },
    players,
    playerLeaders
  };
}

export function assertWorldCupConfig(config: Pick<ApiFootballConfig, "leagueId" | "season">): void {
  if (config.leagueId !== API_FOOTBALL_WORLD_CUP_LEAGUE_ID) {
    throw new Error(`API-Football league must be ${API_FOOTBALL_WORLD_CUP_LEAGUE_ID} for the FIFA World Cup; received ${config.leagueId || "missing"}`);
  }
  if (config.season !== API_FOOTBALL_WORLD_CUP_SEASON) {
    throw new Error(`API-Football season must be ${API_FOOTBALL_WORLD_CUP_SEASON}; received ${config.season || "missing"}`);
  }
}

export function mapApiFootballMatchStatus(short: string | undefined): MatchStatus {
  if (!short || ["NS", "TBD"].includes(short)) return "scheduled";
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE"].includes(short)) return "live";
  if (["FT", "AET", "PEN", "AWD", "WO"].includes(short)) return "complete";
  if (short === "PST") return "postponed";
  if (["CANC", "ABD"].includes(short)) return "cancelled";
  if (["SUSP", "INT"].includes(short)) return "suspended";
  throw new Error(`Unsupported API-Football fixture status: ${short}`);
}

async function fetchApiFootball<T>(config: ApiFootballConfig, endpoint: ApiFootballEndpoint): Promise<ApiFootballEnvelope<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const url = new URL(endpoint, normalizeBaseUrl(config.baseUrl));
  url.searchParams.set("league", API_FOOTBALL_WORLD_CUP_LEAGUE_ID);
  url.searchParams.set("season", API_FOOTBALL_WORLD_CUP_SEASON);
  try {
    const response = await fetch(url, { headers: { "x-apisports-key": config.apiKey }, signal: controller.signal });
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
  const apiRows = standings.response?.flatMap((entry) => entry.league?.standings ?? []).flat() ?? [];
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

function mapFixtures(
  fixtures: ApiFootballEnvelope<ApiFootballFixture>,
  apiTeamIdToInternalId: Map<number, string>,
  groups: GroupStanding[],
  checkedAt: string
): CanonicalMatch[] {
  const entries = [...(fixtures.response ?? [])].sort((a, b) => String(a.fixture?.date).localeCompare(String(b.fixture?.date)));
  if (entries.length !== EXPECTED_FIXTURE_COUNT) {
    throw new Error(`API-Football fixtures must contain all ${EXPECTED_FIXTURE_COUNT} World Cup matches; received ${entries.length}`);
  }
  const internalGroupByTeamId = new Map(groups.flatMap((group) => group.rows.map((row) => [row.team.id, group.code] as const)));
  const mapped = entries.map((entry, index): CanonicalMatch => {
    const round = entry.league?.round;
    const homeTeamId = mapApiFixtureTeam(entry.teams?.home, apiTeamIdToInternalId);
    const awayTeamId = mapApiFixtureTeam(entry.teams?.away, apiTeamIdToInternalId);
    const stage = parseStage(round);
    const group = stage === "group"
      ? parseGroupCode(round) ?? sameGroup(homeTeamId, awayTeamId, internalGroupByTeamId)
      : undefined;
    if (!homeTeamId || !awayTeamId || !entry.fixture?.date) throw new Error(`API-Football fixture ${entry.fixture?.id ?? index + 1} is missing teams or kickoff`);
    if (stage === "group" && !group) throw new Error(`API-Football group fixture ${entry.fixture.id ?? index + 1} has no valid group`);
    const elapsed = entry.fixture.status?.elapsed;
    const extra = entry.fixture.status?.extra;
    return {
      id: `api-football-${entry.fixture.id ?? index + 1}`,
      providerId: entry.fixture.id,
      matchNumber: index + 1,
      stage,
      ...(group ? { group } : {}),
      homeTeamId,
      awayTeamId,
      homeSource: { kind: "team", teamId: homeTeamId },
      awaySource: { kind: "team", teamId: awayTeamId },
      homeScore: entry.goals?.home ?? null,
      awayScore: entry.goals?.away ?? null,
      homePenaltyScore: entry.score?.penalty?.home ?? null,
      awayPenaltyScore: entry.score?.penalty?.away ?? null,
      status: mapApiFootballMatchStatus(entry.fixture.status?.short),
      kickoff: entry.fixture.date,
      venue: [entry.fixture.venue?.name, entry.fixture.venue?.city].filter(Boolean).join(", ") || "Venue TBD",
      updatedAt: checkedAt,
      ...(typeof elapsed === "number" ? { minute: `${elapsed}${typeof extra === "number" ? `+${extra}` : ""}'` } : {})
    };
  });
  const groupCount = mapped.filter((match) => match.stage === "group").length;
  if (groupCount !== EXPECTED_GROUP_FIXTURE_COUNT) throw new Error(`API-Football fixture stages contain ${groupCount} group matches; expected ${EXPECTED_GROUP_FIXTURE_COUNT}`);
  if (mapped.length - groupCount !== 32) throw new Error("API-Football fixture stages must contain all 32 knockout matches");
  return mapped;
}

function mapPlayerCapabilities(
  envelopes: PlayerEnvelopes,
  apiTeamIdToInternalId: Map<number, string>,
  checkedAt: string
): { players: Player[]; playerLeaders: PlayerLeaderboard[] } {
  const playersById = new Map<string, Player>();
  const leaderboards: PlayerLeaderboard[] = [];
  for (const category of Object.keys(playerEndpoints) as PlayerEndpointCategory[]) {
    const envelope = envelopes[category];
    if (!envelope) continue;
    try {
      assertEnvelope(playerEndpoints[category], envelope);
      assertPlayerCompetition(envelope);
      const entries: PlayerLeaderboard["entries"] = [];
      for (const response of envelope.response ?? []) {
        const stat = response.statistics?.find((item) => isExpectedLeague(item.league));
        const teamId = mapApiFixtureTeam(stat?.team, apiTeamIdToInternalId);
        if (!response.player?.id || !response.player.name || !stat || !teamId) continue;
        const playerId = `api-player-${response.player.id}`;
        const stats: PlayerStats = {
          appearances: numberOr(stat.games?.appearances),
          minutes: numberOr(stat.games?.minutes),
          goals: numberOr(stat.goals?.total),
          assists: numberOr(stat.goals?.assists),
          yellowCards: numberOr(stat.cards?.yellow) + numberOr(stat.cards?.yellowred),
          redCards: numberOr(stat.cards?.red) + numberOr(stat.cards?.yellowred)
        };
        const existing = playersById.get(playerId);
        playersById.set(playerId, {
          id: playerId,
          providerId: response.player.id,
          name: response.player.name,
          teamId,
          position: stat.games?.position,
          shirtNumber: stat.games?.number,
          photoUrl: response.player.photo,
          stats: existing?.stats ? mergePlayerStats(existing.stats, stats) : stats,
          updatedAt: checkedAt
        });
        const value = stats[category];
        if (value > 0) entries.push({ rank: entries.length + 1, playerId, teamId, value });
      }
      if (entries.length > 0) leaderboards.push({ category, entries });
    } catch (error) {
      console.warn(`Ignoring invalid optional ${playerEndpoints[category]} response:`, error instanceof Error ? error.message : error);
    }
  }
  const players = [...playersById.values()];
  const minutes = players
    .filter((player) => (player.stats?.minutes ?? 0) > 0)
    .sort((a, b) => (b.stats?.minutes ?? 0) - (a.stats?.minutes ?? 0))
    .slice(0, 20)
    .map((player, index) => ({ rank: index + 1, playerId: player.id, teamId: player.teamId, value: player.stats?.minutes ?? 0 }));
  if (minutes.length > 0) leaderboards.push({ category: "minutes", entries: minutes });
  return { players, playerLeaders: leaderboards };
}

function mergePlayerStats(a: PlayerStats, b: PlayerStats): PlayerStats {
  return {
    appearances: Math.max(a.appearances, b.appearances),
    minutes: Math.max(a.minutes, b.minutes),
    goals: Math.max(a.goals, b.goals),
    assists: Math.max(a.assists, b.assists),
    yellowCards: Math.max(a.yellowCards, b.yellowCards),
    redCards: Math.max(a.redCards, b.redCards)
  };
}

function assertFixtureCompetition(envelope: ApiFootballEnvelope<ApiFootballFixture>): void {
  if ((envelope.response ?? []).some((entry) => !isExpectedLeague(entry.league))) throw new Error("API-Football fixtures returned the wrong league or season");
}

function assertStandingsCompetition(envelope: ApiFootballEnvelope<ApiFootballStandingResponse>): void {
  if ((envelope.response ?? []).some((entry) => !isExpectedLeague(entry.league))) throw new Error("API-Football standings returned the wrong league or season");
}

function assertPlayerCompetition(envelope: ApiFootballEnvelope<ApiFootballPlayerResponse>): void {
  if ((envelope.response ?? []).some((entry) => !(entry.statistics ?? []).some((stat) => isExpectedLeague(stat.league)))) {
    throw new Error("API-Football player response returned the wrong league or season");
  }
}

function isExpectedLeague(league: ApiFootballLeagueRef | undefined): boolean {
  return String(league?.id ?? "") === API_FOOTBALL_WORLD_CUP_LEAGUE_ID && String(league?.season ?? "") === API_FOOTBALL_WORLD_CUP_SEASON;
}

function parseStage(round: string | undefined): MatchStage {
  const value = round?.toLowerCase() ?? "";
  if (value.includes("group")) return "group";
  if (/round of 32|1\/16/.test(value)) return "round32";
  if (/round of 16|1\/8|8th final/.test(value)) return "round16";
  if (/quarter/.test(value)) return "quarterfinal";
  if (/semi/.test(value)) return "semifinal";
  if (/third|3rd/.test(value)) return "thirdPlace";
  if (/final/.test(value)) return "final";
  throw new Error(`Unsupported API-Football World Cup round: ${round ?? "missing"}`);
}

function sameGroup(homeTeamId: string | undefined, awayTeamId: string | undefined, groups: Map<string, GroupCode>): GroupCode | undefined {
  const home = homeTeamId ? groups.get(homeTeamId) : undefined;
  return home && awayTeamId && groups.get(awayTeamId) === home ? home : undefined;
}

function mapApiFixtureTeam(team: ApiFootballTeamRef | undefined, apiTeamIdToInternalId: Map<number, string>): string | undefined {
  if (team?.id !== undefined && apiTeamIdToInternalId.has(team.id)) return apiTeamIdToInternalId.get(team.id);
  const seed = team?.name ? findSeedTeam(team.name, team.code ?? undefined) : undefined;
  if (seed) return seed.id;
  return team?.id !== undefined ? `api-team-${team.id}` : undefined;
}

function mapTeam(apiTeam: ApiFootballTeamRef, group: GroupCode): Team {
  const seed = findSeedTeam(apiTeam.name ?? "", apiTeam.code ?? undefined);
  if (seed) return { ...seed, group };
  const name = apiTeam.name ?? "Unknown team";
  return {
    id: `api-team-${apiTeam.id ?? slug(name)}`,
    name,
    shortName: (apiTeam.code ?? name.slice(0, 3)).toUpperCase(),
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
  return seedTeams.find((team) => normalize(team.name) === normalizedName || normalize(team.shortName) === normalizedCode || normalize(team.shortName) === normalizedName);
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
