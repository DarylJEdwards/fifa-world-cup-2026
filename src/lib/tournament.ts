import { THIRD_PLACE_ASSIGNMENTS } from "../data/annexC.js";
import type {
  CanonicalMatch,
  GroupCode,
  GroupStanding,
  KnockoutSlot,
  Match,
  MatchParticipantSource,
  MatchStage,
  ThirdPlaceRow
} from "../types.js";

export const ANNEX_WINNER_GROUPS = ["A", "B", "D", "E", "G", "I", "K", "L"] as const satisfies readonly GroupCode[];

export const THIRD_PLACE_ELIGIBILITY: Readonly<Record<(typeof ANNEX_WINNER_GROUPS)[number], readonly GroupCode[]>> = {
  A: ["C", "E", "F", "H", "I"],
  B: ["E", "F", "G", "I", "J"],
  D: ["B", "E", "F", "I", "J"],
  E: ["A", "B", "C", "D", "F"],
  G: ["A", "E", "H", "I", "J"],
  I: ["C", "D", "F", "G", "H"],
  K: ["D", "E", "I", "J", "L"],
  L: ["E", "H", "I", "J", "K"]
};

type KnockoutDefinition = {
  matchNumber: number;
  stage: MatchStage;
  homeSource: MatchParticipantSource;
  awaySource: MatchParticipantSource;
};

export function getThirdPlaceAssignments(thirdPlaceRace: ThirdPlaceRow[]): ReadonlyMap<GroupCode, GroupCode> {
  const qualifyingGroups = thirdPlaceRace.filter((entry) => entry.qualifies).map((entry) => entry.group);
  if (qualifyingGroups.length !== 8 || new Set(qualifyingGroups).size !== 8) {
    throw new Error("Annexe C requires exactly eight unique qualifying third-place groups");
  }

  const key = [...qualifyingGroups].sort().join("");
  const assignedGroups = THIRD_PLACE_ASSIGNMENTS[key];
  if (!assignedGroups || assignedGroups.length !== ANNEX_WINNER_GROUPS.length) {
    throw new Error(`No Annexe C assignment found for qualifying groups ${key}`);
  }
  if (new Set(assignedGroups).size !== assignedGroups.length || assignedGroups.some((group) => !qualifyingGroups.includes(group))) {
    throw new Error(`Invalid Annexe C assignment for qualifying groups ${key}`);
  }

  const assignments = new Map<GroupCode, GroupCode>();
  ANNEX_WINNER_GROUPS.forEach((winnerGroup, index) => {
    const thirdGroup = assignedGroups[index];
    if (!THIRD_PLACE_ELIGIBILITY[winnerGroup].includes(thirdGroup)) {
      throw new Error(`Annexe C assigned Group ${thirdGroup} third place to ineligible Group ${winnerGroup} winner`);
    }
    assignments.set(winnerGroup, thirdGroup);
  });
  return assignments;
}

export function buildTournamentSchedule(
  groups: GroupStanding[],
  thirdPlaceRace: ThirdPlaceRow[],
  groupMatches: Match[] = groups.flatMap((group) => group.matches)
): CanonicalMatch[] {
  const canonicalGroupMatches = groupMatches.map((match, index) => canonicalizeGroupMatch(match, index + 1));
  const knockoutMatches = buildKnockoutMatches(groups, thirdPlaceRace);
  const schedule = [...canonicalGroupMatches, ...knockoutMatches].sort((a, b) => a.matchNumber - b.matchNumber);
  validateTournamentSchedule(schedule);
  return schedule;
}

export function buildKnockoutMatches(groups: GroupStanding[], thirdPlaceRace: ThirdPlaceRow[]): CanonicalMatch[] {
  const assignments = getThirdPlaceAssignments(thirdPlaceRace);
  const definitions = knockoutDefinitions(assignments);
  return definitions.map((definition) => {
    const homeTeamId = resolveParticipantId(definition.homeSource, groups, thirdPlaceRace);
    const awayTeamId = resolveParticipantId(definition.awaySource, groups, thirdPlaceRace);
    return {
      id: `match-${definition.matchNumber}`,
      ...definition,
      homeTeamId,
      awayTeamId,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      kickoff: "",
      venue: "TBD"
    };
  });
}

