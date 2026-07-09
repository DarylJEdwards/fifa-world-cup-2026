import type { CanonicalMatch, GroupCode, Team } from "../types.js";

const profiles = {
  manager: "Unavailable in fallback data",
  captain: "Unavailable in fallback data",
  star: "Player feed unavailable",
  bestFinish: "Unavailable in fallback data",
  form: []
};

export const teams: Team[] = [
  team("mex", "Mexico", "MEX", "A", "🇲🇽", ["#006847", "#ffffff", "#ce1126"], "CONCACAF", 15, "Quarter-finals"),
  team("rsa", "South Africa", "RSA", "A", "🇿🇦", ["#007749", "#ffb81c", "#de3831"], "CAF", 61, "Group stage"),
  team("kor", "South Korea", "KOR", "A", "🇰🇷", ["#c60c30", "#ffffff", "#003478"], "AFC", 22, "Fourth place"),
  team("cze", "Czechia", "CZE", "A", "🇨🇿", ["#d7141a", "#ffffff", "#11457e"], "UEFA", 44, "Runner-up"),
  team("sui", "Switzerland", "SUI", "B", "🇨🇭", ["#d52b1e", "#ffffff", "#8b0000"], "UEFA", 20, "Quarter-finals"),
  team("can", "Canada", "CAN", "B", "🇨🇦", ["#d52b1e", "#ffffff", "#d52b1e"], "CONCACAF", 31, "Group stage"),
  team("bih", "Bosnia and Herzegovina", "BIH", "B", "🇧🇦", ["#002395", "#ffffff", "#fecb00"], "UEFA", 70, "Group stage"),
  team("qat", "Qatar", "QAT", "B", "🇶🇦", ["#8a1538", "#ffffff", "#6f0f2f"], "AFC", 53, "Group stage"),
  team("bra", "Brazil", "BRA", "C", "🇧🇷", ["#009c3b", "#ffdf00", "#002776"], "CONMEBOL", 5, "Winners"),
  team("mar", "Morocco", "MAR", "C", "🇲🇦", ["#c1272d", "#006233", "#ffffff"], "CAF", 12, "Fourth place"),
  team("sco", "Scotland", "SCO", "C", "🏴", ["#005eb8", "#ffffff", "#002f6c"], "UEFA", 39, "Group stage"),
  team("hai", "Haiti", "HAI", "C", "🇭🇹", ["#00209f", "#d21034", "#ffffff"], "CONCACAF", 86, "Group stage"),
  team("usa", "United States", "USA", "D", "🇺🇸", ["#3c3b6e", "#ffffff", "#b22234"], "CONCACAF", 14, "Third place"),
  team("aus", "Australia", "AUS", "D", "🇦🇺", ["#00843d", "#ffcd00", "#012169"], "AFC", 26, "Round of 16"),
  team("par", "Paraguay", "PAR", "D", "🇵🇾", ["#d52b1e", "#ffffff", "#0038a8"], "CONMEBOL", 39, "Quarter-finals"),
  team("tur", "Turkey", "TUR", "D", "🇹🇷", ["#e30a17", "#ffffff", "#9d0000"], "UEFA", 25, "Third place"),
  team("ger", "Germany", "GER", "E", "🇩🇪", ["#000000", "#dd0000", "#ffce00"], "UEFA", 10, "Winners"),
  team("civ", "Ivory Coast", "CIV", "E", "🇨🇮", ["#f77f00", "#ffffff", "#009e60"], "CAF", 46, "Group stage"),
  team("ecu", "Ecuador", "ECU", "E", "🇪🇨", ["#ffdd00", "#034ea2", "#ed1c24"], "CONMEBOL", 24, "Round of 16"),
  team("cur", "Curaçao", "CUR", "E", "🇨🇼", ["#002b7f", "#ffffff", "#f9e814"], "CONCACAF", 82, "Debut"),
  team("ned", "Netherlands", "NED", "F", "🇳🇱", ["#ae1c28", "#ffffff", "#21468b"], "UEFA", 7, "Runner-up"),
  team("jpn", "Japan", "JPN", "F", "🇯🇵", ["#bc002d", "#ffffff", "#1f4ea3"], "AFC", 18, "Round of 16"),
  team("swe", "Sweden", "SWE", "F", "🇸🇪", ["#006aa7", "#fecc02", "#ffffff"], "UEFA", 28, "Runner-up"),
  team("tun", "Tunisia", "TUN", "F", "🇹🇳", ["#e70013", "#ffffff", "#8a0d14"], "CAF", 42, "Group stage"),
  team("bel", "Belgium", "BEL", "G", "🇧🇪", ["#000000", "#fae042", "#ed2939"], "UEFA", 8, "Third place"),
  team("egy", "Egypt", "EGY", "G", "🇪🇬", ["#ce1126", "#ffffff", "#000000"], "CAF", 34, "Group stage"),
  team("irn", "Iran", "IRN", "G", "🇮🇷", ["#239f40", "#ffffff", "#da0000"], "AFC", 21, "Group stage"),
  team("nzl", "New Zealand", "NZL", "G", "🇳🇿", ["#00247d", "#cc142b", "#ffffff"], "OFC", 103, "Group stage"),
  team("esp", "Spain", "ESP", "H", "🇪🇸", ["#aa151b", "#f1bf00", "#aa151b"], "UEFA", 1, "Winners"),
  team("cpv", "Cape Verde", "CPV", "H", "🇨🇻", ["#003893", "#f7d116", "#cf2027"], "CAF", 68, "Debut"),
  team("uru", "Uruguay", "URU", "H", "🇺🇾", ["#0038a8", "#ffffff", "#fcd116"], "CONMEBOL", 16, "Winners"),
  team("ksa", "Saudi Arabia", "KSA", "H", "🇸🇦", ["#006c35", "#ffffff", "#004f2d"], "AFC", 60, "Round of 16"),
  team("fra", "France", "FRA", "I", "🇫🇷", ["#0055a4", "#ffffff", "#ef4135"], "UEFA", 3, "Winners"),
  team("nor", "Norway", "NOR", "I", "🇳🇴", ["#ba0c2f", "#ffffff", "#00205b"], "UEFA", 29, "Round of 16"),
  team("sen", "Senegal", "SEN", "I", "🇸🇳", ["#00853f", "#fdef42", "#e31b23"], "CAF", 19, "Quarter-finals"),
  team("irq", "Iraq", "IRQ", "I", "🇮🇶", ["#ce1126", "#ffffff", "#007a3d"], "AFC", 58, "Group stage"),
  team("arg", "Argentina", "ARG", "J", "🇦🇷", ["#75aadb", "#ffffff", "#f6b40e"], "CONMEBOL", 2, "Winners"),
  team("aut", "Austria", "AUT", "J", "🇦🇹", ["#ed2939", "#ffffff", "#c8102e"], "UEFA", 29, "Third place"),
  team("alg", "Algeria", "ALG", "J", "🇩🇿", ["#006233", "#ffffff", "#d21034"], "CAF", 37, "Round of 16"),
  team("jor", "Jordan", "JOR", "J", "🇯🇴", ["#007a3d", "#ffffff", "#ce1126"], "AFC", 64, "Debut"),
  team("col", "Colombia", "COL", "K", "🇨🇴", ["#fcd116", "#003893", "#ce1126"], "CONMEBOL", 13, "Quarter-finals"),
  team("por", "Portugal", "POR", "K", "🇵🇹", ["#006600", "#ff0000", "#ffcc00"], "UEFA", 6, "Third place"),
  team("cod", "DR Congo", "COD", "K", "🇨🇩", ["#007fff", "#f7d618", "#ce1021"], "CAF", 56, "Group stage"),
  team("uzb", "Uzbekistan", "UZB", "K", "🇺🇿", ["#1eb53a", "#0099b5", "#ce1126"], "AFC", 57, "Debut"),
  team("eng", "England", "ENG", "L", "🏴", ["#ffffff", "#c8102e", "#012169"], "UEFA", 4, "Winners"),
  team("cro", "Croatia", "CRO", "L", "🇭🇷", ["#ff0000", "#ffffff", "#171796"], "UEFA", 11, "Runner-up"),
  team("gha", "Ghana", "GHA", "L", "🇬🇭", ["#ce1126", "#fcd116", "#006b3f"], "CAF", 73, "Quarter-finals"),
  team("pan", "Panama", "PAN", "L", "🇵🇦", ["#005293", "#ffffff", "#d21034"], "CONCACAF", 35, "Group stage")
];

