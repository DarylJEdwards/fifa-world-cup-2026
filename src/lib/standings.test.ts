import { describe, expect, it } from "vitest";
import type { GroupStanding, Match, StandingRow, Team } from "../types";
import { buildTournamentSnapshot, compareRows, rankGroupRows, rankThirdPlaceTeams } from "./standings";

describe("World Cup standings rules", () => {
  it("uses head-to-head before overall goal difference inside a group", () => {
    const alpha = row(team("alpha", 20), 6, 2, 2, 6);
    const beta = row(team("beta", 8), 6, 5, 5, 6);
    const groupMatches: Match[] = [
      {
        id: "h2h",
        group: "A",
        homeTeamId: "alpha",
        awayTeamId: "beta",
        homeScore: 1,
        awayScore: 0,
        status: "complete",
        kickoff: "2026-06-11T12:00:00Z",
        venue: "Test"
      }
    ];

    expect(compareRows(alpha, beta, groupMatches)).toBeLessThan(0);
  });

  it("qualifies exactly eight third-place teams", () => {
    const groups: GroupStanding[] = Array.from({ length: 12 }, (_, index) => ({
      code: "A",
      matches: [],
      rows: [
        row(team(`winner-${index}`, 1), 9, 8, 8, 9),
        row(team(`runner-${index}`, 2), 6, 4, 4, 6),
        row(team(`third-${index}`, 20 + index), index, index - 5, index + 1, index),
        row(team(`fourth-${index}`, 60), 0, -6, 1, 0)
      ]
    }));

    const race = rankThirdPlaceTeams(groups);
    expect(race.filter((entry) => entry.qualifies)).toHaveLength(8);
    expect(race[0].rank).toBe(1);
    expect(race[8].qualifies).toBe(false);
  });

  it("ranks three-team ties by the mini-table across all tied teams", () => {
    const alpha = row(team("alpha", 20), 6, 0, 4, 0);
    const beta = row(team("beta", 8), 6, 10, 9, 0);
    const charlie = row(team("charlie", 16), 6, -1, 3, 0);
    const delta = row(team("delta", 60), 0, -6, 1, 0);
    const groupMatches: Match[] = [
      h2h("alpha", "beta", 2, 0),
      h2h("beta", "charlie", 1, 0),
      h2h("charlie", "alpha", 1, 0)
    ];

    expect(rankGroupRows([beta, delta, charlie, alpha], groupMatches).map((rankedRow) => rankedRow.team.id)).toEqual([
      "alpha",
      "charlie",
      "beta",
      "delta"
    ]);
  });

  it("reapplies head-to-head criteria among teams that remain tied after the mini-table splits", () => {
    const alpha = row(team("alpha", 20), 6, 3, 4, 0);
    const beta = row(team("beta", 8), 6, 0, 2, 0);
    const charlie = row(team("charlie", 16), 6, 0, 2, 0);
    const delta = row(team("delta", 60), 6, -3, 1, 0);
    const groupMatches: Match[] = [
      h2h("alpha", "beta", 1, 0),
      h2h("alpha", "charlie", 1, 1),
      h2h("alpha", "delta", 2, 0),
      h2h("beta", "charlie", 1, 0),
      h2h("beta", "delta", 1, 1),
      h2h("charlie", "delta", 1, 0)
    ];

    expect(rankGroupRows([charlie, delta, beta, alpha], groupMatches).map((rankedRow) => rankedRow.team.id)).toEqual([
      "alpha",
      "beta",
      "charlie",
      "delta"
    ]);
  });

  it("falls back to overall goal difference and goals scored when head-to-head cannot split a four-team tie", () => {
    const alpha = row(team("alpha", 20), 4, 3, 5, 0);
    const beta = row(team("beta", 8), 4, 3, 4, 0);
    const charlie = row(team("charlie", 16), 4, 1, 7, 0);
    const delta = row(team("delta", 60), 4, -2, 3, 0);

    expect(rankGroupRows([delta, charlie, beta, alpha], []).map((rankedRow) => rankedRow.team.id)).toEqual([
      "alpha",
      "beta",
      "charlie",
      "delta"
    ]);
  });

  it("uses fair-play score before FIFA ranking fallback", () => {
    const cleaner = row(team("cleaner", 40), 4, 0, 3, -1);
    const rougher = row(team("rougher", 1), 4, 0, 3, -6);

    expect(rankGroupRows([rougher, cleaner], []).map((rankedRow) => rankedRow.team.id)).toEqual(["cleaner", "rougher"]);
  });

  it("uses FIFA ranking fallback when all football and fair-play criteria are tied", () => {
    const higherRanked = row(team("higher-ranked", 4), 4, 0, 3, -2);
    const lowerRanked = row(team("lower-ranked", 40), 4, 0, 3, -2);

    expect(rankGroupRows([lowerRanked, higherRanked], []).map((rankedRow) => rankedRow.team.id)).toEqual(["higher-ranked", "lower-ranked"]);
  });

  it("assigns third-place teams only to eligible knockout slot pools", () => {
    const snapshot = buildTournamentSnapshot();
    const winnerASlot = snapshot.knockoutSlots.find((slot) => slot.id === "r32-79");

    expect(winnerASlot?.source).toContain("C/E/F/H/I");
    expect(winnerASlot?.teamLabel).toMatch(/\((C|E|F|H|I)3\)$/);
  });
});

function team(id: string, rank: number): Team {
  return {
    id,
    name: id,
    shortName: id.slice(0, 3).toUpperCase(),
    group: "A",
    flag: "🏳️",
    colors: ["#111", "#fff", "#d6a84f"],
    confederation: "TEST",
    fifaRank: rank,
    profile: {
      manager: "",
      captain: "",
      star: "",
      bestFinish: "",
      form: []
    }
  };
}

function row(teamInput: Team, points: number, goalDifference: number, goalsFor: number, fairPlay: number): StandingRow {
  return {
    team: teamInput,
    played: 3,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor,
    goalsAgainst: goalsFor - goalDifference,
    goalDifference,
    points,
    fairPlay,
    rank: 0,
    qualification: "outside",
    tiebreakers: []
  };
}

function h2h(homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): Match {
  return {
    id: `${homeTeamId}-${awayTeamId}`,
    group: "A",
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    status: "complete",
    kickoff: "2026-06-11T12:00:00Z",
    venue: "Test"
  };
}
