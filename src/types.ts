export type GroupCode =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L";

export type MatchStatus = "scheduled" | "live" | "complete";
export type QualificationStatus = "qualified" | "round32" | "thirdRace" | "outside";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  group: GroupCode;
  flag: string;
  colors: [string, string, string];
  confederation: string;
  fifaRank: number;
  profile: {
    manager: string;
    captain: string;
    star: string;
    bestFinish: string;
    form: string[];
  };
}

export interface Match {
  id: string;
  group: GroupCode;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute?: string;
  kickoff: string;
  venue: string;
}

export interface StandingRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  fairPlay: number;
  rank: number;
  qualification: QualificationStatus;
  tiebreakers: string[];
}

export interface GroupStanding {
  code: GroupCode;
  rows: StandingRow[];
  matches: Match[];
}

export interface ThirdPlaceRow {
  group: GroupCode;
  row: StandingRow;
  rank: number;
  qualifies: boolean;
}

export interface KnockoutSlot {
  id: string;
  label: string;
  teamLabel: string;
  source: string;
}

export interface ProviderStatus {
  state: "seed" | "live" | "stale" | "fallback" | "missing-config" | "unavailable";
  provider: string;
  detail: string;
  checkedAt: string;
  cacheAgeSeconds?: number;
  nextRefreshSeconds?: number;
}

export interface TournamentSnapshot {
  source: "provider" | "seed-cache";
  providerName: string;
  providerStatus: ProviderStatus;
  lastUpdated: string;
  groups: GroupStanding[];
  thirdPlaceRace: ThirdPlaceRow[];
  knockoutSlots: KnockoutSlot[];
  liveMatches: Match[];
  totalMatches: number;
  goalsScored: number;
}

export interface UserPreferences {
  selectedGroup: GroupCode;
  favorites: string[];
  theme: "dark" | "gold" | "pitch";
  layout: "cinematic" | "compact";
  timezone: "local" | "venue" | "utc";
  refreshSeconds: number;
  reducedMotion: boolean;
}