export const groupCodes: GroupCode[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const groupPairings = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]] as const;

export const matches: CanonicalMatch[] = groupCodes.flatMap((group, groupIndex) => {
  const groupTeams = teams.filter((candidate) => candidate.group === group);
  return groupPairings.map(([homeIndex, awayIndex], pairingIndex) => {
    const matchNumber = groupIndex * 6 + pairingIndex + 1;
    return scheduledGroupMatch(matchNumber, group, groupTeams[homeIndex].id, groupTeams[awayIndex].id);
  });
});

function team(
  id: string,
  name: string,
  shortName: string,
  group: GroupCode,
  flag: string,
  colors: [string, string, string],
  confederation: string,
  fifaRank: number,
  bestFinish: string
): Team {
  return {
    id,
    name,
    shortName,
    group,
    flag,
    colors,
    confederation,
    fifaRank,
    profile: { ...profiles, bestFinish }
  };
}

function scheduledGroupMatch(
  matchNumber: number,
  group: GroupCode,
  homeTeamId: string,
  awayTeamId: string
): CanonicalMatch {
  return {
    id: `match-${matchNumber}`,
    matchNumber,
    stage: "group",
    group,
    homeTeamId,
    awayTeamId,
    homeSource: { kind: "team", teamId: homeTeamId },
    awaySource: { kind: "team", teamId: awayTeamId },
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    kickoff: "",
    venue: "TBD"
  };
}
