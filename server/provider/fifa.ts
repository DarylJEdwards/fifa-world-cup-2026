import { groupCodes, teams as seedTeams } from "../../src/data/seed.js";
import { buildGroupStandings, rankThirdPlaceTeams } from "../../src/lib/standings.js";
import { buildFullKnockoutSlots, buildTournamentSchedule, validateTournamentSchedule } from "../../src/lib/tournament.js";
import type {
  CanonicalMatch,
  GroupCode,
  GroupStanding,
  MatchStage,
  MatchStatus,
  Team,
  TournamentSnapshot
} from "../../src/types.js";

export const FIFA_PUBLIC_BASE_URL = "https://api.fifa.com";
export const FIFA_WORLD_CUP_COMPETITION_ID = "17";
export const FIFA_WORLD_CUP_SEASON_ID = "285023";
export const FIFA_WORLD_CUP_SEASON = "2026";

const EXPECTED_MATCH_COUNT = 104;
const RAPID_WINDOW_BEFORE_MS = 15 * 60 * 1000;
const RAPID_WINDOW_AFTER_MS = 4 * 60 * 60 * 1000;

const stageByMatchNumber = (matchNumber: number): MatchStage => {
  if (matchNumber <= 72) return "group";
  if (matchNumber <= 88) return "round32";
  if (matchNumber <= 96) return "round16";
  if (matchNumber <= 100) return "quarterfinal";
  if (matchNumber <= 102) return "semifinal";
  if (matchNumber === 103) return "thirdPlace";
  return "final";
};

const acceptedStageNames: Readonly<Record<MatchStage, readonly string[]>> = {
  group: ["First Stage"],
  round32: ["Round of 32"],
  round16: ["Round of 16"],
  quarterfinal: ["Quarter-final"],
  semifinal: ["Semi-final"],
  thirdPlace: ["Play-off for third place", "Bronze final"],
  final: ["Final"]
};

const teamCodeAliases: Readonly<Record<string, string>> = {
  CUW: "CUR"
};

export interface FifaProviderConfig {
  baseUrl: string;
  season: string;
  timeoutMs: number;
  providerName: string;
}

interface LocalizedValue {
  Locale?: string;
  Description?: string;
}

interface FifaTeam {
  IdTeam?: string;
  IdCountry?: string;
  Abbreviation?: string;
  TeamName?: LocalizedValue[];
  ShortClubName?: string;
  Score?: number | null;
}

interface FifaStadium {
  Name?: LocalizedValue[];
  CityName?: LocalizedValue[];
}

interface FifaCalendarMatch {
  IdCompetition?: string;
  IdSeason?: string;
  IdStage?: string;
  IdGroup?: string;
  IdMatch?: string;
  MatchNumber?: number;
  MatchStatus?: number;
  ResultType?: number;
  Date?: string;
  StageName?: LocalizedValue[];
  GroupName?: LocalizedValue[];
  Home?: FifaTeam | null;
  Away?: FifaTeam | null;
  HomeTeamScore?: number | null;
  AwayTeamScore?: number | null;
  HomeTeamPenaltyScore?: number | null;
  AwayTeamPenaltyScore?: number | null;
  MatchTime?: string | null;
  Winner?: string | null;
  PlaceHolderA?: string | null;
  PlaceHolderB?: string | null;
  Stadium?: FifaStadium | null;
}

interface FifaCalendarEnvelope {
  ContinuationToken?: string | null;
  Results?: FifaCalendarMatch[];
}

export async function loadFifaSnapshot(config: FifaProviderConfig): Promise<TournamentSnapshot> {
  if (config.season !== FIFA_WORLD_CUP_SEASON) {
    throw new Error(`FIFA provider season must be ${FIFA_WORLD_CUP_SEASON}; received ${config.season || "missing"}`);
  }
  const url = new URL("/api/v3/calendar/matches", normalizeBaseUrl(config.baseUrl));
  url.searchParams.set("language", "en");
  url.searchParams.set("count", "500");
  url.searchParams.set("IdCompetition", FIFA_WORLD_CUP_COMPETITION_ID);
  url.searchParams.set("IdSeason", FIFA_WORLD_CUP_SEASON_ID);

  const calendar = await fetchFifaCalendar(url, config.timeoutMs);
  return mapFifaSnapshot({ calendar, providerName: config.providerName });
}

