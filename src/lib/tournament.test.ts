import { describe, expect, it } from "vitest";
import { THIRD_PLACE_ASSIGNMENTS } from "../data/annexC";
import { groupCodes, matches, teams } from "../data/seed";
import type { GroupCode, StandingRow, Team, ThirdPlaceRow } from "../types";
import { buildTournamentSnapshot } from "./standings";
import {
  ANNEX_WINNER_GROUPS,
  getThirdPlaceAssignments,
  THIRD_PLACE_ELIGIBILITY,
  validateTournamentSchedule
} from "./tournament";

describe("World Cup 2026 tournament data foundation", () => {
  it("contains the confirmed 48-team field with four unique teams in every group", () => {
    expect(teams).toHaveLength(48);
    expect(new Set(teams.map((team) => team.id))).toHaveLength(48);
    expect(Object.fromEntries(groupCodes.map((group) => [
      group,
      teams.filter((team) => team.group === group).map((team) => team.shortName)
    ]))).toEqual({
      A: ["MEX", "RSA", "KOR", "CZE"],
      B: ["SUI", "CAN", "BIH", "QAT"],
      C: ["BRA", "MAR", "SCO", "HAI"],
      D: ["USA", "AUS", "PAR", "TUR"],
      E: ["GER", "CIV", "ECU", "CUR"],
      F: ["NED", "JPN", "SWE", "TUN"],
      G: ["BEL", "EGY", "IRN", "NZL"],
      H: ["ESP", "CPV", "URU", "KSA"],
      I: ["FRA", "NOR", "SEN", "IRQ"],
      J: ["ARG", "AUT", "ALG", "JOR"],
      K: ["COL", "POR", "COD", "UZB"],
      L: ["ENG", "CRO", "GHA", "PAN"]
    });
  });

  it("generates all 72 result-neutral group matches with each pairing exactly once", () => {
    expect(matches).toHaveLength(72);
    expect(matches.every((match) =>
      match.stage === "group" &&
      match.status === "scheduled" &&
      match.homeScore === null &&
      match.awayScore === null
    )).toBe(true);

    groupCodes.forEach((group) => {
      const groupMatches = matches.filter((match) => match.group === group);
      expect(groupMatches).toHaveLength(6);
      const pairings = groupMatches.map((match) => [match.homeTeamId, match.awayTeamId].sort().join("|"));
      expect(new Set(pairings).size).toBe(6);
      const appearances = new Map<string, number>();
      groupMatches.forEach((match) => {
        appearances.set(match.homeTeamId, (appearances.get(match.homeTeamId) ?? 0) + 1);
        appearances.set(match.awayTeamId, (appearances.get(match.awayTeamId) ?? 0) + 1);
      });
      expect([...appearances.values()]).toEqual([3, 3, 3, 3]);
    });
  });

  it("contains all 495 official Annexe C combinations", () => {
    const entries = Object.entries(THIRD_PLACE_ASSIGNMENTS);
    expect(entries).toHaveLength(495);
    entries.forEach(([key, assignment]) => {
      expect(key).toMatch(/^[A-L]{8}$/);
      expect([...key].sort().join("")).toBe(key);
      expect(new Set(key).size).toBe(8);
      expect(assignment).toHaveLength(8);
      expect(new Set(assignment).size).toBe(8);
      expect(assignment.every((group) => key.includes(group))).toBe(true);
    });
  });

  it("validates every Annexe C assignment for eligibility and one-time use", () => {
    Object.keys(THIRD_PLACE_ASSIGNMENTS).forEach((key) => {
      const assignments = getThirdPlaceAssignments(thirdPlaceRaceFor(key));
      expect(assignments.size).toBe(8);
      expect(new Set(assignments.values()).size).toBe(8);
      ANNEX_WINNER_GROUPS.forEach((winnerGroup) => {
        const thirdGroup = assignments.get(winnerGroup);
        expect(thirdGroup).toBeDefined();
        expect(THIRD_PLACE_ELIGIBILITY[winnerGroup]).toContain(thirdGroup);
        expect(key).toContain(thirdGroup);
      });
    });
  });

  it("rejects invalid Annexe C qualifier sets", () => {
    expect(() => getThirdPlaceAssignments(thirdPlaceRaceFor("ABCDEFG"))).toThrow(/eight unique/i);
    expect(() => getThirdPlaceAssignments(thirdPlaceRaceFor("ABCDEFGG"))).toThrow(/eight unique/i);
  });

  it("builds a canonical 104-match schedule with the official stage counts", () => {
    const snapshot = buildTournamentSnapshot();
    const schedule = snapshot.matches;
    expect(schedule).toBeDefined();
    expect(schedule).toHaveLength(104);
    expect(snapshot.totalMatches).toBe(104);
    expect(schedule?.map((match) => match.matchNumber)).toEqual(Array.from({ length: 104 }, (_, index) => index + 1));
    expect(countStages(schedule ?? [])).toEqual({
      group: 72,
      round32: 16,
      round16: 8,
      quarterfinal: 4,
      semifinal: 2,
      thirdPlace: 1,
      final: 1
    });
    expect(() => validateTournamentSchedule(schedule ?? [])).not.toThrow();
  });

  it("models all official Round of 32 source formulas", () => {
    const schedule = buildTournamentSnapshot().matches ?? [];
    const round32 = new Map(schedule.filter((match) => match.stage === "round32").map((match) => [match.matchNumber, match]));
    expect(round32.size).toBe(16);
    expect(sourceKey(round32.get(73)?.homeSource)).toBe("2A");
    expect(sourceKey(round32.get(73)?.awaySource)).toBe("2B");
    expect(sourceKey(round32.get(75)?.homeSource)).toBe("1F");
    expect(sourceKey(round32.get(75)?.awaySource)).toBe("2C");
    expect(sourceKey(round32.get(76)?.homeSource)).toBe("1C");
    expect(sourceKey(round32.get(76)?.awaySource)).toBe("2F");
    expect(sourceKey(round32.get(78)?.homeSource)).toBe("2E");
    expect(sourceKey(round32.get(78)?.awaySource)).toBe("2I");
    expect(sourceKey(round32.get(83)?.homeSource)).toBe("2K");
    expect(sourceKey(round32.get(83)?.awaySource)).toBe("2L");
    expect(sourceKey(round32.get(84)?.homeSource)).toBe("1H");
    expect(sourceKey(round32.get(84)?.awaySource)).toBe("2J");
    expect(sourceKey(round32.get(86)?.homeSource)).toBe("1J");
    expect(sourceKey(round32.get(86)?.awaySource)).toBe("2H");
    expect(sourceKey(round32.get(88)?.homeSource)).toBe("2D");
    expect(sourceKey(round32.get(88)?.awaySource)).toBe("2G");

    const annexWinnerByMatch = new Map([[74, "E"], [77, "I"], [79, "A"], [80, "L"], [81, "D"], [82, "G"], [85, "B"], [87, "K"]]);
    annexWinnerByMatch.forEach((winnerGroup, matchNumber) => {
      expect(sourceKey(round32.get(matchNumber)?.homeSource)).toBe(`1${winnerGroup}`);
      expect(round32.get(matchNumber)?.awaySource.kind).toBe("thirdPlace");
    });
    expect(new Set([...annexWinnerByMatch.keys()].map((number) => {
      const source = round32.get(number)?.awaySource;
      return source?.kind === "thirdPlace" ? source.group : undefined;
    })).size).toBe(8);
  });

  it("models the complete M89-M104 winner and loser source graph", () => {
    const schedule = new Map((buildTournamentSnapshot().matches ?? []).map((match) => [match.matchNumber, match]));
    const expected: Record<number, [string, string]> = {
      89: ["W74", "W77"],
      90: ["W73", "W75"],
      91: ["W76", "W78"],
      92: ["W79", "W80"],
      93: ["W83", "W84"],
      94: ["W81", "W82"],
      95: ["W86", "W88"],
      96: ["W85", "W87"],
      97: ["W89", "W90"],
      98: ["W93", "W94"],
      99: ["W91", "W92"],
      100: ["W95", "W96"],
      101: ["W97", "W98"],
      102: ["W99", "W100"],
      103: ["L101", "L102"],
      104: ["W101", "W102"]
    };
    Object.entries(expected).forEach(([number, sources]) => {
      const match = schedule.get(Number(number));
      expect([sourceKey(match?.homeSource), sourceKey(match?.awaySource)]).toEqual(sources);
    });
  });
});

