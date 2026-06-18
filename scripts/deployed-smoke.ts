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

function isTournamentSnapshot(value: unknown): value is { groups: unknown[]; providerStatus: { state: string } } {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as { groups?: unknown; providerStatus?: unknown; lastUpdated?: unknown };
  if (!Array.isArray(snapshot.groups) || snapshot.groups.length !== 12) return false;
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
