type SmokeConfig = {
  baseUrl: string;
  apiKey: string;
  leagueId: string;
  season: string;
  timeoutMs: number;
  providerName: string;
};

export {};

type EndpointSummary = {
  endpoint: string;
  ok: boolean;
  status: number;
  results?: number;
  responseCount?: number;
  errorKeys?: string[];
};

const selectedProvider = (process.env.SPORTS_PROVIDER || "fifa").trim().toLowerCase();

if (selectedProvider === "fifa" || selectedProvider === "fifa-official") {
  process.env.NODE_ENV = "test";
  const [{ FIFA_PUBLIC_BASE_URL, FIFA_WORLD_CUP_SEASON, loadFifaSnapshot }, { isTournamentSnapshot }] = await Promise.all([
    import("../server/provider/fifa"),
    import("../server/index")
  ]);
  const providerName = "FIFA";
  const baseUrl = process.env.SPORTS_API_BASE_URL || FIFA_PUBLIC_BASE_URL;
  const season = process.env.SPORTS_API_SEASON || FIFA_WORLD_CUP_SEASON;
  const timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS || 8000);

  console.log("FIFA official live smoke starting");
  console.log(`provider=${providerName}`);
  console.log(`baseUrl=${baseUrl}`);
  console.log(`season=${season}`);

  const snapshot = await loadFifaSnapshot({ baseUrl, season, timeoutMs, providerName });
  assertLiveSnapshot(snapshot, isTournamentSnapshot);
  console.log(`mappedSource=${snapshot.source}`);
  console.log(`mappedProviderState=${snapshot.providerStatus.state}`);
  console.log(`groups=${snapshot.groups.length}`);
  console.log(`matches=${snapshot.matches?.length ?? 0}`);
  console.log(`completedMatches=${snapshot.matches?.filter((match) => match.status === "complete").length ?? 0}`);
  console.log(`liveMatches=${snapshot.liveMatches.length}`);
  console.log(`checkedAt=${snapshot.providerStatus.checkedAt}`);
  console.log("FIFA official live smoke passed");
  process.exit(0);
}

