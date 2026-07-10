type ProviderMode = "live" | "fallback";
type Stage = "group" | "round32" | "round16" | "quarterfinal" | "semifinal" | "thirdPlace" | "final";

const args = process.argv.slice(2);
const target = args.find((argument) => !argument.startsWith("--")) ?? process.env.DEPLOYMENT_URL ?? process.env.PLAYWRIGHT_BASE_URL;
const mode = readOption("mode") ?? process.env.DEPLOYMENT_MODE;
const expectedSha = readOption("expected-sha") ?? process.env.EXPECTED_GIT_SHA;
const minCompleted = Number(readOption("min-completed") ?? process.env.MIN_COMPLETED_MATCHES ?? (mode === "live" ? "1" : "0"));

export {};

if (!target) throw new Error("Missing deployed URL. Pass it as an argument or set DEPLOYMENT_URL.");
if (mode !== "live" && mode !== "fallback") throw new Error("Pass an explicit --mode=live or --mode=fallback.");
if (expectedSha && !/^[a-f0-9]{7,40}$/i.test(expectedSha)) throw new Error("Invalid expected Git SHA.");
if (!Number.isInteger(minCompleted) || minCompleted < 0 || minCompleted > 104) throw new Error("Invalid --min-completed value.");

const baseUrl = normalizeUrl(target);
console.log(`deployedSmokeBaseUrl=${baseUrl}`);
console.log(`deployedSmokeMode=${mode}`);

const html = await fetchText(new URL("/", baseUrl), "root");
if (!html.match(/<!doctype html>/i)) throw new Error("Root response did not look like HTML");
if (!html.includes("assets/")) throw new Error("Root HTML did not reference built assets");

const health = await fetchJson<HealthResponse>(new URL("/api/health", baseUrl), "api/health");
assertHealthMode(mode, health);
assertProviderMode(mode, health.providerStatus, "health");
console.log(`healthProvider=${health.provider}`);
console.log(`healthProviderState=${health.providerStatus.state}`);

const tournament = await fetchJson<unknown>(new URL("/api/tournament", baseUrl), "api/tournament");
const snapshot = assertTournamentSnapshot(tournament, mode);
console.log(`tournamentGroups=${snapshot.groups.length}`);
console.log(`tournamentMatches=${snapshot.matches.length}`);
console.log(`tournamentProviderState=${snapshot.providerStatus.state}`);
const completedMatches = snapshot.matches.filter((match) => match.status === "complete");
if (completedMatches.length < minCompleted) throw new Error(`Completed matches=${completedMatches.length}; expected at least ${minCompleted}`);
console.log(`completedMatches=${completedMatches.length}`);

const groups = await fetchJson<unknown>(new URL("/api/groups", baseUrl), "api/groups");
if (!Array.isArray(groups) || groups.length !== 12) throw new Error("/api/groups did not return all 12 groups");

const matches = await fetchJson<unknown>(new URL("/api/matches", baseUrl), "api/matches");
assertCanonicalMatches(matches, "api/matches");

const standings = await fetchJson<unknown>(new URL("/api/standings", baseUrl), "api/standings");
if (!Array.isArray(standings) || standings.length !== 12) throw new Error("/api/standings did not return all 12 group tables");

const teamId = snapshot.groups[0]?.rows[0]?.team.id;
if (!teamId) throw new Error("Tournament snapshot did not contain a team id");
const team = await fetchJson<{ id?: unknown }>(new URL(`/api/teams/${teamId}`, baseUrl), "api/team");
if (team.id !== teamId) throw new Error("/api/teams/:id returned the wrong team");
await fetchExpectedStatus(new URL("/api/teams/not-a-team", baseUrl), "api/missing-team", 404);

await assertClientAssetsDoNotExposeSecrets(baseUrl, html);
if (expectedSha) assertExpectedSha(expectedSha, health, snapshot);

console.log("deployed smoke passed");

interface ProviderStatusShape {
  state: string;
  provider: string;
  detail: string;
  checkedAt: string;
}

interface HealthResponse {
  ok: boolean;
  ready?: boolean;
  degraded?: boolean;
  provider: string;
  providerStatus: ProviderStatusShape;
  buildSha?: string;
  gitSha?: string;
  commitSha?: string;
  deployment?: { gitSha?: string };
}

interface CanonicalMatchShape {
  matchNumber: number;
  stage: Stage;
  homeSource: unknown;
  awaySource: unknown;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
}