export function mapFifaSnapshot({
  calendar,
  providerName,
  now = new Date()
}: {
  calendar: FifaCalendarEnvelope;
  providerName: string;
  now?: Date;
}): TournamentSnapshot {
  const checkedAt = now.toISOString();
  const events = validateAndOrderCalendar(calendar);
  const groupMatches = events
    .filter((event) => event.MatchNumber !== undefined && event.MatchNumber <= 72)
    .map((event) => mapGroupMatch(event, checkedAt));

  const groups = buildGroupStandings(seedTeams, groupMatches, { fairPlayScores: {} });
  validateGroupsAgainstOfficialResults(groups);
  const thirdPlaceRace = rankThirdPlaceTeams(groups);
  const structuralSchedule = buildTournamentSchedule(groups, thirdPlaceRace, groupMatches);
  const matches = events.map((event, index) => mapCalendarMatch(event, structuralSchedule[index], checkedAt));
  validateTournamentSchedule(matches);
  validateResolvedBracketParticipants(matches, groups);

  const groupsWithMatches = groups.map((group) => ({
    ...group,
    matches: matches.filter((match) => match.stage === "group" && match.group === group.code)
  }));
  const liveMatches = matches.filter((match) => match.status === "live");
  const countedMatches = matches.filter((match) => match.homeScore !== null && match.awayScore !== null);
  const rapidRefresh = liveMatches.length > 0 || matches.some((match) => isInsideRapidWindow(match, now.getTime()));
  const nextRefreshSeconds = rapidRefresh ? 15 : 300;
  const completeMatches = matches.filter((match) => match.status === "complete").length;

  return {
    source: "provider",
    providerName,
    providerStatus: {
      state: "live",
      provider: providerName,
      detail: `Official FIFA feed validated: ${completeMatches}/104 results complete, ${liveMatches.length} live.`,
      checkedAt,
      cacheAgeSeconds: 0,
      nextRefreshSeconds
    },
    lastUpdated: checkedAt,
    groups: groupsWithMatches,
    thirdPlaceRace,
    knockoutSlots: buildFullKnockoutSlots(groupsWithMatches, thirdPlaceRace),
    matches,
    liveMatches,
    totalMatches: matches.length,
    goalsScored: countedMatches.reduce((total, match) => total + (match.homeScore ?? 0) + (match.awayScore ?? 0), 0),
    capabilities: {
      liveScores: true,
      standings: true,
      fullSchedule: true,
      bracket: true,
      teamProfiles: true,
      playerStats: false,
      leaderboards: false
    },
    freshness: {
      state: "live",
      updatedAt: checkedAt,
      ageSeconds: 0,
      nextRefreshAt: new Date(now.getTime() + nextRefreshSeconds * 1000).toISOString()
    },
    players: [],
    playerLeaders: []
  };
}

export function mapFifaMatchStatus(status: number | undefined): MatchStatus {
  if (status === 0) return "complete";
  if (status === 1) return "scheduled";
  if (status === 3) return "live";
  throw new Error(`Unsupported FIFA match status: ${String(status)}`);
}

async function fetchFifaCalendar(url: URL, timeoutMs: number): Promise<FifaCalendarEnvelope> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "World-Cup-2026-Command-Center/1.0"
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`FIFA calendar returned ${response.status}`);
    return await response.json() as FifaCalendarEnvelope;
  } finally {
    clearTimeout(timeout);
  }
}

function validateAndOrderCalendar(calendar: FifaCalendarEnvelope): FifaCalendarMatch[] {
  if (!Array.isArray(calendar.Results) || calendar.Results.length !== EXPECTED_MATCH_COUNT) {
    throw new Error(`FIFA calendar must contain 104 matches; received ${calendar.Results?.length ?? 0}`);
  }
  const events = [...calendar.Results].sort((a, b) => numberOrThrow(a.MatchNumber, "MatchNumber") - numberOrThrow(b.MatchNumber, "MatchNumber"));
  const matchNumbers = events.map((event) => numberOrThrow(event.MatchNumber, "MatchNumber"));
  if (new Set(matchNumbers).size !== EXPECTED_MATCH_COUNT || matchNumbers.some((number, index) => number !== index + 1)) {
    throw new Error("FIFA calendar must contain every unique MatchNumber from 1 through 104");
  }
  if (new Set(events.map((event) => event.IdMatch)).size !== EXPECTED_MATCH_COUNT || events.some((event) => !event.IdMatch)) {
    throw new Error("FIFA calendar must contain 104 unique match ids");
  }
  events.forEach((event) => {
    if (event.IdCompetition !== FIFA_WORLD_CUP_COMPETITION_ID || event.IdSeason !== FIFA_WORLD_CUP_SEASON_ID) {
      throw new Error("FIFA calendar returned the wrong competition or season");
    }
    const matchNumber = numberOrThrow(event.MatchNumber, "MatchNumber");
    const expectedStage = stageByMatchNumber(matchNumber);
    const stageName = localizedDescription(event.StageName);
    const stageNames = acceptedStageNames[expectedStage];
    if (!stageNames.includes(stageName)) {
      throw new Error(`FIFA match ${matchNumber} stage=${stageName || "missing"}; expected ${stageNames.join(" or ")}`);
    }
    if (!event.Date || Number.isNaN(new Date(event.Date).getTime())) {
      throw new Error(`FIFA match ${matchNumber} has an invalid kickoff`);
    }
    validateResultType(event);
  });
  return events;
}