const missing = ["SPORTS_API_KEY", "SPORTS_API_LEAGUE_ID"].filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required env for provider smoke: ${missing.join(", ")}`);
  console.error("Set secrets in the shell or .env.local-equivalent environment; this script never prints SPORTS_API_KEY.");
  process.exit(1);
}

const config: SmokeConfig = {
  baseUrl: process.env.SPORTS_API_BASE_URL || "https://v3.football.api-sports.io",
  apiKey: process.env.SPORTS_API_KEY as string,
  leagueId: process.env.SPORTS_API_LEAGUE_ID as string,
  season: process.env.SPORTS_API_SEASON || "2026",
  timeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS || 8000),
  providerName: process.env.SPORTS_PROVIDER || "API-Football"
};

process.env.NODE_ENV = "test";

const [{ loadApiFootballSnapshot }, { isTournamentSnapshot }] = await Promise.all([
  import("../server/provider/apiFootball"),
  import("../server/index")
]);

console.log("API-Football live smoke starting");
console.log(`provider=${config.providerName}`);
console.log(`baseUrl=${config.baseUrl}`);
console.log(`leagueId=${config.leagueId}`);
console.log(`season=${config.season}`);

const endpointSummaries = await Promise.all([
  summarizeEndpoint(config, "leagues"),
  summarizeEndpoint(config, "fixtures"),
  summarizeEndpoint(config, "standings")
]);

endpointSummaries.forEach((summary) => {
  const details = [
    `endpoint=${summary.endpoint}`,
    `status=${summary.status}`,
    `ok=${summary.ok}`,
    summary.results === undefined ? undefined : `results=${summary.results}`,
    summary.responseCount === undefined ? undefined : `responseCount=${summary.responseCount}`,
    summary.errorKeys && summary.errorKeys.length > 0 ? `errorKeys=${summary.errorKeys.join(",")}` : undefined
  ].filter(Boolean);
  console.log(details.join(" "));
});
const failedEndpoint = endpointSummaries.find((summary) => !summary.ok);
if (failedEndpoint) throw new Error(`API-Football ${failedEndpoint.endpoint} smoke failed with status ${failedEndpoint.status}`);
const leagueSummary = endpointSummaries.find((summary) => summary.endpoint === "leagues");
if (leagueSummary?.responseCount !== 1) throw new Error("Expected exactly one World Cup league response for id=1 season=2026");

const snapshot = await loadApiFootballSnapshot(config);
if (!isTournamentSnapshot(snapshot)) {
  throw new Error("Provider mapper returned an invalid TournamentSnapshot");
}
if (snapshot.source !== "provider" || snapshot.providerStatus.state !== "live") {
  throw new Error("Provider smoke did not produce a live provider snapshot");
}
if (snapshot.matches?.length !== 104) throw new Error(`Expected 104 mapped fixtures; received ${snapshot.matches?.length ?? 0}`);
if (snapshot.matches.filter((match) => match.stage === "group").length !== 72) throw new Error("Expected 72 group fixtures");
if (snapshot.matches.filter((match) => match.stage !== "group").length !== 32) throw new Error("Expected 32 knockout fixtures");
if (!snapshot.capabilities?.liveScores || !snapshot.capabilities.fullSchedule || !snapshot.capabilities.bracket) {
  throw new Error("Live provider snapshot is missing required score, schedule, or bracket capabilities");
}

console.log(`mappedSource=${snapshot.source}`);
console.log(`mappedProviderState=${snapshot.providerStatus.state}`);
console.log(`groups=${snapshot.groups.length}`);
console.log(`matches=${snapshot.matches.length}`);
console.log(`knockoutMatches=${snapshot.matches.filter((match) => match.stage !== "group").length}`);
console.log(`checkedAt=${snapshot.providerStatus.checkedAt}`);
console.log("API-Football live smoke passed");

function assertLiveSnapshot(
  snapshot: import("../src/types").TournamentSnapshot,
  isTournamentSnapshot: (value: unknown) => value is import("../src/types").TournamentSnapshot
): void {
  if (!isTournamentSnapshot(snapshot)) throw new Error("Provider mapper returned an invalid TournamentSnapshot");
  if (snapshot.source !== "provider" || snapshot.providerStatus.state !== "live") {
    throw new Error("Provider smoke did not produce a live provider snapshot");
  }
  if (snapshot.matches?.length !== 104) throw new Error(`Expected 104 mapped fixtures; received ${snapshot.matches?.length ?? 0}`);
  if (snapshot.matches.filter((match) => match.stage === "group").length !== 72) throw new Error("Expected 72 group fixtures");
  if (snapshot.matches.filter((match) => match.stage !== "group").length !== 32) throw new Error("Expected 32 knockout fixtures");
  if (!snapshot.capabilities?.liveScores || !snapshot.capabilities.fullSchedule || !snapshot.capabilities.bracket) {
    throw new Error("Live provider snapshot is missing required score, schedule, or bracket capabilities");
  }
}

async function summarizeEndpoint(config: SmokeConfig, endpoint: "leagues" | "fixtures" | "standings"): Promise<EndpointSummary> {
  const url = new URL(endpoint, normalizeBaseUrl(config.baseUrl));
  if (endpoint === "leagues") {
    url.searchParams.set("id", config.leagueId);
  } else {
    url.searchParams.set("league", config.leagueId);
  }
  url.searchParams.set("season", config.season);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "x-apisports-key": config.apiKey
      },
      signal: controller.signal
    });
    const body = await response.json() as { errors?: unknown; results?: number; response?: unknown[] };
    return {
      endpoint,
      ok: response.ok && !hasProviderErrors(body.errors),
      status: response.status,
      results: typeof body.results === "number" ? body.results : undefined,
      responseCount: Array.isArray(body.response) ? body.response.length : undefined,
      errorKeys: providerErrorKeys(body.errors)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function hasProviderErrors(errors: unknown): boolean {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  if (typeof errors === "object") return Object.keys(errors).length > 0;
  return true;
}

function providerErrorKeys(errors: unknown): string[] | undefined {
  if (!errors) return undefined;
  if (Array.isArray(errors)) return errors.length > 0 ? ["array"] : undefined;
  if (typeof errors === "object") return Object.keys(errors);
  return ["message"];
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