interface TournamentSnapshotShape {
  source: string;
  providerStatus: ProviderStatusShape;
  lastUpdated: string;
  groups: Array<{ code: string; rows: Array<{ team: { id: string } }> }>;
  thirdPlaceRace: Array<{ qualifies?: unknown }>;
  knockoutSlots: unknown[];
  matches: CanonicalMatchShape[];
  totalMatches: number;
  capabilities: Record<string, boolean>;
  freshness: Record<string, unknown>;
  players: Array<{ id?: unknown; stats?: unknown }>;
  playerLeaders: Array<{ category?: unknown; entries?: unknown }>;
  buildSha?: string;
  gitSha?: string;
  commitSha?: string;
  deployment?: { gitSha?: string };
}

function assertTournamentSnapshot(value: unknown, expectedMode: ProviderMode): TournamentSnapshotShape {
  const snapshot = asRecord(value, "TournamentSnapshot") as unknown as TournamentSnapshotShape;
  const groupCodes = "ABCDEFGHIJKL".split("");
  if (!Array.isArray(snapshot.groups) || snapshot.groups.length !== 12) throw new Error("TournamentSnapshot must contain 12 groups");
  if (snapshot.groups.map((group) => group.code).join("") !== groupCodes.join("")) throw new Error("TournamentSnapshot groups must be ordered A-L");
  if (!snapshot.groups.every((group) => Array.isArray(group.rows) && group.rows.length === 4 && group.rows.every((row) => typeof row.team?.id === "string"))) {
    throw new Error("Every group must contain four identifiable teams");
  }
  const teamIds = snapshot.groups.flatMap((group) => group.rows.map((row) => row.team.id));
  if (new Set(teamIds).size !== 48) throw new Error("TournamentSnapshot must contain 48 unique teams");
  if (snapshot.totalMatches !== 104) throw new Error(`TournamentSnapshot totalMatches=${snapshot.totalMatches}; expected 104`);
  assertCanonicalMatches(snapshot.matches, "TournamentSnapshot.matches");
  if (!Array.isArray(snapshot.thirdPlaceRace) || snapshot.thirdPlaceRace.length !== 12) throw new Error("thirdPlaceRace must contain 12 teams");
  if (snapshot.thirdPlaceRace.filter((entry) => entry.qualifies === true).length !== 8) throw new Error("thirdPlaceRace must mark exactly eight qualifiers");
  if (!Array.isArray(snapshot.knockoutSlots) || snapshot.knockoutSlots.length !== 32) throw new Error("knockoutSlots must contain all 32 knockout matches");
  if (typeof snapshot.lastUpdated !== "string" || !isTimestamp(snapshot.lastUpdated)) throw new Error("lastUpdated must be an ISO timestamp");
  assertProviderStatus(snapshot.providerStatus);
  assertProviderMode(expectedMode, snapshot.providerStatus, "tournament");
  if (expectedMode === "live" && snapshot.source !== "provider") throw new Error("Live mode requires source=provider");
  if (expectedMode === "fallback" && snapshot.source !== "seed-cache") throw new Error("Fallback mode requires source=seed-cache");
  assertCapabilities(snapshot.capabilities, snapshot, expectedMode);
  assertFreshness(snapshot.freshness, expectedMode);
  assertPlayerData(snapshot.players, snapshot.playerLeaders, snapshot.capabilities);
  return snapshot;
}

function assertCanonicalMatches(value: unknown, label: string): asserts value is CanonicalMatchShape[] {
  if (!Array.isArray(value) || value.length !== 104) throw new Error(`${label} must contain exactly 104 canonical matches`);
  const expectedStageCounts: Record<Stage, number> = { group: 72, round32: 16, round16: 8, quarterfinal: 4, semifinal: 2, thirdPlace: 1, final: 1 };
  const stageCounts = Object.fromEntries(Object.keys(expectedStageCounts).map((stage) => [stage, 0])) as Record<Stage, number>;
  const matchNumbers: number[] = [];
  value.forEach((entry, index) => {
    const match = asRecord(entry, `${label}[${index}]`);
    if (typeof match.matchNumber !== "number" || !Number.isInteger(match.matchNumber) || match.matchNumber < 1 || match.matchNumber > 104) throw new Error(`${label}[${index}] has an invalid matchNumber`);
    if (typeof match.stage !== "string" || !(match.stage in stageCounts)) throw new Error(`${label}[${index}] has an invalid stage`);
    assertParticipantSource(match.homeSource, `${label}[${index}].homeSource`);
    assertParticipantSource(match.awaySource, `${label}[${index}].awaySource`);
    if (typeof match.status !== "string") throw new Error(`${label}[${index}] has an invalid status`);
    if (match.status === "complete" || match.status === "live") {
      if (!isNonNegativeScore(match.homeScore) || !isNonNegativeScore(match.awayScore)) {
        throw new Error(`${label}[${index}] is ${match.status} without valid scores`);
      }
    }
    if ((match.homePenaltyScore === null) !== (match.awayPenaltyScore === null)) {
      throw new Error(`${label}[${index}] has an incomplete penalty score`);
    }
    if (match.homePenaltyScore !== undefined && match.homePenaltyScore !== null && (!isNonNegativeScore(match.homePenaltyScore) || !isNonNegativeScore(match.awayPenaltyScore))) {
      throw new Error(`${label}[${index}] has invalid penalty scores`);
    }
    matchNumbers.push(match.matchNumber);
    stageCounts[match.stage as Stage] += 1;
  });
  const ordered = [...matchNumbers].sort((a, b) => a - b);
  if (new Set(matchNumbers).size !== 104 || ordered.some((number, index) => number !== index + 1)) throw new Error(`${label} match numbers must be the unique range 1-104`);
  for (const [stage, expected] of Object.entries(expectedStageCounts)) {
    if (stageCounts[stage as Stage] !== expected) throw new Error(`${label} stage ${stage} count=${stageCounts[stage as Stage]}; expected ${expected}`);
  }
}

function isNonNegativeScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function assertParticipantSource(value: unknown, label: string): void {
  const source = asRecord(value, label);
  if (source.kind === "team" && typeof source.teamId === "string") return;
  if (source.kind === "groupRank" && typeof source.group === "string" && (source.rank === 1 || source.rank === 2)) return;
  if (source.kind === "thirdPlace" && typeof source.group === "string") return;
  if ((source.kind === "winnerOf" || source.kind === "loserOf") && Number.isInteger(source.matchNumber)) return;
  throw new Error(`${label} is not a valid participant source`);
}

function assertCapabilities(capabilities: unknown, snapshot: TournamentSnapshotShape, expectedMode: ProviderMode): void {
  const value = asRecord(capabilities, "capabilities");
  const keys = ["liveScores", "standings", "fullSchedule", "bracket", "teamProfiles", "playerStats", "leaderboards"];
  if (!keys.every((key) => typeof value[key] === "boolean")) throw new Error("capabilities must expose all seven boolean flags");
  for (const key of ["standings", "fullSchedule", "bracket", "teamProfiles"]) {
    if (value[key] !== true) throw new Error(`capabilities.${key} must be true for a production release`);
  }
  if (value.liveScores !== (expectedMode === "live")) throw new Error(`capabilities.liveScores must be ${expectedMode === "live"} in ${expectedMode} mode`);
  if (value.playerStats !== snapshot.players.some((player) => isRecord(player.stats))) throw new Error("capabilities.playerStats does not match player data availability");
  if (value.leaderboards !== snapshot.playerLeaders.some((leaderboard) => Array.isArray(leaderboard.entries) && leaderboard.entries.length > 0)) {
    throw new Error("capabilities.leaderboards does not match leaderboard availability");
  }
}

function assertFreshness(freshness: unknown, expectedMode: ProviderMode): void {
  const value = asRecord(freshness, "freshness");
  const allowed = expectedMode === "live" ? ["live", "cached"] : ["cached", "stale", "unavailable"];
  if (typeof value.state !== "string" || !allowed.includes(value.state)) throw new Error(`freshness.state=${String(value.state)} is invalid for ${expectedMode} mode`);
  if (typeof value.updatedAt !== "string" || !isTimestamp(value.updatedAt)) throw new Error("freshness.updatedAt must be an ISO timestamp");
  if (value.ageSeconds !== undefined && (typeof value.ageSeconds !== "number" || value.ageSeconds < 0)) throw new Error("freshness.ageSeconds must be non-negative");
  if (value.nextRefreshAt !== undefined && (typeof value.nextRefreshAt !== "string" || !isTimestamp(value.nextRefreshAt))) throw new Error("freshness.nextRefreshAt must be an ISO timestamp");
}

function assertPlayerData(players: unknown, leaderboards: unknown, capabilities: Record<string, boolean>): void {
  if (!Array.isArray(players)) throw new Error("players must be an array");
  if (!Array.isArray(leaderboards)) throw new Error("playerLeaders must be an array");
  if (capabilities.playerStats && players.length === 0) throw new Error("playerStats capability requires players");
  if (capabilities.leaderboards) {
    const categories = new Set(leaderboards.map((entry) => isRecord(entry) ? entry.category : undefined));
    for (const category of ["goals", "assists", "minutes", "yellowCards", "redCards"]) {
      if (!categories.has(category)) throw new Error(`playerLeaders is missing ${category}`);
    }
  }
}

function assertProviderStatus(value: unknown): asserts value is ProviderStatusShape {
  const status = asRecord(value, "providerStatus");
  if (typeof status.state !== "string" || typeof status.provider !== "string" || typeof status.detail !== "string" || typeof status.checkedAt !== "string" || !isTimestamp(status.checkedAt)) {
    throw new Error("providerStatus is malformed");
  }
}

