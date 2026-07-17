import { describe, expect, it } from "vitest";
import { matches as seedGroupMatches, teams as seedTeams } from "../../src/data/seed";
import { mapFifaMatchStatus, mapFifaSnapshot } from "./fifa";

describe("official FIFA provider", () => {
  it("maps the complete official calendar into scores, standings, penalties, and the canonical bracket", () => {
    const calendar = fifaCalendarFixture({ includeLive: true });
    const now = new Date(calendar.Results[0].Date);
    const snapshot = mapFifaSnapshot({ calendar, providerName: "FIFA", now });

    expect(snapshot.source).toBe("provider");
    expect(snapshot.providerStatus).toMatchObject({ state: "live", provider: "FIFA", nextRefreshSeconds: 15 });
    expect(snapshot.matches).toHaveLength(104);
    expect(snapshot.groups).toHaveLength(12);
    expect(snapshot.groups.every((group) => group.rows.length === 4 && group.matches.length === 6)).toBe(true);
    expect(snapshot.knockoutSlots).toHaveLength(32);
    expect(snapshot.liveMatches).toHaveLength(1);
    expect(snapshot.matches?.[0]).toMatchObject({
      matchNumber: 1,
      stage: "group",
      status: "live",
      homeScore: 1,
      awayScore: 0,
      providerId: "fifa-match-1"
    });
    expect(snapshot.matches?.[88]).toMatchObject({
      matchNumber: 89,
      stage: "round16",
      status: "complete",
      homeScore: 0,
      awayScore: 0,
      homePenaltyScore: 4,
      awayPenaltyScore: 3
    });
    expect(snapshot.matches?.[100]).toMatchObject({
      matchNumber: 101,
      stage: "semifinal",
      status: "scheduled",
      homeTeamId: "winner-of-97",
      awayTeamId: "winner-of-98"
    });
    expect(snapshot.capabilities).toMatchObject({
      liveScores: true,
      standings: true,
      fullSchedule: true,
      bracket: true,
      playerStats: false,
      leaderboards: false
    });
  });

  it("switches to rapid polling shortly before kickoff and idle polling outside match windows", () => {
    const calendar = fifaCalendarFixture();
    const semifinal = calendar.Results.find((match) => match.MatchNumber === 101);
    if (!semifinal) throw new Error("Missing semifinal fixture");
    const nearKickoff = new Date("2026-07-14T18:50:00Z");
    semifinal.Date = "2026-07-14T19:00:00Z";

    expect(mapFifaSnapshot({ calendar, providerName: "FIFA", now: nearKickoff }).providerStatus.nextRefreshSeconds).toBe(15);
    expect(mapFifaSnapshot({ calendar, providerName: "FIFA", now: new Date("2027-01-01T00:00:00Z") }).providerStatus.nextRefreshSeconds).toBe(300);
  });

  it("rejects incomplete, duplicate, or wrong-competition calendars", () => {
    const incomplete = fifaCalendarFixture();
    incomplete.Results.pop();
    expect(() => mapFifaSnapshot({ calendar: incomplete, providerName: "FIFA" })).toThrow("104 matches");

    const duplicate = fifaCalendarFixture();
    duplicate.Results[1].MatchNumber = 1;
    expect(() => mapFifaSnapshot({ calendar: duplicate, providerName: "FIFA" })).toThrow("MatchNumber");

    const wrongCompetition = fifaCalendarFixture();
    wrongCompetition.Results[0].IdCompetition = "999";
    expect(() => mapFifaSnapshot({ calendar: wrongCompetition, providerName: "FIFA" })).toThrow("wrong competition");

    const wrongBracket = fifaCalendarFixture();
    const round32 = wrongBracket.Results.find((match) => match.MatchNumber === 73);
    if (!round32) throw new Error("Missing Round of 32 fixture");
    round32.MatchStatus = 0;
    round32.ResultType = 1;
    round32.Home = fifaTeam("eng");
    round32.Away = fifaTeam("gha");
    round32.HomeTeamScore = 1;
    round32.AwayTeamScore = 0;
    expect(() => mapFifaSnapshot({ calendar: wrongBracket, providerName: "FIFA" })).toThrow("canonical source");
  });

  it("accepts FIFA's third-place stage aliases but rejects unrelated labels", () => {
    for (const label of ["Play-off for third place", "Bronze final"]) {
      const calendar = fifaCalendarFixture();
      const thirdPlace = calendar.Results.find((match) => match.MatchNumber === 103);
      if (!thirdPlace) throw new Error("Missing third-place fixture");
      thirdPlace.StageName = [{ Locale: "en-GB", Description: label }];

      expect(() => mapFifaSnapshot({ calendar, providerName: "FIFA" })).not.toThrow();
    }

    const wrongStage = fifaCalendarFixture();
    const thirdPlace = wrongStage.Results.find((match) => match.MatchNumber === 103);
    if (!thirdPlace) throw new Error("Missing third-place fixture");
    thirdPlace.StageName = [{ Locale: "en-GB", Description: "Semi-final" }];

    expect(() => mapFifaSnapshot({ calendar: wrongStage, providerName: "FIFA" })).toThrow(
      "FIFA match 103 stage=Semi-final"
    );
  });

  it("fails closed on unknown FIFA status enums", () => {
    expect(mapFifaMatchStatus(0)).toBe("complete");
    expect(mapFifaMatchStatus(1)).toBe("scheduled");
    expect(mapFifaMatchStatus(3)).toBe("live");
    expect(() => mapFifaMatchStatus(2)).toThrow("Unsupported FIFA match status");
  });
});

