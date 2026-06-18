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
    refetchInterval: refreshSeconds * 1000,
    staleTime: Math.max(5, refreshSeconds - 5) * 1000
  });
}
