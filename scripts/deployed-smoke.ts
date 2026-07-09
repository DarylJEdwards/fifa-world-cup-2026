const target = process.argv[2] || process.env.DEPLOYMENT_URL || process.env.PLAYWRIGHT_BASE_URL;

export {};

if (!target) {
  console.error("Missing deployed URL. Pass it as an argument or set DEPLOYMENT_URL.");
  process.exit(1);
}

const baseUrl = normalizeUrl(target);

console.log(`deployedSmokeBaseUrl=${baseUrl}`);

const html = await fetchText(new URL("/", baseUrl), "root");
if (!html.includes("<!doctype html>") && !html.includes("<!DOCTYPE html>")) {
  throw new Error("Root response did not look like HTML");
}
if (!html.includes("assets/")) {
  throw new Error("Root HTML did not reference built assets");
}

const health = await fetchJson<HealthResponse>(new URL("/api/health", baseUrl), "api/health");
if (health.ok !== true) {
  throw new Error("/api/health did not report ok=true");
}
console.log(`healthProvider=${health.provider}`);
console.log(`healthProviderState=${health.providerStatus.state}`);

const tournament = await fetchJson<unknown>(new URL("/api/tournament", baseUrl), "api/tournament");
if (!isTournamentSnapshot(tournament)) {
  throw new Error("/api/tournament did not return a valid TournamentSnapshot");
}
console.log(`tournamentGroups=${tournament.groups.length}`);
console.log(`tournamentProviderState=${tournament.providerStatus.state}`);

const groups = await fetchJson<unknown[]>(new URL("/api/groups", baseUrl), "api/groups");
if (!Array.isArray(groups) || groups.length !== 12) {
  throw new Error("/api/groups did not return all 12 groups");
}

const matches = await fetchJson<unknown[]>(new URL("/api/matches", baseUrl), "api/matches");
if (!Array.isArray(matches) || matches.length === 0) {
  throw new Error("/api/matches did not return matches");
}

const standings = await fetchJson<unknown[]>(new URL("/api/standings", baseUrl), "api/standings");
if (!Array.isArray(standings) || standings.length !== 12) {
  throw new Error("/api/standings did not return all 12 group tables");
}

const teamId = tournament.groups[0]?.rows[0]?.team.id;
if (!teamId) throw new Error("Tournament snapshot did not contain a team id");
const team = await fetchJson<{ id?: unknown }>(new URL(`/api/teams/${teamId}`, baseUrl), "api/team");
if (team.id !== teamId) {
  throw new Error("/api/teams/:id returned the wrong team");
}

await fetchExpectedStatus(new URL("/api/teams/not-a-team", baseUrl), "api/missing-team", 404);

await assertClientBundleDoesNotExposeSecret(baseUrl, html);

console.log("deployed smoke passed");

interface HealthResponse {
  ok: boolean;
  provider: string;
  providerStatus: {
    state: string;
  };
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
  if (response.status !== expectedStatus) {
    throw new Error(`${label} returned ${response.status}; expected ${expectedStatus}`);
  }
}

async function assertClientBundleDoesNotExposeSecret(baseUrl: URL, html: string): Promise<void> {
  const assetPaths = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => match[1]);
  if (assetPaths.length === 0) {
    throw new Error("No JavaScript assets found in root HTML");
  }

  for (const assetPath of assetPaths) {
    const assetUrl = new URL(assetPath, baseUrl);
    const body = await fetchText(assetUrl, `asset:${assetUrl.pathname}`);
    if (body.includes("SPORTS_API_KEY")) {
      throw new Error(`Client asset exposes SPORTS_API_KEY literal: ${assetUrl.pathname}`);
    }
  }
}

function normalizeUrl(value: string): URL {
  const url = new URL(value.startsWith("http") ? value : `https://${value}`);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

interface DeployedTournamentSnapshot {
  groups: Array<{
    rows: Array<{
      team: {
        id: string;
      };
    }>;
  }>;
  providerStatus: { state: string };
}

function isTournamentSnapshot(value: unknown): value is DeployedTournamentSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as { groups?: unknown; providerStatus?: unknown; lastUpdated?: unknown };
  if (!Array.isArray(snapshot.groups) || snapshot.groups.length !== 12) return false;
  if (!snapshot.groups.every((group) => hasTeamId(group))) return false;
  if (typeof snapshot.lastUpdated !== "string") return false;
  if (!snapshot.providerStatus || typeof snapshot.providerStatus !== "object") return false;
  const status = snapshot.providerStatus as { state?: unknown; provider?: unknown; detail?: unknown; checkedAt?: unknown };
  return (
    typeof status.state === "string" &&
    typeof status.provider === "string" &&
    typeof status.detail === "string" &&
    typeof status.checkedAt === "string"
  );
}

function hasTeamId(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const group = value as { rows?: unknown };
  if (!Array.isArray(group.rows) || group.rows.length !== 4) return false;
  return group.rows.every((row) => {
    if (!row || typeof row !== "object") return false;
    const team = (row as { team?: unknown }).team;
    return Boolean(team && typeof team === "object" && typeof (team as { id?: unknown }).id === "string");
  });
}
