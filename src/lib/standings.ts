import { groupCodes, matches, teams } from "../data/seed.js";
import type { GroupStanding, KnockoutSlot, Match, StandingRow, Team, ThirdPlaceRow, TournamentSnapshot } from "../types.js";

const fairPlaySeed: Record<string, number> = Object.fromEntries(
  teams.map((team, index) => [team.id, -((index % 4) + (team.fifaRank % 3))])
);

export function buildTournamentSnapshot(source: TournamentSnapshot["source"] = "seed-cache", providerName = "Seed cache"): TournamentSnapshot {
  const groups = buildGroupStandings(teams, matches);
  const thirdPlaceRace = rankThirdPlaceTeams(groups);
  const knockoutSlots = buildKnockoutSlots(groups, thirdPlaceRace);
  const countedMatches = matches.filter((match) => match.homeScore !== null && match.awayScore !== null);
  const checkedAt = new Date().toISOString();

  return {
    source,
    providerName,
    providerStatus: {
      state: source === "provider" ? "live" : "seed",
      provider: providerName,
      detail: source === "provider" ? "Provider snapshot validated." : "Seed-cache fallback data is active.",
      checkedAt
    },
    lastUpdated: checkedAt,
    groups,
    thirdPlaceRace,
    knockoutSlots,
    liveMatches: matches.filter((match) => match.status === "live"),
    totalMatches: 104,
    goalsScored: countedMatches.reduce((total, match) => total + (match.homeScore ?? 0) + (match.awayScore ?? 0), 0)
  };
}

export function buildGroupStandings(allTeams: Team[], allMatches: Match[]): GroupStanding[] {
  return groupCodes.map((code) => {
    const groupTeams = allTeams.filter((team) => team.group === code);
    const groupMatches = allMatches.filter((match) => match.group === code);
    const rows = groupTeams.map((team) => seedRow(team));

    groupMatches.forEach((match) => {
      if (match.homeScore === null || match.awayScore === null) return;
      const home = rows.find((row) => row.team.id === match.homeTeamId);
      const away = rows.find((row) => row.team.id === match.awayTeamId);
      if (!home || !away) return;
      applyMatch(home, away, match.homeScore, match.awayScore);
    });

    const ranked = rankGroupRows(rows, groupMatches);
    return {
      code,
      matches: groupMatches,
      rows: ranked.map((row, index) => ({
        ...row,
        rank: index + 1,
        qualification: index < 2 ? "round32" : index === 2 ? "thirdRace" : "outside"
      }))
    };
  });
}

export function rankGroupRows(rows: StandingRow[], groupMatches: Match[]): StandingRow[] {
  return resolvePointGroups(rows, groupMatches);
}

export function rankThirdPlaceTeams(groups: GroupStanding[]): ThirdPlaceRow[] {
  return groups
    .map((group) => ({ group: group.code, row: group.rows[2] }))
    .sort((a, b) => compareThirdRows(a.row, b.row))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      qualifies: index < 8,
      row: {
        ...entry.row,
        qualification: index < 8 ? "thirdRace" : "outside"
      }
    }));
}

export function compareRows(a: StandingRow, b: StandingRow, groupMatches: Match[]): number {
  const tiedTeams = [a.team.id, b.team.id];
  const headToHead = miniTable(tiedTeams, groupMatches);
  const h2hA = headToHead.get(a.team.id);
  const h2hB = headToHead.get(b.team.id);

  const ladder = [
    b.points - a.points,
    (h2hB?.points ?? 0) - (h2hA?.points ?? 0),
    (h2hB?.goalDifference ?? 0) - (h2hA?.goalDifference ?? 0),
    (h2hB?.goalsFor ?? 0) - (h2hA?.goalsFor ?? 0),
    b.goalDifference - a.goalDifference,
    b.goalsFor - a.goalsFor,
    b.fairPlay - a.fairPlay,
    a.team.fifaRank - b.team.fifaRank
  ];

  return ladder.find((value) => value !== 0) ?? a.team.name.localeCompare(b.team.name);
}

function resolvePointGroups(rows: StandingRow[], groupMatches: Match[]): StandingRow[] {
  const pointGroups = groupRows(
    [...rows].sort((a, b) => b.points - a.points),
    (row) => String(row.points)
  );

  return pointGroups.flatMap((group) => (group.length === 1 ? group : resolveTiedRows(group, groupMatches)));
}

function resolveTiedRows(rows: StandingRow[], groupMatches: Match[]): StandingRow[] {
  if (rows.length <= 1) return rows;

  const teamIds = rows.map((row) => row.team.id);
  const headToHead = miniTable(teamIds, groupMatches);
  const headToHeadGroups = groupRows(
    [...rows].sort((a, b) => {
      const aStats = headToHead.get(a.team.id);
      const bStats = headToHead.get(b.team.id);
      return (
        (bStats?.points ?? 0) - (aStats?.points ?? 0) ||
        (bStats?.goalDifference ?? 0) - (aStats?.goalDifference ?? 0) ||
        (bStats?.goalsFor ?? 0) - (aStats?.goalsFor ?? 0)
      );
    }),
    (row) => {
      const stats = headToHead.get(row.team.id);
      return `${stats?.points ?? 0}|${stats?.goalDifference ?? 0}|${stats?.goalsFor ?? 0}`;
    }
  );

  if (headToHeadGroups.length > 1) {
    return headToHeadGroups.flatMap((group) => (group.length === 1 ? group : resolveTiedRows(group, groupMatches)));
  }

  return [...rows].sort(compareOverallRows);
}