function fifaCalendarFixture(options: { includeLive?: boolean } = {}) {
  const baseTime = Date.UTC(2026, 5, 11, 19);
  const events = Array.from({ length: 104 }, (_, index) => {
    const matchNumber = index + 1;
    const stage = stageFor(matchNumber);
    const groupMatch = matchNumber <= 72 ? seedGroupMatches[matchNumber - 1] : undefined;
    const home = groupMatch ? fifaTeam(groupMatch.homeTeamId) : null;
    const away = groupMatch ? fifaTeam(groupMatch.awayTeamId) : null;
    const completed = matchNumber <= 72 || matchNumber === 89;
    const live = options.includeLive === true && matchNumber === 1;
    const penalties = matchNumber === 89;
    const knockoutHome = penalties ? fifaTeam("mex") : home;
    const knockoutAway = penalties ? fifaTeam("rsa") : away;

    return {
      IdCompetition: "17",
      IdSeason: "285023",
      IdStage: `stage-${stage}`,
      IdGroup: groupMatch ? `group-${groupMatch.group}` : undefined,
      IdMatch: `fifa-match-${matchNumber}`,
      MatchNumber: matchNumber,
      MatchStatus: live ? 3 : completed ? 0 : 1,
      ResultType: live ? 0 : penalties ? 2 : completed ? 1 : 0,
      Date: new Date(baseTime + index * 60 * 60 * 1000).toISOString(),
      StageName: [{ Locale: "en-GB", Description: fifaStageName(stage) }],
      GroupName: groupMatch ? [{ Locale: "en-GB", Description: `Group ${groupMatch.group}` }] : [],
      Home: knockoutHome,
      Away: knockoutAway,
      HomeTeamScore: live ? 1 : penalties ? 0 : completed ? matchNumber % 3 : null,
      AwayTeamScore: live ? 0 : penalties ? 0 : completed ? (matchNumber + 1) % 2 : null,
      HomeTeamPenaltyScore: penalties ? 4 : null,
      AwayTeamPenaltyScore: penalties ? 3 : null,
      MatchTime: live ? "62'" : completed ? "90'" : null,
      Winner: completed ? knockoutHome?.IdTeam ?? null : null,
      PlaceHolderA: matchNumber > 72 ? "W previous" : null,
      PlaceHolderB: matchNumber > 72 ? "W previous" : null,
      Stadium: {
        Name: [{ Locale: "en-GB", Description: `Stadium ${matchNumber}` }],
        CityName: [{ Locale: "en-GB", Description: "Host City" }]
      }
    };
  });
  return { ContinuationToken: null, Results: events };
}

function fifaTeam(teamId: string) {
  const team = seedTeams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Unknown fixture team ${teamId}`);
  const abbreviation = team.shortName === "CUR" ? "CUW" : team.shortName;
  return {
    IdTeam: `fifa-${team.id}`,
    IdCountry: abbreviation,
    Abbreviation: abbreviation,
    TeamName: [{ Locale: "en-GB", Description: team.name }],
    ShortClubName: team.name,
    Score: null
  };
}

function stageFor(matchNumber: number) {
  if (matchNumber <= 72) return "group";
  if (matchNumber <= 88) return "round32";
  if (matchNumber <= 96) return "round16";
  if (matchNumber <= 100) return "quarterfinal";
  if (matchNumber <= 102) return "semifinal";
  if (matchNumber === 103) return "thirdPlace";
  return "final";
}

function fifaStageName(stage: string): string {
  return {
    group: "First Stage",
    round32: "Round of 32",
    round16: "Round of 16",
    quarterfinal: "Quarter-final",
    semifinal: "Semi-final",
    thirdPlace: "Play-off for third place",
    final: "Final"
  }[stage] as string;
}