export function buildFullKnockoutSlots(groups: GroupStanding[], thirdPlaceRace: ThirdPlaceRow[]): KnockoutSlot[] {
  return buildKnockoutMatches(groups, thirdPlaceRace).map((match) => ({
    id: match.stage === "round32" ? `r32-${match.matchNumber}` : `knockout-${match.matchNumber}`,
    label: `Match ${match.matchNumber}`,
    teamLabel: `${participantLabel(match.homeSource, groups, thirdPlaceRace)} vs ${participantLabel(match.awaySource, groups, thirdPlaceRace)}`,
    source: sourcePairLabel(match.homeSource, match.awaySource)
  }));
}

export function validateTournamentSchedule(schedule: CanonicalMatch[]): void {
  if (schedule.length !== 104) throw new Error(`Tournament schedule must contain 104 matches; received ${schedule.length}`);
  const numbers = schedule.map((match) => match.matchNumber);
  if (new Set(numbers).size !== 104 || numbers.some((number, index) => number !== index + 1)) {
    throw new Error("Tournament schedule must contain each match number from 1 through 104 exactly once");
  }

  const expectedStageCounts: Readonly<Record<MatchStage, number>> = {
    group: 72,
    round32: 16,
    round16: 8,
    quarterfinal: 4,
    semifinal: 2,
    thirdPlace: 1,
    final: 1
  };
  Object.entries(expectedStageCounts).forEach(([stage, expected]) => {
    const actual = schedule.filter((match) => match.stage === stage).length;
    if (actual !== expected) throw new Error(`Expected ${expected} ${stage} matches; received ${actual}`);
  });

  schedule.filter((match) => match.stage !== "group").forEach((match) => {
    [match.homeSource, match.awaySource].forEach((source) => {
      if ((source.kind === "winnerOf" || source.kind === "loserOf") && source.matchNumber >= match.matchNumber) {
        throw new Error(`Match ${match.matchNumber} references non-prior match ${source.matchNumber}`);
      }
    });
  });
}

function canonicalizeGroupMatch(match: Match, fallbackNumber: number): CanonicalMatch {
  const matchNumber = match.matchNumber ?? fallbackNumber;
  return {
    ...match,
    id: match.id || `match-${matchNumber}`,
    matchNumber,
    stage: "group",
    homeSource: match.homeSource ?? { kind: "team", teamId: match.homeTeamId },
    awaySource: match.awaySource ?? { kind: "team", teamId: match.awayTeamId }
  };
}

function knockoutDefinitions(assignments: ReadonlyMap<GroupCode, GroupCode>): KnockoutDefinition[] {
  const groupRank = (group: GroupCode, rank: 1 | 2): MatchParticipantSource => ({ kind: "groupRank", group, rank });
  const third = (winnerGroup: GroupCode): MatchParticipantSource => {
    const group = assignments.get(winnerGroup);
    if (!group) throw new Error(`Missing third-place assignment for Group ${winnerGroup} winner`);
    return { kind: "thirdPlace", group };
  };
  const winner = (matchNumber: number): MatchParticipantSource => ({ kind: "winnerOf", matchNumber });
  const loser = (matchNumber: number): MatchParticipantSource => ({ kind: "loserOf", matchNumber });
  const match = (
    matchNumber: number,
    stage: MatchStage,
    homeSource: MatchParticipantSource,
    awaySource: MatchParticipantSource
  ): KnockoutDefinition => ({ matchNumber, stage, homeSource, awaySource });

  return [
    match(73, "round32", groupRank("A", 2), groupRank("B", 2)),
    match(74, "round32", groupRank("E", 1), third("E")),
    match(75, "round32", groupRank("F", 1), groupRank("C", 2)),
    match(76, "round32", groupRank("C", 1), groupRank("F", 2)),
    match(77, "round32", groupRank("I", 1), third("I")),
    match(78, "round32", groupRank("E", 2), groupRank("I", 2)),
    match(79, "round32", groupRank("A", 1), third("A")),
    match(80, "round32", groupRank("L", 1), third("L")),
    match(81, "round32", groupRank("D", 1), third("D")),
    match(82, "round32", groupRank("G", 1), third("G")),
    match(83, "round32", groupRank("K", 2), groupRank("L", 2)),
    match(84, "round32", groupRank("H", 1), groupRank("J", 2)),
    match(85, "round32", groupRank("B", 1), third("B")),
    match(86, "round32", groupRank("J", 1), groupRank("H", 2)),
    match(87, "round32", groupRank("K", 1), third("K")),
    match(88, "round32", groupRank("D", 2), groupRank("G", 2)),
    match(89, "round16", winner(74), winner(77)),
    match(90, "round16", winner(73), winner(75)),
    match(91, "round16", winner(76), winner(78)),
    match(92, "round16", winner(79), winner(80)),
    match(93, "round16", winner(83), winner(84)),
    match(94, "round16", winner(81), winner(82)),
    match(95, "round16", winner(86), winner(88)),
    match(96, "round16", winner(85), winner(87)),
    match(97, "quarterfinal", winner(89), winner(90)),
    match(98, "quarterfinal", winner(93), winner(94)),
    match(99, "quarterfinal", winner(91), winner(92)),
    match(100, "quarterfinal", winner(95), winner(96)),
    match(101, "semifinal", winner(97), winner(98)),
    match(102, "semifinal", winner(99), winner(100)),
    match(103, "thirdPlace", loser(101), loser(102)),
    match(104, "final", winner(101), winner(102))
  ];
}