function mapGroupMatch(event: FifaCalendarMatch, checkedAt: string): CanonicalMatch {
  const matchNumber = numberOrThrow(event.MatchNumber, "MatchNumber");
  const homeTeam = mapRequiredTeam(event.Home, matchNumber, "home");
  const awayTeam = mapRequiredTeam(event.Away, matchNumber, "away");
  if (homeTeam.group !== awayTeam.group) throw new Error(`FIFA group match ${matchNumber} contains teams from different groups`);
  const group = parseGroup(event.GroupName);
  if (!group || group !== homeTeam.group) throw new Error(`FIFA match ${matchNumber} has an invalid group`);
  const status = mapFifaMatchStatus(event.MatchStatus);
  const scores = mapScores(event, status);
  return {
    id: `match-${matchNumber}`,
    matchNumber,
    stage: "group",
    group,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    homeSource: { kind: "team", teamId: homeTeam.id },
    awaySource: { kind: "team", teamId: awayTeam.id },
    ...scores,
    status,
    providerId: event.IdMatch,
    updatedAt: checkedAt,
    minute: status === "live" ? event.MatchTime ?? undefined : undefined,
    kickoff: event.Date as string,
    venue: mapVenue(event.Stadium)
  };
}

function mapCalendarMatch(event: FifaCalendarMatch, structure: CanonicalMatch, checkedAt: string): CanonicalMatch {
  const matchNumber = numberOrThrow(event.MatchNumber, "MatchNumber");
  if (structure.matchNumber !== matchNumber || structure.stage !== stageByMatchNumber(matchNumber)) {
    throw new Error(`FIFA match ${matchNumber} does not align with the canonical bracket`);
  }
  const status = mapFifaMatchStatus(event.MatchStatus);
  const homeTeam = mapOptionalTeam(event.Home);
  const awayTeam = mapOptionalTeam(event.Away);
  if (structure.stage === "group" && (!homeTeam || !awayTeam)) {
    throw new Error(`FIFA group match ${matchNumber} is missing a team`);
  }
  if (status !== "scheduled" && (!homeTeam || !awayTeam)) {
    throw new Error(`FIFA active/completed match ${matchNumber} is missing a resolved team`);
  }
  const scores = mapScores(event, status);
  return {
    ...structure,
    id: `match-${matchNumber}`,
    group: structure.stage === "group" ? homeTeam?.group : undefined,
    homeTeamId: homeTeam?.id ?? structure.homeTeamId,
    awayTeamId: awayTeam?.id ?? structure.awayTeamId,
    ...scores,
    status,
    providerId: event.IdMatch,
    updatedAt: checkedAt,
    minute: status === "live" ? event.MatchTime ?? undefined : undefined,
    kickoff: event.Date as string,
    venue: mapVenue(event.Stadium)
  };
}

function mapScores(
  event: FifaCalendarMatch,
  status: MatchStatus
): Pick<CanonicalMatch, "homeScore" | "awayScore" | "homePenaltyScore" | "awayPenaltyScore"> {
  if (status === "scheduled") {
    return { homeScore: null, awayScore: null, homePenaltyScore: null, awayPenaltyScore: null };
  }
  const homeScore = scoreOrThrow(event.HomeTeamScore ?? event.Home?.Score, event.MatchNumber, "home");
  const awayScore = scoreOrThrow(event.AwayTeamScore ?? event.Away?.Score, event.MatchNumber, "away");
  const penalties = event.ResultType === 2;
  return {
    homeScore,
    awayScore,
    homePenaltyScore: penalties ? scoreOrThrow(event.HomeTeamPenaltyScore, event.MatchNumber, "home penalty") : null,
    awayPenaltyScore: penalties ? scoreOrThrow(event.AwayTeamPenaltyScore, event.MatchNumber, "away penalty") : null
  };
}

function validateResultType(event: FifaCalendarMatch): void {
  const status = mapFifaMatchStatus(event.MatchStatus);
  if (status === "complete" && ![1, 2, 3].includes(event.ResultType ?? -1)) {
    throw new Error(`FIFA match ${event.MatchNumber} has unsupported completed ResultType ${String(event.ResultType)}`);
  }
  if (status !== "complete" && ![0, 1, 2, 3].includes(event.ResultType ?? -1)) {
    throw new Error(`FIFA match ${event.MatchNumber} has unsupported ResultType ${String(event.ResultType)}`);
  }
}

