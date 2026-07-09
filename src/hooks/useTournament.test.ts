import { describe, expect, it } from "vitest";
import { buildTournamentSnapshot } from "../lib/standings";
import type { ProviderStatus, TournamentSnapshot } from "../types";
import { tournamentRefetchIntervalMs } from "./useTournament";

describe("tournament automatic refresh cadence", () => {
  it("polls faster while a match is live", () => {
    const snapshot = snapshotWithStatus("live", 15);
    snapshot.liveMatches = [{ ...snapshot.matches![0], status: "live" }];
    expect(tournamentRefetchIntervalMs(snapshot, 30)).toBe(15_000);
  });

  it("backs off when there are no live matches", () => {
    const snapshot = snapshotWithStatus("live", 300);
    snapshot.liveMatches = [];
    expect(tournamentRefetchIntervalMs(snapshot, 30)).toBe(300_000);
  });

  it("retries degraded provider states without waiting for the idle cadence", () => {
    const snapshot = snapshotWithStatus("stale");
    snapshot.liveMatches = [];
    expect(tournamentRefetchIntervalMs(snapshot, 120)).toBe(30_000);
  });
});

function snapshotWithStatus(state: ProviderStatus["state"], nextRefreshSeconds?: number): TournamentSnapshot {
  const snapshot = buildTournamentSnapshot();
  return {
    ...snapshot,
    providerStatus: {
      ...snapshot.providerStatus,
      state,
      nextRefreshSeconds
    }
  };
}