function thirdPlaceRaceFor(key: string): ThirdPlaceRow[] {
  return [...key].map((group, index) => {
    const code = group as GroupCode;
    return {
      group: code,
      row: standingRow(teamFor(code)),
      rank: index + 1,
      qualifies: true
    };
  });
}

function teamFor(group: GroupCode): Team {
  return {
    id: `third-${group}`,
    name: `Third ${group}`,
    shortName: `3${group}`,
    group,
    flag: "🏳️",
    colors: ["#111", "#fff", "#d6a84f"],
    confederation: "TEST",
    fifaRank: 999,
    profile: { manager: "", captain: "", star: "", bestFinish: "", form: [] }
  };
}

function standingRow(team: Team): StandingRow {
  return {
    team,
    played: 3,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    fairPlay: 0,
    rank: 3,
    qualification: "thirdRace",
    tiebreakers: []
  };
}

function countStages(matchesInput: Array<{ stage: string }>): Record<string, number> {
  return matchesInput.reduce<Record<string, number>>((counts, match) => {
    counts[match.stage] = (counts[match.stage] ?? 0) + 1;
    return counts;
  }, {});
}

function sourceKey(source: import("../types").MatchParticipantSource | undefined): string | undefined {
  if (!source) return undefined;
  if (source.kind === "groupRank") return `${source.rank}${source.group}`;
  if (source.kind === "thirdPlace") return `3${source.group}`;
  if (source.kind === "winnerOf") return `W${source.matchNumber}`;
  if (source.kind === "loserOf") return `L${source.matchNumber}`;
  return source.teamId;
}