function mapRequiredTeam(value: FifaTeam | null | undefined, matchNumber: number, side: string): Team {
  const team = mapOptionalTeam(value);
  if (!team) throw new Error(`FIFA match ${matchNumber} has an unknown ${side} team ${value?.Abbreviation ?? "missing"}`);
  return team;
}

function mapOptionalTeam(value: FifaTeam | null | undefined): Team | undefined {
  if (!value?.Abbreviation) return undefined;
  const code = teamCodeAliases[value.Abbreviation.toUpperCase()] ?? value.Abbreviation.toUpperCase();
  return seedTeams.find((team) => team.shortName === code);
}

function parseGroup(values: LocalizedValue[] | undefined): GroupCode | undefined {
  const match = localizedDescription(values).match(/Group\s+([A-L])/i);
  const code = match?.[1]?.toUpperCase() as GroupCode | undefined;
  return code && groupCodes.includes(code) ? code : undefined;
}

function localizedDescription(values: LocalizedValue[] | undefined): string {
  if (!Array.isArray(values)) return "";
  return values.find((value) => value.Locale?.toLowerCase().startsWith("en"))?.Description ?? values[0]?.Description ?? "";
}

function mapVenue(stadium: FifaStadium | null | undefined): string {
  const name = localizedDescription(stadium?.Name);
  const city = localizedDescription(stadium?.CityName);
  return [name, city].filter(Boolean).join(", ") || "Venue TBD";
}

function validateGroupsAgainstOfficialResults(groups: GroupStanding[]): void {
  if (groups.length !== 12 || groups.some((group) => group.rows.length !== 4 || group.matches.length !== 6)) {
    throw new Error("Official FIFA results did not produce 12 complete four-team group tables");
  }
  const teamIds = groups.flatMap((group) => group.rows.map((row) => row.team.id));
  if (new Set(teamIds).size !== 48) throw new Error("Official FIFA results did not produce 48 unique group teams");
}

function validateResolvedBracketParticipants(matches: CanonicalMatch[], groups: GroupStanding[]): void {
  const realTeamIds = new Set(seedTeams.map((team) => team.id));
  for (const match of matches.filter((candidate) => candidate.stage !== "group")) {
    const expectedHome = resolveSourceTeam(match.homeSource, matches, groups);
    const expectedAway = resolveSourceTeam(match.awaySource, matches, groups);
    if (expectedHome && realTeamIds.has(match.homeTeamId) && match.homeTeamId !== expectedHome) {
      throw new Error(`FIFA match ${match.matchNumber} home team does not match its canonical source`);
    }
    if (expectedAway && realTeamIds.has(match.awayTeamId) && match.awayTeamId !== expectedAway) {
      throw new Error(`FIFA match ${match.matchNumber} away team does not match its canonical source`);
    }
  }
}

function resolveSourceTeam(
  source: CanonicalMatch["homeSource"],
  matches: CanonicalMatch[],
  groups: GroupStanding[]
): string | undefined {
  if (source.kind === "team") return source.teamId;
  if (source.kind === "groupRank") return groups.find((group) => group.code === source.group)?.rows[source.rank - 1]?.team.id;
  if (source.kind === "thirdPlace") return groups.find((group) => group.code === source.group)?.rows[2]?.team.id;
  const prior = matches.find((match) => match.matchNumber === source.matchNumber);
  if (!prior || prior.status !== "complete" || prior.homeScore === null || prior.awayScore === null) return undefined;
  const homeWon = prior.homePenaltyScore !== null && prior.homePenaltyScore !== undefined
    ? prior.homePenaltyScore > (prior.awayPenaltyScore ?? -1)
    : prior.homeScore > prior.awayScore;
  const awayWon = prior.awayPenaltyScore !== null && prior.awayPenaltyScore !== undefined
    ? prior.awayPenaltyScore > (prior.homePenaltyScore ?? -1)
    : prior.awayScore > prior.homeScore;
  if (!homeWon && !awayWon) return undefined;
  const winner = homeWon ? prior.homeTeamId : prior.awayTeamId;
  const loser = homeWon ? prior.awayTeamId : prior.homeTeamId;
  return source.kind === "winnerOf" ? winner : loser;
}

function isInsideRapidWindow(match: CanonicalMatch, now: number): boolean {
  const kickoff = new Date(match.kickoff).getTime();
  return match.status === "scheduled" && now >= kickoff - RAPID_WINDOW_BEFORE_MS && now <= kickoff + RAPID_WINDOW_AFTER_MS;
}

function numberOrThrow(value: number | undefined, label: string): number {
  if (!Number.isInteger(value)) throw new Error(`FIFA ${label} must be an integer`);
  return value as number;
}

function scoreOrThrow(value: number | null | undefined, matchNumber: number | undefined, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`FIFA match ${matchNumber ?? "unknown"} has an invalid ${label} score`);
  }
  return value;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