function assertProviderMode(expectedMode: ProviderMode, status: ProviderStatusShape, label: string): void {
  assertProviderStatus(status);
  const fallbackStates = new Set(["seed", "fallback", "missing-config", "unavailable"]);
  if (expectedMode === "live" && status.state !== "live") throw new Error(`${label} provider state=${status.state}; expected live`);
  if (expectedMode === "fallback" && !fallbackStates.has(status.state)) throw new Error(`${label} provider state=${status.state}; expected a fallback state`);
}

function assertHealthMode(expectedMode: ProviderMode, health: HealthResponse): void {
  if (expectedMode === "live" && (health.ok !== true || health.ready !== true || health.degraded !== false)) {
    throw new Error("Live mode requires health ok=true, ready=true, and degraded=false");
  }
  if (expectedMode === "fallback" && (health.ok !== false || health.ready !== false || health.degraded !== true)) {
    throw new Error("Fallback mode requires health ok=false, ready=false, and degraded=true");
  }
}

async function assertClientAssetsDoNotExposeSecrets(base: URL, html: string): Promise<void> {
  const queue = [...collectJavaScriptUrls(base, base, html)];
  const visited = new Set<string>();
  const secretValues = [process.env.SPORTS_API_KEY, process.env.CLIENT_SECRET_SCAN_VALUE].filter((value): value is string => Boolean(value && value.length >= 8));
  while (queue.length > 0) {
    const assetUrl = queue.shift();
    if (!assetUrl || visited.has(assetUrl.href)) continue;
    if (visited.size >= 500) throw new Error("Client asset graph exceeded the 500-file safety limit");
    visited.add(assetUrl.href);
    const body = await fetchText(assetUrl, `asset:${assetUrl.pathname}`);
    if (body.includes("SPORTS_API_KEY") || body.includes("x-apisports-key")) throw new Error(`Client asset exposes a provider-secret marker: ${assetUrl.pathname}`);
    if (secretValues.some((secret) => body.includes(secret))) throw new Error(`Client asset contains a configured secret value: ${assetUrl.pathname}`);
    for (const child of collectJavaScriptUrls(base, assetUrl, body)) if (!visited.has(child.href)) queue.push(child);
  }
  if (visited.size === 0) throw new Error("No JavaScript assets found in root HTML");
  console.log(`clientAssetsScanned=${visited.size}`);
}

function collectJavaScriptUrls(base: URL, parent: URL, body: string): URL[] {
  const references = [...body.matchAll(/["']([^"'\\\s]+\.js(?:\?[^"']*)?)["']/g)].map((match) => match[1]);
  return references.flatMap((reference) => {
    try {
      // Vite's __vite__mapDeps table emits base-relative values such as
      // "assets/CinematicStage-*.js" inside a file that already lives in
      // /assets/. Static ESM imports still use normal parent-relative paths.
      const resolutionBase = reference.startsWith("assets/") ? base : parent;
      const url = new URL(reference, resolutionBase);
      return url.origin === base.origin && url.pathname.startsWith("/assets/") ? [url] : [];
    } catch {
      return [];
    }
  });
}

function assertExpectedSha(expected: string, health: HealthResponse, snapshot: TournamentSnapshotShape): void {
  const observed = [health.buildSha, health.gitSha, health.commitSha, health.deployment?.gitSha, snapshot.buildSha, snapshot.gitSha, snapshot.commitSha, snapshot.deployment?.gitSha]
    .find((value): value is string => typeof value === "string");
  if (!observed) throw new Error("Expected Git SHA was provided, but the deployment exposes no build provenance");
  const normalizedExpected = expected.toLowerCase();
  const normalizedObserved = observed.toLowerCase();
  if (!normalizedExpected.startsWith(normalizedObserved) && !normalizedObserved.startsWith(normalizedExpected)) throw new Error(`Deployment Git SHA ${observed} does not match expected ${expected}`);
  console.log(`deploymentGitSha=${observed}`);
}

async function fetchText(url: URL, label: string): Promise<string> {
  const response = await fetch(url);
  console.log(`${label}Status=${response.status}`);
  if (!response.ok) throw new Error(`${label} returned ${response.status}`);
  return response.text();
}

async function fetchJson<T>(url: URL, label: string): Promise<T> {
  const response = await fetch(url);
  console.log(`${label}Status=${response.status}`);
  if (!response.ok) throw new Error(`${label} returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchExpectedStatus(url: URL, label: string, expectedStatus: number): Promise<void> {
  const response = await fetch(url);
  console.log(`${label}Status=${response.status}`);
  if (response.status !== expectedStatus) throw new Error(`${label} returned ${response.status}; expected ${expectedStatus}`);
}

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function normalizeUrl(value: string): URL {
  const url = new URL(value.startsWith("http") ? value : `https://${value}`);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}
