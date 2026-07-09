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

export type MatchStatus = "scheduled" | "live" | "complete" | "postponed" | "cancelled" | "suspended";
export type MatchStage = "group" | "round32" | "round16" | "quarterfinal" | "semifinal" | "thirdPlace" | "final";
export type QualificationStatus = "qualified" | "round32" | "thirdRace" | "outside";

export type MatchParticipantSource =
  | { kind: "team"; teamId: string }
  | { kind: "groupRank"; group: GroupCode; rank: 1 | 2 }
  | { kind: "thirdPlace"; group: GroupCode }
  | { kind: "winnerOf"; matchNumber: number }
  | { kind: "loserOf"; matchNumber: number };

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
  group?: GroupCode;
  matchNumber?: number;
  stage?: MatchStage;
  homeTeamId: string;
  awayTeamId: string;
  homeSource?: MatchParticipantSource;
  awaySource?: MatchParticipantSource;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  status: MatchStatus;
  providerId?: string | number;
  updatedAt?: string;
  minute?: string;
  kickoff: string;
  venue: string;
}

export interface CanonicalMatch extends Match {
  matchNumber: number;
  stage: MatchStage;
  homeSource: MatchParticipantSource;
  awaySource: MatchParticipantSource;
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

export interface PlayerStats {
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface Player {
  id: string;
  providerId?: string | number;
  name: string;
  teamId: string;
  position?: string;
  shirtNumber?: number;
  photoUrl?: string;
  stats?: PlayerStats;
  updatedAt?: string;
}

export type PlayerLeaderboardCategory = "goals" | "assists" | "minutes" | "yellowCards" | "redCards";

export interface PlayerLeaderboard {
  category: PlayerLeaderboardCategory;
  entries: Array<{
    rank: number;
    playerId: string;
    teamId: string;
    value: number;
  }>;
}

export interface TournamentCapabilities {
  liveScores: boolean;
  standings: boolean;
  fullSchedule: boolean;
  bracket: boolean;
  teamProfiles: boolean;
  playerStats: boolean;
  leaderboards: boolean;
}

export interface SnapshotFreshness {
  state: "live" | "cached" | "stale" | "unavailable";
  updatedAt: string;
  ageSeconds?: number;
  nextRefreshAt?: string;
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
  matches?: CanonicalMatch[];
  liveMatches: Match[];
  totalMatches: number;
  goalsScored: number;
  capabilities?: TournamentCapabilities;
  freshness?: SnapshotFreshness;
  players?: Player[];
  playerLeaders?: PlayerLeaderboard[];
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