function resolveParticipantId(
  source: MatchParticipantSource,
  groups: GroupStanding[],
  thirdPlaceRace: ThirdPlaceRow[]
): string {
  if (source.kind === "team") return source.teamId;
  if (source.kind === "winnerOf") return `winner-of-${source.matchNumber}`;
  if (source.kind === "loserOf") return `loser-of-${source.matchNumber}`;
  if (source.kind === "thirdPlace") {
    return thirdPlaceRace.find((entry) => entry.group === source.group)?.row.team.id ?? `third-${source.group}`;
  }
  return groups.find((group) => group.code === source.group)?.rows[source.rank - 1]?.team.id ?? `group-${source.group}-rank-${source.rank}`;
}

function participantLabel(
  source: MatchParticipantSource,
  groups: GroupStanding[],
  thirdPlaceRace: ThirdPlaceRow[]
): string {
  if (source.kind === "winnerOf") return `Winner M${source.matchNumber}`;
  if (source.kind === "loserOf") return `Loser M${source.matchNumber}`;
  if (source.kind === "thirdPlace") {
    const entry = thirdPlaceRace.find((candidate) => candidate.group === source.group);
    return entry ? `${entry.row.team.shortName} (${source.group}3)` : `Group ${source.group} third`;
  }
  if (source.kind === "team") {
    return groups.flatMap((group) => group.rows).find((row) => row.team.id === source.teamId)?.team.shortName ?? source.teamId;
  }
  return groups.find((group) => group.code === source.group)?.rows[source.rank - 1]?.team.shortName ?? `${source.rank}${source.group}`;
}

function sourceLabel(source: MatchParticipantSource): string {
  if (source.kind === "winnerOf") return `Winner Match ${source.matchNumber}`;
  if (source.kind === "loserOf") return `Loser Match ${source.matchNumber}`;
  if (source.kind === "thirdPlace") return `Third place Group ${source.group}`;
  if (source.kind === "team") return source.teamId;
  return `${source.rank === 1 ? "Winner" : "Runner-up"} Group ${source.group}`;
}

function sourcePairLabel(homeSource: MatchParticipantSource, awaySource: MatchParticipantSource): string {
  if (homeSource.kind === "groupRank" && homeSource.rank === 1 && awaySource.kind === "thirdPlace") {
    return `${sourceLabel(homeSource)} vs best 3rd ${THIRD_PLACE_ELIGIBILITY[homeSource.group as (typeof ANNEX_WINNER_GROUPS)[number]].join("/")}`;
  }
  return `${sourceLabel(homeSource)} vs ${sourceLabel(awaySource)}`;
}