function compareOverallRows(a: StandingRow, b: StandingRow): number {
  return (
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    b.fairPlay - a.fairPlay ||
    a.team.fifaRank - b.team.fifaRank ||
    a.team.name.localeCompare(b.team.name)
  );
}

function groupRows<T>(rows: T[], keyFor: (row: T) => string): T[][] {
  const groups: T[][] = [];
  rows.forEach((row) => {
    const key = keyFor(row);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && keyFor(lastGroup[0]) === key) {
      lastGroup.push(row);
    } else {
      groups.push([row]);
    }
  });
  return groups;
}

export function compareThirdRows(a: StandingRow, b: StandingRow): number {
  const ladder = [
    b.points - a.points,
    b.goalDifference - a.goalDifference,
    b.goalsFor - a.goalsFor,
    b.fairPlay - a.fairPlay,
    a.team.fifaRank - b.team.fifaRank
  ];
  return ladder.find((value) => value !== 0) ?? a.team.name.localeCompare(b.team.name);
}

export function buildKnockoutSlots(groups: GroupStanding[], thirdPlaceRace: ThirdPlaceRow[]): KnockoutSlot[] {
  const groupMap = new Map(groups.map((group) => [group.code, group]));
  const bestThirds = thirdPlaceRace.filter((entry) => entry.qualifies);
  const slot = (id: string, label: string, source: string, teamLabel: string): KnockoutSlot => ({ id, label, source, teamLabel });

  return [
    slot("r32-73", "Match 73", "Runner-up A vs Runner-up B", `${groupMap.get("A")?.rows[1].team.shortName} vs ${groupMap.get("B")?.rows[1].team.shortName}`),
    slot("r32-74", "Match 74", "Winner E vs best 3rd A/B/C/D/F", `${groupMap.get("E")?.rows[0].team.shortName} vs ${pickThird(bestThirds, ["A", "B", "C", "D", "F"])}`),
    slot("r32-79", "Match 79", "Winner A vs best 3rd C/E/F/H/I", `${groupMap.get("A")?.rows[0].team.shortName} vs ${pickThird(bestThirds, ["C", "E", "F", "H", "I"])}`),
    slot("r32-85", "Match 85", "Winner B vs best 3rd E/F/G/I/J", `${groupMap.get("B")?.rows[0].team.shortName} vs ${pickThird(bestThirds, ["E", "F", "G", "I", "J"])}`),
    slot("final", "Final", "Road to MetLife Stadium", "1 champion")
  ];
}

function pickThird(thirdPlaceRace: ThirdPlaceRow[], eligibleGroups: string[]): string {
  const entry = thirdPlaceRace.find((candidate) => eligibleGroups.includes(candidate.group));
  return entry ? `${entry.row.team.shortName} (${entry.group}3)` : "3rd place";
}

function seedRow(team: Team): StandingRow {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    fairPlay: fairPlaySeed[team.id] ?? 0,
    rank: 0,
    qualification: "outside",
    tiebreakers: []
  };
}

function applyMatch(home: StandingRow, away: StandingRow, homeScore: number, awayScore: number): void {
  home.played += 1;
  away.played += 1;
  home.goalsFor += homeScore;
  home.goalsAgainst += awayScore;
  away.goalsFor += awayScore;
  away.goalsAgainst += homeScore;
  home.goalDifference = home.goalsFor - home.goalsAgainst;
  away.goalDifference = away.goalsFor - away.goalsAgainst;

  if (homeScore > awayScore) {
    home.won += 1;
    away.lost += 1;
    home.points += 3;
  } else if (homeScore < awayScore) {
    away.won += 1;
    home.lost += 1;
    away.points += 3;
  } else {
    home.drawn += 1;
    away.drawn += 1;
    home.points += 1;
    away.points += 1;
  }
}

function miniTable(teamIds: string[], groupMatches: Match[]): Map<string, Pick<StandingRow, "points" | "goalsFor" | "goalDifference">> {
  const table = new Map(teamIds.map((id) => [id, { points: 0, goalsFor: 0, goalDifference: 0 }]));
  groupMatches.forEach((match) => {
    if (match.homeScore === null || match.awayScore === null) return;
    if (!teamIds.includes(match.homeTeamId) || !teamIds.includes(match.awayTeamId)) return;
    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);
    if (!home || !away) return;
    home.goalsFor += match.homeScore;
    away.goalsFor += match.awayScore;
    home.goalDifference += match.homeScore - match.awayScore;
    away.goalDifference += match.awayScore - match.homeScore;
    if (match.homeScore > match.awayScore) home.points += 3;
    if (match.homeScore < match.awayScore) away.points += 3;
    if (match.homeScore === match.awayScore) {
      home.points += 1;
      away.points += 1;
    }
  });
  return table;
}
