import { useQuery } from "@tanstack/react-query";
import { buildTournamentSnapshot } from "../lib/standings";
import type { TournamentSnapshot } from "../types";
import { usePreferences } from "../store/preferences";

export function useTournament() {
  const refreshSeconds = usePreferences((state) => state.refreshSeconds);

  return useQuery({
    queryKey: ["tournament"],
    queryFn: async (): Promise<TournamentSnapshot> => {
      const response = await fetch("/api/tournament");
      if (!response.ok) throw new Error("Unable to load tournament feed");
      return response.json() as Promise<TournamentSnapshot>;
    },
    initialData: () => buildTournamentSnapshot(),
    refetchInterval: (query) => tournamentRefetchIntervalMs(query.state.data, refreshSeconds),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 5_000
  });
}

export function tournamentRefetchIntervalMs(snapshot: TournamentSnapshot | undefined, preferenceSeconds: number): number {
  const safePreference = clampSeconds(preferenceSeconds, 10, 300);
  const providerHint = snapshot?.providerStatus.nextRefreshSeconds;
  const safeHint = providerHint === undefined ? undefined : clampSeconds(providerHint, 5, 300);
  if (snapshot?.liveMatches.some((match) => match.status === "live")) {
    return Math.min(safePreference, safeHint ?? 15) * 1000;
  }
  if (["stale", "fallback", "missing-config", "unavailable"].includes(snapshot?.providerStatus.state ?? "")) {
    return Math.min(safePreference, safeHint ?? 30) * 1000;
  }
  return Math.max(safePreference, safeHint ?? 300) * 1000;
}

function clampSeconds(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}
